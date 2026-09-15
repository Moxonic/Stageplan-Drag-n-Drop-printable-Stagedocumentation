// stripe-webhook — the one place the plan field is set.
//
// Deploy with --no-verify-jwt: Stripe does not carry a Supabase token. The
// Stripe signature is what proves the call is real, and anything unsigned is
// turned away before it is read.

import Stripe from 'npm:stripe@17';
import { admin, stripe } from '../_shared/common.ts';

const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const cryptoProvider = Stripe.createSubtleCryptoProvider();

// past_due still counts while Stripe retries the card
const PAID = ['active', 'trialing', 'past_due'];

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  if (!signature || !secret) return new Response('Missing signature', { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, secret, undefined, cryptoProvider);
  } catch {
    return new Response('Bad signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          await applySubscription(sub, session.client_reference_id);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await applySubscription(event.data.object as Stripe.Subscription, null);
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    // a 500 makes Stripe try again later
    return new Response('Handler failed', { status: 500 });
  }
});

async function applySubscription(sub: Stripe.Subscription, userHint: string | null) {
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  let paid = PAID.includes(sub.status);
  let periodEnd = periodEndOf(sub);

  // Events can arrive out of order, and an old subscription ending must not
  // undo a newer one that is still running.
  if (!paid) {
    const others = await stripe.subscriptions.list({ customer, status: 'all', limit: 10 });
    const running = others.data.find((s) => s.id !== sub.id && PAID.includes(s.status));
    if (running) {
      paid = true;
      periodEnd = periodEndOf(running);
    }
  }

  const update = {
    plan: paid ? 'pro' : 'free',
    plan_renews_at: paid && periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    stripe_customer_id: customer,
  };

  const userId = userHint || sub.metadata?.supabase_user_id || null;
  const query = admin.from('profiles').update(update);
  const { error } = userId ? await query.eq('id', userId) : await query.eq('stripe_customer_id', customer);
  if (error) throw error;
}

// Newer Stripe API versions keep the period on the subscription item.
function periodEndOf(sub: Stripe.Subscription): number | null {
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const top = sub as unknown as { current_period_end?: number };
  return item?.current_period_end ?? top.current_period_end ?? null;
}

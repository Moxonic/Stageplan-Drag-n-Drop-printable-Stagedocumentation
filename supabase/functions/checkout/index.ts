// checkout — a Stripe Checkout page for the one paid tier.
//
// The customer is made once and its id kept on the profile; the card itself
// only ever goes to Stripe. The plan changes when the webhook hears back, not
// here, so closing the page halfway leaves nothing half-paid.

import { admin, backToApp, handle, HttpError, json, readBody, signedInUser, stripe } from '../_shared/common.ts';

Deno.serve(handle(async (req) => {
  const user = await signedInUser(req);
  const body = await readBody(req);
  const back = backToApp(body.return_url);

  const price = Deno.env.get('STRIPE_PRICE_ID');
  if (!price) throw new HttpError(500, 'STRIPE_PRICE_ID is not set');

  const { data: profile, error } = await admin
    .from('profiles')
    .select('plan, stripe_customer_id')
    .eq('id', user.id)
    .single();
  if (error || !profile) throw new HttpError(404, 'No profile for this account');
  if (profile.plan === 'pro') throw new HttpError(409, 'This account is already on the paid plan');

  let customer = profile.stripe_customer_id as string | null;
  if (!customer) {
    const made = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customer = made.id;
    const { error: saveError } = await admin
      .from('profiles')
      .update({ stripe_customer_id: customer })
      .eq('id', user.id);
    if (saveError) throw saveError;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { supabase_user_id: user.id } },
    allow_promotion_codes: true,
    success_url: back + '?checkout=done',
    cancel_url: back + '?checkout=cancelled',
  });

  return json({ url: session.url });
}));

// portal — Stripe's Customer Portal, where a subscription is changed,
// cancelled or its card replaced. Whatever happens there reaches the app
// through the webhook.

import { admin, backToApp, handle, HttpError, json, readBody, signedInUser, stripe } from '../_shared/common.ts';

Deno.serve(handle(async (req) => {
  const user = await signedInUser(req);
  const body = await readBody(req);

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();
  if (!profile?.stripe_customer_id) throw new HttpError(404, 'There is no billing for this account yet');

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: backToApp(body.return_url),
  });

  return json({ url: session.url });
}));

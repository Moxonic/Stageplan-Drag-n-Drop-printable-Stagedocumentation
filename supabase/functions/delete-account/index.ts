// delete-account — the delete-my-account path, written alongside sign-up.
//
// In order: stop any subscription so nobody is charged for an account that is
// gone, forget the person in PostHog, then delete the auth user. Deleting the
// user cascades through the database: profile, shows, crew links, team
// memberships, and the teams this person created with their stage library and
// storage lists.
//
// The Stripe customer record is left in place, cancelled, because invoices
// already issued have to be kept for the accounts.

import { admin, handle, json, signedInUser, stripe } from '../_shared/common.ts';

Deno.serve(handle(async (req) => {
  const user = await signedInUser(req);

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.stripe_customer_id) {
    const subs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'all',
      limit: 100,
    });
    for (const sub of subs.data) {
      if (!['canceled', 'incomplete_expired'].includes(sub.status)) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }
  }

  await forgetInPostHog(user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;

  return json({ deleted: true });
}));

// Best effort: an analytics hiccup does not keep an account alive. Needs a
// PostHog personal API key with person write access.
async function forgetInPostHog(distinctId: string) {
  const key = Deno.env.get('POSTHOG_PERSONAL_API_KEY');
  const project = Deno.env.get('POSTHOG_PROJECT_ID');
  if (!key || !project) return;

  const host = (Deno.env.get('POSTHOG_HOST') ?? 'https://us.posthog.com').replace(/\/+$/, '');
  const headers = { Authorization: `Bearer ${key}` };

  try {
    const found = await fetch(
      `${host}/api/projects/${project}/persons/?distinct_id=${encodeURIComponent(distinctId)}`,
      { headers },
    );
    if (!found.ok) {
      console.error('PostHog person lookup failed', found.status);
      return;
    }
    const { results } = await found.json();
    for (const person of results ?? []) {
      const id = person.uuid ?? person.id;
      const gone = await fetch(`${host}/api/projects/${project}/persons/${id}/?delete_events=true`, {
        method: 'DELETE',
        headers,
      });
      if (!gone.ok) console.error('PostHog person deletion failed', gone.status);
    }
  } catch (err) {
    console.error('PostHog deletion failed', err);
  }
}

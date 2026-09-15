/* app.config.example.js — copy to app.config.js and fill in.
 *
 * Every value here is public by design and ends up readable by every visitor,
 * which is why it is safe to commit app.config.js for a static host to deploy.
 * The secrets — Supabase's service_role key, Stripe's secret key and webhook
 * secret — live only in the Supabase Edge Function settings, never here.
 *
 * Without app.config.js the app stays behind the sign-in window, which says
 * that sign-in has not been set up.
 */
window.APP_CONFIG = {
    // Supabase dashboard: Project Settings, API
    supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
    supabaseAnonKey: 'YOUR-ANON-KEY',

    // PostHog: Project Settings, Project API key. Leave the key empty to send
    // no analytics at all. Use https://eu.i.posthog.com for an EU project.
    posthogKey: '',
    posthogHost: 'https://us.i.posthog.com',

    // What the upgrade button says the paid plan costs. Only a label: the
    // price itself is the Stripe price the checkout function is given.
    paidPlanLabel: 'Pro · per person per month'
};

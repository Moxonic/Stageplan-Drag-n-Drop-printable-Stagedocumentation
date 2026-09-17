/* app.config.js — this deployment's public settings. See app.config.example.js.
 *
 * Every value here is public by design and ends up readable by every visitor.
 * The secrets — Supabase's service_role key, Stripe's secret key and webhook
 * secret — live only in the Supabase Edge Function settings, never here.
 */
window.APP_CONFIG = {
    // Supabase dashboard: Project Settings, API
    supabaseUrl: 'https://kgjdtlkigbdxjzqhotzo.supabase.co',
    // the publishable key (sb_publishable_...); the legacy anon key is disabled
    supabaseAnonKey: 'sb_publishable_FXt6YOo1aW6vXNkAo3ugYA_OJrxz0N4',

    // PostHog: Project Settings, Project API key. Leave the key empty to send
    // no analytics at all. Use https://eu.i.posthog.com for an EU project.
    posthogKey: '',
    posthogHost: 'https://us.i.posthog.com',

    // What the upgrade button says the paid plan costs. Only a label: the
    // price itself is the Stripe price the checkout function is given.
    paidPlanLabel: 'Pro · per person per month'
};

/* billing.js — which plan the account is on, and the way to change it.
 *
 * The plan is a field on the account's profile row, and only the server
 * writes it: the Stripe webhook when a subscription starts, changes or ends.
 * The app reads it to decide what to show. Anything that matters — creating a
 * team, writing to its shared library — is checked again by the database.
 *
 * Paying happens on Stripe's own pages, in a new tab. This tab keeps asking
 * for the plan while that is going on, so it notices the change without being
 * reloaded. No card number ever passes through the app: Stripe holds it, and
 * the profile holds only Stripe's customer id.
 *
 * Everyone who signed up while StagePlanner was free keeps the paid features
 * without paying. The server works that out from the signup date and the day
 * billing started, and the panel says so.
 */
window.Billing = (function () {
    'use strict';

    const POLL_EVERY = 4000;          // ms between looks while a checkout is open
    const POLL_FOR = 15 * 60000;      // how long a checkout is waited for
    const FOCUS_GAP = 10000;          // ms between looks when the tab comes back

    const cfg = window.APP_CONFIG || {};
    let plan = null;                  // { plan, effective, billing_live, renews_at, has_billing }
    let pollTimer = null;
    let lastLook = 0;
    let returned = null;              // 'done' | 'cancelled' when Stripe sent us back here
    const listeners = [];

    const byId = (id) => document.getElementById(id);

    /* Stripe sends people back with ?checkout=done or ?checkout=cancelled. The
       tab that opened the checkout is already watching the plan, so this one
       closes itself when it can. */
    (function catchReturn() {
        let params;
        try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
        const state = params.get('checkout');
        if (!state) return;
        returned = state;
        params.delete('checkout');
        const q = params.toString();
        try {
            history.replaceState(null, '', window.location.pathname + (q ? '?' + q : '') + window.location.hash);
        } catch (e) { /* harmless */ }
        if (window.opener) {
            try { window.close(); } catch (e) { /* not ours to close */ }
        }
    })();

    /* ---------------- reading the plan ---------------- */

    async function refresh() {
        lastLook = Date.now();
        if (!window.Cloud || !window.Cloud.available()) {
            if (plan !== null) { plan = null; changed(); }
            return null;
        }
        const before = JSON.stringify(plan);
        const next = await window.Cloud.rpc('my_plan');
        plan = next || null;
        if (JSON.stringify(plan) !== before) changed();
        return plan;
    }

    const effective = () => (plan ? plan.effective : null);
    const isPaid = () => effective() === 'pro' || effective() === 'grandfathered';

    function changed() {
        render();
        listeners.forEach((fn) => { try { fn(plan); } catch (e) { /* a listener's problem */ } });
    }

    /* ---------------- watching a checkout ---------------- */

    function watch() {
        clearInterval(pollTimer);
        const started = effective();
        const until = Date.now() + POLL_FOR;
        pollTimer = setInterval(async () => {
            if (Date.now() > until) { clearInterval(pollTimer); return; }
            try {
                await refresh();
                if (effective() !== started) clearInterval(pollTimer);
            } catch (e) { /* try again on the next tick */ }
        }, POLL_EVERY);
    }

    /* The Stripe page is opened into a tab made during the click itself, since
       a tab opened after waiting for the server is a popup to most browsers. */
    async function goToStripe(fnName, button) {
        const tab = window.open('', '_blank');
        const was = button.textContent;
        button.disabled = true;
        button.textContent = 'Opening Stripe…';
        try {
            const res = await window.Cloud.fn(fnName, { return_url: window.Account.returnUrl() });
            if (!res || !res.url) throw new Error('No Stripe page came back');
            if (tab) tab.location.href = res.url;
            else window.location.assign(res.url);
            watch();
        } catch (err) {
            if (tab) tab.close();
            alert('Stripe could not be opened: ' + (err.message || err));
        } finally {
            button.disabled = false;
            button.textContent = was;
        }
    }

    /* ---------------- the panel ---------------- */

    function setText(id, text) {
        const node = byId(id);
        if (node) node.textContent = text;
    }

    function show(id, on) {
        const node = byId(id);
        if (node) node.hidden = !on;
    }

    function date(iso) {
        const d = new Date(iso);
        return isNaN(d) ? '' : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
    }

    function render() {
        const who = window.Account && window.Account.current();
        show('planSection', !!(who && plan));
        if (!who || !plan) return;

        const label = cfg.paidPlanLabel || 'the paid plan';
        const upgrade = byId('planUpgradeBtn');
        if (upgrade) upgrade.title = label;

        if (plan.effective === 'pro') {
            setText('planName', 'Pro');
            setText('planNote', plan.renews_at ? 'Renews on ' + date(plan.renews_at) + '.' : 'Thank you for paying for StagePlanner.');
        } else if (plan.effective === 'grandfathered' && !plan.billing_live) {
            setText('planName', 'Free while in beta');
            setText('planNote', 'Everything is included. When paid plans start, everyone who signed up before then keeps it all without paying — you included.');
        } else if (plan.effective === 'grandfathered') {
            setText('planName', 'Free for you, for good');
            setText('planNote', 'You signed up while StagePlanner was free, so you keep every feature without paying.');
        } else {
            setText('planName', 'Free');
            setText('planNote', 'Teams, with a shared stage library and shared storage lists, come with ' + label + '.');
        }

        show('planUpgradeBtn', plan.effective === 'free' && !!plan.billing_live);
        show('planManageBtn', !!plan.has_billing);

        if (returned === 'done' && plan.effective === 'pro') returned = null;
    }

    /* ---------------- start ---------------- */

    function init() {
        const upgrade = byId('planUpgradeBtn');
        const manage = byId('planManageBtn');
        if (upgrade) upgrade.addEventListener('click', () => goToStripe('checkout', upgrade));
        if (manage) manage.addEventListener('click', () => goToStripe('portal', manage));

        if (window.Account) {
            window.Account.onChange((who) => {
                if (!who) { clearInterval(pollTimer); plan = null; changed(); return; }
                refresh()
                    .then(() => { if (returned === 'done' && effective() !== 'pro') watch(); })
                    .catch(() => { /* shown as no plan section */ });
            });
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden || Date.now() - lastLook < FOCUS_GAP) return;
            refresh().catch(() => {});
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        plan: () => plan,
        isPaid: isPaid,
        refresh: refresh,
        onChange: (fn) => { listeners.push(fn); }
    };
})();

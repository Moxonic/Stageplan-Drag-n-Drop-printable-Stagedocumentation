/* account.js — the sign-in you meet before the app.
 *
 * Two ways in, both handled by the Supabase project named in app.config.js,
 * and neither leaves a password to look after:
 *
 *   Google   the browser goes to Google and comes back with a session in the
 *            address fragment, which is read once and wiped.
 *   Email    a six-digit code is sent to the address and typed back in. The
 *            first code for a new address is what makes the account.
 *
 * Until someone is signed in the app sits behind the sign-in window and cannot
 * be used. The gate lives in the browser: it decides who gets the interface.
 * What is actually worth protecting — shows in the account, the team library,
 * the plan — is guarded by row level security on the server.
 *
 * Everything else that needs the account (cloud.js, the show sync, teams,
 * billing, analytics) asks here: current() for who, token() for a fresh access
 * token, and onChange() to hear about signing in and out.
 */
window.Account = (function () {
    'use strict';

    const SESSION_KEY = 'stageplanner.session.v2';
    const REFRESH_MARGIN = 60000;        // refresh a token a minute before it lapses

    // What earlier versions kept in this browser: a home-made usage log, a
    // device id, and the session in an older shape.
    const RETIRED_KEYS = [
        'stageplanner.account.v1',
        'stageplanner.usage.queue.v1',
        'stageplanner.usage.device.v1',
        'stageplanner.usage.optout.v1'
    ];

    const cfg = window.APP_CONFIG || {};
    const hosted = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);

    let session = null;      // { id, email, provider, token, refresh, expires }
    let pendingEmail = null; // the address a code has just been sent to
    let refreshing = null;   // one refresh at a time, however many callers ask
    const listeners = [];

    const byId = (id) => document.getElementById(id);

    /* ---------------- kept between visits ---------------- */

    function forgetRetired() {
        RETIRED_KEYS.forEach((key) => {
            try { localStorage.removeItem(key); } catch (e) { /* private window */ }
        });
    }

    function load() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            session = raw ? JSON.parse(raw) : null;
        } catch (e) {
            session = null;
        }
    }

    function store() {
        try {
            if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            else localStorage.removeItem(SESSION_KEY);
        } catch (e) { /* private window */ }
    }

    /* ---------------- talking to Supabase auth ---------------- */

    function api(path) { return cfg.supabaseUrl.replace(/\/+$/, '') + '/auth/v1' + path; }

    async function call(method, path, body, token) {
        const headers = { 'apikey': cfg.supabaseAnonKey, 'Content-Type': 'application/json' };
        if (token) headers.Authorization = 'Bearer ' + token;
        const res = await fetch(api(path), {
            method: method,
            headers: headers,
            body: body ? JSON.stringify(body) : undefined
        });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
        if (!res.ok) {
            // the auth server answers errors in more than one shape
            const err = new Error((data && (data.msg || data.error_description || data.message || data.error)) ||
                ('Request failed with ' + res.status));
            err.code = data && (data.error_code || data.code);
            err.status = res.status;
            throw err;
        }
        return data;
    }

    function fromTokens(body) {
        const user = body.user || {};
        return {
            id: user.id,
            email: user.email || '',
            provider: (user.app_metadata && user.app_metadata.provider) || 'email',
            token: body.access_token,
            refresh: body.refresh_token || null,
            expires: Date.now() + (parseInt(body.expires_in, 10) || 3600) * 1000
        };
    }

    // Where Google sends people back to: this page, with no query or fragment.
    const returnUrl = () => window.location.origin + window.location.pathname;

    function signInWithGoogle() {
        if (window.location.protocol === 'file:') {
            throw new Error('Google sign-in needs the app served from a web address, not opened from disk.');
        }
        window.location.assign(api('/authorize?provider=google&redirect_to=' + encodeURIComponent(returnUrl())));
    }

    function sendCode(email) {
        return call('POST', '/otp', { email: email, create_user: true });
    }

    async function verifyCode(email, code) {
        return fromTokens(await call('POST', '/verify', { type: 'email', email: email, token: code }));
    }

    function refresh() {
        if (refreshing) return refreshing;
        refreshing = (async () => {
            try {
                const next = fromTokens(await call('POST', '/token?grant_type=refresh_token',
                    { refresh_token: session.refresh }));
                session = Object.assign(session, next, { email: next.email || session.email });
                store();
            } finally {
                refreshing = null;
            }
        })();
        return refreshing;
    }

    /* A fresh access token for anything that talks to the project. A refresh
       the server refuses means the account is gone or signed out elsewhere. */
    async function token() {
        if (!session) throw new Error('Not signed in');
        if (Date.now() > session.expires - REFRESH_MARGIN) {
            try {
                await refresh();
            } catch (err) {
                if (!(err instanceof TypeError)) {
                    signOut('Your session has ended. Sign in again.');
                }
                throw err;
            }
        }
        return session.token;
    }

    /* The Google round trip lands back here with the session, or an error, in
       the fragment. The fragment is never sent to a server by the browser, and
       it is wiped from the address bar so it cannot be pasted on by accident. */
    function readFragment() {
        const hash = (window.location.hash || '').replace(/^#/, '');
        if (!hash || (hash.indexOf('access_token=') === -1 && hash.indexOf('error') === -1)) return null;

        const bits = {};
        hash.split('&').forEach((pair) => {
            const i = pair.indexOf('=');
            if (i > 0) bits[pair.slice(0, i)] = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
        });

        try { history.replaceState(null, '', returnUrl() + window.location.search); }
        catch (e) { window.location.hash = ''; }
        return bits;
    }

    /* ---------------- telling the rest of the app ---------------- */

    const current = () => (session ? { id: session.id, email: session.email, provider: session.provider } : null);

    function notify(reason) {
        const who = current();
        listeners.forEach((fn) => { try { fn(who, reason); } catch (e) { /* a listener's problem */ } });
    }

    /* ---------------- the gate ---------------- */

    const STEPS = ['gateBusy', 'gateSetup', 'gateStart', 'gateCode'];

    function step(id) {
        STEPS.forEach((s) => { const n = byId(s); if (n) n.hidden = s !== id; });
        fail('');
        const first = byId(id) && byId(id).querySelector('input');
        if (first) setTimeout(() => first.focus(), 0);
    }

    function fail(message) {
        const node = byId('gateError');
        if (!node) return;
        node.textContent = message || '';
        node.hidden = !message;
    }

    function lock() {
        const gate = byId('authGate');
        const app = byId('app');
        if (gate) gate.hidden = false;
        if (app) app.inert = true;
        if (window.TopBar) window.TopBar.closeMenus();
    }

    function enter(next) {
        session = next;
        pendingEmail = null;
        store();
        const gate = byId('authGate');
        const app = byId('app');
        if (gate) gate.hidden = true;
        if (app) app.inert = false;
        const code = byId('gateCodeInput');
        if (code) code.value = '';
        render();
        notify('signed-in');
    }

    function signOut(message) {
        const token = session && session.token;
        session = null;
        store();
        render();
        lock();
        step(hosted ? 'gateStart' : 'gateSetup');
        if (typeof message === 'string') fail(message);
        notify('signed-out');
        if (token && hosted) call('POST', '/logout', null, token).catch(() => { /* already gone */ });
    }

    /* The account goes on the server: the subscription is cancelled, the row
       and everything that hangs off it is deleted, and so are the analytics
       for this person. See supabase/functions/delete-account. */
    async function deleteAccount() {
        if (!window.Cloud) throw new Error('Not connected');
        await window.Cloud.fn('delete-account', {});
        session = null;
        store();
        render();
        lock();
        step('gateStart');
        fail('Your account has been deleted.');
        notify('deleted');
    }

    async function busy(button, label, work) {
        const was = button.textContent;
        button.disabled = true;
        button.textContent = label;
        try {
            await work();
        } catch (err) {
            fail(err.message || 'Something went wrong. Try again.');
        } finally {
            button.disabled = false;
            button.textContent = was;
        }
    }

    function askForCode(email) {
        pendingEmail = email;
        byId('gateCodeLead').textContent = 'We sent a code to ' + email + '. Type it in to sign in.';
        step('gateCode');
    }

    function wireGate() {
        const gate = byId('authGate');
        if (!gate) return;

        // Keys typed into the gate are not plot shortcuts.
        gate.addEventListener('keydown', (e) => e.stopPropagation());

        byId('gateGoogle').addEventListener('click', () => {
            try { signInWithGoogle(); } catch (err) { fail(err.message); }
        });

        byId('gateEmailForm').addEventListener('submit', (e) => {
            e.preventDefault();
            busy(byId('gateSendCode'), 'Sending code…', async () => {
                const email = (byId('gateEmail').value || '').trim();
                if (!email || email.indexOf('@') < 1) throw new Error('That does not look like an email address.');
                try {
                    await sendCode(email);
                } catch (err) {
                    if (err.status === 429) throw new Error('Too many codes asked for. Wait a minute and try again.');
                    throw err;
                }
                askForCode(email);
            });
        });

        byId('gateCodeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            busy(byId('gateVerify'), 'Checking…', async () => {
                const code = (byId('gateCodeInput').value || '').replace(/\s+/g, '');
                if (!/^\d{6,10}$/.test(code)) throw new Error('The code is the digits from the email.');
                let next;
                try {
                    next = await verifyCode(pendingEmail, code);
                } catch (err) {
                    throw new Error('That code is wrong or has expired. Send a new one.');
                }
                enter(next);
            });
        });

        byId('gateResend').addEventListener('click', (e) => {
            if (!pendingEmail) return;
            busy(e.currentTarget, 'Sending…', async () => {
                await sendCode(pendingEmail);
                byId('gateCodeLead').textContent = 'A new code is on its way to ' + pendingEmail + '.';
            });
        });

        byId('gateBack').addEventListener('click', () => {
            pendingEmail = null;
            step('gateStart');
        });
    }

    /* ---------------- the top-bar panel ---------------- */

    function setText(id, text) {
        const node = byId(id);
        if (node) node.textContent = text;
    }

    function render() {
        const btn = byId('accountBtn');
        if (btn) btn.classList.toggle('is-signed-in', !!session);
        setText('accountBtnLabel', session ? (session.email || 'Account') : 'Account');
        setText('accountLabel', session ? session.email : '');
        setText('accountKind', !session ? '' : session.provider === 'google'
            ? 'Signed in with Google.'
            : 'Signed in with an emailed code.');
    }

    function wirePanel() {
        const out = byId('accountSignOut');
        if (out) out.addEventListener('click', () => signOut());

        const del = byId('accountDelete');
        if (del) {
            del.addEventListener('click', () => {
                if (!session) return;
                const typed = prompt(
                    'Delete your StagePlanner account?\n\n' +
                    'This cancels any subscription, deletes the shows saved in your account, ' +
                    'the teams you own with their stage library and storage lists, and your usage data. ' +
                    'It cannot be undone. What is saved in this browser stays here.\n\n' +
                    'Type your email address to confirm:');
                if (typed === null) return;
                if (typed.trim().toLowerCase() !== (session.email || '').toLowerCase()) {
                    alert('That is not the email on this account, so nothing was deleted.');
                    return;
                }
                del.disabled = true;
                deleteAccount()
                    .catch((err) => alert('The account could not be deleted: ' + (err.message || err)))
                    .finally(() => { del.disabled = false; });
            });
        }
    }

    /* ---------------- start ---------------- */

    async function init() {
        forgetRetired();
        wireGate();
        wirePanel();
        lock();

        if (!hosted) {
            step('gateSetup');
            return;
        }

        step('gateBusy');

        const bits = readFragment();
        if (bits && bits.access_token) {
            try {
                const who = await call('GET', '/user', null, bits.access_token);
                enter(fromTokens(Object.assign({}, bits, { user: who })));
                return;
            } catch (err) {
                step('gateStart');
                fail('Google sign-in could not be finished. Try again.');
                return;
            }
        }

        load();
        if (session && session.token) {
            try {
                if (Date.now() > session.expires - REFRESH_MARGIN) await refresh();
                enter(session);
                return;
            } catch (err) {
                // No network is not a verdict on the account: keep working
                // offline on the session this browser already has.
                if (err instanceof TypeError) {
                    enter(session);
                    return;
                }
                session = null;
                store();
            }
        }

        step('gateStart');
        if (bits && (bits.error_description || bits.error)) {
            fail('Sign-in was cancelled or refused: ' + (bits.error_description || bits.error));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        current: current,
        token: token,
        onChange: (fn) => { listeners.push(fn); },
        signOut: () => signOut(),
        isHosted: () => hosted,
        returnUrl: returnUrl
    };
})();

/* cloud.js — the one way the app talks to its Supabase project once somebody
 * is signed in.
 *
 *   rest(method, path, body, prefer)   the tables, through PostgREST
 *   rpc(name, args)                     the SQL functions in supabase/schema.sql
 *   fn(name, body)                      the Edge Functions (billing, deleting)
 *
 * Every call carries the signed-in person's token, so row level security on
 * the server decides what each one may read and write. Nothing here is trusted
 * to enforce anything.
 */
window.Cloud = (function () {
    'use strict';

    const cfg = window.APP_CONFIG || {};
    const base = (cfg.supabaseUrl || '').replace(/\/+$/, '');

    const available = () => !!(base && cfg.supabaseAnonKey && window.Account && window.Account.current());

    async function request(method, url, body, extra) {
        if (!available()) throw new Error('Not signed in');
        const token = await window.Account.token();
        const headers = Object.assign({
            'apikey': cfg.supabaseAnonKey,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }, extra || {});

        const res = await fetch(url, {
            method: method,
            headers: headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

        if (!res.ok) {
            const err = new Error((data && (data.message || data.error || data.msg)) ||
                ('Request failed with ' + res.status));
            err.status = res.status;
            err.code = data && data.code;
            throw err;
        }
        return data;
    }

    return {
        available: available,
        rest: (method, path, body, prefer) =>
            request(method, base + '/rest/v1/' + path, body, prefer ? { Prefer: prefer } : null),
        rpc: (name, args) => request('POST', base + '/rest/v1/rpc/' + name, args || {}),
        fn: (name, body) => request('POST', base + '/functions/v1/' + name, body || {})
    };
})();

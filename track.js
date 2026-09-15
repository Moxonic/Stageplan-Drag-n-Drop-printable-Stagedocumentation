/* track.js — the nine things worth counting, and the one place they go out.
 *
 * Every event in the app goes through Track.event(), so the destination can
 * change later without touching anything that fires one. Today that is
 * PostHog, loaded only when app.config.js names a project key. With no key,
 * Track.event() does nothing at all.
 *
 * The events are named after what a person did, and carry counts and sizes
 * only: how many scenes, how many items, how wide the stage is. The plot itself
 * never leaves the machine through here. Anything not on the list below is
 * refused, so a stray call cannot quietly widen what is collected.
 *
 * PostHog is told to collect nothing on its own — no autocapture, no page
 * views, no session recording — so these nine are the whole picture. Once
 * somebody signs in, the browser is identified by their account id, which
 * joins the counts from before and after into one person.
 */
window.Track = (function () {
    'use strict';

    const EVENTS = [
        'app_opened',        // the app finished loading
        'work_minute',       // a minute with the tab in front and hands on it
        'show_saved',        // Save show to file
        'show_opened',       // Open show file
        'scene_added',       // + Scene
        'stage_drawn',       // Draw stage
        'shift_written',     // Done in the shift editor
        'storage_exported',  // Export file on a storage list
        'pdf_exported'       // the PDF was actually written
    ];

    const TICK = 60000;          // ms between active-minute checks
    const IDLE_AFTER = 120000;   // ms without input after which this is not work
    const MAX_QUEUE = 200;       // calls held while the library loads

    const cfg = window.APP_CONFIG || {};
    const key = cfg.posthogKey || '';
    const host = (cfg.posthogHost || 'https://us.i.posthog.com').replace(/\/+$/, '');

    let lib = null;
    const queue = [];
    let lastInput = Date.now();

    const byId = (id) => document.getElementById(id);

    /* ---------------- the destination ---------------- */

    /* PostHog's own loader, reduced to what it needs: a placeholder holding
       the init call, then the library, which picks the call up and replaces
       the placeholder with itself. */
    function load() {
        if (!key) return;
        window.posthog = [];
        window.posthog._i = [[key, {
            api_host: host,
            autocapture: false,
            capture_pageview: false,
            capture_pageleave: false,
            disable_session_recording: true,
            persistence: 'localStorage'
        }, 'posthog']];
        window.posthog.__SV = 1;

        const assets = host.indexOf('.i.posthog.com') !== -1
            ? host.replace('.i.posthog.com', '-assets.i.posthog.com')
            : host;
        const script = document.createElement('script');
        script.async = true;
        script.src = assets + '/static/array.js';
        script.onload = () => {
            const ph = window.posthog;
            if (!ph || typeof ph.capture !== 'function') return;
            lib = ph;
            queue.splice(0).forEach(([method, args]) => call(method, args));
        };
        document.head.appendChild(script);
    }

    function call(method, args) {
        if (!key) return;
        if (!lib) {
            queue.push([method, args]);
            if (queue.length > MAX_QUEUE) queue.shift();
            return;
        }
        try { lib[method].apply(lib, args); } catch (e) { /* analytics never breaks the app */ }
    }

    /* ---------------- the one call ---------------- */

    function event(name, props) {
        if (EVENTS.indexOf(name) === -1) {
            if (window.console) console.warn('Track: "' + name + '" is not one of the nine events');
            return;
        }
        call('capture', [name, props || {}]);
    }

    /* ---------------- what to listen to ---------------- */

    function plotSize() {
        const items = document.querySelectorAll('#dropZone .eqOnStage').length;
        const labels = document.querySelectorAll('#dropZone .textAdded').length;
        const strokes = (typeof lines !== 'undefined' && Array.isArray(lines)) ? lines.length : 0;
        return { items: items, labels: labels, strokes: strokes };
    }

    const sceneCount = () => (window.Scenes ? window.Scenes.count() : 1);

    function metres(id) {
        const node = byId(id);
        const v = node ? parseFloat(node.value) : NaN;
        return isFinite(v) ? v : null;
    }

    /* Reaching for buttons by id rather than asking each module to report in,
       so the drawing code does not have to know analytics exists. The PDF is
       the exception and reports itself: a click is not proof it finished. */
    function wire() {
        const clicks = [
            ['showSaveFileBtn', 'show_saved', () => Object.assign(
                { scenes: sceneCount(), title: !!(byId('playNameInput') || {}).value }, plotSize())],
            ['showOpenFileBtn', 'show_opened', () => ({})],
            ['sceneAddBtn', 'scene_added', () => ({ scene: sceneCount() + 1 })],
            ['applyStage', 'stage_drawn', () => ({
                width_m: metres('mainW'),
                depth_m: metres('mainD'),
                side_l: !!(byId('sideLOn') || {}).checked,
                side_r: !!(byId('sideROn') || {}).checked,
                back: !!(byId('backOn') || {}).checked,
                pit: !!(byId('pitOn') || {}).checked
            })],
            ['shiftDone', 'shift_written', () => ({
                steps: document.querySelectorAll('#shiftList .shiftRow').length
            })]
        ];

        clicks.forEach(([id, name, props]) => {
            const node = byId(id);
            if (node) node.addEventListener('click', () => event(name, props()));
        });

        // The storage menu is built in JavaScript and its rows carry no ids, so
        // this one is matched on its label, and heard on the way down because
        // the menu stops clicks inside it from bubbling.
        document.addEventListener('click', (e) => {
            const item = e.target.closest && e.target.closest('.eqMenuItem');
            if (item && (item.textContent || '').trim() === 'Export file') {
                const list = window.EquipmentPanel && window.EquipmentPanel.activeStorage();
                event('storage_exported', { items: list ? list.items.length : null });
            }
        }, true);

        ['pointerdown', 'keydown', 'wheel'].forEach((type) => {
            document.addEventListener(type, () => { lastInput = Date.now(); }, { passive: true });
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) lastInput = Date.now();
        });

        // Wall clock from open to close would bill a tab left open over lunch.
        setInterval(() => {
            if (document.hidden) return;
            if (Date.now() - lastInput > IDLE_AFTER) return;
            if (window.Account && !window.Account.current()) return;   // behind the sign-in
            event('work_minute', {});
        }, TICK);
    }

    /* ---------------- people, not browsers ---------------- */

    function watchAccount() {
        if (!window.Account) return;
        window.Account.onChange((who) => {
            if (who) call('identify', [who.id]);
            else call('reset', []);
        });
    }

    function init() {
        // the account panel only says counts go to PostHog when they do
        const note = byId('accountPrivacy');
        if (note) note.hidden = !key;

        load();
        wire();
        watchAccount();
        // after scenes.js has put the stored show back, so the counts are real
        setTimeout(() => event('app_opened', Object.assign({ scenes: sceneCount() }, plotSize())), 400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { event: event, events: () => EVENTS.slice() };
})();

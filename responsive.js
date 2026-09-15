/* responsive.js — the parts of the small-screen shell that CSS cannot do.
 *
 * Three jobs. The top bar wraps onto a second row on a phone, and nothing in
 * CSS can report how tall it ended up, so its height is measured into
 * --topbar-real-h; the popovers and the rail hang from that. The rail becomes
 * a drawer over the stage, which needs something to open and shut it. And on
 * a phone held upright that drawer is a sheet up from the bottom, whose handle
 * is dragged to set the height — a gesture no stylesheet can follow.
 *
 * All three are inert on a wide screen: the measurement matches the fixed
 * height, and neither the drawer class nor the sheet class has any rule
 * outside its media query.
 */
window.RailDrawer = (function () {
    'use strict';

    const PHONE = '(max-width: 760px)';

    // Must match the sheet's query in responsive.css, or the handle and the
    // gesture behind it end up on different sides of the same screen.
    const UPRIGHT = '(max-width: 760px) and (orientation: portrait) and (min-height: 480px)';

    // Where the sheet lands when the finger comes off, as a share of how tall
    // it is allowed to get. Under the first it goes away; over the second it
    // goes to the top; between them it returns to resting.
    const DISMISS_AT = 0.25;
    const FULL_AT = 0.78;

    // Long enough for the slide in responsive.css to finish.
    const SLIDE_MS = 220;

    const byId = (id) => document.getElementById(id);

    let app = null;
    let rail = null;
    let backdrop = null;
    let toggle = null;
    let handle = null;

    let drag = null;        // the finger on the handle, while there is one
    let resetTimer = 0;

    const isDrawer = () => window.matchMedia(PHONE).matches;
    const isSheet = () => window.matchMedia(UPRIGHT).matches;

    const typingInRail = () => {
        const on = document.activeElement;
        return !!(rail && on && rail.contains(on) &&
            (on.tagName === 'INPUT' || on.tagName === 'SELECT' || on.tagName === 'TEXTAREA'));
    };

    /* ---------------- the real top bar height ---------------- */

    function measure() {
        const bar = document.querySelector('.topbar');
        if (!bar) return;
        const h = Math.round(bar.getBoundingClientRect().height);
        if (h > 0) document.documentElement.style.setProperty('--topbar-real-h', h + 'px');
    }

    /* ---------------- the drawer ---------------- */

    function setOpen(open) {
        if (!app) return;
        const on = !!open && isDrawer();
        app.classList.toggle('rail-open', on);
        if (backdrop) backdrop.hidden = !on;
        if (toggle) toggle.setAttribute('aria-expanded', String(on));

        // Shutting it puts the sheet back to resting, but only once it is out
        // of sight, so it does not resize itself on the way down.
        if (!on) resetSheet(SLIDE_MS);
    }

    function isOpen() { return !!(app && app.classList.contains('rail-open')); }

    /* ---------------- the sheet, on an upright phone ---------------- */

    /* The height the sheet is allowed to reach, which the stylesheet already
       works out as max-height; asking for it computed saves saying it twice. */
    function ceiling() {
        if (!rail) return window.innerHeight;
        const max = parseFloat(window.getComputedStyle(rail).maxHeight);
        return max > 0 ? max : window.innerHeight;
    }

    function setFull(on) {
        if (!app) return;
        const full = !!on && isSheet();
        app.classList.toggle('rail-full', full);
        if (rail) rail.style.height = '';     // the class carries the height now
        if (handle) handle.setAttribute('aria-expanded', String(full));
    }

    /* Back to the height the stylesheet asks for. A delay leaves the sheet at
       the height the finger left it in until it has slid away. */
    function resetSheet(delay) {
        window.clearTimeout(resetTimer);
        const run = () => setFull(false);
        if (delay) resetTimer = window.setTimeout(run, delay);
        else run();
    }

    function onGrab(e) {
        if (!isSheet() || !isOpen() || !rail) return;
        drag = {
            id: e.pointerId,
            y: e.clientY,
            h: rail.getBoundingClientRect().height,
            moved: false
        };
        app.classList.add('rail-dragging');
        if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
    }

    function onMove(e) {
        if (!drag || e.pointerId !== drag.id) return;
        const dy = e.clientY - drag.y;
        if (Math.abs(dy) > 4) drag.moved = true;
        // Down shrinks it, up grows it, and neither goes past the ceiling.
        rail.style.height = Math.max(0, Math.min(ceiling(), drag.h - dy)) + 'px';
    }

    function onRelease(e) {
        if (!drag || e.pointerId !== drag.id) return;
        const moved = drag.moved;
        const share = rail.getBoundingClientRect().height / ceiling();
        drag = null;
        app.classList.remove('rail-dragging');

        // A press rather than a drag: the handle is the way up and back down.
        if (!moved) {
            setFull(!app.classList.contains('rail-full'));
            return;
        }

        if (share < DISMISS_AT) setOpen(false);
        else setFull(share > FULL_AT);
    }

    function onCancel(e) {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        app.classList.remove('rail-dragging');
        setFull(app.classList.contains('rail-full'));
    }

    function wireHandle() {
        if (!handle) return;
        handle.addEventListener('pointerdown', onGrab);
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onRelease);
        handle.addEventListener('pointercancel', onCancel);

        // A click with no pointer behind it came from the keyboard, so it is
        // the only one worth acting on; a tap is already handled on release.
        handle.addEventListener('click', (e) => {
            if (e.detail === 0) setFull(!app.classList.contains('rail-full'));
        });
    }

    /* ---------------- wiring ---------------- */

    function init() {
        app = byId('app');
        rail = byId('sidebar');
        backdrop = byId('railBackdrop');
        toggle = byId('railToggleBtn');
        handle = byId('railHandle');
        if (!app) return;

        measure();
        wireHandle();

        if (toggle) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                setOpen(!isOpen());
            });
        }

        if (backdrop) backdrop.addEventListener('click', () => setOpen(false));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen()) setOpen(false);
        });

        // The rail is a column again once there is room for one, and a drawer
        // left open would then sit over the stage with nothing to close it.
        // Turning the phone on its side ends the sheet the same way.
        window.addEventListener('resize', () => {
            measure();
            // A keyboard opening over the custom-item fields is not a change of
            // layout, so leave the sheet where it is until typing is finished.
            if (typingInRail()) return;
            if (!isDrawer()) setOpen(false);
            else if (!isSheet()) resetSheet();
        });

        // The bar rewraps when a label or a button changes, not only when the
        // window does, so watch the bar itself where the browser allows it.
        const bar = document.querySelector('.topbar');
        if (bar && typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(measure).observe(bar);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        open: () => setOpen(true),
        close: () => setOpen(false),
        isOpen: isOpen,
        isDrawer: isDrawer,
        isSheet: isSheet,
        measure: measure
    };
})();

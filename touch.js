/* touch.js — the app by finger.
 *
 * Everything on the stage was built for a mouse: the pen listens for
 * mousedown, the selection handles for mousedown and then mousemove on the
 * document, and gear is moved by HTML5 drag and drop, which a touch screen
 * does not fire at all.
 *
 * Rather than teach each of those a second language, a touch is retold here as
 * the mouse event it stands for. Moving gear is the exception: drag and drop
 * has no mouse event to borrow, so that one is done here from the coordinates.
 * Tapping a row in the rail to place gear is added too, because dragging out of
 * a drawer is a poor way to spend a thumb.
 *
 * Loaded last, so everything it talks to already exists.
 */
window.TouchInput = (function () {
    'use strict';

    const TAP_SLOP = 8;          // px of travel still counted as a tap, not a drag
    const CASCADE = 18;          // px each tapped item steps from the one before
    const CASCADE_WRAP = 6;

    const byId = (id) => document.getElementById(id);
    const dropZone = () => byId('dropZone');
    const drawing = () => window.penEnabled || window.eraserEnabled;

    let cascade = 0;

    /* ---------------- retelling a touch as a mouse event ---------------- */

    function asMouse(target, type, touch) {
        target.dispatchEvent(new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: touch ? touch.clientX : 0,
            clientY: touch ? touch.clientY : 0,
            buttons: type === 'mouseup' ? 0 : 1
        }));
    }

    const firstTouch = (e) => (e.touches && e.touches[0]) ||
        (e.changedTouches && e.changedTouches[0]) || null;

    /* ---------------- drawing and erasing ---------------- */

    /* Only while the pen or the rubber is in hand. With neither, the touch is
       left alone, so the browser's own click still reaches the selection. */
    function wireCanvas() {
        const canvas = byId('canvas');
        if (!canvas) return;
        let stroking = false;

        canvas.addEventListener('touchstart', (e) => {
            if (!drawing() || e.touches.length !== 1) return;
            stroking = true;
            e.preventDefault();       // no scrolling, and no click afterwards
            asMouse(canvas, 'mousedown', e.touches[0]);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            if (!stroking) return;
            e.preventDefault();
            asMouse(canvas, 'mousemove', firstTouch(e));
        }, { passive: false });

        const end = (e) => {
            if (!stroking) return;
            stroking = false;
            asMouse(canvas, 'mouseup', firstTouch(e));
        };
        canvas.addEventListener('touchend', end);
        canvas.addEventListener('touchcancel', end);
    }

    /* ---------------- the rotate and resize handles ---------------- */

    /* selection.js starts a handle drag on mousedown over the handle and then
       follows the mouse on the document, so the retelling lands in both
       places. */
    function wireHandles() {
        const dz = dropZone();
        if (!dz) return;
        let handle = null;

        dz.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            const hit = e.target.closest && e.target.closest('.selHandle');
            if (!hit) return;
            handle = hit;
            e.preventDefault();
            asMouse(hit, 'mousedown', e.touches[0]);
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!handle) return;
            e.preventDefault();
            asMouse(document, 'mousemove', firstTouch(e));
        }, { passive: false });

        const end = (e) => {
            if (!handle) return;
            handle = null;
            asMouse(document, 'mouseup', firstTouch(e));
        };
        document.addEventListener('touchend', end);
        document.addEventListener('touchcancel', end);
    }

    /* ---------------- moving gear and labels ---------------- */

    function wireStageDrag() {
        const dz = dropZone();
        if (!dz) return;
        let drag = null;

        dz.addEventListener('touchstart', (e) => {
            if (drawing() || e.touches.length !== 1) return;
            if (e.target.closest('.selLayer')) return;      // the handles run themselves
            const node = e.target.closest('.eqOnStage, .dropped-equipment, .textAdded');
            if (!node || node.isContentEditable) return;    // a label being typed into

            const t = e.touches[0];
            drag = {
                node: node,
                fromX: t.clientX,
                fromY: t.clientY,
                left: parseFloat(node.style.left) || 0,
                top: parseFloat(node.style.top) || 0,
                moved: false
            };
            if (window.Selection) window.Selection.select(node);
        }, { passive: true });

        dz.addEventListener('touchmove', (e) => {
            if (!drag || e.touches.length !== 1) return;
            const t = e.touches[0];
            const dx = t.clientX - drag.fromX;
            const dy = t.clientY - drag.fromY;
            if (!drag.moved && Math.hypot(dx, dy) < TAP_SLOP) return;

            drag.moved = true;
            e.preventDefault();          // the stage moves the item, not the page
            drag.node.style.left = Math.round(drag.left + dx) + 'px';
            drag.node.style.top = Math.round(drag.top + dy) + 'px';
            if (window.Selection) window.Selection.sync();
        }, { passive: false });

        const end = () => {
            if (!drag) return;
            const done = drag;
            drag = null;
            if (!done.moved) return;     // a tap, and selecting it was the whole job
            if (window.StageScale) window.StageScale.rememberPosition(done.node);
            if (window.Selection) window.Selection.sync();
            if (window.PlotHistory) window.PlotHistory.record();
        };
        dz.addEventListener('touchend', end);
        dz.addEventListener('touchcancel', end);
    }

    /* ---------------- tapping the rail to place gear ---------------- */

    /* Middle of the stage, stepped along a short diagonal so a run of taps
       lands as a row you can pull apart rather than as one pile. */
    function placeInMiddle(item) {
        const dz = dropZone();
        if (!dz || !window.StageScale || !item) return null;

        const node = window.StageScale.createStageElement(item);
        dz.appendChild(node);
        window.StageScale.resizeElement(node);

        const step = (cascade % CASCADE_WRAP) * CASCADE;
        cascade += 1;
        node.style.left = Math.round(dz.clientWidth / 2 - node.offsetWidth / 2 + step) + 'px';
        node.style.top = Math.round(dz.clientHeight / 2 - node.offsetHeight / 2 + step) + 'px';

        window.StageScale.rememberPosition(node);
        if (typeof addDragListeners === 'function') addDragListeners(node);
        if (window.Selection) window.Selection.select(node);
        if (window.PlotHistory) window.PlotHistory.record();
        return node;
    }

    function wireRailTap() {
        const rail = byId('sidebar');
        if (!rail) return;

        rail.addEventListener('click', (e) => {
            // the + , the remove cross, the search field and the chooser
            if (e.target.closest('button, input, select, textarea, label')) return;
            if (window.EquipmentPanel && window.EquipmentPanel.isEditing()) return;

            const row = e.target.closest('[data-eid]');
            if (!row) return;
            const item = window.EquipmentCatalog && window.EquipmentCatalog.get(row.dataset.eid);
            if (!item) return;

            placeInMiddle(item);
            if (window.RailDrawer) window.RailDrawer.close();
        });
    }

    function init() {
        wireCanvas();
        wireHandles();
        wireStageDrag();
        wireRailTap();
        // A new stage is a fresh surface, so the cascade starts over.
        if (window.StageScale) window.StageScale.onChange(() => { cascade = 0; });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { placeInMiddle: placeInMiddle };
})();

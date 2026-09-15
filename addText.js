/* addText.js — free text on the plot. Double-click empty stage to add a
   label; double-click it again to remove it.

   Text boxes are also the way to draw a plain rectangle on the plot, so they
   are built by one factory that history.js can call to put a box back. */
window.StageText = (function () {
    'use strict';

    const dropZone = () => document.getElementById('dropZone');

    function record() {
        if (window.PlotHistory) window.PlotHistory.record();
    }

    /* Build a text box with every behaviour already attached. The caller
       positions it — history restores fractions, a double-click uses pixels. */
    function create(opts) {
        opts = opts || {};
        const div = document.createElement('div');
        div.className = 'textAdded';
        div.style.position = 'absolute';
        div.style.border = '1.5px solid #1d2329';
        div.style.borderRadius = '2px';
        div.style.whiteSpace = 'pre-wrap';
        div.style.padding = '4px 6px';
        div.style.zIndex = '10';
        div.dataset.rotation = String(opts.rotation || 0);
        div.dataset.uid = opts.uid || (window.StageScale ? window.StageScale.newUid() : String(Math.random()));

        if (opts.text) div.textContent = opts.text;
        if (opts.rotation) div.style.transform = 'rotate(' + opts.rotation + 'deg)';

        if (opts.editing) div.contentEditable = 'true';

        bind(div);
        return div;
    }

    function bind(div) {
        div.addEventListener('blur', () => {
            div.contentEditable = 'false';
            record();
        });

        // A label moves the same way gear does: it follows the pointer rather
        // than sending a ghost ahead and jumping at the end.
        if (window.StageMove) window.StageMove.makeMovable(div);

        // Each box keeps its own angle, rather than sharing one counter.
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const deg = ((parseFloat(div.dataset.rotation || '0') + 22.5) % 360);
            div.dataset.rotation = String(deg);
            div.style.transform = 'rotate(' + deg + 'deg)';
            if (window.Selection) window.Selection.sync();
            record();
        });
    }

    function init() {
        const dz = dropZone();
        if (!dz) {
            console.error('Dropzone element not found');
            return;
        }

        dz.addEventListener('dblclick', (event) => {
            if (window.penEnabled || window.eraserEnabled) return;

            // equipment has its own double-click meaning, handled elsewhere
            if (event.target.closest('.gear, .dropped-equipment, .selLayer')) return;

            // a second double-click on a text box removes it
            const existing = event.target.closest('.textAdded');
            if (existing) {
                if (window.Selection) window.Selection.clear();
                existing.remove();
                record();
                return;
            }

            const rect = dz.getBoundingClientRect();
            const div = create({ editing: true });
            div.style.left = (event.clientX - rect.left) + 'px';
            div.style.top = (event.clientY - rect.top) + 'px';
            dz.appendChild(div);
            if (window.StageScale) window.StageScale.rememberPosition(div);
            div.focus();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { create };
})();

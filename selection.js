/* selection.js — click something on the stage to see what you are about to
 * change, and get handles for the things that used to be hidden gestures.
 *
 * The outline sits inside the item so it turns with it. The handles sit in a
 * separate layer that never rotates, so "drag right to make it bigger" keeps
 * meaning the same thing whichever way the cabinet is pointing.
 */
window.Selection = (function () {
    'use strict';

    let selected = null;
    let layer = null;
    let drag = null;                       // an in-progress rotate or resize

    const dropZone = () => document.getElementById('dropZone');
    const isEquipment = (n) => n && n.classList.contains('eqOnStage');

    /* ---------------- the handle layer ---------------- */

    function ensureLayer() {
        if (layer && layer.isConnected) return layer;
        const dz = dropZone();
        if (!dz) return null;
        layer = document.createElement('div');
        layer.className = 'selLayer';
        layer.hidden = true;
        layer.innerHTML =
            '<div class="selBox"></div>' +
            '<button type="button" class="selHandle selRotate" title="Drag to rotate">⟳</button>' +
            '<button type="button" class="selHandle selResize" title="Drag to resize">⤡</button>' +
            '<div class="selBar">' +
              '<button type="button" class="selAction" data-act="duplicate" title="Duplicate (Ctrl+D)">⧉</button>' +
              '<button type="button" class="selAction" data-act="delete" title="Delete (Del)">✕</button>' +
            '</div>' +
            '<div class="selReadout"></div>';
        dz.appendChild(layer);
        wireLayer();
        return layer;
    }

    function wireLayer() {
        layer.querySelector('.selRotate').addEventListener('mousedown', (e) => startDrag(e, 'rotate'));
        layer.querySelector('.selResize').addEventListener('mousedown', (e) => startDrag(e, 'resize'));
        layer.querySelectorAll('.selAction').forEach((btn) => {
            btn.addEventListener('mousedown', (e) => e.stopPropagation());
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (btn.dataset.act === 'delete') remove();
                else duplicate();
            });
        });
    }

    /* ---------------- position the chrome over the item ---------------- */

    function sync() {
        if (!selected || !selected.isConnected) { clear(); return; }
        const l = ensureLayer();
        if (!l) return;

        const left = parseFloat(selected.style.left) || 0;
        const top = parseFloat(selected.style.top) || 0;
        const w = selected.offsetWidth;
        const h = selected.offsetHeight;
        const rot = parseFloat(selected.getAttribute('data-rotation') || '0') || 0;

        l.hidden = false;
        l.style.left = left + 'px';
        l.style.top = top + 'px';
        l.style.width = w + 'px';
        l.style.height = h + 'px';

        // only the outline turns with the item
        l.querySelector('.selBox').style.transform = 'rotate(' + rot + 'deg)';

        const readout = l.querySelector('.selReadout');
        const item = window.EquipmentCatalog && window.EquipmentCatalog.get(selected.dataset.eid);
        if (item) {
            const k = parseFloat(selected.dataset.itemScale || '1') || 1;
            const size = item.mode === 'real'
                ? fmt(item.w * k) + ' × ' + fmt(item.d * k) + ' m'
                : 'symbol';
            readout.textContent = item.name + ' · ' + size + ' · ' + Math.round(rot) + '°';
        } else {
            readout.textContent = 'Text';
        }
    }

    function fmt(v) { return (Math.round(v * 100) / 100).toFixed(2); }

    /* ---------------- select and clear ---------------- */

    function select(node) {
        if (selected === node) { sync(); return; }
        clear();
        if (!node) return;
        selected = node;
        node.classList.add('is-selected');
        sync();
    }

    function clear() {
        if (selected) selected.classList.remove('is-selected');
        selected = null;
        if (layer) layer.hidden = true;
    }

    /* ---------------- actions ---------------- */

    function remove() {
        if (!selected) return;
        const node = selected;
        clear();
        node.remove();
        if (window.PlotHistory) window.PlotHistory.record();
    }

    function duplicate() {
        if (!selected || !isEquipment(selected)) return;
        const item = window.EquipmentCatalog.get(selected.dataset.eid);
        if (!item) return;
        const dz = dropZone();
        const copy = window.StageScale.createStageElement(item);
        copy.dataset.itemScale = selected.dataset.itemScale || '1';
        dz.appendChild(copy);
        window.StageScale.resizeElement(copy);

        const rot = parseFloat(selected.getAttribute('data-rotation') || '0') || 0;
        if (rot) {
            copy.style.transform = 'rotate(' + rot + 'deg)';
            copy.setAttribute('data-rotation', rot);
            window.StageScale.syncLabel(copy);
        }
        copy.style.left = ((parseFloat(selected.style.left) || 0) + 16) + 'px';
        copy.style.top = ((parseFloat(selected.style.top) || 0) + 16) + 'px';
        window.StageScale.rememberPosition(copy);
        if (typeof addDragListeners === 'function') addDragListeners(copy);

        select(copy);
        if (window.PlotHistory) window.PlotHistory.record();
    }

    function nudge(dx, dy) {
        if (!selected) return;
        selected.style.left = ((parseFloat(selected.style.left) || 0) + dx) + 'px';
        selected.style.top = ((parseFloat(selected.style.top) || 0) + dy) + 'px';
        if (window.StageScale) window.StageScale.rememberPosition(selected);
        sync();
    }

    /* ---------------- dragging a handle ---------------- */

    function startDrag(e, mode) {
        if (!selected) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = selected.getBoundingClientRect();
        drag = {
            mode: mode,
            cx: rect.left + rect.width / 2,
            cy: rect.top + rect.height / 2,
            startRot: parseFloat(selected.getAttribute('data-rotation') || '0') || 0,
            startScale: parseFloat(selected.dataset.itemScale || '1') || 1,
            startDist: 0
        };
        drag.startAngle = angleTo(e.clientX, e.clientY);
        drag.startDist = distTo(e.clientX, e.clientY) || 1;

        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
    }

    function angleTo(x, y) { return Math.atan2(y - drag.cy, x - drag.cx) * 180 / Math.PI; }
    function distTo(x, y) { return Math.hypot(x - drag.cx, y - drag.cy); }

    function onDragMove(e) {
        if (!drag || !selected) return;

        if (drag.mode === 'rotate') {
            let deg = drag.startRot + (angleTo(e.clientX, e.clientY) - drag.startAngle);
            if (!e.altKey) deg = Math.round(deg / 7.5) * 7.5;     // Alt for free rotation
            deg = ((deg % 360) + 360) % 360;
            selected.style.transform = 'rotate(' + deg + 'deg)';
            selected.setAttribute('data-rotation', deg);
            if (window.StageScale) window.StageScale.syncLabel(selected);
        } else {
            const k = Math.max(0.25, Math.min(8, drag.startScale * (distTo(e.clientX, e.clientY) / drag.startDist)));
            selected.dataset.itemScale = String(k);
            if (window.StageScale) {
                window.StageScale.resizeElement(selected);
                window.StageScale.restorePosition(selected);
            }
        }
        sync();
    }

    function onDragEnd() {
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        if (drag && window.PlotHistory) window.PlotHistory.record();
        drag = null;
    }

    /* ---------------- wiring ---------------- */

    function isTyping(el) {
        if (!el) return false;
        const t = el.tagName;
        return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable;
    }

    function init() {
        const dz = dropZone();
        if (!dz) return;

        dz.addEventListener('mousedown', (e) => {
            if (window.penEnabled || window.eraserEnabled) return;
            if (e.target.closest('.selLayer')) return;
            const node = e.target.closest('.eqOnStage, .textAdded');
            if (node) select(node);
            else clear();
        });

        document.addEventListener('keydown', (e) => {
            if (!selected || isTyping(document.activeElement)) return;

            if (e.key === 'Escape') { clear(); return; }
            if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); return; }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                duplicate();
                return;
            }

            const step = e.shiftKey ? 10 : 1;
            if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-step, 0); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(step, 0); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); nudge(0, -step); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); nudge(0, step); }
            else return;

            clearTimeout(nudge.timer);
            nudge.timer = setTimeout(() => {
                if (window.PlotHistory) window.PlotHistory.record();
            }, 400);
        });

        // the stage can be redrawn underneath us
        if (window.StageScale) window.StageScale.onChange(() => { if (selected) sync(); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        select: select,
        clear: clear,
        sync: sync,
        current: () => selected
    };
})();

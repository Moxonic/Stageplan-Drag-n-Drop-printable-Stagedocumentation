/* history.js — one undo stack for the whole plot.
 *
 * Snapshots rather than commands: the plot is small (a few dozen objects and
 * some pen strokes) and a snapshot cannot drift out of step with the DOM the
 * way a pile of inverse operations can.
 *
 * Positions are stored as fractions of the stage, matching StageScale, so an
 * undo taken before the stage was redrawn still lands in the right place.
 */
window.PlotHistory = (function () {
    'use strict';

    const LIMIT = 60;

    let past = [];
    let future = [];
    let current = null;
    let muted = false;          // set while we are the ones changing the DOM
    const listeners = [];

    const dropZone = () => document.getElementById('dropZone');

    /* ---------------- reading the plot ---------------- */

    function fractionOf(node) {
        const dz = dropZone();
        if (!dz || !dz.clientWidth) return { fx: 0, fy: 0 };
        if (node.dataset.fx !== undefined) {
            return { fx: parseFloat(node.dataset.fx), fy: parseFloat(node.dataset.fy) };
        }
        const left = parseFloat(node.style.left) || 0;
        const top = parseFloat(node.style.top) || 0;
        return {
            fx: (left + node.offsetWidth / 2) / dz.clientWidth,
            fy: (top + node.offsetHeight / 2) / dz.clientHeight
        };
    }

    function snapshot() {
        const dz = dropZone();
        if (!dz) return null;

        const items = [];
        dz.querySelectorAll('.eqOnStage').forEach((node) => {
            const f = fractionOf(node);
            items.push({
                eid: node.dataset.eid,
                uid: node.dataset.uid,
                fx: f.fx,
                fy: f.fy,
                scale: parseFloat(node.dataset.itemScale || '1') || 1,
                rot: parseFloat(node.getAttribute('data-rotation') || '0') || 0
            });
        });

        const texts = [];
        dz.querySelectorAll('.textAdded').forEach((node) => {
            const f = fractionOf(node);
            texts.push({
                text: node.textContent,
                uid: node.dataset.uid,
                fx: f.fx,
                fy: f.fy,
                rot: parseFloat(node.dataset.rotation || '0') || 0
            });
        });

        // draw.js keeps its strokes in a script-scoped `lines` array
        let strokes = [];
        if (typeof lines !== 'undefined' && Array.isArray(lines)) {
            strokes = lines.map((l) => ({
                color: l.color,
                width: l.width,
                points: l.points.map((p) => ({ x: p.x, y: p.y }))
            }));
        }

        return JSON.stringify({ items, texts, strokes });
    }

    /* ---------------- writing it back ---------------- */

    function place(node, fx, fy) {
        const dz = dropZone();
        node.dataset.fx = fx;
        node.dataset.fy = fy;
        node.style.left = (fx * dz.clientWidth - node.offsetWidth / 2) + 'px';
        node.style.top = (fy * dz.clientHeight - node.offsetHeight / 2) + 'px';
    }

    function restore(json) {
        const dz = dropZone();
        if (!dz || !json) return;
        const state = JSON.parse(json);

        muted = true;
        if (window.Selection) window.Selection.clear();

        dz.querySelectorAll('.eqOnStage, .textAdded').forEach((n) => n.remove());

        (state.items || []).forEach((rec) => {
            const item = window.EquipmentCatalog && window.EquipmentCatalog.get(rec.eid);
            if (!item) return;
            const node = window.StageScale.createStageElement(item);
            if (rec.uid) node.dataset.uid = rec.uid;
            node.dataset.itemScale = String(rec.scale);
            dz.appendChild(node);
            window.StageScale.resizeElement(node);
            if (rec.rot) {
                node.style.transform = 'rotate(' + rec.rot + 'deg)';
                node.setAttribute('data-rotation', rec.rot);
                window.StageScale.syncLabel(node);
            }
            place(node, rec.fx, rec.fy);
            if (typeof addDragListeners === 'function') addDragListeners(node);
        });

        (state.texts || []).forEach((rec) => {
            if (!window.StageText) return;
            const node = window.StageText.create({ text: rec.text, rotation: rec.rot, uid: rec.uid });
            dz.appendChild(node);
            place(node, rec.fx, rec.fy);
        });

        if (typeof lines !== 'undefined' && Array.isArray(lines)) {
            lines.length = 0;
            (state.strokes || []).forEach((s) => lines.push({
                color: s.color,
                width: s.width,
                points: s.points.map((p) => ({ x: p.x, y: p.y }))
            }));
            if (typeof redrawCanvas === 'function') redrawCanvas();
        }

        muted = false;
        notify();
    }

    /* ---------------- the stack ---------------- */

    function notify() {
        const state = { canUndo: past.length > 0, canRedo: future.length > 0 };
        listeners.forEach((fn) => { try { fn(state); } catch (e) { /* a listener's problem */ } });
    }

    /* Call after anything that changes the plot. Cheap enough to call freely:
       identical snapshots are dropped rather than stacked. */
    function record() {
        if (muted) return;
        const shot = snapshot();
        if (shot === null || shot === current) return;
        if (current !== null) {
            past.push(current);
            if (past.length > LIMIT) past.shift();
        }
        current = shot;
        future = [];
        notify();
    }

    function undo() {
        if (!past.length) return;
        future.push(current);
        current = past.pop();
        restore(current);
    }

    function redo() {
        if (!future.length) return;
        past.push(current);
        current = future.pop();
        restore(current);
    }

    function reset() {
        past = [];
        future = [];
        current = snapshot();
        notify();
    }

    function onChange(fn) { listeners.push(fn); }

    /* ---------------- keys ---------------- */

    function isTyping(el) {
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }

    document.addEventListener('keydown', (e) => {
        if (!(e.ctrlKey || e.metaKey)) return;
        if (isTyping(document.activeElement)) return;
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    });

    document.addEventListener('DOMContentLoaded', () => {
        // the starting point, so the first change has something to go back to
        setTimeout(reset, 0);
    });

    return {
        record: record,
        undo: undo,
        redo: redo,
        reset: reset,
        onChange: onChange,
        isRestoring: () => muted,
        /* scenes.js keeps a scene as one of these snapshots, and puts it back
           on the stage the same way an undo does. */
        snapshot: snapshot,
        restore: restore,
        empty: () => JSON.stringify({ items: [], texts: [], strokes: [] })
    };
})();

/* scenes.js — several looks of the same stage, kept in one show document.
 *
 * A scene is one plot: the gear, the labels and the pen strokes, stored as the
 * same snapshot history.js already uses for undo. Switching scenes puts that
 * snapshot back on the stage, so nothing else in the app has to know that more
 * than one plot exists.
 *
 * Between two scenes sits a shift: the work the crew does in the change. Its
 * list is never typed by hand — it is the difference between the two snapshots,
 * so it cannot drift out of step with the plots. What a difference cannot know
 * is the order the work happened in, so every piece taken off or put on is
 * logged as you do it, and that log orders the list. Anything the log does not
 * cover falls in behind it, and the order can be dragged into shape by hand.
 */
window.Scenes = (function () {
    'use strict';

    const STORE_KEY = 'stageplanner.show.v1';
    const MOVE_MIN_M = 0.2;       // under this it is a nudge on the drawing, not a move on stage
    const TURN_MIN_DEG = 5;

    const DETAIL_IDS = ['playNameInput', 'playMixerInput', 'playQLabInput',
                        'playLiveprofessorInput', 'playChecklist', 'playComments'];

    let scenes = [];
    let active = 0;
    let quietDepth = 0;      // >0 while we are the ones rewriting the stage
    let previewing = false;  // the export is stepping through the scenes
    let renaming = false;    // a chip is being typed into, so leave the strip alone
    let observer = null;
    let ready = false;
    let saveTimer = null;
    let dragFrom = -1;       // the row being dragged in the shift editor
    let shiftIndex = -1;     // the shift the editor is open on
    const saveListeners = [];  // showSync.js: hears every save, and why
    let readyQueue = [];       // waiting for the stored show to be back on the stage

    const byId = (id) => document.getElementById(id);
    const fmt1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
    const fmt2 = (v) => (Math.round(v * 100) / 100).toFixed(2);

    /* ---------------- the show ---------------- */

    function blankShift() {
        return { name: '', time: '', note: '', log: [], order: null, notes: {} };
    }

    function blankScene(name, plot) {
        return {
            name: name || '',
            plot: plot || window.PlotHistory.empty(),
            shift: blankShift()
        };
    }

    // Storage can hand back anything, so rebuild a known-good shape from it.
    function cleanScene(raw) {
        raw = raw || {};
        const s = blankScene('', typeof raw.plot === 'string' ? raw.plot : null);
        if (typeof raw.name === 'string') s.name = raw.name;
        const sh = raw.shift || {};
        s.shift.name = typeof sh.name === 'string' ? sh.name : '';
        s.shift.time = typeof sh.time === 'string' ? sh.time : '';
        s.shift.note = typeof sh.note === 'string' ? sh.note : '';
        s.shift.log = Array.isArray(sh.log) ? sh.log.slice() : [];
        s.shift.order = Array.isArray(sh.order) ? sh.order.slice() : null;
        s.shift.notes = (sh.notes && typeof sh.notes === 'object') ? sh.notes : {};
        return s;
    }

    function sceneLabel(i) {
        const s = scenes[i];
        return s && s.name ? s.name : 'Scene ' + (i + 1);
    }

    /* ---------------- reading and writing the stage ---------------- */

    /* Our own rewrites of the stage must not be mistaken for stage work.
       takeRecords drops what the observer has queued but not yet delivered. */
    function quiet(fn) {
        quietDepth += 1;
        try { fn(); }
        finally {
            if (observer) observer.takeRecords();
            quietDepth -= 1;
        }
    }

    function commit() {
        if (!ready || previewing || !scenes[active]) return;
        const shot = window.PlotHistory.snapshot();
        if (shot) scenes[active].plot = shot;
    }

    function show(i) {
        if (!scenes[i]) return;
        quiet(() => window.PlotHistory.restore(scenes[i].plot));
    }

    /* ---------------- storage ---------------- */

    function readDetails() {
        const out = {};
        DETAIL_IDS.forEach((id) => {
            const node = byId(id);
            if (node) out[id] = node.value;
        });
        return out;
    }

    function writeDetails(details) {
        if (!details) return;
        DETAIL_IDS.forEach((id) => {
            const node = byId(id);
            if (node && typeof details[id] === 'string') node.value = details[id];
        });
    }

    function clearDetails() {
        DETAIL_IDS.forEach((id) => {
            const node = byId(id);
            if (node) node.value = '';
        });
    }

    function save() {
        if (!ready || previewing) return;
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify({
                version: 1,
                active: active,
                details: readDetails(),
                scenes: scenes
            }));
        } catch (e) { /* private mode, or the quota is full */ }
        emit('edit');
    }

    // 'edit' for any save, 'new' and 'import' when the show is a different show.
    function emit(reason) {
        saveListeners.forEach((fn) => { try { fn(reason); } catch (e) { /* a listener's problem */ } });
    }

    // Called from anywhere the plot might have changed. Cheap to call freely.
    function persist() {
        if (!ready || previewing) return;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            commit();
            refreshStrip();
            save();
        }, 350);
    }

    /* ---------------- what changed between two scenes ---------------- */

    function itemsOf(scene) {
        let state;
        try { state = JSON.parse(scene.plot); } catch (e) { state = null; }
        const items = (state && state.items) || [];
        return items.map((rec, i) => ({
            key: rec.uid || ('legacy:' + rec.eid + ':' + i),
            eid: rec.eid,
            fx: rec.fx,
            fy: rec.fy,
            rot: rec.rot || 0,
            scale: rec.scale || 1
        }));
    }

    function itemLabel(rec) {
        const item = window.EquipmentCatalog && window.EquipmentCatalog.get(rec.eid);
        if (!item) return rec.eid || 'Item';
        if (item.mode !== 'real') return item.name;
        return item.name + ' · ' + fmt2(item.w * rec.scale) + ' × ' + fmt2(item.d * rec.scale) + ' m';
    }

    // The short way round, so 350° to 10° is a 20° turn rather than 340°.
    function angleDelta(a, b) {
        return ((b - a + 540) % 360) - 180;
    }

    /* The plan is drawn with the audience along the bottom edge and the side
       stages labelled L and R across the page, so a move is described in those
       same terms rather than in stage left and stage right. */
    function heading(dx, dy) {
        const dist = Math.hypot(dx, dy) || 1;
        const parts = [];
        if (Math.abs(dx) / dist > 0.35) parts.push(dx > 0 ? 'towards R' : 'towards L');
        if (Math.abs(dy) / dist > 0.35) parts.push(dy > 0 ? 'downstage' : 'upstage');
        return parts.join(' and ');
    }

    // Empty when the item may as well have stayed put.
    function moveDetail(was, now) {
        const dz = byId('dropZone');
        const ppm = window.StageScale ? window.StageScale.pxPerMeter() : 0;
        const bits = [];

        if (dz && ppm > 0) {
            const dx = ((now.fx - was.fx) * dz.clientWidth) / ppm;
            const dy = ((now.fy - was.fy) * dz.clientHeight) / ppm;
            const dist = Math.hypot(dx, dy);
            if (dist >= MOVE_MIN_M) {
                const where = heading(dx, dy);
                bits.push('moved ' + fmt1(dist) + ' m' + (where ? ' ' + where : ''));
            }
        }

        const turn = angleDelta(was.rot, now.rot);
        if (Math.abs(turn) >= TURN_MIN_DEG) bits.push('turned ' + Math.round(Math.abs(turn)) + '°');

        return bits.join(', ');
    }

    /* Consecutive identical steps read better as one line: four chairs carried
       on together are one job, not four. Only neighbours are merged, so the
       sequence of the work is left alone. */
    function group(events, notes) {
        const rows = [];
        events.forEach((ev) => {
            const last = rows[rows.length - 1];
            if (last && last.action === ev.action && last.eid === ev.eid && last.detail === ev.detail) {
                last.keys.push(ev.key);
                last.count += 1;
                return;
            }
            rows.push({
                action: ev.action,
                eid: ev.eid,
                label: ev.label,
                detail: ev.detail,
                keys: [ev.key],
                count: 1
            });
        });
        rows.forEach((r, i) => {
            r.num = i + 1;
            r.note = notes[r.keys[0]] || '';
        });
        return rows;
    }

    /* The shift that leads into scene i. The difference decides what is on the
       list; the recorded order decides what order it is read in. */
    function shiftRows(i) {
        if (i <= 0 || !scenes[i] || !scenes[i - 1]) return [];

        const before = itemsOf(scenes[i - 1]);
        const after = itemsOf(scenes[i]);
        const beforeBy = {};
        const afterBy = {};
        before.forEach((r) => { beforeBy[r.key] = r; });
        after.forEach((r) => { afterBy[r.key] = r; });

        const events = {};
        const natural = [];

        before.forEach((r) => {
            if (afterBy[r.key]) return;
            events[r.key] = { action: 'out', key: r.key, eid: r.eid, label: itemLabel(r), detail: '' };
            natural.push(r.key);
        });

        after.forEach((r) => {
            const was = beforeBy[r.key];
            if (!was) {
                events[r.key] = { action: 'in', key: r.key, eid: r.eid, label: itemLabel(r), detail: '' };
                natural.push(r.key);
                return;
            }
            const detail = moveDetail(was, r);
            if (!detail) return;
            events[r.key] = { action: 'moved', key: r.key, eid: r.eid, label: itemLabel(r), detail: detail };
            natural.push(r.key);
        });

        const shift = scenes[i].shift || (scenes[i].shift = blankShift());
        const seq = [];
        const seen = {};
        const take = (key) => {
            if (!events[key] || seen[key]) return;
            seen[key] = true;
            seq.push(events[key]);
        };
        (shift.order || []).forEach(take);   // dragged into shape by hand
        (shift.log || []).forEach(take);     // the order the work was done in
        natural.forEach(take);               // whatever is left over

        return group(seq, shift.notes || {});
    }

    function shiftTally(i) {
        const tally = { out: 0, in: 0, moved: 0 };
        shiftRows(i).forEach((r) => { tally[r.action] += r.count; });
        return tally;
    }

    /* ---------------- logging the order the work was done in ---------------- */

    function watchPlot() {
        const dz = byId('dropZone');
        if (!dz || typeof MutationObserver === 'undefined') return;

        observer = new MutationObserver((records) => {
            if (quietDepth > 0 || previewing) return;
            const shift = scenes[active] && scenes[active].shift;
            if (!shift) return;

            const note = (node) => {
                if (!node || node.nodeType !== 1 || !node.classList) return;
                if (!node.classList.contains('eqOnStage')) return;
                const uid = node.dataset.uid;
                if (!uid || shift.log.indexOf(uid) !== -1) return;
                shift.log.push(uid);
            };

            records.forEach((rec) => {
                Array.prototype.forEach.call(rec.removedNodes, note);
                Array.prototype.forEach.call(rec.addedNodes, note);
            });
            persist();
        });

        observer.observe(dz, { childList: true });
    }

    /* ---------------- the strip along the bottom ---------------- */

    function el(tag, cls, text) {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function tallyText(t) {
        const parts = [];
        if (t.out) parts.push('−' + t.out);
        if (t.in) parts.push('+' + t.in);
        if (t.moved) parts.push('↷' + t.moved);
        return parts.length ? parts.join(' ') : 'no change';
    }

    function sceneChip(i) {
        const chip = el('div', 'sceneChip' + (i === active ? ' is-active' : ''));
        chip.dataset.index = String(i);
        chip.title = 'Scene ' + (i + 1) + ' — click to open, double-click to rename';
        chip.appendChild(el('span', 'sceneNum', String(i + 1)));
        chip.appendChild(el('span', 'sceneName', sceneLabel(i)));

        const menu = el('button', 'sceneMenuBtn', '⋯');
        menu.type = 'button';
        menu.title = 'Rename, duplicate, reorder or delete this scene';
        menu.dataset.menu = String(i);
        chip.appendChild(menu);
        return chip;
    }

    function shiftChip(i) {
        const shift = scenes[i].shift || blankShift();
        const chip = el('div', 'shiftChip');
        chip.dataset.shift = String(i);
        chip.title = 'Shift from ' + sceneLabel(i - 1) + ' into ' + sceneLabel(i);
        chip.appendChild(el('span', 'shiftGlyph', '⇄'));

        const body = el('div', 'shiftChipBody');
        body.appendChild(el('span', 'shiftChipName', shift.name || 'Shift'));
        body.appendChild(el('span', 'shiftChipMeta',
            tallyText(shiftTally(i)) + (shift.time ? ' · ' + shift.time : '')));
        chip.appendChild(body);
        return chip;
    }

    /* Which scene is open is a class, not a rebuild. Replacing the chips under
       a click would split the pair of clicks a rename needs, so the strip is
       only rebuilt when what it says has actually changed. */
    function markActive() {
        const track = byId('sceneTrack');
        if (!track) return;
        track.querySelectorAll('.sceneChip').forEach((chip) => {
            chip.classList.toggle('is-active', parseInt(chip.dataset.index, 10) === active);
        });

        const current = track.querySelector('.sceneChip.is-active');
        // Scroll the strip alone. scrollIntoView also scrolls every box around
        // it, the page included, which on a phone can push the top bar away.
        if (current) {
            const strip = track.getBoundingClientRect();
            const chip = current.getBoundingClientRect();
            if (chip.left < strip.left) track.scrollLeft -= strip.left - chip.left;
            else if (chip.right > strip.right) track.scrollLeft += chip.right - strip.right;
        }

        const count = byId('sceneCount');
        if (count) {
            count.textContent = scenes.length === 1
                ? '1 scene'
                : scenes.length + ' scenes · ' + (active + 1) + ' open';
        }
    }

    let stripSignature = '';

    function refreshStrip() {
        const track = byId('sceneTrack');
        if (!track || renaming) return;

        // Everything the strip puts on screen, minus which scene is open.
        const shape = scenes.map((scene, i) => [
            sceneLabel(i),
            i > 0 ? [scene.shift.name, scene.shift.time, tallyText(shiftTally(i))] : 0
        ]);
        const signature = JSON.stringify(shape);

        if (signature !== stripSignature) {
            stripSignature = signature;
            track.innerHTML = '';
            scenes.forEach((scene, i) => {
                if (i > 0) track.appendChild(shiftChip(i));
                track.appendChild(sceneChip(i));
            });
        }
        markActive();
    }

    /* ---------------- moving between scenes ---------------- */

    function activate(i) {
        if (i < 0 || i >= scenes.length || i === active || previewing) return;
        commit();
        active = i;
        show(i);
        window.PlotHistory.reset();     // undo does not reach back into another scene
        if (window.Selection) window.Selection.clear();
        markActive();
        save();
    }

    function addScene(opts) {
        opts = opts || {};
        commit();
        const at = (opts.at === undefined) ? active + 1 : opts.at;
        const plot = opts.blank ? window.PlotHistory.empty() : scenes[active].plot;
        scenes.splice(at, 0, blankScene('', plot));
        active = at;
        show(at);
        window.PlotHistory.reset();
        if (window.Selection) window.Selection.clear();
        refreshStrip();
        save();
    }

    function removeScene(i) {
        if (scenes.length < 2 || !scenes[i]) return;
        if (!confirm('Delete ' + sceneLabel(i) + '? The shift into it goes with it.')) return;
        scenes.splice(i, 1);
        active = Math.min(active > i ? active - 1 : active, scenes.length - 1);
        show(active);
        window.PlotHistory.reset();
        refreshStrip();
        save();
    }

    function moveScene(from, to) {
        if (to < 0 || to >= scenes.length || from === to) return;
        commit();
        const moved = scenes.splice(from, 1)[0];
        scenes.splice(to, 0, moved);
        if (active === from) active = to;
        else if (from < active && to >= active) active -= 1;
        else if (from > active && to <= active) active += 1;
        refreshStrip();
        save();
    }

    /* Rename in place on the chip, rather than in a dialog of its own. */
    function startRename(i, chip) {
        const span = chip.querySelector('.sceneName');
        if (!span || renaming) return;
        renaming = true;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'sceneRename';
        input.value = scenes[i].name || '';
        input.placeholder = 'Scene ' + (i + 1);
        span.replaceWith(input);
        input.focus();
        input.select();

        const finish = (keep) => {
            if (!renaming) return;
            renaming = false;
            if (keep) scenes[i].name = input.value.trim();
            refreshStrip();
            save();
        };

        input.addEventListener('blur', () => finish(true));
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('dblclick', (e) => e.stopPropagation());
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); finish(true); }
            else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
        });
    }

    /* ---------------- the menu on a scene chip ---------------- */

    let sceneMenu = null;

    function closeSceneMenu() {
        if (sceneMenu) { sceneMenu.remove(); sceneMenu = null; }
    }

    function openSceneMenu(i, anchor) {
        closeSceneMenu();
        const menu = el('div', 'sceneMenu');

        const add = (label, fn, disabled) => {
            const btn = el('button', 'sceneMenuItem', label);
            btn.type = 'button';
            btn.disabled = !!disabled;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeSceneMenu();
                fn();
            });
            menu.appendChild(btn);
        };

        add('Rename', () => {
            const chip = document.querySelector('.sceneChip[data-index="' + i + '"]');
            if (chip) startRename(i, chip);
        });
        add('Duplicate', () => { activate(i); addScene({ at: i + 1 }); });
        add('Insert empty scene after', () => { activate(i); addScene({ at: i + 1, blank: true }); });
        add('Move left', () => moveScene(i, i - 1), i === 0);
        add('Move right', () => moveScene(i, i + 1), i === scenes.length - 1);
        add('Delete', () => removeScene(i), scenes.length < 2);
        menu.lastChild.classList.add('isDanger');

        document.body.appendChild(menu);
        const rect = anchor.getBoundingClientRect();
        menu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
        menu.style.top = Math.max(8, rect.top - menu.offsetHeight - 6) + 'px';
        sceneMenu = menu;
    }

    /* ---------------- the shift editor ---------------- */

    function openShift(i) {
        if (i <= 0 || !scenes[i]) return;
        commit();
        shiftIndex = i;
        const shift = scenes[i].shift;

        byId('shiftDialogTitle').textContent = shift.name || 'Shift';
        byId('shiftLead').textContent = 'From ' + sceneLabel(i - 1) + ' into ' + sceneLabel(i);
        byId('shiftNameInput').value = shift.name || '';
        byId('shiftTimeInput').value = shift.time || '';
        byId('shiftNote').value = shift.note || '';
        renderShiftRows();
        byId('shiftDialog').hidden = false;
        byId('shiftNameInput').focus();
    }

    function closeShift() {
        byId('shiftDialog').hidden = true;
        shiftIndex = -1;
        refreshStrip();
        save();
    }

    const TAGS = { out: 'OUT', in: 'IN', moved: 'MOVED' };

    function renderShiftRows() {
        const host = byId('shiftList');
        if (!host || shiftIndex < 0) return;

        const rows = shiftRows(shiftIndex);
        host.innerHTML = '';

        if (!rows.length) {
            host.appendChild(el('div', 'shiftEmpty',
                'Nothing changes between these two scenes yet. Open the later scene and move, add or take away gear.'));
            return;
        }

        rows.forEach((row, index) => {
            const node = el('div', 'shiftRow is-' + row.action);
            node.draggable = true;
            node.dataset.index = String(index);

            node.appendChild(el('span', 'shiftRowNum', String(row.num)));
            node.appendChild(el('span', 'shiftRowTag', TAGS[row.action]));

            const text = el('div', 'shiftRowText');
            text.appendChild(el('span', 'shiftRowLabel',
                (row.count > 1 ? row.count + '× ' : '') + row.label));
            if (row.detail) text.appendChild(el('span', 'shiftRowDetail', row.detail));
            node.appendChild(text);

            const note = document.createElement('input');
            note.type = 'text';
            note.className = 'shiftRowNote';
            note.placeholder = 'note';
            note.value = row.note;
            note.addEventListener('input', () => {
                const shift = scenes[shiftIndex].shift;
                if (note.value) shift.notes[row.keys[0]] = note.value;
                else delete shift.notes[row.keys[0]];
                save();
            });
            note.addEventListener('mousedown', (e) => e.stopPropagation());
            node.appendChild(note);

            node.appendChild(el('span', 'shiftRowGrip', '⠿'));
            host.appendChild(node);
        });
    }

    /* Dragging a row rewrites the whole order, so the hand-made sequence wins
       from then on. "Recorded order" hands it back to the one that was logged. */
    function bindShiftReorder() {
        const host = byId('shiftList');
        if (!host) return;

        host.addEventListener('dragstart', (e) => {
            const row = e.target.closest('.shiftRow');
            if (!row) return;
            dragFrom = parseInt(row.dataset.index, 10);
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', 'reorder'); } catch (err) { /* older browsers */ }
            row.classList.add('isDragging');
        });

        host.addEventListener('dragend', (e) => {
            const row = e.target.closest('.shiftRow');
            if (row) row.classList.remove('isDragging');
            dragFrom = -1;
        });

        host.addEventListener('dragover', (e) => {
            if (dragFrom < 0) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        host.addEventListener('drop', (e) => {
            if (dragFrom < 0 || shiftIndex < 0) return;
            e.preventDefault();
            const rows = shiftRows(shiftIndex);
            const target = e.target.closest('.shiftRow');
            const to = target ? parseInt(target.dataset.index, 10) : rows.length - 1;
            const moved = rows.splice(dragFrom, 1)[0];
            rows.splice(to, 0, moved);
            dragFrom = -1;

            const order = [];
            rows.forEach((r) => r.keys.forEach((k) => order.push(k)));
            scenes[shiftIndex].shift.order = order;
            renderShiftRows();
            save();
        });
    }

    /* ---------------- starting over ---------------- */

    /* A new show is one empty scene and no details. The equipment storage and
       the stage are not the show's to throw away: the rail is the kit you work
       from, and the stage is the room you are in, both of which outlast any one
       show. Undo does not reach back past this, so it is asked for first. */
    function newShow() {
        if (!confirm('Start a new show? Every scene and everything on the stage goes. Your equipment storage and the stage stay as they are.')) return;
        scenes = [blankScene('', window.PlotHistory.empty())];
        active = 0;
        clearDetails();
        show(0);
        window.PlotHistory.reset();
        if (window.Selection) window.Selection.clear();
        refreshStrip();
        emit('new');
        save();
        if (window.TopBar) window.TopBar.closeMenus();   // the cleared stage is the answer
    }

    /* ---------------- the show as a file ---------------- */

    function exportShow() {
        commit();
        const details = readDetails();
        const payload = {
            stageplanner: 'show',
            version: 1,
            details: details,
            scenes: scenes
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (details.playNameInput || 'untitled show')
            .replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '-show.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    function importShow() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                let data;
                try { data = JSON.parse(reader.result); } catch (err) { data = null; }
                if (!data || !Array.isArray(data.scenes) || !data.scenes.length) {
                    alert('That file is not a show.');
                    return;
                }
                if (!confirm('Open this show? What is on the stage now is replaced.')) return;
                scenes = data.scenes.map(cleanScene);
                active = 0;
                writeDetails(data.details);
                show(0);
                window.PlotHistory.reset();
                refreshStrip();
                emit('import');
                save();
            };
            reader.readAsText(file);
        });
        input.click();
    }

    /* ---------------- the show as a document ---------------- */

    /* What showSync.js puts in the account: the same shape as the show file,
       as a copy, so nothing done to it reaches back into the live show. */
    function toDocument() {
        commit();
        return JSON.parse(JSON.stringify({
            stageplanner: 'show',
            version: 1,
            details: readDetails(),
            scenes: scenes
        }));
    }

    // Replaces the show without asking: the caller has already asked.
    function openDocument(doc) {
        if (!ready || !doc || !Array.isArray(doc.scenes) || !doc.scenes.length) return false;
        scenes = doc.scenes.map(cleanScene);
        active = 0;
        clearDetails();
        writeDetails(doc.details);
        show(0);
        window.PlotHistory.reset();
        if (window.Selection) window.Selection.clear();
        refreshStrip();
        save();
        return true;
    }

    /* ---------------- wiring ---------------- */

    function isTyping(node) {
        if (!node) return false;
        const tag = node.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
    }

    function bindStrip() {
        const track = byId('sceneTrack');
        if (!track) return;

        track.addEventListener('click', (e) => {
            const menuBtn = e.target.closest('.sceneMenuBtn');
            if (menuBtn) {
                e.stopPropagation();
                openSceneMenu(parseInt(menuBtn.dataset.menu, 10), menuBtn);
                return;
            }
            const shift = e.target.closest('.shiftChip');
            if (shift) { openShift(parseInt(shift.dataset.shift, 10)); return; }
            const chip = e.target.closest('.sceneChip');
            if (chip) activate(parseInt(chip.dataset.index, 10));
        });

        track.addEventListener('dblclick', (e) => {
            const chip = e.target.closest('.sceneChip');
            if (!chip) return;
            e.preventDefault();
            startRename(parseInt(chip.dataset.index, 10), chip);
        });

        const addBtn = byId('sceneAddBtn');
        if (addBtn) addBtn.addEventListener('click', () => addScene({}));

        document.addEventListener('click', closeSceneMenu);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeSceneMenu();
            if (!e.ctrlKey || e.shiftKey || e.altKey || isTyping(document.activeElement)) return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); activate(active - 1); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); activate(active + 1); }
        });
    }

    function bindShiftDialog() {
        const dialog = byId('shiftDialog');
        if (!dialog) return;

        const field = (id, key) => {
            const node = byId(id);
            if (!node) return;
            node.addEventListener('input', () => {
                if (shiftIndex < 0) return;
                scenes[shiftIndex].shift[key] = node.value;
                if (key === 'name') byId('shiftDialogTitle').textContent = node.value || 'Shift';
                save();
            });
        };
        field('shiftNameInput', 'name');
        field('shiftTimeInput', 'time');
        field('shiftNote', 'note');

        byId('shiftResetOrder').addEventListener('click', () => {
            if (shiftIndex < 0) return;
            scenes[shiftIndex].shift.order = null;
            renderShiftRows();
            save();
        });

        byId('shiftDone').addEventListener('click', closeShift);
        dialog.querySelector('.modalClose').addEventListener('click', closeShift);
        dialog.addEventListener('click', (e) => { if (e.target === dialog) closeShift(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !dialog.hidden) closeShift();
        });

        bindShiftReorder();
    }

    function bindShowFile() {
        const newBtn = byId('showNewBtn');
        const saveBtn = byId('showSaveFileBtn');
        const openBtn = byId('showOpenFileBtn');
        if (newBtn) newBtn.addEventListener('click', newShow);
        if (saveBtn) saveBtn.addEventListener('click', exportShow);
        if (openBtn) openBtn.addEventListener('click', importShow);
    }

    function init() {
        if (!window.PlotHistory || !byId('sceneTrack')) return;

        let stored = null;
        try { stored = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { stored = null; }

        if (stored && Array.isArray(stored.scenes) && stored.scenes.length) {
            scenes = stored.scenes.map(cleanScene);
            active = Math.min(Math.max(0, parseInt(stored.active, 10) || 0), scenes.length - 1);
            writeDetails(stored.details);
        } else {
            // Whatever is already on the stage becomes the first scene.
            scenes = [blankScene('', window.PlotHistory.snapshot())];
            active = 0;
        }

        ready = true;
        bindStrip();
        bindShiftDialog();
        bindShowFile();
        watchPlot();

        if (stored) show(active);
        window.PlotHistory.reset();
        refreshStrip();

        window.PlotHistory.onChange(persist);
        DETAIL_IDS.forEach((id) => {
            const node = byId(id);
            if (node) node.addEventListener('input', persist);
        });

        const waiting = readyQueue;
        readyQueue = null;
        waiting.forEach((fn) => { try { fn(); } catch (e) { /* a caller's problem */ } });
    }

    // After stageBuilder has drawn the stage: positions are held as fractions
    // of it, so it needs its final size before a plot is put back on it. A page
    // opened in a background tab is never painted and so never gets a frame,
    // so a timer stands behind the frame and whichever arrives first starts us.
    document.addEventListener('DOMContentLoaded', () => {
        let started = false;
        const start = () => {
            if (started) return;
            started = true;
            init();
        };
        requestAnimationFrame(() => requestAnimationFrame(start));
        setTimeout(start, 120);
    });

    return {
        count: () => scenes.length,
        activeIndex: () => active,
        label: sceneLabel,
        shift: (i) => (scenes[i] && scenes[i].shift) || blankShift(),
        shiftRows: shiftRows,
        go: activate,
        commit: commit,
        document: toDocument,
        open: openDocument,
        onSave: (fn) => { saveListeners.push(fn); },
        whenReady: (fn) => { if (readyQueue) readyQueue.push(fn); else fn(); },

        /* The export walks every scene across the stage to photograph it. While
           it does, nothing is written back into the scene it started on. */
        beginPreview: () => { commit(); previewing = true; },
        preview: (i) => { if (previewing) show(i); },
        endPreview: () => {
            previewing = false;
            show(active);
            refreshStrip();
        }
    };
})();

/* Stage definition — describe a venue in meters (main stage, side stages,
   backstage, orchestra pit), draw it to scale and keep it in localStorage. */
(() => {
    'use strict';

    const STORE_KEY = 'stageplanner.stages.v1';
    const ACTIVE_KEY = 'stageplanner.activeStage.v1';
    const MIN_M = 0.5;
    const MAX_M = 100;
    const MARGIN_PX = 60; // breathing room around the plan inside the stage area
    /* A strip of house below the plan, tall enough for the AUDIENCE label to
       sit in. The audience is in front of everything the stage has, the pit
       included, so the label is never allowed onto a drawn region. In pixels
       rather than meters because it is sized by the type in it, and the box it
       is added to is clipped, so a label outside would simply be cut off. */
    const HOUSE_PX = 24;

    const byId = (id) => document.getElementById(id);
    const px = (n) => `${n}px`;
    const fmt = (n) => String(Number(n.toFixed(2)));

    // Pixels per meter of the stage currently on screen, or null before one
    // has been drawn. Equipment sizing reads this so gear matches the stage.
    let currentScale = null;

    // The stage currently drawn, or null before the first one.
    let activeConfig = null;

    function notifyScaleChange() {
        if (window.StageScale) window.StageScale.applyAll();
    }

    const TOGGLES = [
        ['sideLOn', ['sideLW', 'sideLD']],
        ['sideROn', ['sideRW', 'sideRD']],
        ['backOn', ['backW', 'backD']],
        ['pitOn', ['pitW', 'pitD']]
    ];

    function defaultConfig() {
        return {
            name: '',
            main:  { width: 12, depth: 10 },
            sideL: { enabled: false, width: 6, depth: 8 },
            sideR: { enabled: false, width: 6, depth: 8 },
            // the room behind the back wall, as wide as the deck it serves
            back:  { enabled: false, width: 12, depth: 4 },
            pit:   { enabled: false, width: 10, depth: 3 }
        };
    }

    // Storage can hand back anything, so rebuild a known-good shape from it.
    function normalise(raw) {
        const base = defaultConfig();
        if (!raw || typeof raw !== 'object') return base;
        const part = (key) => {
            const src = raw[key] || {};
            return {
                enabled: !!src.enabled,
                width: clamp(src.width, base[key].width),
                depth: clamp(src.depth, base[key].depth)
            };
        };
        return {
            name: typeof raw.name === 'string' ? raw.name : '',
            main: { width: clamp((raw.main || {}).width, base.main.width),
                    depth: clamp((raw.main || {}).depth, base.main.depth) },
            sideL: part('sideL'),
            sideR: part('sideR'),
            // stages saved before there was a backstage simply have none
            back: part('back'),
            pit: part('pit')
        };
    }

    function clamp(value, fallback) {
        const n = parseFloat(value);
        if (!isFinite(n)) return fallback;
        return Math.min(MAX_M, Math.max(MIN_M, n));
    }

    /* ---------- form <-> config ---------- */

    function field(id, fallback) {
        return clamp(byId(id).value, fallback);
    }

    function readForm() {
        const d = defaultConfig();
        return {
            name: byId('stageNameInput').value.trim(),
            main:  { width: field('mainW', d.main.width), depth: field('mainD', d.main.depth) },
            sideL: { enabled: byId('sideLOn').checked, width: field('sideLW', d.sideL.width), depth: field('sideLD', d.sideL.depth) },
            sideR: { enabled: byId('sideROn').checked, width: field('sideRW', d.sideR.width), depth: field('sideRD', d.sideR.depth) },
            back:  { enabled: byId('backOn').checked,  width: field('backW', d.back.width),   depth: field('backD', d.back.depth) },
            pit:   { enabled: byId('pitOn').checked,   width: field('pitW', d.pit.width),     depth: field('pitD', d.pit.depth) }
        };
    }

    function writeForm(cfg) {
        byId('stageNameInput').value = cfg.name || '';
        byId('mainW').value = cfg.main.width;
        byId('mainD').value = cfg.main.depth;
        byId('sideLOn').checked = cfg.sideL.enabled;
        byId('sideLW').value = cfg.sideL.width;
        byId('sideLD').value = cfg.sideL.depth;
        byId('sideROn').checked = cfg.sideR.enabled;
        byId('sideRW').value = cfg.sideR.width;
        byId('sideRD').value = cfg.sideR.depth;
        byId('backOn').checked = cfg.back.enabled;
        byId('backW').value = cfg.back.width;
        byId('backD').value = cfg.back.depth;
        byId('pitOn').checked = cfg.pit.enabled;
        byId('pitW').value = cfg.pit.width;
        byId('pitD').value = cfg.pit.depth;
        syncDisabled();
    }

    function syncDisabled() {
        TOGGLES.forEach(([box, fields]) => {
            const on = byId(box).checked;
            fields.forEach((id) => { byId(id).disabled = !on; });
        });
    }

    /* ---------- drawing ---------- */

    // Lay the plan out in meters first, then scale the whole thing to fit.
    function layout(cfg) {
        const L = cfg.sideL.enabled ? cfg.sideL : null;
        const R = cfg.sideR.enabled ? cfg.sideR : null;
        const B = cfg.back.enabled ? cfg.back : null;
        const P = cfg.pit.enabled ? cfg.pit : null;

        const leftW = L ? L.width : 0;
        const deckW = leftW + cfg.main.width + (R ? R.width : 0);
        // Everything upstage shares one front edge — the proscenium line.
        const deckD = Math.max(cfg.main.depth, L ? L.depth : 0, R ? R.depth : 0);

        /* The backstage is behind the back wall, so it is drawn above the deck
           and pushes the whole plan down the page by its own depth. Measuring
           from the front edge instead of from the top of the box keeps every
           other region where it was. */
        const front = (B ? B.depth : 0) + deckD;

        const backX = B ? leftW + (cfg.main.width - B.width) / 2 : 0;
        const pitX = P ? leftW + (cfg.main.width - P.width) / 2 : 0;
        // A pit or a backstage wider than the deck hangs off the sides, so grow
        // the box for it.
        const minX = Math.min(0, B ? backX : 0, P ? pitX : 0);
        const maxX = Math.max(deckW, B ? backX + B.width : 0, P ? pitX + P.width : 0);
        const ox = -minX;

        const regions = [];
        if (B) regions.push({ kind: 'backstage', label: 'Backstage', x: ox + backX, y: 0, w: B.width, h: B.depth });
        if (L) regions.push({ kind: 'sideStage', label: 'Side stage L', x: ox, y: front - L.depth, w: L.width, h: L.depth });
        regions.push({ kind: 'mainStage', label: 'Main stage', x: ox + leftW, y: front - cfg.main.depth, w: cfg.main.width, h: cfg.main.depth });
        if (R) regions.push({ kind: 'sideStage', label: 'Side stage R', x: ox + leftW + cfg.main.width, y: front - R.depth, w: R.width, h: R.depth });
        if (P) regions.push({ kind: 'orchestraPit', label: 'Orchestra pit', x: ox + pitX, y: front, w: P.width, h: P.depth });

        return {
            regions,
            totalW: maxX - minX,
            totalD: front + (P ? P.depth : 0),
            front,
            centreX: ox + leftW + cfg.main.width / 2,
            main: { x: ox + leftW, y: front - cfg.main.depth, h: cfg.main.depth }
        };
    }

    function fitScale(widthM, depthM) {
        const holder = document.querySelector('.stageContainer');
        const boxW = holder.clientWidth || 900;
        const boxH = holder.clientHeight || 700;
        // Breathing room is a luxury of a big screen. On a phone the stage
        // needs the width more than it needs a margin, and the floors come
        // down with it so a small screen is not asked to show 320px.
        const margin = boxW < 560 ? 10 : MARGIN_PX;
        const floor = boxW < 560 ? 180 : 320;
        const availW = Math.max(floor, boxW - margin);
        // the house strip is added to the drawn height, so the plan is fitted
        // into what is left once it has been taken out
        const availH = Math.max(Math.round(floor * 0.875), boxH - margin - HOUSE_PX);
        return Math.min(availW / widthM, availH / depthM);
    }

    function box(className, rect, scale) {
        const node = document.createElement('div');
        node.className = className;
        node.style.left = px(Math.round(rect.x * scale));
        node.style.top = px(Math.round(rect.y * scale));
        node.style.width = px(Math.round(rect.w * scale));
        node.style.height = px(Math.round(rect.h * scale));
        return node;
    }

    function chip(className, text) {
        const node = document.createElement('div');
        node.className = className;
        node.textContent = text;
        return node;
    }

    // A 1 m grid anchored to the two datums a tech reads off: the centre
    // line and the front edge of the deck.
    function gridLayer(plan, scale, planH) {
        const layer = document.createElement('div');
        layer.className = 'stageGrid';
        // stop the squares at the front edge of the plan; the house below it is
        // not stage and is not measured
        layer.style.height = px(planH);

        const vertical = (xM) => {
            const line = document.createElement('div');
            line.className = 'gridLine vertical';
            line.style.left = px(Math.round(xM * scale));
            layer.appendChild(line);
        };
        const horizontal = (yM) => {
            const line = document.createElement('div');
            line.className = 'gridLine horizontal';
            line.style.top = px(Math.round(yM * scale));
            layer.appendChild(line);
        };

        for (let m = plan.centreX % 1; m < plan.totalW; m += 1) vertical(m);
        for (let y = plan.front; y > 0; y -= 1) horizontal(y);
        for (let y = plan.front + 1; y < plan.totalD; y += 1) horizontal(y);

        return layer;
    }

    function render(cfg) {
        const stage = byId('stage');
        const geo = byId('stageGeometry');
        if (!stage || !geo) return;

        const plan = layout(cfg);
        const scale = fitScale(plan.totalW, plan.totalD);
        const boxW = Math.round(plan.totalW * scale);
        const planH = Math.round(plan.totalD * scale);
        const boxH = planH + HOUSE_PX;

        geo.innerHTML = '';
        stage.classList.add('customStage');
        stage.style.width = px(boxW);
        stage.style.height = px(boxH);
        stage.style.aspectRatio = 'auto';
        stage.style.resize = 'none';

        // Fills first, then the grid over them, then borders and labels on top.
        plan.regions.forEach((r) => geo.appendChild(box(`regionFill ${r.kind}`, r, scale)));
        geo.appendChild(gridLayer(plan, scale, planH));
        plan.regions.forEach((r) => {
            const outline = box(`regionOutline ${r.kind}`, r, scale);
            outline.appendChild(chip('regionLabel', `${r.label} · ${fmt(r.w)} × ${fmt(r.h)} m`));
            geo.appendChild(outline);
        });

        const centre = document.createElement('div');
        centre.className = 'centreLine';
        centre.style.left = px(Math.round(plan.centreX * scale));
        centre.style.top = px(Math.round(plan.main.y * scale));
        centre.style.height = px(Math.round(plan.main.h * scale));
        geo.appendChild(centre);

        geo.appendChild(chip('planNote', `${fmt(plan.totalW)} × ${fmt(plan.totalD)} m · 1 square = 1 m`));
        geo.appendChild(chip('audienceNote', 'AUDIENCE'));

        currentScale = scale;
        activeConfig = cfg;
        resizeCanvas(boxW, boxH);
        notifyScaleChange();
        updateSummary();
        try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(cfg)); } catch (err) { /* storage full or blocked */ }
    }

    // Keep drawings and dropped gear where they were relative to the stage.
    function resizeCanvas(width, height) {
        const cv = byId('canvas');
        if (!cv || !width || !height) return;

        const sx = width / (cv.width || width);
        const sy = height / (cv.height || height);
        cv.width = width;
        cv.height = height;

        if (typeof lines !== 'undefined' && Array.isArray(lines)) {
            lines.forEach((line) => line.points.forEach((p) => { p.x *= sx; p.y *= sy; }));
        }
        // .eqOnStage items are left alone — StageScale re-places those from the
        // fractional position it keeps, which survives a resize on its own.
        document.querySelectorAll('#dropZone .dropped-equipment, #dropZone .textAdded').forEach((node) => {
            if (node.classList.contains('eqOnStage')) return;
            const left = parseFloat(node.style.left);
            const top = parseFloat(node.style.top);
            if (isFinite(left)) node.style.left = px(Math.round(left * sx));
            if (isFinite(top)) node.style.top = px(Math.round(top * sy));
        });
        if (typeof redrawCanvas === 'function') {
            try { redrawCanvas(); } catch (err) { /* a stray single-point line */ }
        }
    }

    // A new stage is a new room, so the plot drawn for the old one does not
    // belong on it: the gear, the labels and the pen lines all come off. The
    // snapshot is taken once the stage is bare, so Ctrl+Z brings it all back.
    function clearPlot() {
        const dz = byId('dropZone');
        if (!dz) return;

        if (window.Selection) window.Selection.clear();
        dz.querySelectorAll('.dropped-equipment, .textAdded').forEach((node) => node.remove());

        if (typeof lines !== 'undefined' && Array.isArray(lines)) {
            lines.length = 0;
            if (typeof redrawCanvas === 'function') redrawCanvas();
        }

        if (window.PlotHistory) window.PlotHistory.record();
    }

    /* ---------- saved stages ---------- */

    function loadStore() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
        catch (err) { return {}; }
    }

    function saveStore(store) {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(store));
            return true;
        } catch (err) {
            return false;
        }
    }

    /* A stage in the team library is listed as 'team:<row id>', under the
       stages saved in this browser. teams.js keeps that library. */
    const TEAM_PREFIX = 'team:';
    const isTeamValue = (value) => !!value && value.indexOf(TEAM_PREFIX) === 0;
    const teamLib = () => (window.TeamLibrary && window.TeamLibrary.team() ? window.TeamLibrary : null);

    function configFor(value) {
        if (isTeamValue(value)) {
            const lib = window.TeamLibrary;
            const row = lib && lib.stage(value.slice(TEAM_PREFIX.length));
            return row ? Object.assign({}, row.config, { name: row.name }) : null;
        }
        return loadStore()[value] || null;
    }

    function refreshList(selected) {
        const select = byId('savedStages');
        const store = loadStore();
        const names = Object.keys(store).sort((a, b) => a.localeCompare(b));
        const lib = teamLib();
        const shared = lib ? lib.stages() : [];
        select.innerHTML = '';

        // a setup says so, and how much comes with it
        const label = (name, raw) => {
            const count = setupCount(cleanSetup(raw && raw.setup));
            if (!raw || !cleanSetup(raw.setup)) return name;
            return `${name} · with equipment (${count} ${count === 1 ? 'item' : 'items'})`;
        };

        let mine = select;
        if (lib) {
            mine = document.createElement('optgroup');
            mine.label = 'In this browser';
            select.appendChild(mine);
        }
        names.forEach((name) => mine.appendChild(new Option(label(name, store[name]), name)));

        if (lib) {
            const group = document.createElement('optgroup');
            group.label = 'Team · ' + lib.team().name;
            shared.forEach((row) => group.appendChild(new Option(label(row.name, row.config), TEAM_PREFIX + row.id)));
            select.appendChild(group);
        }

        const values = Array.from(select.options).map((o) => o.value);
        select.value = selected && values.includes(selected) ? selected : '';
        byId('stageListEmpty').hidden = values.length > 0;
        syncListButtons();
    }

    // Open, Delete and Export only mean something with a stage selected;
    // sharing, only with one of your own selected and a team to share it with.
    function syncListButtons() {
        const value = byId('savedStages').value;
        ['openStage', 'deleteStage', 'exportStage'].forEach((id) => { byId(id).disabled = !value; });
        const share = byId('shareStage');
        if (share) {
            share.hidden = !teamLib();
            share.disabled = !value || isTeamValue(value);
        }
    }

    /* ---------- the dialog ---------- */

    const STEPS = ['stageStepChoice', 'stageStepCreate', 'stageStepExisting'];

    function showStep(id) {
        STEPS.forEach((step) => { byId(step).hidden = step !== id; });
    }

    function openDialog(step) {
        showStep(step || 'stageStepChoice');
        byId('stageDialog').hidden = false;
    }

    function closeDialog() {
        byId('stageDialog').hidden = true;
    }

    // What the sidebar shows about the stage currently drawn.
    function updateSummary() {
        const node = byId('stageSummary');
        if (!node) return;
        if (!activeConfig) { node.textContent = 'No stage yet'; return; }
        const size = `${fmt(activeConfig.main.width)} × ${fmt(activeConfig.main.depth)} m`;
        node.textContent = activeConfig.name ? `${activeConfig.name} · ${size}` : size;
    }

    /* ---------- stage setups: a stage with its equipment ---------- */

    /* A saved stage can carry what stands on it: the gear, the labels and the
       pen lines, as the same snapshot undo uses. Gear and labels are held as
       fractions of the stage, so they land in the right place on any screen;
       pen lines are in canvas pixels, so the canvas size goes with them and
       they are scaled on the way back. Custom items travel inside the setup,
       because another machine has never heard of them. */

    // Storage and files can hand back anything, so rebuild a known-good shape.
    function cleanSetup(raw) {
        if (!raw || typeof raw !== 'object' || !raw.plot || typeof raw.plot !== 'object') return null;
        const list = (v) => (Array.isArray(v) ? v : []);
        const w = raw.canvas && parseFloat(raw.canvas.w);
        const h = raw.canvas && parseFloat(raw.canvas.h);
        return {
            plot: { items: list(raw.plot.items), texts: list(raw.plot.texts), strokes: list(raw.plot.strokes) },
            canvas: w > 0 && h > 0 ? { w, h } : null,
            custom: list(raw.custom).filter((c) => c && typeof c.id === 'string')
        };
    }

    // A clean stage, with its setup kept when it has one.
    function withSetup(raw) {
        const clean = normalise(raw);
        const setup = cleanSetup(raw && raw.setup);
        return setup ? Object.assign(clean, { setup }) : clean;
    }

    const setupCount = (setup) => (setup ? setup.plot.items.length : 0);

    function plotHasContent() {
        const dz = byId('dropZone');
        const onStage = dz && dz.querySelector('.eqOnStage, .textAdded');
        const drawn = typeof lines !== 'undefined' && Array.isArray(lines) && lines.length > 0;
        return !!onStage || drawn;
    }

    function captureSetup() {
        const shot = window.PlotHistory ? window.PlotHistory.snapshot() : null;
        const plot = shot ? JSON.parse(shot) : { items: [], texts: [], strokes: [] };
        const cv = byId('canvas');
        const ids = Array.from(new Set(plot.items.map((rec) => rec.eid)));
        const custom = window.EquipmentPanel && window.EquipmentPanel.customItems
            ? window.EquipmentPanel.customItems(ids)
            : [];
        return cleanSetup({ plot, canvas: cv ? { w: cv.width, h: cv.height } : null, custom });
    }

    /* Puts a setup on the stage that is drawn now. Undo reaches back past it. */
    function applySetup(setup) {
        if (!setup || !window.PlotHistory) return;

        if (window.EquipmentPanel && window.EquipmentPanel.adoptCustom) {
            window.EquipmentPanel.adoptCustom(setup.custom);
        } else if (window.EquipmentCatalog) {
            setup.custom.forEach((c) => window.EquipmentCatalog.register(c));
        }

        const plot = JSON.parse(JSON.stringify(setup.plot));
        const cv = byId('canvas');
        if (setup.canvas && cv && cv.width && cv.height) {
            const sx = cv.width / setup.canvas.w;
            const sy = cv.height / setup.canvas.h;
            plot.strokes.forEach((s) => (s.points || []).forEach((p) => { p.x *= sx; p.y *= sy; }));
        }

        const Cat = window.EquipmentCatalog;
        const missing = Cat ? plot.items.filter((rec) => !Cat.get(rec.eid)).length : 0;

        window.PlotHistory.restore(JSON.stringify(plot));
        window.PlotHistory.record();

        if (missing) {
            alert(`${missing} ${missing === 1 ? 'piece' : 'pieces'} of equipment in this setup ` +
                'could not be found in the catalogue here and were left off.');
        }
    }

    // Stage menu: the stage drawn now, and everything on it, under one name.
    function saveSetup() {
        if (!activeConfig) {
            alert('Draw a stage first.');
            return;
        }
        const suggested = activeConfig.name || '';
        const name = (prompt('Name this stage setup. The stage and everything on it — gear, labels and lines — are saved together.', suggested) || '').trim();
        if (!name) return;

        const store = loadStore();
        if (store[name] && !confirm(`"${name}" already exists. Overwrite?`)) return;

        const setup = captureSetup();
        store[name] = Object.assign(normalise(activeConfig), { name, setup });
        if (!saveStore(store)) {
            alert('Could not save the setup — the browser storage is full or blocked. ' +
                'Export the show to a file instead, or save the stage without so many drawn lines.');
            return;
        }

        // the stage on screen now goes by that name too
        activeConfig = Object.assign({}, activeConfig, { name });
        try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeConfig)); } catch (err) { /* storage full or blocked */ }
        writeForm(normalise(activeConfig));
        updateSummary();
        refreshList(name);

        const btn = byId('saveSetupBtn');
        if (btn) {
            const was = btn.textContent;
            btn.textContent = `Saved · ${setupCount(setup)} ${setupCount(setup) === 1 ? 'item' : 'items'}`;
            setTimeout(() => { btn.textContent = was; }, 1500);
        }
    }

    /* ---------- stage files ---------- */

    function exportStage(value) {
        const cfg = configFor(value);
        if (!cfg) return;
        const name = cfg.name || value;
        const setup = cleanSetup(cfg.setup);
        // version 2 files carry a setup; a version 1 reader still finds the stage in them
        const payload = Object.assign({ stageplanner: 'stage', version: setup ? 2 : 1 }, normalise(cfg), { name },
            setup ? { setup } : {});
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name.replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '-stage.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    function importStage() {
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
                if (!data || !data.main) {
                    alert('That file is not a stage.');
                    return;
                }
                const cfg = normalise(data);
                if (!cfg.name) cfg.name = file.name.replace(/\.json$/i, '');
                const setup = cleanSetup(data.setup);
                const store = loadStore();
                if (store[cfg.name] && !confirm(`"${cfg.name}" already exists. Overwrite?`)) return;
                if (setup && plotHasContent() &&
                    !confirm(`"${cfg.name}" comes with its equipment. What is on the stage now is replaced — Ctrl+Z brings it back.`)) return;
                store[cfg.name] = setup ? Object.assign({}, cfg, { setup }) : cfg;
                if (!saveStore(store)) {
                    alert('Could not save the stage — the browser is blocking storage.');
                    return;
                }
                refreshList(cfg.name);
                writeForm(cfg);
                render(cfg);
                if (setup) applySetup(setup);
                closeDialog();
            };
            reader.readAsText(file);
        });
        input.click();
    }

    /* ---------- wiring ---------- */

    function saveCurrentForm() {
        const cfg = readForm();
        if (!cfg.name) {
            alert('Name the stage before saving.');
            byId('stageNameInput').focus();
            return null;
        }
        const store = loadStore();
        if (store[cfg.name] && !confirm(`"${cfg.name}" already exists. Overwrite?`)) return null;
        store[cfg.name] = cfg;
        if (!saveStore(store)) {
            alert('Could not save the stage — the browser is blocking storage.');
            return null;
        }
        refreshList(cfg.name);
        return cfg;
    }

    // A bare stage keeps whatever is on the plot; a setup brings its own.
    function openSelected() {
        const cfg = configFor(byId('savedStages').value);
        if (!cfg) return;
        const clean = normalise(cfg);
        const setup = cleanSetup(cfg.setup);
        if (setup && plotHasContent() &&
            !confirm(`Open "${clean.name}" with its equipment? What is on the stage now is replaced — Ctrl+Z brings it back.`)) return;
        writeForm(clean);
        render(clean);
        if (setup) applySetup(setup);
        closeDialog();
    }

    function init() {
        if (!byId('stageGeometry') || !byId('stageDialog')) return;

        TOGGLES.forEach(([box]) => byId(box).addEventListener('change', syncDisabled));

        /* opening and closing */
        byId('newStageBtn').addEventListener('click', () => openDialog('stageStepChoice'));
        byId('stageDialogClose').addEventListener('click', closeDialog);
        byId('stageDialog').addEventListener('click', (e) => {
            if (e.target === byId('stageDialog')) closeDialog();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !byId('stageDialog').hidden) closeDialog();
        });

        /* step 1: new, existing or a file */
        byId('stageChooseNew').addEventListener('click', () => {
            writeForm(defaultConfig());
            showStep('stageStepCreate');
            byId('stageNameInput').focus();
        });
        byId('stageChooseExisting').addEventListener('click', () => {
            refreshList('');
            showStep('stageStepExisting');
        });
        byId('stageChooseImport').addEventListener('click', importStage);

        // Stage menu: the stage with everything on it
        const saveSetupBtn = byId('saveSetupBtn');
        if (saveSetupBtn) saveSetupBtn.addEventListener('click', saveSetup);

        byId('stageBackFromCreate').addEventListener('click', () => showStep('stageStepChoice'));
        byId('stageBackFromExisting').addEventListener('click', () => showStep('stageStepChoice'));

        /* step 2a: measurements */
        byId('applyStage').addEventListener('click', () => {
            clearPlot();
            render(readForm());
            closeDialog();
        });
        byId('saveStage').addEventListener('click', () => {
            const cfg = saveCurrentForm();
            if (!cfg) return;
            const btn = byId('saveStage');
            btn.textContent = 'Saved';
            setTimeout(() => { btn.textContent = 'Save'; }, 1200);
        });

        /* step 2b: stages saved earlier */
        byId('savedStages').addEventListener('change', syncListButtons);
        byId('savedStages').addEventListener('dblclick', openSelected);
        byId('openStage').addEventListener('click', openSelected);
        byId('exportStage').addEventListener('click', () => exportStage(byId('savedStages').value));
        byId('deleteStage').addEventListener('click', () => {
            const name = byId('savedStages').value;
            if (!name) return;
            if (isTeamValue(name)) {
                const cfg = configFor(name);
                const lib = window.TeamLibrary;
                if (!cfg || !lib) return;
                if (!confirm(`Delete "${cfg.name}" from the team library, for everyone in the team?`)) return;
                lib.deleteStage(name.slice(TEAM_PREFIX.length))
                    .then(() => refreshList(''))
                    .catch((err) => alert('Could not delete the stage: ' + (err.message || err)));
                return;
            }
            if (!confirm(`Delete "${name}"?`)) return;
            const store = loadStore();
            delete store[name];
            saveStore(store);
            refreshList('');
        });
        // A stage saved here goes into the team library under the same name.
        const shareBtn = byId('shareStage');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const name = byId('savedStages').value;
                const lib = teamLib();
                const cfg = loadStore()[name];
                if (!lib || !cfg || isTeamValue(name)) return;
                if (lib.stages().some((row) => row.name === name) &&
                    !confirm(`The team already has a stage called "${name}". Replace it for everyone?`)) return;
                shareBtn.disabled = true;
                lib.saveStage(withSetup(Object.assign({}, cfg, { name })))
                    .then((row) => refreshList(TEAM_PREFIX + row.id))
                    .catch((err) => alert('Could not share the stage: ' + (err.message || err)))
                    .finally(syncListButtons);
            });
        }

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (activeConfig) render(activeConfig);
            }, 120);
        });

        refreshList('');

        let active = null;
        try { active = JSON.parse(localStorage.getItem(ACTIVE_KEY)); } catch (err) { /* ignore */ }
        // Every stage is drawn from measurements, so the first run gets the
        // default room rather than a picture of somebody else's.
        const start = active ? normalise(active) : defaultConfig();
        writeForm(start);
        render(start);
        updateSummary();
    }

    window.StageBuilder = {
        openDialog: () => openDialog('stageStepChoice'),
        // teams.js, when the team's stage library changes
        refreshLibrary: () => {
            const select = byId('savedStages');
            if (select) refreshList(select.value);
        },
        // pixels per metre of the stage on screen, null before one is drawn
        pxPerMeter: () => currentScale
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* Stage definition — describe a venue in meters (main stage, side stages,
   orchestra pit), draw it to scale and keep it in localStorage. */
(() => {
    'use strict';

    const STORE_KEY = 'stageplanner.stages.v1';
    const ACTIVE_KEY = 'stageplanner.activeStage.v1';
    const MIN_M = 0.5;
    const MAX_M = 100;
    const MARGIN_PX = 60; // breathing room around the plan inside the stage area

    const byId = (id) => document.getElementById(id);
    const px = (n) => `${n}px`;
    const fmt = (n) => String(Number(n.toFixed(2)));

    // Pixels per meter of the plan currently on screen, or null while the
    // built-in house plan is showing (that one carries no stated scale).
    // Equipment sizing reads this so gear matches the drawn stage.
    let currentScale = null;

    // The stage currently drawn, or null while the house plan is up.
    let activeConfig = null;

    // The last stage that was drawn. Kept when the house plan is switched on
    // so that switching back restores it instead of asking all over again.
    let lastConfig = null;

    function notifyScaleChange() {
        if (window.StageScale) window.StageScale.applyAll();
    }

    const TOGGLES = [
        ['sideLOn', ['sideLW', 'sideLD']],
        ['sideROn', ['sideRW', 'sideRD']],
        ['pitOn', ['pitW', 'pitD']]
    ];

    function defaultConfig() {
        return {
            name: '',
            main:  { width: 12, depth: 10 },
            sideL: { enabled: false, width: 6, depth: 8 },
            sideR: { enabled: false, width: 6, depth: 8 },
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
        const P = cfg.pit.enabled ? cfg.pit : null;

        const leftW = L ? L.width : 0;
        const deckW = leftW + cfg.main.width + (R ? R.width : 0);
        // Everything upstage shares one front edge — the proscenium line.
        const deckD = Math.max(cfg.main.depth, L ? L.depth : 0, R ? R.depth : 0);

        const pitX = P ? leftW + (cfg.main.width - P.width) / 2 : 0;
        // A pit wider than the deck hangs off the sides, so grow the box for it.
        const minX = P ? Math.min(0, pitX) : 0;
        const maxX = Math.max(deckW, P ? pitX + P.width : 0);
        const ox = -minX;

        const regions = [];
        if (L) regions.push({ kind: 'sideStage', label: 'Side stage L', x: ox, y: deckD - L.depth, w: L.width, h: L.depth });
        regions.push({ kind: 'mainStage', label: 'Main stage', x: ox + leftW, y: deckD - cfg.main.depth, w: cfg.main.width, h: cfg.main.depth });
        if (R) regions.push({ kind: 'sideStage', label: 'Side stage R', x: ox + leftW + cfg.main.width, y: deckD - R.depth, w: R.width, h: R.depth });
        if (P) regions.push({ kind: 'orchestraPit', label: 'Orchestra pit', x: ox + pitX, y: deckD, w: P.width, h: P.depth });

        return {
            regions,
            totalW: maxX - minX,
            totalD: deckD + (P ? P.depth : 0),
            deckD,
            centreX: ox + leftW + cfg.main.width / 2,
            main: { x: ox + leftW, y: deckD - cfg.main.depth, h: cfg.main.depth }
        };
    }

    function fitScale(widthM, depthM) {
        const holder = document.querySelector('.stageContainer');
        const availW = Math.max(320, (holder.clientWidth || 900) - MARGIN_PX);
        const availH = Math.max(280, (holder.clientHeight || 700) - MARGIN_PX);
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
    function gridLayer(plan, scale) {
        const layer = document.createElement('div');
        layer.className = 'stageGrid';

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
        for (let y = plan.deckD; y > 0; y -= 1) horizontal(y);
        for (let y = plan.deckD + 1; y < plan.totalD; y += 1) horizontal(y);

        return layer;
    }

    function render(cfg) {
        const stage = byId('stage');
        const geo = byId('stageGeometry');
        if (!stage || !geo) return;

        const plan = layout(cfg);
        const scale = fitScale(plan.totalW, plan.totalD);
        const boxW = Math.round(plan.totalW * scale);
        const boxH = Math.round(plan.totalD * scale);

        geo.innerHTML = '';
        stage.classList.add('customStage');
        stage.style.width = px(boxW);
        stage.style.height = px(boxH);
        stage.style.aspectRatio = 'auto';
        stage.style.resize = 'none';

        // Fills first, then the grid over them, then borders and labels on top.
        plan.regions.forEach((r) => geo.appendChild(box(`regionFill ${r.kind}`, r, scale)));
        geo.appendChild(gridLayer(plan, scale));
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
        lastConfig = cfg;
        resizeCanvas(boxW, boxH);
        notifyScaleChange();
        byId('toggleHSCPlan').checked = false;
        updateSummary();
        try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(cfg)); } catch (err) { /* storage full or blocked */ }
    }

    const HOUSE_RATIO = 640 / 560;   // the proportions of the house plan image

    function fitHouseStage() {
        const stage = byId('stage');
        const holder = document.querySelector('.stageContainer');
        if (!stage || !holder || stage.classList.contains('customStage')) return;

        const availW = Math.max(320, holder.clientWidth - MARGIN_PX);
        const availH = Math.max(280, holder.clientHeight - MARGIN_PX);
        let w = availW;
        let h = w / HOUSE_RATIO;
        if (h > availH) { h = availH; w = h * HOUSE_RATIO; }

        stage.style.width = px(Math.round(w));
        stage.style.height = px(Math.round(h));
        stage.style.aspectRatio = 'auto';
        resizeCanvas(Math.round(w), Math.round(h));
        notifyScaleChange();
    }

    function useHouseStage() {
        const stage = byId('stage');
        stage.classList.remove('customStage');
        ['width', 'height', 'aspectRatio', 'resize'].forEach((prop) => { stage.style[prop] = ''; });
        byId('stageGeometry').innerHTML = '';
        byId('toggleHSCPlan').checked = true;
        currentScale = null;
        activeConfig = null;
        updateSummary();
        try { localStorage.removeItem(ACTIVE_KEY); } catch (err) { /* ignore */ }
        requestAnimationFrame(fitHouseStage);
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

    function refreshList(selected) {
        const select = byId('savedStages');
        const names = Object.keys(loadStore()).sort((a, b) => a.localeCompare(b));
        select.innerHTML = '';
        names.forEach((name) => select.appendChild(new Option(name, name)));
        select.value = selected && names.includes(selected) ? selected : '';
        byId('stageListEmpty').hidden = names.length > 0;
        syncListButtons();
    }

    // Open, Delete and Export only mean something with a stage selected.
    function syncListButtons() {
        const has = !!byId('savedStages').value;
        ['openStage', 'deleteStage', 'exportStage'].forEach((id) => { byId(id).disabled = !has; });
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
        if (!activeConfig) { node.textContent = 'House plan'; return; }
        const size = `${fmt(activeConfig.main.width)} × ${fmt(activeConfig.main.depth)} m`;
        node.textContent = activeConfig.name ? `${activeConfig.name} · ${size}` : size;
    }

    /* ---------- stage files ---------- */

    function exportStage(name) {
        const cfg = loadStore()[name];
        if (!cfg) return;
        const payload = Object.assign({ stageplanner: 'stage', version: 1 }, normalise(cfg), { name });
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
                const store = loadStore();
                if (store[cfg.name] && !confirm(`"${cfg.name}" already exists. Overwrite?`)) return;
                store[cfg.name] = cfg;
                if (!saveStore(store)) {
                    alert('Could not save the stage — the browser is blocking storage.');
                    return;
                }
                refreshList(cfg.name);
                writeForm(cfg);
                render(cfg);
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

    function openSelected() {
        const cfg = loadStore()[byId('savedStages').value];
        if (!cfg) return;
        const clean = normalise(cfg);
        writeForm(clean);
        render(clean);
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

        byId('stageBackFromCreate').addEventListener('click', () => showStep('stageStepChoice'));
        byId('stageBackFromExisting').addEventListener('click', () => showStep('stageStepChoice'));

        /* step 2a: measurements */
        byId('applyStage').addEventListener('click', () => {
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
            if (!confirm(`Delete "${name}"?`)) return;
            const store = loadStore();
            delete store[name];
            saveStore(store);
            refreshList('');
        });

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (activeConfig) render(activeConfig);
                else fitHouseStage();
            }, 120);
        });

        refreshList('');

        let active = null;
        try { active = JSON.parse(localStorage.getItem(ACTIVE_KEY)); } catch (err) { /* ignore */ }
        writeForm(active ? normalise(active) : defaultConfig());
        if (active) render(normalise(active));
        else fitHouseStage();
        updateSummary();
    }

    window.StageBuilder = {
        useHouseStage,
        // The House plan checkbox turning off means "show my stage again".
        // With nothing defined yet there is nothing to show, so ask.
        applyFromForm: () => {
            if (lastConfig) { render(lastConfig); return; }
            // Nothing defined yet: the house plan is still what's on screen,
            // so put the tick back rather than let the box lie about it.
            byId('toggleHSCPlan').checked = true;
            openDialog('stageStepChoice');
        },
        openDialog: () => openDialog('stageStepChoice'),
        // null while the house plan is up, otherwise pixels per meter
        pxPerMeter: () => currentScale
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

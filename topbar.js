/* topbar.js — the menus in the top bar, the shortcut overlay, and the
   status strip along the bottom.

   Show details, the stage summary and the drawing tools used to occupy three
   columns of a very wide sidebar. They are the same controls, moved into
   popovers so the stage gets the space instead. */
(() => {
    'use strict';

    const byId = (id) => document.getElementById(id);

    /* ---------------- popover menus ---------------- */

    const MENUS = [
        ['showMenuBtn', 'showMenu'],
        ['stageMenuBtn', 'stageMenu'],
        ['penColourBtn', 'drawMenu']
    ];

    function closeMenus(except) {
        MENUS.forEach(([btnId, menuId]) => {
            if (menuId === except) return;
            const menu = byId(menuId);
            const btn = byId(btnId);
            if (!menu || !btn) return;
            menu.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
        });
    }

    // keep the panel under its button, and on screen
    function place(btn, menu) {
        const rect = btn.getBoundingClientRect();
        menu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
    }

    // Open one menu, closing the others. Also used from outside, to send
    // someone to the field they still have to fill in.
    function openMenu(menuId) {
        const pair = MENUS.find(([, id]) => id === menuId);
        if (!pair) return;
        const btn = byId(pair[0]);
        const menu = byId(menuId);
        if (!btn || !menu) return;

        closeMenus(menuId);
        menu.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        place(btn, menu);
    }

    function wireMenus() {
        MENUS.forEach(([btnId, menuId]) => {
            const btn = byId(btnId);
            const menu = byId(menuId);
            if (!btn || !menu) return;

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!menu.hidden) {
                    closeMenus(null);
                    return;
                }
                openMenu(menuId);
                const first = menu.querySelector('input, textarea, select, button');
                if (first && first.tagName !== 'BUTTON') first.focus();
            });

            // clicks inside a menu should not dismiss it
            menu.addEventListener('click', (e) => e.stopPropagation());
        });

        document.addEventListener('click', () => closeMenus(null));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenus(null);
        });
    }

    /* ---------------- shortcut overlay ---------------- */

    function wireInfo() {
        const overlay = byId('infoOverlay');
        const btn = byId('infoButton');
        if (!overlay || !btn) return;

        const close = () => { overlay.hidden = true; };
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenus(null);
            overlay.hidden = false;
        });
        overlay.querySelector('.modalClose').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !overlay.hidden) close();
        });
    }

    /* ---------------- status strip ---------------- */

    // What the plot is being drawn against, and how much is on it.
    function refreshStatus() {
        const scale = byId('statusScale');
        const count = byId('statusCount');
        if (scale && window.StageScale) {
            const ppm = window.StageScale.pxPerMeter();
            const fromPlan = window.StageScale.scaleSource() === 'plan';
            scale.innerHTML = fromPlan
                ? 'Drawn stage · <b>' + (Math.round(ppm * 10) / 10) + ' px/m</b>'
                : 'House plan · <b>' + window.StageScale.settings.stageWidthM + ' m</b> wide';
        }
        if (count) {
            const items = document.querySelectorAll('#dropZone .eqOnStage').length;
            const texts = document.querySelectorAll('#dropZone .textAdded').length;
            const parts = [items + (items === 1 ? ' item' : ' items')];
            if (texts) parts.push(texts + (texts === 1 ? ' label' : ' labels'));
            count.textContent = parts.join(' · ');
        }
    }

    /* ---------------- undo and redo buttons ---------------- */

    function wireHistoryButtons() {
        const undo = byId('undoBtn');
        const redo = byId('redoBtn');
        if (!undo || !redo || !window.PlotHistory) return;

        undo.addEventListener('click', () => window.PlotHistory.undo());
        redo.addEventListener('click', () => window.PlotHistory.redo());

        window.PlotHistory.onChange((state) => {
            undo.disabled = !state.canUndo;
            redo.disabled = !state.canRedo;
            refreshStatus();
        });
    }

    function init() {
        wireMenus();
        wireInfo();
        wireHistoryButtons();
        refreshStatus();
        if (window.StageScale) window.StageScale.onChange(refreshStatus);
        // the plot changes outside history too (dropping, deleting)
        const dz = byId('dropZone');
        if (dz && typeof MutationObserver !== 'undefined') {
            new MutationObserver(refreshStatus).observe(dz, { childList: true });
        }
    }

    window.TopBar = { refreshStatus, openMenu, closeMenus: () => closeMenus(null) };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* theme.js — light and dark.

   Loaded in <head>, ahead of the stylesheets, so data-theme is on <html>
   before anything paints and a dark screen never flashes white first.

   Until someone presses the moon in the top bar the app follows the system
   setting, and changes with it. Once they have picked, the choice is kept in
   this browser and wins. The tokens themselves live in ui.css. */
(() => {
    'use strict';

    const KEY = 'stageplanner.theme.v1';
    const root = document.documentElement;
    const system = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function chosen() {
        try {
            const v = localStorage.getItem(KEY);
            return v === 'dark' || v === 'light' ? v : null;
        } catch (e) { return null; }      /* private window */
    }

    function current() {
        return chosen() || (system && system.matches ? 'dark' : 'light');
    }

    // The button shows where it will take you, not where you are.
    function apply() {
        const theme = current();
        root.setAttribute('data-theme', theme);

        const btn = document.getElementById('themeBtn');
        if (!btn) return;
        const dark = theme === 'dark';
        btn.setAttribute('aria-pressed', String(dark));
        btn.textContent = dark ? '☀️' : '🌙';
        btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    }

    function set(theme) {
        try { localStorage.setItem(KEY, theme); } catch (e) { /* full, or blocked */ }
        apply();
    }

    apply();

    if (system) {
        const follow = () => { if (!chosen()) apply(); };
        if (system.addEventListener) system.addEventListener('change', follow);
        else if (system.addListener) system.addListener(follow);
    }

    function init() {
        const btn = document.getElementById('themeBtn');
        if (btn) btn.addEventListener('click', () => set(current() === 'dark' ? 'light' : 'dark'));
        apply();
    }

    window.Theme = { current, set };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

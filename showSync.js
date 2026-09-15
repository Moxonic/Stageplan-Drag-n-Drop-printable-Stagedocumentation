/* showSync.js — the show in the account, so it opens on the next machine.
 *
 * The show still lives in this browser first: scenes.js writes it to local
 * storage as you work, and that copy is what you keep working on offline. This
 * file follows those saves and puts the same document in a row of the shows
 * table, a couple of seconds after the last change.
 *
 * Every row carries a revision number the server bumps on each write. A save
 * says which revision it started from, so a show changed on two machines is
 * noticed rather than silently overwritten, and you choose which one wins.
 *
 * A show can also be handed to a crew by link. The link opens the latest
 * version of the show for anyone signed in; what they change is saved as
 * their own copy, never over yours.
 */
window.ShowSync = (function () {
    'use strict';

    const LINK_KEY = 'stageplanner.cloudShow.v1';
    const PENDING_LINK_KEY = 'stageplanner.pendingShowLink';
    const PUSH_DELAY = 2500;     // ms after the last change before it goes up
    const CHECK_EVERY = 30000;   // ms between looks for a newer version elsewhere

    // owner: the account this browser's show was last saved to
    // id, rev: its row and the revision this browser has
    // dirty: changed here since that revision
    let link = { owner: null, id: null, rev: null, dirty: false };
    let baseline = null;         // the body last sent or received, to skip no-op saves
    let applying = false;        // we are the ones replacing the show
    let pushing = null;
    let pushTimer = null;
    let edits = 0;
    let lastCheck = 0;

    const byId = (id) => document.getElementById(id);
    const me = () => window.Account && window.Account.current();
    const signedIn = () => !!(me() && window.Cloud && window.Cloud.available());

    /* ---------------- kept between visits ---------------- */

    function readLink() {
        try {
            const raw = JSON.parse(localStorage.getItem(LINK_KEY));
            if (raw && typeof raw === 'object') link = Object.assign(link, raw);
        } catch (e) { /* keep the empty link */ }
    }

    function writeLink() {
        try { localStorage.setItem(LINK_KEY, JSON.stringify(link)); } catch (e) { /* full, or blocked */ }
    }

    /* A crew link arrives as ?show=<token>. It is taken off the address at once
       and held for the session, so it survives the trip through Google. */
    (function catchLink() {
        let params;
        try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
        const token = params.get('show');
        if (!token) return;
        try { sessionStorage.setItem(PENDING_LINK_KEY, token); } catch (e) { /* private window */ }
        params.delete('show');
        const q = params.toString();
        try {
            history.replaceState(null, '', window.location.pathname + (q ? '?' + q : '') + window.location.hash);
        } catch (e) { /* the token stays visible, and still works */ }
    })();

    /* ---------------- what the menu says ---------------- */

    function status(text, tone) {
        const node = byId('cloudStatus');
        if (!node) return;
        node.textContent = text || '';
        node.dataset.tone = tone || '';
    }

    function renderStatus() {
        if (!me()) { status(''); return; }
        if (link.dirty && link.id) { status('Changes not yet saved to your account', 'warn'); return; }
        if (link.id) { status('Saved to your account', 'ok'); return; }
        status('Only in this browser. Give the show a title or put gear on the stage to save it to your account.');
    }

    /* ---------------- the document ---------------- */

    const title = (doc) => (((doc.details || {}).playNameInput) || '').trim();

    function worthKeeping(doc) {
        if (title(doc) || doc.scenes.length > 1) return true;
        return doc.scenes.some((scene) => {
            try {
                const plot = JSON.parse(scene.plot);
                return (plot.items || []).length || (plot.texts || []).length || (plot.strokes || []).length;
            } catch (e) {
                return false;
            }
        });
    }

    function bodyOf(doc) { return { title: title(doc), doc: doc }; }

    /* ---------------- hearing the show change ---------------- */

    function onShowSaved(reason) {
        if (applying) return;
        // a new or imported show is a different show, so it gets its own row
        if (reason === 'new' || reason === 'import') {
            link.id = null;
            link.rev = null;
            baseline = null;
        }
        link.dirty = true;
        edits += 1;
        writeLink();
        schedule();
    }

    function schedule() {
        clearTimeout(pushTimer);
        if (!signedIn()) { renderStatus(); return; }
        pushTimer = setTimeout(() => { push(); }, PUSH_DELAY);
    }

    /* ---------------- sending ---------------- */

    async function push() {
        if (pushing) {
            await pushing;
            return;
        }
        if (!link.dirty || !signedIn() || !window.Scenes) { renderStatus(); return; }

        let again = false;
        pushing = (async () => {
            const startEdits = edits;
            const doc = window.Scenes.document();
            const body = bodyOf(doc);
            const text = JSON.stringify(body);

            if (!link.id && !worthKeeping(doc)) { link.dirty = false; writeLink(); renderStatus(); return; }
            if (link.id && text === baseline) { link.dirty = edits !== startEdits; writeLink(); renderStatus(); return; }

            status('Saving to your account…', 'busy');
            try {
                let rows;
                if (!link.id) {
                    rows = await window.Cloud.rest('POST', 'shows?select=id,rev', body, 'return=representation');
                } else {
                    rows = await window.Cloud.rest('PATCH',
                        'shows?id=eq.' + encodeURIComponent(link.id) + '&rev=eq.' + link.rev + '&select=id,rev',
                        body, 'return=representation');
                    if (!rows || !rows.length) {
                        await resolveConflict();
                        again = link.dirty;
                        return;
                    }
                }
                link.owner = me().id;
                link.id = rows[0].id;
                link.rev = rows[0].rev;
                baseline = text;
                link.dirty = edits !== startEdits;
                again = link.dirty;
                writeLink();
                renderStatus();
            } catch (err) {
                status(err instanceof TypeError
                    ? 'Offline. Kept in this browser, and saved to your account once you are back.'
                    : 'Not saved to your account: ' + err.message, 'warn');
            }
        })();

        try { await pushing; } finally { pushing = null; }
        if (again) schedule();
    }

    /* ---------------- two machines, one show ---------------- */

    async function fetchRow(id, full) {
        const rows = await window.Cloud.rest('GET', 'shows?id=eq.' + encodeURIComponent(id) +
            '&select=' + (full ? 'id,rev,title,doc,updated_at' : 'id,rev'));
        return (rows && rows[0]) || null;
    }

    async function resolveConflict() {
        const row = await fetchRow(link.id, true);
        if (!row) {
            // deleted on another machine while changed on this one: saved again as new
            link.id = null;
            link.rev = null;
            writeLink();
            return;
        }
        const takeTheirs = confirm('"' + (row.title || 'Untitled show') + '" was changed on another machine ' +
            'since this one last saved it.\n\n' +
            'OK: open that version here. What changed on this machine is replaced.\n' +
            'Cancel: keep this version and save it over the other one.');
        if (takeTheirs) {
            apply(row);
        } else {
            link.rev = row.rev;
            link.dirty = true;
            writeLink();
        }
    }

    function apply(row) {
        applying = true;
        try { window.Scenes.open(row.doc); } finally { applying = false; }
        link = { owner: me() ? me().id : null, id: row.id, rev: row.rev, dirty: false };
        // read back through scenes.js, so the redraw that follows compares equal
        baseline = JSON.stringify(bodyOf(window.Scenes.document()));
        writeLink();
        renderStatus();
    }

    async function check() {
        if (!signedIn() || pushing || !window.Scenes) return;
        lastCheck = Date.now();
        if (!link.id) {
            if (link.dirty) push();
            else renderStatus();
            return;
        }
        try {
            const row = await fetchRow(link.id, false);
            if (!row) {
                link.id = null;
                link.rev = null;
                writeLink();
                if (link.dirty) push();
                else renderStatus();
                return;
            }
            if (row.rev === link.rev) {
                if (link.dirty) push();
                else renderStatus();
                return;
            }
            if (!link.dirty) {
                const full = await fetchRow(link.id, true);
                if (full) apply(full);
                return;
            }
            await resolveConflict();
            if (link.dirty) push();
        } catch (err) {
            if (err instanceof TypeError) status('Offline. Kept in this browser.', 'warn');
        }
    }

    /* ---------------- a show handed over by link ---------------- */

    async function openPendingLink() {
        let token = null;
        try {
            token = sessionStorage.getItem(PENDING_LINK_KEY);
            sessionStorage.removeItem(PENDING_LINK_KEY);
        } catch (e) { token = null; }
        if (!token) return;

        try {
            const rows = await window.Cloud.rpc('open_show_link', { p_token: token });
            const row = Array.isArray(rows) ? rows[0] : rows;
            if (!row) {
                alert('That show link does not work any more. Ask for a new one.');
                return;
            }
            if (row.show_id === link.id) return;       // your own show, already here

            if (!confirm('Open "' + (row.title || 'Untitled show') + '", shared with you by link?\n\n' +
                'What is on the stage here is replaced' + (link.id ? ', after it is saved to your account.' : '.'))) return;

            if (link.dirty) await push();
            applying = true;
            try { window.Scenes.open(row.doc); } finally { applying = false; }
            // a copy: it becomes a show of your own the first time you change it
            link = { owner: me().id, id: null, rev: null, dirty: false };
            baseline = null;
            writeLink();
            status('Opened from a crew link. Anything you change is saved as your own copy.');
        } catch (err) {
            alert('The shared show could not be opened: ' + (err.message || err));
        }
    }

    async function copyCrewLink(button) {
        if (!signedIn()) return;
        const was = button.textContent;
        button.disabled = true;
        try {
            if (link.dirty || !link.id) {
                link.dirty = true;
                await push();
            }
            if (!link.id) {
                alert('Give the show a title or put something on the stage first, then share it.');
                return;
            }
            let rows = await window.Cloud.rest('GET',
                'show_links?select=token&limit=1&show_id=eq.' + encodeURIComponent(link.id));
            if (!rows || !rows.length) {
                rows = await window.Cloud.rest('POST', 'show_links?select=token',
                    { show_id: link.id }, 'return=representation');
            }
            const url = window.Account.returnUrl() + '?show=' + encodeURIComponent(rows[0].token);
            try {
                await navigator.clipboard.writeText(url);
                button.textContent = 'Link copied';
                setTimeout(() => { button.textContent = was; }, 1600);
            } catch (e) {
                prompt('Copy this link for the crew:', url);
            }
        } catch (err) {
            alert('The link could not be made: ' + (err.message || err));
        } finally {
            button.disabled = false;
        }
    }

    /* ---------------- the list of shows in the account ---------------- */

    function el(tag, cls, text) {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function when(iso) {
        const d = new Date(iso);
        return isNaN(d) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }

    async function renderList() {
        const host = byId('cloudShowList');
        if (!host) return;
        host.textContent = 'Loading…';
        let rows;
        try {
            rows = await window.Cloud.rest('GET', 'shows?select=id,title,updated_at&order=updated_at.desc');
        } catch (err) {
            host.textContent = 'Your shows could not be loaded: ' + (err.message || err);
            return;
        }
        host.textContent = '';
        if (!rows.length) {
            host.appendChild(el('div', 'cloudEmpty', 'No shows in your account yet. The one you are working on is saved here once it has a title or gear on the stage.'));
            return;
        }
        rows.forEach((row) => {
            const item = el('div', 'cloudRow' + (row.id === link.id ? ' is-current' : ''));
            const text = el('div', 'cloudRowText');
            text.appendChild(el('b', '', row.title || 'Untitled show'));
            text.appendChild(el('span', '', (row.id === link.id ? 'Open here · ' : '') + 'Saved ' + when(row.updated_at)));
            item.appendChild(text);

            const open = el('button', 'btn', row.id === link.id ? 'Open' : 'Open');
            open.type = 'button';
            open.disabled = row.id === link.id;
            open.addEventListener('click', () => openRow(row.id));
            item.appendChild(open);

            const del = el('button', 'btn btn--danger', 'Delete');
            del.type = 'button';
            del.addEventListener('click', () => deleteRow(row));
            item.appendChild(del);

            host.appendChild(item);
        });
    }

    async function openRow(id) {
        try {
            if (link.dirty) await push();
            if (link.dirty && !confirm('This show has changes that could not be saved to your account. ' +
                'Open the other show anyway? Those changes are lost.')) return;
            const row = await fetchRow(id, true);
            if (!row) { renderList(); return; }
            apply(row);
            closeList();
            if (window.TopBar) window.TopBar.closeMenus();
        } catch (err) {
            alert('The show could not be opened: ' + (err.message || err));
        }
    }

    async function deleteRow(row) {
        if (!confirm('Delete "' + (row.title || 'Untitled show') + '" from your account? ' +
            'Crew links to it stop working. A copy open in a browser stays in that browser.')) return;
        try {
            await window.Cloud.rest('DELETE', 'shows?id=eq.' + encodeURIComponent(row.id));
            if (row.id === link.id) {
                link.id = null;
                link.rev = null;
                link.dirty = false;
                baseline = null;
                writeLink();
                renderStatus();
            }
            renderList();
        } catch (err) {
            alert('The show could not be deleted: ' + (err.message || err));
        }
    }

    function openList() {
        const dialog = byId('cloudShowsDialog');
        if (!dialog || !signedIn()) return;
        if (window.TopBar) window.TopBar.closeMenus();
        dialog.hidden = false;
        renderList();
    }

    function closeList() {
        const dialog = byId('cloudShowsDialog');
        if (dialog) dialog.hidden = true;
    }

    /* ---------------- wiring ---------------- */

    function whenScenes(fn) {
        if (window.Scenes && window.Scenes.whenReady) window.Scenes.whenReady(fn);
        else fn();
    }

    function onAccount(who, reason) {
        clearTimeout(pushTimer);
        if (!who) {
            if (reason === 'deleted') {
                link = { owner: null, id: null, rev: null, dirty: false };
                writeLink();
            }
            renderStatus();
            return;
        }
        // A show last saved to someone else's account is not theirs to update.
        if (link.owner && link.owner !== who.id) {
            link = { owner: who.id, id: null, rev: null, dirty: true };
            writeLink();
        }
        // Never saved anywhere: it goes up once, if there is something to keep.
        if (!link.owner && !link.id) link.dirty = true;

        whenScenes(() => { openPendingLink().then(check); });
    }

    function init() {
        readLink();

        const openBtn = byId('cloudOpenBtn');
        const shareBtn = byId('cloudShareBtn');
        if (openBtn) openBtn.addEventListener('click', openList);
        if (shareBtn) shareBtn.addEventListener('click', () => copyCrewLink(shareBtn));

        const dialog = byId('cloudShowsDialog');
        if (dialog) {
            dialog.querySelector('.modalClose').addEventListener('click', closeList);
            dialog.addEventListener('click', (e) => { if (e.target === dialog) closeList(); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !dialog.hidden) closeList(); });
        }

        if (window.Scenes && window.Scenes.onSave) window.Scenes.onSave(onShowSaved);
        if (window.Account) window.Account.onChange(onAccount);

        // back on this tab, or every so often while it is in front
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && Date.now() - lastCheck > 5000) check();
        });
        setInterval(() => { if (!document.hidden) check(); }, CHECK_EVERY);
        window.addEventListener('online', () => check());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        saveNow: push,
        openList: openList,
        state: () => Object.assign({}, link)
    };
})();

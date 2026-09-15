/* teams.js — a venue and its crew, sharing one stage library and the storage
 * lists that go with it.
 *
 * A team is a row, its people are rows, and so is every stage and storage list
 * it shares. The stage dialog lists the team's stages under your own, and the
 * storage menu lists the team's lists under yours: open one and it is the same
 * list on every account in the team, with no JSON file emailed anywhere.
 *
 * What is shown here is a copy kept in this browser, refreshed when you sign
 * in, when the tab comes back, and after every change you make. Who may read
 * and write each row is decided on the server by row level security, and a
 * team can only be created, grown or written to while its owner's plan
 * includes teams.
 *
 * Two people editing the same shared storage list at the same moment: the
 * last one to save wins. Stages are replaced whole, by name.
 */
window.TeamLibrary = (function () {
    'use strict';

    const CACHE_KEY = 'stageplanner.team.v1';
    const SAVE_DELAY = 1200;       // ms after the last change to a shared list
    const REFRESH_GAP = 30000;     // ms between refreshes when the tab comes back

    const empty = () => ({ owner: null, teams: [], active: null, stages: [], lists: [], members: [] });
    let cache = empty();
    let lastRefresh = 0;
    const saveTimers = {};

    const byId = (id) => document.getElementById(id);
    const me = () => window.Account && window.Account.current();
    const connected = () => !!(me() && window.Cloud && window.Cloud.available());

    /* ---------------- kept in this browser ---------------- */

    function readCache() {
        try {
            const raw = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (raw && Array.isArray(raw.teams)) cache = Object.assign(empty(), raw);
        } catch (e) { cache = empty(); }
    }

    function writeCache() {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* full, or blocked */ }
    }

    // Custom items travel with the list that uses them.
    function registerCustom() {
        const Cat = window.EquipmentCatalog;
        if (!Cat || !Cat.register) return;
        cache.lists.forEach((list) => (list.custom || []).forEach((item) => {
            try { Cat.register(item); } catch (e) { /* already known, or malformed */ }
        }));
    }

    const team = () => cache.teams.filter((t) => t.id === cache.active)[0] || null;
    const isOwner = () => !!team() && team().role === 'owner';

    function changed() {
        writeCache();
        registerCustom();
        renderSection();
        renderDialog();
        if (window.EquipmentPanel && window.EquipmentPanel.refreshLists) window.EquipmentPanel.refreshLists();
        if (window.StageBuilder && window.StageBuilder.refreshLibrary) window.StageBuilder.refreshLibrary();
    }

    /* ---------------- reading the team ---------------- */

    async function refresh() {
        const who = me();
        if (!who || !connected()) return;
        lastRefresh = Date.now();

        const rows = await window.Cloud.rest('GET',
            'team_members?select=role,team:teams(id,name)&user_id=eq.' + encodeURIComponent(who.id));
        cache.owner = who.id;
        cache.teams = (rows || [])
            .filter((r) => r.team)
            .map((r) => ({ id: r.team.id, name: r.team.name, role: r.role }))
            .sort((a, b) => a.name.localeCompare(b.name));
        if (!team()) cache.active = cache.teams.length ? cache.teams[0].id : null;

        if (!cache.active) {
            cache.stages = [];
            cache.lists = [];
            cache.members = [];
            changed();
            return;
        }

        const id = cache.active;
        const q = 'team_id=eq.' + encodeURIComponent(id);
        const [stages, lists, members] = await Promise.all([
            window.Cloud.rest('GET', 'team_stages?select=id,name,config,updated_at&order=name&' + q),
            window.Cloud.rest('GET', 'team_storage?select=id,name,items,custom,updated_at&order=name&' + q),
            window.Cloud.rest('GET', 'team_members?select=user_id,role,email&order=role.desc,email&' + q)
        ]);
        if (cache.active !== id) return;       // switched team while this was loading

        cache.stages = stages || [];
        // The storage panel holds on to list objects, so the same objects are
        // updated in place, and a list with a save still pending is left alone.
        cache.lists = (lists || []).map((row) => {
            const held = cache.lists.filter((l) => l.id === row.id)[0];
            if (held && saveTimers[row.id]) return held;
            const list = held || { id: row.id };
            list.name = row.name;
            list.items = Array.isArray(row.items) ? row.items : [];
            list.custom = Array.isArray(row.custom) ? row.custom : [];
            return list;
        });
        cache.members = members || [];
        changed();
    }

    function refreshQuietly() {
        refresh().catch((err) => { if (window.console) console.warn('Team refresh failed:', err.message || err); });
    }

    // A delete the rules refuse deletes nothing and says nothing, so ask for
    // the rows back and treat none as a refusal.
    async function remove(path) {
        const rows = await window.Cloud.rest('DELETE', path, undefined, 'return=representation');
        if (!rows || !rows.length) throw new Error('You are not allowed to do that, or it is already gone.');
        return rows;
    }

    /* ---------------- teams and people ---------------- */

    async function createTeam(name) {
        const id = await window.Cloud.rpc('create_team', { p_name: name });
        cache.active = id;
        await refresh();
    }

    async function addMember(email) {
        await window.Cloud.rpc('add_team_member', { p_team: cache.active, p_email: email });
        await refresh();
    }

    async function removeMember(userId) {
        await remove('team_members?team_id=eq.' + encodeURIComponent(cache.active) +
            '&user_id=eq.' + encodeURIComponent(userId));
        await refresh();
    }

    async function leaveTeam() {
        await removeMember(me().id);
        cache.active = null;
        await refresh();
    }

    async function deleteTeam() {
        await remove('teams?id=eq.' + encodeURIComponent(cache.active));
        cache.active = null;
        await refresh();
    }

    function setActive(id) {
        if (id === cache.active) return;
        cache.active = id;
        cache.stages = [];
        cache.lists = [];
        cache.members = [];
        changed();
        refreshQuietly();
    }

    /* ---------------- the shared stage library ---------------- */

    async function saveStage(cfg) {
        const rows = await window.Cloud.rest('POST',
            'team_stages?on_conflict=team_id,name&select=id,name,config,updated_at',
            { team_id: cache.active, name: cfg.name, config: cfg },
            'resolution=merge-duplicates,return=representation');
        const row = rows[0];
        cache.stages = cache.stages.filter((s) => s.id !== row.id && s.name !== row.name).concat([row])
            .sort((a, b) => a.name.localeCompare(b.name));
        changed();
        return row;
    }

    async function deleteStage(id) {
        await remove('team_stages?id=eq.' + encodeURIComponent(id));
        cache.stages = cache.stages.filter((s) => s.id !== id);
        changed();
    }

    /* ---------------- shared storage lists ---------------- */

    async function createList(name, items, custom) {
        const rows = await window.Cloud.rest('POST', 'team_storage?select=id,name,items,custom',
            { team_id: cache.active, name: name, items: items, custom: custom || [] },
            'return=representation');
        const row = rows[0];
        const list = { id: row.id, name: row.name, items: row.items || [], custom: row.custom || [] };
        cache.lists.push(list);
        changed();
        return list;
    }

    // Called by the storage panel every time it saves a shared list.
    function saveListSoon(list) {
        writeCache();
        clearTimeout(saveTimers[list.id]);
        saveTimers[list.id] = setTimeout(async () => {
            try {
                await window.Cloud.rest('PATCH', 'team_storage?id=eq.' + encodeURIComponent(list.id),
                    { name: list.name, items: list.items, custom: list.custom || [] }, 'return=minimal');
            } catch (err) {
                if (window.console) console.warn('Shared storage list not saved:', err.message || err);
            } finally {
                delete saveTimers[list.id];
            }
        }, SAVE_DELAY);
    }

    async function deleteList(id) {
        clearTimeout(saveTimers[id]);
        delete saveTimers[id];
        await remove('team_storage?id=eq.' + encodeURIComponent(id));
        cache.lists = cache.lists.filter((l) => l.id !== id);
        changed();
    }

    /* ---------------- the account panel ---------------- */

    function setText(id, text) {
        const node = byId(id);
        if (node) node.textContent = text;
    }

    const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

    // Unknown until the plan has loaded, and the server has the last word anyway.
    function mayCreate() {
        const B = window.Billing;
        return !B || B.plan() === null || B.isPaid();
    }

    function renderSection() {
        const section = byId('teamSection');
        if (!section) return;
        section.hidden = !me();
        if (!me()) return;

        const t = team();
        const pick = byId('teamPick');
        if (pick) {
            pick.hidden = cache.teams.length < 2;
            if (!pick.hidden) {
                pick.innerHTML = '';
                cache.teams.forEach((x) => pick.appendChild(new Option(x.name, x.id)));
                pick.value = cache.active || '';
            }
        }

        setText('teamName', t ? t.name : 'No team yet');
        setText('teamNote', t
            ? plural(cache.members.length, 'person') .replace('persons', 'people') + ' · ' +
              plural(cache.stages.length, 'shared stage') + ' · ' + plural(cache.lists.length, 'shared storage list')
            : mayCreate()
                ? 'A team shares one stage library and its storage lists between accounts, for a venue and its crew.'
                : 'A team shares a stage library and storage lists between accounts. Teams come with the paid plan.');

        const create = byId('teamCreateBtn');
        if (create) {
            create.textContent = t ? 'New team…' : 'Create team…';
            create.disabled = !mayCreate();
        }
        const members = byId('teamMembersBtn');
        if (members) members.hidden = !t;
    }

    function el(tag, cls, text) {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function dialogError(message) {
        const node = byId('teamError');
        if (!node) return;
        node.textContent = message || '';
        node.hidden = !message;
    }

    function renderDialog() {
        const dialog = byId('teamDialog');
        if (!dialog || dialog.hidden) return;
        const t = team();
        if (!t) { dialog.hidden = true; return; }

        setText('teamDialogTitle', t.name);
        const host = byId('teamMemberList');
        host.textContent = '';
        cache.members.forEach((m) => {
            const row = el('div', 'cloudRow');
            const text = el('div', 'cloudRowText');
            text.appendChild(el('b', '', m.email || 'Someone'));
            text.appendChild(el('span', '', (m.role === 'owner' ? 'Owner' : 'Member') +
                (me() && m.user_id === me().id ? ' · you' : '')));
            row.appendChild(text);
            if (isOwner() && m.user_id !== me().id) {
                const btn = el('button', 'btn btn--danger', 'Remove');
                btn.type = 'button';
                btn.addEventListener('click', () => {
                    if (!confirm('Take ' + (m.email || 'this person') + ' out of ' + t.name + '?')) return;
                    removeMember(m.user_id).catch((err) => dialogError(err.message));
                });
                row.appendChild(btn);
            }
            host.appendChild(row);
        });

        const form = byId('teamAddForm');
        if (form) form.hidden = !isOwner();
        const leave = byId('teamLeaveBtn');
        if (leave) leave.hidden = isOwner();
        const del = byId('teamDeleteBtn');
        if (del) del.hidden = !isOwner();
    }

    function openDialog() {
        const dialog = byId('teamDialog');
        if (!dialog || !team()) return;
        if (window.TopBar) window.TopBar.closeMenus();
        dialogError('');
        dialog.hidden = false;
        renderDialog();
        refreshQuietly();
    }

    function closeDialog() {
        const dialog = byId('teamDialog');
        if (dialog) dialog.hidden = true;
    }

    function wire() {
        const create = byId('teamCreateBtn');
        if (create) {
            create.addEventListener('click', () => {
                const name = prompt('Name the team — the venue, company or production:');
                if (!name || !name.trim()) return;
                create.disabled = true;
                createTeam(name.trim())
                    .catch((err) => alert('The team could not be created: ' + (err.message || err)))
                    .finally(() => renderSection());
            });
        }

        const pick = byId('teamPick');
        if (pick) pick.addEventListener('change', () => setActive(pick.value));

        const members = byId('teamMembersBtn');
        if (members) members.addEventListener('click', openDialog);

        const dialog = byId('teamDialog');
        if (!dialog) return;
        dialog.querySelector('.modalClose').addEventListener('click', closeDialog);
        dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(); });
        dialog.addEventListener('keydown', (e) => e.stopPropagation());
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !dialog.hidden) closeDialog(); });

        byId('teamAddForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const field = byId('teamAddEmail');
            const email = (field.value || '').trim();
            if (!email || email.indexOf('@') < 1) { dialogError('That does not look like an email address.'); return; }
            const btn = byId('teamAddBtn');
            btn.disabled = true;
            dialogError('');
            addMember(email)
                .then(() => { field.value = ''; })
                .catch((err) => dialogError(err.message || String(err)))
                .finally(() => { btn.disabled = false; });
        });

        byId('teamLeaveBtn').addEventListener('click', () => {
            const t = team();
            if (!t || !confirm('Leave ' + t.name + '? Its shared stages and storage lists disappear from this browser.')) return;
            leaveTeam().then(closeDialog).catch((err) => dialogError(err.message));
        });

        byId('teamDeleteBtn').addEventListener('click', () => {
            const t = team();
            if (!t) return;
            const typed = prompt('Delete ' + t.name + ' for everyone in it? Its shared stages and storage lists are deleted. ' +
                'Copies people saved in their own browsers stay.\n\nType the team name to confirm:');
            if (typed === null) return;
            if (typed.trim() !== t.name) { dialogError('The name did not match, so nothing was deleted.'); return; }
            deleteTeam().then(closeDialog).catch((err) => dialogError(err.message));
        });
    }

    /* ---------------- start ---------------- */

    function init() {
        wire();
        renderSection();

        if (window.Account) {
            window.Account.onChange((who) => {
                if (!who) {
                    // the next person to sign in here does not see this team
                    cache = empty();
                    changed();
                    return;
                }
                if (cache.owner && cache.owner !== who.id) {
                    cache = empty();
                    changed();
                }
                refreshQuietly();
            });
        }
        if (window.Billing) window.Billing.onChange(renderSection);

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && connected() && Date.now() - lastRefresh > REFRESH_GAP) refreshQuietly();
        });
    }

    readCache();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        team: team,
        stages: () => cache.stages.slice(),
        stage: (id) => cache.stages.filter((s) => s.id === id)[0] || null,
        saveStage: saveStage,
        deleteStage: deleteStage,
        lists: () => cache.lists.slice(),
        list: (id) => cache.lists.filter((l) => l.id === id)[0] || null,
        createList: createList,
        saveListSoon: saveListSoon,
        deleteList: deleteList,
        refresh: refresh
    };
})();

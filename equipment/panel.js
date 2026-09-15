/*
 * panel.js — the sidebar: your own kit list, and the window that edits it.
 *
 * Storage lives in localStorage, so the strip on the left is whatever you last
 * set it to. You can keep several lists and switch between them, add your own
 * items with real measurements, and move a list to another machine as a JSON
 * file.
 *
 * The rail is only the strip you drag from. Everything that changes what is in
 * storage — searching the catalogue, browsing it, removing and reordering —
 * happens in the window that Edit opens.
 *
 * What the app now calls storage it used to call a palette. The saved key and
 * the saved property are still spelled the old way on purpose, so a kit list
 * saved before the rename still loads.
 */
window.EquipmentPanel = (function () {
  'use strict';

  var STORE_KEY = 'stageplanner.palettes.v1';
  var Cat = window.EquipmentCatalog;
  var Scale = window.StageScale;

  var store = null;
  var editMode = false;
  var dragFrom = -1;

  var ICON_LABELS = {
    'speaker-array': 'Line array',
    'speaker-point': 'Point source',
    'speaker-sub': 'Subwoofer',
    'speaker-wedge': 'Monitor / wedge',
    'speaker-studio': 'Studio monitor',
    'speaker-column': 'Column',
    'speaker-ceiling': 'Ceiling speaker',
    'mic-handheld': 'Handheld mic',
    'mic-dynamic-small': 'Instrument mic',
    'mic-wireless': 'Wireless handheld',
    'mic-pencil': 'Pencil condenser',
    'mic-condenser-large': 'Large diaphragm',
    'mic-kick': 'Kick drum mic',
    'mic-clip': 'Clip-on',
    'mic-boundary': 'Boundary / PZM',
    'mic-shotgun': 'Shotgun',
    'mic-ribbon': 'Ribbon',
    'mic-gooseneck': 'Gooseneck',
    'mic-headset': 'Headset',
    'mic-lav': 'Lavalier',
    'mic-hanging': 'Hanging',
    'mic-bodypack': 'Bodypack',
    'riser': 'Riser',
    'drumkit': 'Drum kit',
    'piano-grand': 'Grand piano',
    'piano-upright': 'Upright piano',
    'amp-cab': 'Amplifier',
    'keyboard': 'Keyboard',
    'stand-mic': 'Stand (tripod)',
    'stand-round': 'Stand (round base)',
    'music-stand': 'Music stand',
    'chair': 'Chair',
    'table': 'Table',
    'person': 'Person',
    'monitor-tv': 'Screen',
    'screen': 'Projection screen',
    'di-box': 'Box',
    'power': 'Power',
    'laptop': 'Laptop',
    'orch-violin': 'Violin',
    'orch-viola': 'Viola',
    'orch-cello': 'Cello',
    'orch-double-bass': 'Double bass',
    'orch-harp': 'Harp',
    'orch-flute': 'Flute',
    'orch-piccolo': 'Piccolo',
    'orch-oboe': 'Oboe',
    'orch-cor-anglais': 'Cor anglais',
    'orch-clarinet': 'Clarinet',
    'orch-bass-clarinet': 'Bass clarinet',
    'orch-bassoon': 'Bassoon',
    'orch-contrabassoon': 'Contrabassoon',
    'orch-saxophone': 'Saxophone',
    'orch-horn': 'Horn',
    'orch-trumpet': 'Trumpet',
    'orch-trombone': 'Trombone',
    'orch-bass-trombone': 'Bass trombone',
    'orch-tuba': 'Tuba',
    'orch-timpani': 'Timpani',
    'orch-snare-drum': 'Snare drum',
    'orch-bass-drum': 'Bass drum',
    'orch-cymbals': 'Cymbals',
    'orch-marimba': 'Marimba',
    'orch-xylophone': 'Xylophone',
    'orch-vibraphone': 'Vibraphone',
    'orch-glockenspiel': 'Glockenspiel',
    'orch-tubular-bells': 'Tubular bells',
    'orch-tam-tam': 'Tam-tam',
    'orch-celesta': 'Celesta',
    'orch-harpsichord': 'Harpsichord',
    'orch-podium': 'Conductor podium',
    'mus-guitar-acoustic': 'Acoustic guitar',
    'mus-guitar-classical': 'Classical guitar',
    'mus-guitar-electric': 'Electric guitar',
    'mus-bass-electric': 'Bass guitar',
    'mus-ukulele': 'Ukulele',
    'mus-mandolin': 'Mandolin',
    'mus-banjo': 'Banjo',
    'mus-fiddle': 'Fiddle',
    'mus-accordion': 'Accordion',
    'mus-keys': 'Keyboard player',
    'mus-pianist': 'Pianist',
    'mus-drummer': 'Drummer',
    'mus-congas': 'Congas',
    'mus-cajon': 'Cajón',
    'mus-bongos': 'Bongos',
    'mus-singer': 'Singer with mic stand',
    'mus-saxophone': 'Saxophonist',
    'mus-trumpet': 'Trumpet player',
    'mus-dj': 'DJ',
    'generic': 'Rectangle'
  };

  /* ---------------- storage ---------------- */

  function freshStore() {
    return {
      version: 1,
      active: 'standard',
      palettes: [
        { id: 'standard', name: 'Storage1', items: Cat.defaultStorage.slice() }
      ],
      custom: []
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.palettes && s.palettes.length) { store = s; }
      }
    } catch (e) { /* fall through to defaults */ }
    if (!store) store = freshStore();
    if (!store.custom) store.custom = [];
    // The list everyone starts with was called Standard. A kit list saved
    // under the old name opens as Storage1, unless it has been renamed since,
    // which is a name of someone's own choosing and is left alone.
    var seeded = store.palettes.filter(function (x) { return x.id === 'standard'; })[0];
    if (seeded && seeded.name === 'Standard') {
      seeded.name = 'Storage1';
      persist();
    }
    // Item IDs moved when the catalogue was translated; map anything saved
    // under an old ID onto its current one, and write the result back so the
    // stored list stops depending on the alias table.
    if (Cat.resolveId) {
      var moved = false;
      store.palettes.forEach(function (p) {
        p.items = (p.items || []).map(function (id) {
          var now = Cat.resolveId(id);
          if (now !== id) moved = true;
          return now;
        });
      });
      if (moved) persist();
    }
    store.custom.forEach(function (it) { Cat.register(it); });
  }

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
    var shared = teamList(store.active);
    if (shared) {
      shared.custom = customFor(shared);
      window.TeamLibrary.saveListSoon(shared);
    }
  }

  /* A list shared with the team lives in TeamLibrary rather than in this
     browser's store, and is chosen by the id 'team:<row id>'. */
  function teamList(id) {
    if (!id || String(id).indexOf('team:') !== 0 || !window.TeamLibrary) return null;
    return window.TeamLibrary.list(String(id).slice(5));
  }

  // The custom items a list uses, from this browser and from the team, once each.
  function customFor(list) {
    var seen = {};
    return store.custom.concat(list.custom || []).filter(function (c) {
      if (!c || list.items.indexOf(c.id) === -1 || seen[c.id]) return false;
      seen[c.id] = true;
      return true;
    });
  }

  function activeStorage() {
    var shared = teamList(store.active);
    if (shared) return shared;
    for (var i = 0; i < store.palettes.length; i++) {
      if (store.palettes[i].id === store.active) return store.palettes[i];
    }
    store.active = store.palettes[0].id;
    return store.palettes[0];
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  }

  /* ---------------- small DOM helpers ---------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  /* ---------------- storage strip ---------------- */

  /* On the rail a tile is dragged onto the stage; in the edit window it is
     dragged to reorder and carries its own remove button. */
  function storageTile(item, index, editable) {
    var tile = el('div', 'eqTile');
    tile.draggable = true;
    tile.dataset.eid = item.id;
    tile.dataset.index = String(index);
    tile.title = Scale.tooltip(item) +
      (editable ? '\nDrag to reorder' : '\nTap to place it on the stage, or drag it there');
    tile.appendChild(Scale.thumb(item));

    var cap = el('span', 'eqTileCap', Scale.shortLabel(item));
    tile.appendChild(cap);

    if (editable) {
      var rm = el('button', 'eqTileRemove', '✕');
      rm.title = 'Remove from storage';
      rm.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var p = activeStorage();
        p.items.splice(index, 1);
        persist();
        renderStorage();
      });
      tile.appendChild(rm);
    }
    return tile;
  }

  function fillStorage(host, editable, emptyText) {
    if (!host) return;
    clear(host);

    var p = activeStorage();
    if (!p.items.length) {
      host.appendChild(el('div', 'eqEmpty', emptyText));
      return;
    }

    p.items.forEach(function (id, i) {
      var item = Cat.get(id);
      if (!item) return;
      host.appendChild(storageTile(item, i, editable));
    });
  }

  /* The rail strip, and the copy in the edit window while that is open. */
  function renderStorage() {
    fillStorage(document.getElementById('eqStorage'), false,
      'Empty. Press Edit to search the catalogue.');

    var name = document.getElementById('eqEditStorageName');
    if (name) name.textContent = activeStorage().name;
    fillStorage(document.getElementById('eqStorageEdit'), true,
      'Nothing here yet. Press + on a result to put it in storage.');
  }

  /* Reordering, on the copy of the storage inside the edit window. */
  function bindStorageReorder() {
    var host = document.getElementById('eqStorageEdit');
    if (!host) return;

    host.addEventListener('dragstart', function (e) {
      var tile = e.target.closest('.eqTile');
      if (!tile) return;
      dragFrom = parseInt(tile.dataset.index, 10);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', 'reorder'); } catch (err) {}
      tile.classList.add('isDragging');
    });

    host.addEventListener('dragend', function (e) {
      var tile = e.target.closest('.eqTile');
      if (tile) tile.classList.remove('isDragging');
      dragFrom = -1;
    });

    host.addEventListener('dragover', function (e) {
      if (dragFrom < 0) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    host.addEventListener('drop', function (e) {
      if (dragFrom < 0) return;
      e.preventDefault();
      var tile = e.target.closest('.eqTile');
      var to = tile ? parseInt(tile.dataset.index, 10) : activeStorage().items.length - 1;
      var p = activeStorage();
      var moved = p.items.splice(dragFrom, 1)[0];
      p.items.splice(to, 0, moved);
      dragFrom = -1;
      persist();
      renderStorage();
    });
  }

  /* ---------------- search ---------------- */

  function resultRow(item) {
    var row = el('div', 'eqResult');
    row.dataset.eid = item.id;
    row.title = 'Tap to place it on the stage, or press + to keep it in the rail';

    var pic = el('div', 'eqResultPic');
    pic.appendChild(Scale.thumb(item, 26));
    row.appendChild(pic);

    var txt = el('div', 'eqResultText');
    txt.appendChild(el('div', 'eqResultName', item.name));
    var meta = item.sub + ' · ' + Scale.dimText(item);
    txt.appendChild(el('div', 'eqResultMeta', meta));
    row.appendChild(txt);

    var addBtn = el('button', 'eqAdd', '+');
    addBtn.title = 'Add to storage';
    row.appendChild(addBtn);

    /* The whole row adds, so the + reads as a label as much as a button and a
       near miss still lands. */
    row.addEventListener('click', function () {
      addToStorage(item.id);
      addBtn.textContent = '✓';
      setTimeout(function () { addBtn.textContent = '+'; }, 900);
    });

    return row;
  }

  function addToStorage(id) {
    var p = activeStorage();
    if (p.items.indexOf(id) === -1) {
      p.items.push(id);
      persist();
      renderStorage();
    }
  }

  /* An empty box says nothing, so an emptied search falls back to the browse
     list rather than leaving the window blank. */
  function renderResults(query) {
    var box = document.getElementById('eqResults');
    if (!box) return;
    if (!query) { renderBrowse(); return; }

    clear(box);
    box.classList.remove('isBrowsing');
    box.scrollTop = 0;
    var hits = Cat.search(query, 40);

    if (!hits.length) {
      box.appendChild(el('div', 'eqEmpty', 'Nothing found. Try a brand, model or type.'));
      return;
    }
    hits.forEach(function (it) { box.appendChild(resultRow(it)); });
  }

  /* Full catalogue, for when you do not know what it is called. One dropdown
     per category, all shut to begin with, so the whole library is five lines
     until you open the one you want. Rows are built on first open. */
  function renderBrowse() {
    var box = document.getElementById('eqResults');
    if (!box) return;
    clear(box);
    box.classList.add('isBrowsing');
    box.scrollTop = 0;

    Cat.categories().forEach(function (cat) {
      var subs = Cat.subcategories(cat.id);
      var total = 0;
      subs.forEach(function (sub) { total += Cat.inCategory(cat.id, sub).length; });
      if (!total) return;

      var group = el('details', 'eqCatGroup');
      var head = el('summary', 'eqCatHead');
      head.appendChild(el('span', 'eqCatName', cat.label));
      head.appendChild(el('span', 'eqCatCount', String(total)));
      group.appendChild(head);

      var body = el('div', 'eqCatBody');
      group.appendChild(body);

      var filled = false;
      group.addEventListener('toggle', function () {
        if (group.open && !filled) {
          filled = true;
          subs.forEach(function (sub) {
            var rows = Cat.inCategory(cat.id, sub);
            if (!rows.length) return;
            body.appendChild(el('div', 'eqSubHead', sub));
            rows.forEach(function (it) { body.appendChild(resultRow(it)); });
          });
        }
      });

      box.appendChild(group);
    });
  }

  /* ---------------- storage management menu ---------------- */

  function openStorageMenu(open) {
    var menu = document.getElementById('eqStorageMenu');
    var btn = document.getElementById('eqStorageBtn');
    if (!menu) return;
    menu.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* The menu under the floppy says which list you are working out of, above
     the actions that same list answers to. The button carries the name in its
     tooltip, since it has no room to show one. */
  function renderStorageMenu() {
    var btn = document.getElementById('eqStorageBtn');
    if (btn) btn.title = 'Storage: ' + activeStorage().name + ' · switch, save, copy, import and export';

    var picks = document.getElementById('eqStoragePicks');
    if (!picks) return;
    clear(picks);
    var pick = function (id, name) {
      var on = id === store.active;
      var b = el('button', 'eqMenuItem eqMenuPick' + (on ? ' is-on' : ''));
      b.type = 'button';
      b.title = name;
      b.appendChild(el('span', 'eqPickMark', on ? '✓' : ''));
      b.appendChild(el('span', 'eqPickName', name));
      b.addEventListener('click', function () {
        openStorageMenu(false);
        if (on) return;
        store.active = id;
        persist();
        renderStorageMenu();
        renderStorage();
      });
      picks.appendChild(b);
    };
    store.palettes.forEach(function (p) { pick(p.id, p.name); });

    // the team's lists, the same on every account in it
    var lib = window.TeamLibrary;
    var team = lib && lib.team();
    if (team) {
      picks.appendChild(el('div', 'eqMenuHead', 'Team · ' + team.name));
      var lists = lib.lists();
      if (!lists.length) picks.appendChild(el('div', 'eqMenuNote', 'Nothing shared yet'));
      lists.forEach(function (l) { pick('team:' + l.id, l.name); });
    }
  }

  function newStorage(copyCurrent) {
    var name = prompt('Storage name:', copyCurrent ? activeStorage().name + ' (copy)' : 'New storage');
    if (!name) return;
    var p = { id: uid('pal'), name: name, items: copyCurrent ? activeStorage().items.slice() : [] };
    store.palettes.push(p);
    store.active = p.id;
    persist();
    renderStorageMenu();
    renderStorage();
  }

  function renameStorage() {
    var p = activeStorage();
    var name = prompt('New name:', p.name);
    if (!name) return;
    p.name = name;
    persist();
    renderStorageMenu();
  }

  function deleteStorage() {
    var shared = teamList(store.active);
    if (shared) {
      if (!confirm('Delete "' + shared.name + '" from the team, for everyone in it?')) return;
      window.TeamLibrary.deleteList(shared.id).then(function () {
        store.active = store.palettes[0].id;
        persist();
        renderStorageMenu();
        renderStorage();
      }, function (err) { alert('Could not delete the shared list: ' + err.message); });
      return;
    }
    if (store.palettes.length < 2) {
      alert('You need at least one storage list.');
      return;
    }
    var p = activeStorage();
    if (!confirm('Delete "' + p.name + '"?')) return;
    store.palettes = store.palettes.filter(function (x) { return x.id !== p.id; });
    store.active = store.palettes[0].id;
    persist();
    renderStorageMenu();
    renderStorage();
  }

  /* Puts a copy of this list in the team and switches to it, so from then on
     everyone in the team works out of the same list. */
  function shareStorage() {
    var lib = window.TeamLibrary;
    if (!lib || !lib.team()) {
      alert('Create or join a team first, under Account in the top bar.');
      return;
    }
    var p = activeStorage();
    if (teamList(store.active)) {
      alert('"' + p.name + '" is already shared with the team.');
      return;
    }
    lib.createList(p.name, p.items.slice(), customFor(p)).then(function (list) {
      store.active = 'team:' + list.id;
      persist();
      renderStorageMenu();
      renderStorage();
    }, function (err) { alert('Could not share the list: ' + err.message); });
  }

  function exportStorage() {
    var p = activeStorage();
    var payload = {
      stageplanner: 'storage',
      version: 1,
      name: p.name,
      items: p.items,
      custom: store.custom.filter(function (c) { return p.items.indexOf(c.id) !== -1; })
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = p.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '-storage.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function importStorage() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (!data || !data.items) throw new Error('bad file');
          (data.custom || []).forEach(function (c) {
            if (Cat.register(c)) store.custom.push(c);
          });
          var p = { id: uid('pal'), name: data.name || 'Imported', items: data.items };
          store.palettes.push(p);
          store.active = p.id;
          persist();
          renderStorageMenu();
          renderStorage();
        } catch (e) {
          alert('Could not read the file.');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function resetStorage() {
    if (!confirm('Reset this storage list to the default selection?')) return;
    activeStorage().items = Cat.defaultStorage.slice();
    persist();
    renderStorage();
  }

  /* ---------------- custom items ---------------- */

  function openCustomForm() {
    var box = document.getElementById('eqCustomForm');
    if (!box) return;
    box.hidden = !box.hidden;
    if (!box.hidden) box.querySelector('input').focus();
  }

  function buildCustomForm() {
    var box = el('div', 'eqCustomForm');
    box.id = 'eqCustomForm';
    box.hidden = true;

    var name = el('input', 'eqField');
    name.placeholder = 'Name, e.g. "Sidefill L"';

    var w = el('input', 'eqField eqNum');
    w.type = 'number'; w.min = '1'; w.step = '1'; w.value = '60';
    w.placeholder = 'Width cm';

    var d = el('input', 'eqField eqNum');
    d.type = 'number'; d.min = '1'; d.step = '1'; d.value = '45';
    d.placeholder = 'Depth cm';

    var icon = el('select', 'eqField');
    window.EquipmentIcons.names().forEach(function (n) {
      var o = el('option', null, ICON_LABELS[n] || n);
      o.value = n;
      icon.appendChild(o);
    });
    icon.value = 'speaker-point';

    var mode = el('select', 'eqField');
    [['real', 'To scale'], ['symbol', 'Fixed symbol size']].forEach(function (m) {
      var o = el('option', null, m[1]);
      o.value = m[0];
      mode.appendChild(o);
    });

    var save = el('button', 'eqBtn eqBtnPrimary', 'Add');
    save.addEventListener('click', function () {
      var label = (name.value || '').trim();
      if (!label) { name.focus(); return; }
      var item = {
        id: uid('custom'),
        brand: '',
        model: label,
        name: label,
        cat: 'other',
        sub: 'Custom',
        mode: mode.value,
        w: Math.max(0.01, (parseFloat(w.value) || 60) / 100),
        d: Math.max(0.01, (parseFloat(d.value) || 45) / 100),
        h: 0.5,
        icon: icon.value,
        tags: 'custom ' + label.toLowerCase()
      };
      Cat.register(item);
      store.custom.push(item);
      addToStorage(item.id);
      persist();
      name.value = '';
      box.hidden = true;
    });

    var row1 = el('div', 'eqFormRow');
    row1.appendChild(name);
    var row2 = el('div', 'eqFormRow');
    row2.appendChild(w); row2.appendChild(el('span', 'eqUnit', '×')); row2.appendChild(d);
    row2.appendChild(el('span', 'eqUnit', 'cm'));
    var row3 = el('div', 'eqFormRow');
    row3.appendChild(icon); row3.appendChild(mode);
    var row4 = el('div', 'eqFormRow');
    row4.appendChild(save);

    box.appendChild(row1); box.appendChild(row2); box.appendChild(row3); box.appendChild(row4);
    return box;
  }

  /* ---------------- the edit window ---------------- */

  /* Searching the catalogue, browsing it and taking things back out are all
     one job, so they share one window instead of crowding the rail. The rail
     keeps the strip you drag from. */
  function buildEditDialog() {
    var wrap = el('div', 'modal eqEditModal');
    wrap.id = 'eqEditDialog';
    wrap.hidden = true;

    var box = el('div', 'modalBox eqEditBox');
    wrap.appendChild(box);

    var close = el('button', 'modalClose', '✖');
    close.title = 'Close';
    close.addEventListener('click', closeEditDialog);
    box.appendChild(close);

    box.appendChild(el('div', 'modalTitle', 'Edit storage'));

    var grid = el('div', 'eqEditGrid');
    box.appendChild(grid);

    /* left: the catalogue, searched or browsed */
    var left = el('div', 'eqEditCol');
    left.appendChild(el('div', 'eqEditHead', 'Catalogue'));

    var searchWrap = el('div', 'eqSearchWrap');
    var search = el('input', 'eqSearch');
    search.id = 'eqSearch';
    search.type = 'search';
    search.autocomplete = 'off';
    search.placeholder = 'Search: sm58, d&b v8, wedge, riser…';
    searchWrap.appendChild(search);

    var browseBtn = el('button', 'eqBtn eqBrowse', '⊞ Browse all');
    browseBtn.title = 'Browse the whole catalogue';
    searchWrap.appendChild(browseBtn);
    left.appendChild(searchWrap);

    var results = el('div', 'eqResults');
    results.id = 'eqResults';
    left.appendChild(results);
    grid.appendChild(left);

    var timer = null;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { renderResults(search.value.trim()); }, 90);
    });
    browseBtn.addEventListener('click', function () {
      search.value = '';
      renderBrowse();
      search.focus();
    });

    /* right: what is in storage as you work */
    var right = el('div', 'eqEditCol');
    var head = el('div', 'eqEditHead', 'In ');
    var name = el('span', 'eqEditStorageName');
    name.id = 'eqEditStorageName';
    head.appendChild(name);
    right.appendChild(head);

    var storage = el('div', 'eqStorage isEditing');
    storage.id = 'eqStorageEdit';
    right.appendChild(storage);
    right.appendChild(el('div', 'eqEditHint',
      'Drag a tile to reorder it. ✕ takes it out of storage.'));
    grid.appendChild(right);

    var foot = el('div', 'eqEditFoot');
    var done = el('button', 'btn btn--primary', 'Done');
    done.addEventListener('click', closeEditDialog);
    foot.appendChild(done);
    box.appendChild(foot);

    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) closeEditDialog();
    });

    return wrap;
  }

  function openEditDialog() {
    var dlg = document.getElementById('eqEditDialog');
    if (!dlg) return;
    editMode = true;
    dlg.hidden = false;

    var search = document.getElementById('eqSearch');
    if (search) search.value = '';
    renderBrowse();
    renderStorage();
    if (search) search.focus();
  }

  function closeEditDialog() {
    var dlg = document.getElementById('eqEditDialog');
    if (!dlg) return;
    editMode = false;
    dragFrom = -1;
    dlg.hidden = true;
  }

  /* ---------------- scale controls ---------------- */

  /* How the gear is drawn, which is the rail's business. How big the
     stage is belongs to the stage itself, and is set under Stage Setup. */
  function buildScaleControls() {
    var wrap = el('div', 'eqScale');

    var row = el('label', 'eqScaleRow eqCheckRow');
    var chk = el('input');
    chk.type = 'checkbox';
    chk.checked = Scale.settings.showLabels;
    chk.addEventListener('change', function () { Scale.set('showLabels', chk.checked); });
    row.appendChild(chk);
    row.appendChild(el('span', null, 'Show names on stage'));
    wrap.appendChild(row);

    return wrap;
  }

  /* ---------------- assembly ---------------- */

  function build() {
    var host = document.getElementById('eqPanel');
    if (!host) return;

    /* Storage lists and everything you can do to one, behind one floppy in
       the rail's own heading: the menu answers which list you are in before it
       offers the actions, so the button itself needs no label. It sits in the
       heading rather than in the panel, which is why this reaches past its
       host; the menu goes with it so it still hangs off the button. */
    var titleRow = document.querySelector('.railTitle') || host;
    var menuBtn = el('button', 'eqStorageBtn', '💾');
    menuBtn.id = 'eqStorageBtn';
    menuBtn.type = 'button';
    menuBtn.setAttribute('aria-label', 'Storage lists');
    menuBtn.setAttribute('aria-haspopup', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    titleRow.appendChild(menuBtn);

    var menu = el('div', 'eqMenu');
    menu.id = 'eqStorageMenu';
    menu.hidden = true;
    menu.appendChild(el('div', 'eqMenuHead', 'Storage lists'));
    // The lists themselves, rebuilt by renderStorageMenu whenever they change.
    var picks = el('div', 'eqMenuPicks');
    picks.id = 'eqStoragePicks';
    menu.appendChild(picks);
    menu.appendChild(el('div', 'eqMenuSep'));
    [
      ['New storage', function () { newStorage(false); }],
      ['Save as copy', function () { newStorage(true); }],
      ['Share with team', shareStorage],
      ['Rename', renameStorage],
      ['Reset', resetStorage],
      ['Export file', exportStorage],
      ['Import file', importStorage],
      ['Delete storage', deleteStorage]
    ].forEach(function (row) {
      var b = el('button', 'eqMenuItem', row[0]);
      b.type = 'button';
      b.addEventListener('click', function () { openStorageMenu(false); row[1](); });
      menu.appendChild(b);
    });
    titleRow.appendChild(menu);

    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openStorageMenu(menu.hidden);
    });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { openStorageMenu(false); });

    /* storage strip, with its own heading so Edit sits on the thing it edits */
    var box = el('div', 'eqStorageBox');
    var head = el('div', 'eqStorageHead');
    head.appendChild(el('span', 'eqStorageHeadName', 'Storage'));

    var editBtn = el('button', 'eqEditBtn', 'Edit');
    editBtn.title = 'Search the catalogue, and remove or reorder what is in storage';
    editBtn.addEventListener('click', openEditDialog);
    head.appendChild(editBtn);
    box.appendChild(head);

    var storage = el('div', 'equipment-container eqStorage');
    storage.id = 'eqStorage';
    box.appendChild(storage);
    host.appendChild(box);

    /* custom item */
    var customBtn = el('button', 'eqBtn eqCustomBtn', '+ Custom item');
    customBtn.title = 'Create an item with your own measurements';
    customBtn.addEventListener('click', openCustomForm);
    host.appendChild(customBtn);
    host.appendChild(buildCustomForm());

    /* scale */
    host.appendChild(buildScaleControls());

    /* the edit window, on the page from the start so its ids always resolve */
    document.body.appendChild(buildEditDialog());

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var dlg = document.getElementById('eqEditDialog');
      if (dlg && !dlg.hidden) closeEditDialog();
      openStorageMenu(false);
    });

    renderStorageMenu();
    renderStorage();
    bindStorageReorder();
  }

  function init() {
    load();
    build();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    addToStorage: addToStorage,
    activeStorage: function () { return activeStorage(); },
    isEditing: function () { return editMode; },
    openEditor: openEditDialog,
    refresh: renderStorage,
    // stageBuilder.js: the custom items a stage setup uses, to carry in its file
    customItems: function (ids) {
      return store.custom.filter(function (c) { return ids.indexOf(c.id) !== -1; });
    },
    // ...and on the way back in, kept here so they are still known after a reload
    adoptCustom: function (list) {
      var added = false;
      (list || []).forEach(function (c) {
        if (c && c.id && Cat.register(c)) { store.custom.push(c); added = true; }
      });
      if (added) persist();
    },
    // teams.js, when the team's lists change underneath the rail
    refreshLists: function () {
      if (!store || !document.getElementById('eqStorage')) return;
      renderStorageMenu();
      renderStorage();
    }
  };
})();

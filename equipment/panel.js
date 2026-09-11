/*
 * panel.js — the sidebar: search the catalogue, and keep your own kit list.
 *
 * Palettes live in localStorage, so the strip on the left is whatever you last
 * set it to. You can keep several and switch between them, add your own items
 * with real measurements, and move a palette to another machine as a JSON file.
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
    'generic': 'Rectangle'
  };

  /* ---------------- storage ---------------- */

  function freshStore() {
    return {
      version: 1,
      active: 'standard',
      palettes: [
        { id: 'standard', name: 'Standard', items: Cat.defaultPalette.slice() }
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
    // Item IDs moved when the catalogue was translated; map anything saved
    // under an old ID onto its current one, and write the result back so the
    // stored palette stops depending on the alias table.
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
  }

  function activePalette() {
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

  /* ---------------- palette strip ---------------- */

  function paletteTile(item, index) {
    var tile = el('div', 'eqTile');
    tile.draggable = true;
    tile.dataset.eid = item.id;
    tile.dataset.index = String(index);
    tile.title = Scale.tooltip(item) + '\nDrag onto the stage';
    tile.appendChild(Scale.thumb(item));

    var cap = el('span', 'eqTileCap', Scale.shortLabel(item));
    tile.appendChild(cap);

    if (editMode) {
      var rm = el('button', 'eqTileRemove', '✕');
      rm.title = 'Remove from palette';
      rm.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var p = activePalette();
        p.items.splice(index, 1);
        persist();
        renderPalette();
      });
      tile.appendChild(rm);
    }
    return tile;
  }

  function renderPalette() {
    var host = document.getElementById('eqPalette');
    if (!host) return;
    clear(host);
    host.classList.toggle('isEditing', editMode);

    var p = activePalette();
    if (!p.items.length) {
      host.appendChild(el('div', 'eqEmpty', 'Empty. Search for equipment and press + to add it.'));
      return;
    }

    p.items.forEach(function (id, i) {
      var item = Cat.get(id);
      if (!item) return;
      host.appendChild(paletteTile(item, i));
    });
  }

  /* Reordering inside the palette, active only while editing. */
  function bindPaletteReorder() {
    var host = document.getElementById('eqPalette');
    if (!host) return;

    host.addEventListener('dragstart', function (e) {
      var tile = e.target.closest('.eqTile');
      if (!tile) return;
      if (editMode) {
        dragFrom = parseInt(tile.dataset.index, 10);
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', 'reorder'); } catch (err) {}
        tile.classList.add('isDragging');
      }
    });

    host.addEventListener('dragend', function (e) {
      var tile = e.target.closest('.eqTile');
      if (tile) tile.classList.remove('isDragging');
      dragFrom = -1;
    });

    host.addEventListener('dragover', function (e) {
      if (!editMode || dragFrom < 0) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    host.addEventListener('drop', function (e) {
      if (!editMode || dragFrom < 0) return;
      e.preventDefault();
      var tile = e.target.closest('.eqTile');
      var to = tile ? parseInt(tile.dataset.index, 10) : activePalette().items.length - 1;
      var p = activePalette();
      var moved = p.items.splice(dragFrom, 1)[0];
      p.items.splice(to, 0, moved);
      dragFrom = -1;
      persist();
      renderPalette();
    });
  }

  /* ---------------- search ---------------- */

  function resultRow(item) {
    var row = el('div', 'eqResult');
    row.draggable = true;
    row.dataset.eid = item.id;
    row.title = 'Drag straight onto the stage, or press + to add it to the palette';

    var pic = el('div', 'eqResultPic');
    pic.appendChild(Scale.thumb(item, 26));
    row.appendChild(pic);

    var txt = el('div', 'eqResultText');
    txt.appendChild(el('div', 'eqResultName', item.name));
    var meta = item.sub + ' · ' + Scale.dimText(item);
    txt.appendChild(el('div', 'eqResultMeta', meta));
    row.appendChild(txt);

    var addBtn = el('button', 'eqAdd', '+');
    addBtn.title = 'Add to palette';
    addBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      addToPalette(item.id);
      addBtn.textContent = '✓';
      setTimeout(function () { addBtn.textContent = '+'; }, 900);
    });
    row.appendChild(addBtn);

    return row;
  }

  function addToPalette(id) {
    var p = activePalette();
    if (p.items.indexOf(id) === -1) {
      p.items.push(id);
      persist();
      renderPalette();
    }
  }

  /* Anchored to the search box. Fixed rather than absolute so the rail's
     own scrolling cannot clip it. */
  function positionResults() {
    var box = document.getElementById('eqResults');
    var search = document.getElementById('eqSearch');
    if (!box || !search || box.hidden) return;
    var r = search.getBoundingClientRect();
    box.style.left = Math.round(r.left) + 'px';
    box.style.top = Math.round(r.bottom + 6) + 'px';
    var overflow = box.getBoundingClientRect().bottom - (window.innerHeight - 12);
    if (overflow > 0) box.style.top = Math.round(r.bottom + 6 - overflow) + 'px';
  }

  function renderResults(query) {
    var box = document.getElementById('eqResults');
    if (!box) return;
    clear(box);

    if (!query) { box.hidden = true; return; }
    var hits = Cat.search(query, 40);
    box.hidden = false;
    positionResults();

    if (!hits.length) {
      box.appendChild(el('div', 'eqEmpty', 'Nothing found. Try a brand, model or type.'));
      return;
    }
    hits.forEach(function (it) { box.appendChild(resultRow(it)); });
  }

  /* Full catalogue, grouped, for when you do not know what it is called. */
  function renderBrowse() {
    var box = document.getElementById('eqResults');
    if (!box) return;
    clear(box);
    box.hidden = false;
    positionResults();

    Cat.categories().forEach(function (cat) {
      Cat.subcategories(cat.id).forEach(function (sub) {
        var head = el('div', 'eqGroupHead', cat.label + ' · ' + sub);
        box.appendChild(head);
        Cat.inCategory(cat.id, sub).forEach(function (it) {
          box.appendChild(resultRow(it));
        });
      });
    });
  }

  /* ---------------- palette management menu ---------------- */

  function renderPaletteSelect() {
    var sel = document.getElementById('eqPaletteSelect');
    if (!sel) return;
    clear(sel);
    store.palettes.forEach(function (p) {
      var o = el('option', null, p.name);
      o.value = p.id;
      if (p.id === store.active) o.selected = true;
      sel.appendChild(o);
    });
  }

  function newPalette(copyCurrent) {
    var name = prompt('Palette name:', copyCurrent ? activePalette().name + ' (copy)' : 'New palette');
    if (!name) return;
    var p = { id: uid('pal'), name: name, items: copyCurrent ? activePalette().items.slice() : [] };
    store.palettes.push(p);
    store.active = p.id;
    persist();
    renderPaletteSelect();
    renderPalette();
  }

  function renamePalette() {
    var p = activePalette();
    var name = prompt('New name:', p.name);
    if (!name) return;
    p.name = name;
    persist();
    renderPaletteSelect();
  }

  function deletePalette() {
    if (store.palettes.length < 2) {
      alert('You need at least one palette.');
      return;
    }
    var p = activePalette();
    if (!confirm('Delete "' + p.name + '"?')) return;
    store.palettes = store.palettes.filter(function (x) { return x.id !== p.id; });
    store.active = store.palettes[0].id;
    persist();
    renderPaletteSelect();
    renderPalette();
  }

  function exportPalette() {
    var p = activePalette();
    var payload = {
      stageplanner: 'palette',
      version: 1,
      name: p.name,
      items: p.items,
      custom: store.custom.filter(function (c) { return p.items.indexOf(c.id) !== -1; })
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = p.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '-palette.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function importPalette() {
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
          renderPaletteSelect();
          renderPalette();
        } catch (e) {
          alert('Could not read the file.');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function resetPalette() {
    if (!confirm('Reset this palette to the default selection?')) return;
    activePalette().items = Cat.defaultPalette.slice();
    persist();
    renderPalette();
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
      addToPalette(item.id);
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

  /* ---------------- scale controls ---------------- */

  function buildScaleControls() {
    var wrap = el('div', 'eqScale');

    var r1 = el('div', 'eqScaleRow');
    r1.appendChild(el('label', 'eqScaleLabel', 'Stage width'));
    var width = el('input', 'eqField eqNum');
    width.type = 'number'; width.min = '2'; width.max = '80'; width.step = '0.5';
    width.value = String(Scale.settings.stageWidthM);
    width.title = 'How wide the house plan is in reality. Everything drawn to scale follows this number.';
    width.addEventListener('change', function () {
      var v = parseFloat(width.value);
      if (v > 0) Scale.set('stageWidthM', v);
    });
    r1.appendChild(width);
    r1.appendChild(el('span', 'eqUnit', 'm'));
    wrap.appendChild(r1);

    /* A stage drawn from measurements already states its own scale, so the
       manual width only applies to the built-in house plan. */
    var note = el('div', 'eqScaleNote');
    wrap.appendChild(note);

    function syncScaleSource() {
      var fromPlan = Scale.scaleSource() === 'plan';
      width.disabled = fromPlan;
      r1.classList.toggle('isMuted', fromPlan);
      note.textContent = fromPlan
        ? 'Scale comes from the stage you defined.'
        : 'Applies to the built-in house plan.';
    }
    syncScaleSource();
    Scale.onChange(syncScaleSource);

    var r2 = el('div', 'eqScaleRow');
    r2.appendChild(el('label', 'eqScaleLabel', 'Symbol size'));
    var sym = el('input', 'eqRange');
    sym.type = 'range'; sym.min = '12'; sym.max = '48'; sym.step = '1';
    sym.value = String(Scale.settings.symbolPx);
    sym.title = 'The size of microphones and other small gear, which is not drawn to scale.';
    sym.addEventListener('input', function () {
      Scale.set('symbolPx', parseInt(sym.value, 10));
    });
    r2.appendChild(sym);
    wrap.appendChild(r2);

    var r3 = el('label', 'eqScaleRow eqCheckRow');
    var chk = el('input');
    chk.type = 'checkbox';
    chk.checked = Scale.settings.showLabels;
    chk.addEventListener('change', function () { Scale.set('showLabels', chk.checked); });
    r3.appendChild(chk);
    r3.appendChild(el('span', null, 'Show names on stage'));
    wrap.appendChild(r3);

    return wrap;
  }

  /* ---------------- assembly ---------------- */

  function build() {
    var host = document.getElementById('eqPanel');
    if (!host) return;

    /* palette chooser */
    var bar = el('div', 'eqBar');
    var sel = el('select', 'eqPaletteSelect');
    sel.id = 'eqPaletteSelect';
    sel.title = 'Switch palette';
    sel.addEventListener('change', function () {
      store.active = sel.value;
      persist();
      renderPalette();
    });
    bar.appendChild(sel);

    var editBtn = el('button', 'eqIconBtn', '✎');
    editBtn.title = 'Edit the palette: remove and reorder items';
    editBtn.addEventListener('click', function () {
      editMode = !editMode;
      editBtn.classList.toggle('isOn', editMode);
      renderPalette();
    });
    bar.appendChild(editBtn);

    var menuBtn = el('button', 'eqIconBtn', '⋯');
    menuBtn.title = 'Save, copy, import and export palettes';
    bar.appendChild(menuBtn);
    host.appendChild(bar);

    var menu = el('div', 'eqMenu');
    menu.hidden = true;
    [
      ['New palette', function () { newPalette(false); }],
      ['Save as copy', function () { newPalette(true); }],
      ['Rename', renamePalette],
      ['Reset', resetPalette],
      ['Export file', exportPalette],
      ['Import file', importPalette],
      ['Delete palette', deletePalette]
    ].forEach(function (row) {
      var b = el('button', 'eqMenuItem', row[0]);
      b.addEventListener('click', function () { menu.hidden = true; row[1](); });
      menu.appendChild(b);
    });
    host.appendChild(menu);

    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener('click', function () { menu.hidden = true; });

    /* search */
    var searchWrap = el('div', 'eqSearchWrap');
    var search = el('input', 'eqSearch');
    search.id = 'eqSearch';
    search.type = 'search';
    search.autocomplete = 'off';
    search.placeholder = 'Search: sm58, d&b v8, wedge, riser…';
    searchWrap.appendChild(search);

    var browseBtn = el('button', 'eqIconBtn eqBrowse', '⊞');
    browseBtn.title = 'Browse the whole catalogue';
    searchWrap.appendChild(browseBtn);
    host.appendChild(searchWrap);

    var results = el('div', 'eqResults');
    results.id = 'eqResults';
    results.hidden = true;
    host.appendChild(results);

    var timer = null;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { renderResults(search.value.trim()); }, 90);
    });
    search.addEventListener('focus', function () {
      if (search.value.trim()) renderResults(search.value.trim());
    });
    browseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var box = document.getElementById('eqResults');
      if (!box.hidden && !search.value.trim()) { box.hidden = true; return; }
      search.value = '';
      renderBrowse();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var box = document.getElementById('eqResults');
        if (box) box.hidden = true;
      }
    });

    /* palette strip */
    var palette = el('div', 'equipment-container eqPalette');
    palette.id = 'eqPalette';
    host.appendChild(palette);

    /* custom item */
    var customBtn = el('button', 'eqBtn eqCustomBtn', '+ Custom item');
    customBtn.title = 'Create an item with your own measurements';
    customBtn.addEventListener('click', openCustomForm);
    host.appendChild(customBtn);
    host.appendChild(buildCustomForm());

    /* scale */
    host.appendChild(buildScaleControls());

    renderPaletteSelect();
    renderPalette();
    bindPaletteReorder();

    window.addEventListener('resize', positionResults);
    var rail = document.querySelector('.rail');
    if (rail) rail.addEventListener('scroll', positionResults);
  }

  function init() {
    load();
    build();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    addToPalette: addToPalette,
    activePalette: function () { return activePalette(); },
    isEditing: function () { return editMode; },
    refresh: renderPalette
  };
})();

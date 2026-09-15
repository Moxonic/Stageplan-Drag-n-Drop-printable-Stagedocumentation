/*
 * scale.js — turns catalogue entries into stage objects of the right size.
 *
 * The stage is a picture of a real room, so everything dropped on it is sized
 * from one number: how wide the stage is in metres. Change that number and
 * every placed item resizes around it, keeping its position on the stage.
 *
 * Microphones and other pocket-sized gear are exempt. At true scale an SM58
 * is under three pixels, so those are drawn at a fixed symbol size you can
 * dial up or down on its own.
 */
window.StageScale = (function () {
  'use strict';

  var SETTINGS_KEY = 'stageplanner.settings.v1';
  var MIN_PX = 6;              // nothing gets smaller than this on stage
  var listeners = [];

  var settings = {
    stageWidthM: 12,           // how wide the stage graphic is, in metres
    symbolPx: 26,              // on-screen size of microphones and small gear
    showLabels: true
  };

  function load() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          if (saved.stageWidthM > 0) settings.stageWidthM = saved.stageWidthM;
          if (saved.symbolPx > 0) settings.symbolPx = saved.symbolPx;
          if (typeof saved.showLabels === 'boolean') settings.showLabels = saved.showLabels;
        }
      }
    } catch (e) { /* private mode, corrupt value — defaults are fine */ }
  }

  function save() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  function dropZone() { return document.getElementById('dropZone'); }

  /* Where the scale comes from. Every stage is drawn from real measurements
     and states its own metres per pixel, so 'plan' is the normal answer; the
     fallback only covers the moment before the first stage is on screen. */
  function stageScaleSource() {
    var fromPlan = (window.StageBuilder && typeof window.StageBuilder.pxPerMeter === 'function')
      ? window.StageBuilder.pxPerMeter() : null;
    return (fromPlan > 0) ? 'plan' : 'manual';
  }

  function pxPerMeter() {
    if (stageScaleSource() === 'plan') return window.StageBuilder.pxPerMeter();
    var dz = dropZone();
    var w = dz ? dz.clientWidth : 640;
    return w / (settings.stageWidthM || 12);
  }

  /* ---------- sizing ---------- */

  function iconAspect(item) {
    if (item.mode === 'real') return item.w / item.d;
    return window.EquipmentIcons.aspectOf(item.icon);
  }

  // On-stage footprint in pixels, before any per-item adjustment.
  function baseSize(item) {
    if (item.mode === 'real') {
      var ppm = pxPerMeter();
      var w = item.w * ppm, h = item.d * ppm;
      var smallest = Math.min(w, h);
      if (smallest < MIN_PX) { var k = MIN_PX / smallest; w *= k; h *= k; }
      return { w: w, h: h };
    }
    var a = iconAspect(item), s = settings.symbolPx;
    return a >= 1 ? { w: s, h: s / a } : { w: s * a, h: s };
  }

  function sizeFor(item, itemScale) {
    var b = baseSize(item), k = itemScale || 1;
    return { w: b.w * k, h: b.h * k };
  }

  // Size for a storage tile or search result: real gear keeps some of its
  // relative bulk so the strip reads at a glance, but stays clickable.
  function thumbSize(item) {
    if (item.mode !== 'real') return 26;
    var biggest = Math.max(item.w, item.d);
    var px = 30 * Math.sqrt(biggest / 0.8);
    return Math.max(13, Math.min(34, px));
  }

  /* ---------- rendering ---------- */

  function iconSrc(item, pxW) {
    return window.EquipmentIcons.dataUri(item.icon, {
      aspect: iconAspect(item),
      pxW: pxW,
      strokePx: 1
    });
  }

  function shortLabel(item) {
    return item.model || item.name;
  }

  function dimText(item) {
    function n(v) { return (Math.round(v * 100) / 100).toFixed(2); }
    return n(item.w) + ' × ' + n(item.d) + ' m';
  }

  function tooltip(item) {
    return item.name + '\n' + dimText(item) +
      (item.mode === 'real' ? ' (to scale)' : ' (symbol)');
  }

  /* A small preview image, used by storage tiles and search results. */
  function thumb(item, px) {
    px = px || thumbSize(item);
    var a = iconAspect(item);
    var w = a >= 1 ? px : px * a;
    var h = a >= 1 ? px / a : px;
    var img = document.createElement('img');
    img.className = 'eqThumb';
    img.src = iconSrc(item, w);
    img.width = Math.round(w);
    img.height = Math.round(h);
    img.alt = item.name;
    img.draggable = false;
    return img;
  }

  /* ---------- stage objects ---------- */

  /* Every object on the stage carries an id of its own, separate from the
     catalogue id. Two SM58s are the same catalogue entry but different
     things on stage, and scenes.js has to tell them apart to say which one
     went off between two scenes. */
  var uidSeq = 0;
  function newUid() {
    uidSeq += 1;
    return "o" + Date.now().toString(36) + uidSeq.toString(36);
  }

  function createStageElement(item) {
    var el = document.createElement('div');
    el.className = 'dropped-equipment gear eqOnStage';
    el.dataset.eid = item.id;
    el.dataset.uid = newUid();
    el.dataset.itemScale = '1';
    el.setAttribute('data-rotation', '0');
    el.style.position = 'absolute';
    el.title = tooltip(item);

    var img = document.createElement('img');
    img.className = 'eqIcon gear';
    img.draggable = false;
    img.alt = item.name;
    el.appendChild(img);

    var label = document.createElement('span');
    label.className = 'eqLabel gear';
    label.textContent = shortLabel(item);
    el.appendChild(label);

    resizeElement(el);
    return el;
  }

  function resizeElement(el) {
    var item = window.EquipmentCatalog.get(el.dataset.eid);
    if (!item) return;
    var k = parseFloat(el.dataset.itemScale || '1') || 1;
    var s = sizeFor(item, k);
    el.style.width = s.w + 'px';
    el.style.height = s.h + 'px';

    var img = el.querySelector('.eqIcon');
    if (img) {
      img.src = iconSrc(item, s.w);
      img.style.width = '100%';
      img.style.height = '100%';
    }
    syncLabel(el);
  }

  /* Keep the caption upright and legible however the item is turned. */
  function syncLabel(el) {
    var label = el.querySelector('.eqLabel');
    if (!label) return;
    label.style.display = settings.showLabels ? 'block' : 'none';
    var deg = parseFloat(el.getAttribute('data-rotation') || '0') || 0;
    label.style.transform = 'translateX(-50%) rotate(' + (-deg) + 'deg)';
  }

  /* ---------- position, stored as a fraction of the stage ---------- */

  function rememberPosition(el) {
    var dz = dropZone();
    if (!dz || !dz.clientWidth) return;
    var left = parseFloat(el.style.left) || 0;
    var top = parseFloat(el.style.top) || 0;
    el.dataset.fx = (left + el.offsetWidth / 2) / dz.clientWidth;
    el.dataset.fy = (top + el.offsetHeight / 2) / dz.clientHeight;
  }

  function restorePosition(el) {
    var dz = dropZone();
    if (!dz || el.dataset.fx === undefined) return;
    var cx = parseFloat(el.dataset.fx) * dz.clientWidth;
    var cy = parseFloat(el.dataset.fy) * dz.clientHeight;
    el.style.left = (cx - el.offsetWidth / 2) + 'px';
    el.style.top = (cy - el.offsetHeight / 2) + 'px';
  }

  /* ---------- bulk updates ---------- */

  function applyAll() {
    var els = document.querySelectorAll('.eqOnStage');
    for (var i = 0; i < els.length; i++) {
      resizeElement(els[i]);
      restorePosition(els[i]);
    }
    listeners.forEach(function (fn) { try { fn(settings); } catch (e) {} });
  }

  function set(key, value) {
    settings[key] = value;
    save();
    applyAll();
  }

  function onChange(fn) { listeners.push(fn); }

  /* Shift + wheel over an item nudges that one item's size. */
  function bindItemResize() {
    var dz = dropZone();
    if (!dz) return;
    dz.addEventListener('wheel', function (e) {
      if (!e.shiftKey) return;
      var el = e.target.closest && e.target.closest('.eqOnStage');
      if (!el) return;
      e.preventDefault();
      var k = parseFloat(el.dataset.itemScale || '1') || 1;
      k = Math.max(0.3, Math.min(6, k * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      el.dataset.itemScale = String(k);
      resizeElement(el);
      restorePosition(el);
      if (window.Selection) window.Selection.sync();
      clearTimeout(bindItemResize.timer);
      bindItemResize.timer = setTimeout(function () {
        if (window.PlotHistory) window.PlotHistory.record();
      }, 350);
    }, { passive: false });
  }

  /* Redraw when the stage itself is resized — #stage has resize:both. */
  function watchStage() {
    var stage = document.getElementById('stage');
    if (!stage || typeof ResizeObserver === 'undefined') return;
    var pending = null;
    new ResizeObserver(function () {
      clearTimeout(pending);
      pending = setTimeout(applyAll, 60);
    }).observe(stage);
  }

  load();
  document.addEventListener('DOMContentLoaded', function () {
    bindItemResize();
    watchStage();
  });

  return {
    settings: settings,
    set: set,
    save: save,
    newUid: newUid,
    pxPerMeter: pxPerMeter,
    scaleSource: stageScaleSource,
    sizeFor: sizeFor,
    thumbSize: thumbSize,
    thumb: thumb,
    iconSrc: iconSrc,
    iconAspect: iconAspect,
    dimText: dimText,
    tooltip: tooltip,
    shortLabel: shortLabel,
    createStageElement: createStageElement,
    resizeElement: resizeElement,
    syncLabel: syncLabel,
    rememberPosition: rememberPosition,
    restorePosition: restorePosition,
    applyAll: applyAll,
    onChange: onChange
  };
})();

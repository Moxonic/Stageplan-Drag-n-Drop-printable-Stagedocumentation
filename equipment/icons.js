/*
 * icons.js — vector symbols for the equipment catalogue.
 *
 * Every symbol is generated as an SVG string and handed to the page as a
 * data-URI inside an <img>. That keeps html2canvas (used by the PDF export)
 * happy: it rasterises <img> reliably, while inline <svg> support in the old
 * 0.5.0-beta4 build is patchy.
 *
 * Two kinds of symbol:
 *   real   — drawn in plan view (seen from above), viewBox matches the real
 *            footprint, so a sub really is bigger than a nearfield monitor.
 *   symbol — drawn in side view at a fixed readable size (microphones, DI
 *            boxes). A 50 mm capsule would be two pixels if drawn to scale.
 */
window.EquipmentIcons = (function () {
  'use strict';

  var C = {
    body:  '#2c2b2b',
    edge:  '#141414',
    face:  '#b9b9bd',
    mid:   '#6b6a6a',
    light: '#dcdcde',
    metal: '#9a9aa0',
    warm:  '#8a7566',
    ink:   '#1d1d1f'
  };

  function r(n) { return Math.round(n * 100) / 100; }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- plan-view helpers (real scale) ---------- */

  function box(c, o) {
    o = o || {};
    var s = c.sw, rad = o.rad === undefined ? Math.min(c.vw, c.vh) * 0.08 : o.rad;
    return '<rect x="' + r(s / 2) + '" y="' + r(s / 2) + '" width="' + r(c.vw - s) +
      '" height="' + r(c.vh - s) + '" rx="' + r(rad) + '" fill="' + (o.fill || C.body) +
      '" stroke="' + C.edge + '" stroke-width="' + r(s) + '"/>';
  }

  // Front face marker: the edge the cabinet radiates from (bottom by default).
  function frontBar(c, o) {
    o = o || {};
    var h = c.vh * (o.h || 0.18), inset = c.sw * 1.6;
    return '<rect x="' + r(inset) + '" y="' + r(c.vh - inset - h) + '" width="' +
      r(c.vw - inset * 2) + '" height="' + r(h) + '" rx="' + r(h * 0.25) +
      '" fill="' + (o.fill || C.face) + '" opacity="' + (o.op || 0.9) + '"/>';
  }

  function trapezoid(c, taper) {
    var s = c.sw, ins = c.vw * taper;
    return '<path d="M' + r(ins) + ',' + r(s / 2) + ' H' + r(c.vw - ins) +
      ' L' + r(c.vw - s / 2) + ',' + r(c.vh - s / 2) + ' H' + r(s / 2) + ' Z" fill="' +
      C.body + '" stroke="' + C.edge + '" stroke-width="' + r(s) +
      '" stroke-linejoin="round"/>';
  }

  /* ---------- catalogue of symbols ---------- */

  var ICONS = {

    /* ===== speakers, plan view ===== */

    'speaker-point': {
      aspect: 1,
      draw: function (c) { return trapezoid(c, 0.17) + frontBar(c, {}); }
    },

    'speaker-array': {
      aspect: 1.4,
      draw: function (c) {
        var s = c.sw, tabW = c.vw * 0.05, tabH = c.vh * 0.34;
        return '<rect x="0" y="' + r(c.vh * 0.18) + '" width="' + r(tabW) + '" height="' +
          r(tabH) + '" fill="' + C.mid + '"/>' +
          '<rect x="' + r(c.vw - tabW) + '" y="' + r(c.vh * 0.18) + '" width="' + r(tabW) +
          '" height="' + r(tabH) + '" fill="' + C.mid + '"/>' +
          '<path d="M' + r(c.vw * 0.13) + ',' + r(s / 2) + ' H' + r(c.vw * 0.87) +
          ' L' + r(c.vw - s / 2) + ',' + r(c.vh - s / 2) + ' H' + r(s / 2) + ' Z" fill="' +
          C.body + '" stroke="' + C.edge + '" stroke-width="' + r(s) + '" stroke-linejoin="round"/>' +
          frontBar(c, { h: 0.2 });
      }
    },

    'speaker-wedge': {
      aspect: 1.8,
      draw: function (c) {
        var s = c.sw;
        return '<path d="M' + r(c.vw * 0.06) + ',' + r(s / 2) + ' H' + r(c.vw * 0.94) +
          ' L' + r(c.vw - s / 2) + ',' + r(c.vh - s / 2) + ' H' + r(s / 2) + ' Z" fill="' +
          C.body + '" stroke="' + C.edge + '" stroke-width="' + r(s) + '" stroke-linejoin="round"/>' +
          '<line x1="' + r(c.vw * 0.12) + '" y1="' + r(c.vh * 0.55) + '" x2="' + r(c.vw * 0.88) +
          '" y2="' + r(c.vh * 0.55) + '" stroke="' + C.mid + '" stroke-width="' + r(s) + '"/>' +
          frontBar(c, { h: 0.24 });
      }
    },

    'speaker-sub': {
      aspect: 1.4,
      draw: function (c) {
        var d = Math.min(c.vw, c.vh) * 0.26;
        return box(c, { rad: Math.min(c.vw, c.vh) * 0.05 }) +
          '<circle cx="' + r(c.vw * 0.32) + '" cy="' + r(c.vh * 0.5) + '" r="' + r(d) +
          '" fill="none" stroke="' + C.mid + '" stroke-width="' + r(c.sw * 1.2) + '"/>' +
          '<circle cx="' + r(c.vw * 0.68) + '" cy="' + r(c.vh * 0.5) + '" r="' + r(d) +
          '" fill="none" stroke="' + C.mid + '" stroke-width="' + r(c.sw * 1.2) + '"/>' +
          frontBar(c, { h: 0.12, op: 0.7 });
      }
    },

    'speaker-column': {
      aspect: 0.35,
      draw: function (c) { return box(c, {}) + frontBar(c, { h: 0.06 }); }
    },

    'speaker-studio': {
      aspect: 0.85,
      draw: function (c) {
        return '<rect x="' + r(c.sw / 2) + '" y="' + r(c.sw / 2) + '" width="' + r(c.vw - c.sw) +
          '" height="' + r(c.vh - c.sw) + '" rx="' + r(c.vw * 0.22) + '" fill="' + C.body +
          '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          frontBar(c, { h: 0.2, fill: C.light });
      }
    },

    'speaker-ceiling': {
      aspect: 1,
      draw: function (c) {
        var cx = c.vw / 2, cy = c.vh / 2, rr = Math.min(cx, cy) - c.sw;
        return '<circle cx="' + r(cx) + '" cy="' + r(cy) + '" r="' + r(rr) + '" fill="' + C.light +
          '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          '<circle cx="' + r(cx) + '" cy="' + r(cy) + '" r="' + r(rr * 0.55) + '" fill="none" stroke="' +
          C.mid + '" stroke-width="' + r(c.sw) + '"/>';
      }
    },

    /* ===== microphones, side view (fixed symbol size) ===== */

    'mic-handheld': {
      aspect: 0.4,
      draw: function (c) {
        var w = c.vw, h = c.vh, gr = w * 0.5, gy = gr + c.sw;
        return '<path d="M' + r(w * 0.22) + ',' + r(h) + ' L' + r(w * 0.28) + ',' + r(h * 0.42) +
          ' H' + r(w * 0.72) + ' L' + r(w * 0.78) + ',' + r(h) + ' Z" fill="' + C.body +
          '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '" stroke-linejoin="round"/>' +
          '<circle cx="' + r(w / 2) + '" cy="' + r(gy) + '" r="' + r(gr - c.sw / 2) + '" fill="' +
          C.metal + '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          '<path d="M' + r(w * 0.1) + ',' + r(gy) + ' H' + r(w * 0.9) + '" stroke="' + C.edge +
          '" stroke-width="' + r(c.sw * 0.6) + '" opacity="0.45"/>' +
          '<path d="M' + r(w * 0.16) + ',' + r(gy - gr * 0.55) + ' H' + r(w * 0.84) + '" stroke="' +
          C.edge + '" stroke-width="' + r(c.sw * 0.6) + '" opacity="0.45"/>' +
          '<path d="M' + r(w * 0.16) + ',' + r(gy + gr * 0.55) + ' H' + r(w * 0.84) + '" stroke="' +
          C.edge + '" stroke-width="' + r(c.sw * 0.6) + '" opacity="0.45"/>' +
          '<rect x="' + r(w * 0.25) + '" y="' + r(h * 0.72) + '" width="' + r(w * 0.5) +
          '" height="' + r(h * 0.05) + '" fill="' + C.mid + '"/>';
      }
    },

    'mic-wireless': {
      aspect: 0.4,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return ICONS['mic-handheld'].draw(c) +
          '<rect x="' + r(w * 0.26) + '" y="' + r(h * 0.84) + '" width="' + r(w * 0.48) +
          '" height="' + r(h * 0.04) + '" fill="' + C.light + '"/>' +
          '<circle cx="' + r(w * 0.5) + '" cy="' + r(h * 0.93) + '" r="' + r(w * 0.09) + '" fill="' +
          C.light + '"/>';
      }
    },

    // SM57 / e906 family: slim tapered body, small flat grille.
    'mic-dynamic-small': {
      aspect: 0.34,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return '<path d="M' + r(w * 0.26) + ',' + r(h) + ' L' + r(w * 0.3) + ',' + r(h * 0.3) +
          ' H' + r(w * 0.7) + ' L' + r(w * 0.74) + ',' + r(h) + ' Z" fill="' + C.body +
          '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '" stroke-linejoin="round"/>' +
          '<rect x="' + r(w * 0.14) + '" y="' + r(c.sw / 2) + '" width="' + r(w * 0.72) +
          '" height="' + r(h * 0.3) + '" rx="' + r(w * 0.16) + '" fill="' + C.metal +
          '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          '<line x1="' + r(w * 0.2) + '" y1="' + r(h * 0.15) + '" x2="' + r(w * 0.8) + '" y2="' +
          r(h * 0.15) + '" stroke="' + C.edge + '" stroke-width="' + r(c.sw * 0.6) + '" opacity="0.45"/>' +
          '<rect x="' + r(w * 0.28) + '" y="' + r(h * 0.7) + '" width="' + r(w * 0.44) +
          '" height="' + r(h * 0.05) + '" fill="' + C.mid + '"/>';
      }
    },

    'mic-pencil': {
      aspect: 0.3,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return '<rect x="' + r(c.sw / 2) + '" y="' + r(h * 0.1) + '" width="' + r(w - c.sw) +
          '" height="' + r(h * 0.9 - c.sw) + '" rx="' + r(w * 0.3) + '" fill="' + C.body +
          '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          '<rect x="' + r(c.sw / 2) + '" y="' + r(h * 0.1) + '" width="' + r(w - c.sw) +
          '" height="' + r(h * 0.26) + '" rx="' + r(w * 0.3) + '" fill="' + C.metal +
          '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          '<line x1="' + r(w * 0.5) + '" y1="0" x2="' + r(w * 0.5) + '" y2="' + r(h * 0.1) +
          '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '"/>';
      }
    },

    'mic-condenser-large': {
      aspect: 0.52,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return '<path d="M' + r(w * 0.08) + ',' + r(h * 0.2) + ' Q' + r(w * 0.02) + ',' + r(h * 0.62) +
          ' ' + r(w * 0.5) + ',' + r(h * 0.66) + ' Q' + r(w * 0.98) + ',' + r(h * 0.62) + ' ' +
          r(w * 0.92) + ',' + r(h * 0.2) + '" fill="none" stroke="' + C.mid + '" stroke-width="' +
          r(c.sw * 1.2) + '"/>' +
          '<rect x="' + r(w * 0.24) + '" y="' + r(c.sw) + '" width="' + r(w * 0.52) + '" height="' +
          r(h * 0.62) + '" rx="' + r(w * 0.26) + '" fill="' + C.body + '" stroke="' + C.edge +
          '" stroke-width="' + r(c.sw) + '"/>' +
          '<rect x="' + r(w * 0.27) + '" y="' + r(h * 0.05) + '" width="' + r(w * 0.46) +
          '" height="' + r(h * 0.3) + '" rx="' + r(w * 0.2) + '" fill="' + C.metal + '"/>' +
          '<rect x="' + r(w * 0.4) + '" y="' + r(h * 0.66) + '" width="' + r(w * 0.2) +
          '" height="' + r(h * 0.34) + '" fill="' + C.mid + '"/>';
      }
    },

    'mic-kick': {
      aspect: 0.72,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return '<ellipse cx="' + r(w * 0.5) + '" cy="' + r(h * 0.36) + '" rx="' + r(w * 0.46) +
          '" ry="' + r(h * 0.34) + '" fill="' + C.metal + '" stroke="' + C.edge +
          '" stroke-width="' + r(c.sw) + '"/>' +
          '<path d="M' + r(w * 0.3) + ',' + r(h * 0.64) + ' L' + r(w * 0.34) + ',' + r(h) +
          ' H' + r(w * 0.66) + ' L' + r(w * 0.7) + ',' + r(h * 0.64) + ' Z" fill="' + C.body +
          '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '" stroke-linejoin="round"/>' +
          '<ellipse cx="' + r(w * 0.5) + '" cy="' + r(h * 0.36) + '" rx="' + r(w * 0.26) +
          '" ry="' + r(h * 0.18) + '" fill="none" stroke="' + C.edge + '" stroke-width="' +
          r(c.sw * 0.7) + '" opacity="0.5"/>';
      }
    },

    'mic-clip': {
      aspect: 0.85,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return '<path d="M' + r(w * 0.05) + ',' + r(h * 0.95) + ' q' + r(w * 0.1) + ',' + r(-h * 0.5) +
          ' ' + r(w * 0.45) + ',' + r(-h * 0.45) + '" fill="none" stroke="' + C.mid +
          '" stroke-width="' + r(c.sw * 1.6) + '"/>' +
          '<rect x="' + r(w * 0.42) + '" y="' + r(h * 0.28) + '" width="' + r(w * 0.5) +
          '" height="' + r(h * 0.3) + '" rx="' + r(h * 0.15) + '" fill="' + C.body +
          '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          '<circle cx="' + r(w * 0.85) + '" cy="' + r(h * 0.43) + '" r="' + r(h * 0.12) + '" fill="' +
          C.metal + '"/>' +
          '<rect x="' + r(w * 0.02) + '" y="' + r(h * 0.82) + '" width="' + r(w * 0.3) +
          '" height="' + r(h * 0.16) + '" rx="' + r(h * 0.05) + '" fill="' + C.mid + '"/>';
      }
    },

    'mic-boundary': {
      aspect: 1.7,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return '<path d="M' + r(w * 0.3) + ',' + r(h * 0.72) + ' a' + r(w * 0.2) + ',' + r(h * 0.42) +
          ' 0 0 1 ' + r(w * 0.4) + ',0 Z" fill="' + C.body + '" stroke="' + C.edge +
          '" stroke-width="' + r(c.sw) + '"/>' +
          '<rect x="' + r(w * 0.06) + '" y="' + r(h * 0.72) + '" width="' + r(w * 0.88) +
          '" height="' + r(h * 0.2) + '" rx="' + r(h * 0.08) + '" fill="' + C.mid + '" stroke="' +
          C.edge + '" stroke-width="' + r(c.sw) + '"/>';
      }
    },

    'mic-shotgun': {
      aspect: 0.22,
      draw: function (c) {
        var w = c.vw, h = c.vh, slots = '';
        for (var i = 0; i < 7; i++) {
          // The interference slots are what make a shotgun read as a shotgun,
          // so they have to be lighter than the body, not darker.
          slots += '<line x1="' + r(w * 0.28) + '" y1="' + r(h * (0.12 + i * 0.075)) + '" x2="' +
            r(w * 0.72) + '" y2="' + r(h * (0.12 + i * 0.075)) + '" stroke="' + C.light +
            '" stroke-width="' + r(c.sw * 0.9) + '" opacity="0.75"/>';
        }
        return '<rect x="' + r(c.sw / 2) + '" y="' + r(c.sw / 2) + '" width="' + r(w - c.sw) +
          '" height="' + r(h * 0.78) + '" rx="' + r(w * 0.4) + '" fill="' + C.body + '" stroke="' +
          C.edge + '" stroke-width="' + r(c.sw) + '"/>' + slots +
          '<rect x="' + r(w * 0.18) + '" y="' + r(h * 0.78) + '" width="' + r(w * 0.64) +
          '" height="' + r(h * 0.22) + '" fill="' + C.mid + '"/>';
      }
    },

    'mic-ribbon': {
      aspect: 0.42,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return '<rect x="' + r(c.sw / 2) + '" y="' + r(c.sw / 2) + '" width="' + r(w - c.sw) +
          '" height="' + r(h * 0.46) + '" rx="' + r(w * 0.3) + '" fill="' + C.metal + '" stroke="' +
          C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          '<rect x="' + r(w * 0.32) + '" y="' + r(h * 0.46) + '" width="' + r(w * 0.36) +
          '" height="' + r(h * 0.54) + '" rx="' + r(w * 0.1) + '" fill="' + C.body + '" stroke="' +
          C.edge + '" stroke-width="' + r(c.sw) + '"/>';
      }
    },

    'mic-gooseneck': {
      aspect: 0.55,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return '<rect x="' + r(w * 0.08) + '" y="' + r(h * 0.82) + '" width="' + r(w * 0.84) +
          '" height="' + r(h * 0.16) + '" rx="' + r(h * 0.06) + '" fill="' + C.body + '" stroke="' +
          C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          '<path d="M' + r(w * 0.5) + ',' + r(h * 0.82) + ' C' + r(w * 0.5) + ',' + r(h * 0.4) + ' ' +
          r(w * 0.2) + ',' + r(h * 0.3) + ' ' + r(w * 0.28) + ',' + r(h * 0.08) + '" fill="none" stroke="' +
          C.body + '" stroke-width="' + r(c.sw * 1.8) + '" stroke-linecap="round"/>' +
          '<circle cx="' + r(w * 0.28) + '" cy="' + r(h * 0.07) + '" r="' + r(w * 0.12) + '" fill="' +
          C.metal + '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '"/>';
      }
    },

    'mic-headset': {
      aspect: 1.15,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return '<path d="M' + r(w * 0.16) + ',' + r(h * 0.2) + ' a' + r(w * 0.16) + ',' + r(h * 0.2) +
          ' 0 1 1 ' + r(-w * 0.02) + ',' + r(h * 0.34) + '" fill="none" stroke="' + C.body +
          '" stroke-width="' + r(c.sw * 1.8) + '" stroke-linecap="round"/>' +
          '<path d="M' + r(w * 0.18) + ',' + r(h * 0.5) + ' Q' + r(w * 0.6) + ',' + r(h * 0.62) + ' ' +
          r(w * 0.9) + ',' + r(h * 0.44) + '" fill="none" stroke="' + C.body + '" stroke-width="' +
          r(c.sw * 1.4) + '" stroke-linecap="round"/>' +
          '<circle cx="' + r(w * 0.92) + '" cy="' + r(h * 0.43) + '" r="' + r(w * 0.08) + '" fill="' +
          C.metal + '" stroke="' + C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          '<path d="M' + r(w * 0.14) + ',' + r(h * 0.54) + ' Q' + r(w * 0.05) + ',' + r(h * 0.82) +
          ' ' + r(w * 0.3) + ',' + r(h * 0.96) + '" fill="none" stroke="' + C.mid + '" stroke-width="' +
          r(c.sw) + '"/>';
      }
    },

    'mic-lav': {
      aspect: 0.5,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return '<rect x="' + r(w * 0.28) + '" y="' + r(c.sw) + '" width="' + r(w * 0.44) +
          '" height="' + r(h * 0.34) + '" rx="' + r(w * 0.22) + '" fill="' + C.body + '" stroke="' +
          C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          '<circle cx="' + r(w * 0.5) + '" cy="' + r(h * 0.14) + '" r="' + r(w * 0.12) + '" fill="' +
          C.metal + '"/>' +
          '<path d="M' + r(w * 0.5) + ',' + r(h * 0.36) + ' q' + r(w * 0.45) + ',' + r(h * 0.22) + ' ' +
          r(-w * 0.1) + ',' + r(h * 0.34) + ' q' + r(-w * 0.4) + ',' + r(h * 0.14) + ' ' + r(w * 0.05) +
          ',' + r(h * 0.28) + '" fill="none" stroke="' + C.mid + '" stroke-width="' + r(c.sw * 1.1) + '"/>';
      }
    },

    'mic-hanging': {
      aspect: 0.38,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return '<line x1="' + r(w * 0.5) + '" y1="0" x2="' + r(w * 0.5) + '" y2="' + r(h * 0.58) +
          '" stroke="' + C.mid + '" stroke-width="' + r(c.sw) + '"/>' +
          '<rect x="' + r(w * 0.26) + '" y="' + r(h * 0.58) + '" width="' + r(w * 0.48) +
          '" height="' + r(h * 0.34) + '" rx="' + r(w * 0.24) + '" fill="' + C.body + '" stroke="' +
          C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          '<circle cx="' + r(w * 0.5) + '" cy="' + r(h * 0.9) + '" r="' + r(w * 0.16) + '" fill="' +
          C.metal + '"/>';
      }
    },

    'mic-bodypack': {
      aspect: 0.62,
      draw: function (c) {
        var w = c.vw, h = c.vh;
        return '<rect x="' + r(c.sw) + '" y="' + r(h * 0.14) + '" width="' + r(w - c.sw * 2) +
          '" height="' + r(h * 0.8) + '" rx="' + r(w * 0.12) + '" fill="' + C.body + '" stroke="' +
          C.edge + '" stroke-width="' + r(c.sw) + '"/>' +
          '<line x1="' + r(w * 0.78) + '" y1="' + r(h * 0.14) + '" x2="' + r(w * 0.78) + '" y2="0" stroke="' +
          C.mid + '" stroke-width="' + r(c.sw * 1.2) + '"/>' +
          '<rect x="' + r(w * 0.18) + '" y="' + r(h * 0.3) + '" width="' + r(w * 0.46) +
          '" height="' + r(h * 0.22) + '" fill="' + C.light + '" opacity="0.8"/>';
      }
    },

    /* ===== stage furniture and backline, plan view ===== */

    'riser': {
      aspect: 2,
      draw: function (c) {
        var s = c.sw;
        return '<rect x="' + r(s / 2) + '" y="' + r(s / 2) + '" width="' + r(c.vw - s) + '" height="' +
          r(c.vh - s) + '" fill="#ffffff" stroke="' + C.ink + '" stroke-width="' + r(s * 1.4) + '"/>' +
          '<line x1="' + r(s) + '" y1="' + r(s) + '" x2="' + r(c.vw - s) + '" y2="' + r(c.vh - s) +
          '" stroke="' + C.mid + '" stroke-width="' + r(s * 0.8) + '" opacity="0.55"/>' +
          '<line x1="' + r(c.vw - s) + '" y1="' + r(s) + '" x2="' + r(s) + '" y2="' + r(c.vh - s) +
          '" stroke="' + C.mid + '" stroke-width="' + r(s * 0.8) + '" opacity="0.55"/>';
      }
    },

    'drumkit': {
      aspect: 1.2,
      draw: function (c) {
        var w = c.vw, h = c.vh, s = c.sw;
        function ring(cx, cy, rr, fill) {
          return '<circle cx="' + r(cx) + '" cy="' + r(cy) + '" r="' + r(rr) + '" fill="' + fill +
            '" stroke="' + C.ink + '" stroke-width="' + r(s) + '"/>';
        }
        return ring(w * 0.5, h * 0.72, w * 0.19, C.light) +          // kick
          ring(w * 0.31, h * 0.52, w * 0.11, '#ffffff') +            // snare
          ring(w * 0.47, h * 0.36, w * 0.1, C.light) +               // rack tom
          ring(w * 0.63, h * 0.38, w * 0.1, C.light) +               // rack tom
          ring(w * 0.79, h * 0.62, w * 0.13, C.light) +              // floor tom
          ring(w * 0.2, h * 0.3, w * 0.09, C.metal) +                // hi-hat
          ring(w * 0.8, h * 0.24, w * 0.11, C.metal) +               // ride
          ring(w * 0.36, h * 0.16, w * 0.1, C.metal);                // crash
      }
    },

    'piano-grand': {
      aspect: 0.72,
      draw: function (c) {
        var w = c.vw, h = c.vh, s = c.sw;
        return '<path d="M' + r(w * 0.05) + ',' + r(h * 0.14) + ' H' + r(w * 0.95) +
          ' C' + r(w * 1.02) + ',' + r(h * 0.55) + ' ' + r(w * 0.78) + ',' + r(h * 0.99) + ' ' +
          r(w * 0.42) + ',' + r(h * 0.96) + ' C' + r(w * 0.18) + ',' + r(h * 0.93) + ' ' +
          r(w * 0.05) + ',' + r(h * 0.6) + ' ' + r(w * 0.05) + ',' + r(h * 0.14) + ' Z" fill="' +
          C.body + '" stroke="' + C.ink + '" stroke-width="' + r(s) + '"/>' +
          '<rect x="' + r(w * 0.05) + '" y="' + r(h * 0.02) + '" width="' + r(w * 0.9) +
          '" height="' + r(h * 0.12) + '" fill="' + C.light + '" stroke="' + C.ink +
          '" stroke-width="' + r(s) + '"/>';
      }
    },

    'piano-upright': {
      aspect: 2.6,
      draw: function (c) {
        return box(c, { fill: C.body, rad: c.sw }) +
          '<rect x="' + r(c.vw * 0.06) + '" y="' + r(c.vh * 0.58) + '" width="' + r(c.vw * 0.88) +
          '" height="' + r(c.vh * 0.32) + '" fill="' + C.light + '"/>';
      }
    },

    'amp-cab': {
      aspect: 1.6,
      draw: function (c) {
        var d = Math.min(c.vw / 2, c.vh) * 0.34;
        return box(c, { rad: c.sw }) +
          '<circle cx="' + r(c.vw * 0.3) + '" cy="' + r(c.vh * 0.5) + '" r="' + r(d) +
          '" fill="none" stroke="' + C.mid + '" stroke-width="' + r(c.sw) + '"/>' +
          '<circle cx="' + r(c.vw * 0.7) + '" cy="' + r(c.vh * 0.5) + '" r="' + r(d) +
          '" fill="none" stroke="' + C.mid + '" stroke-width="' + r(c.sw) + '"/>' +
          frontBar(c, { h: 0.1, op: 0.6 });
      }
    },

    'keyboard': {
      aspect: 4,
      draw: function (c) {
        var keys = '', n = 12;
        for (var i = 1; i < n; i++) {
          keys += '<line x1="' + r(c.vw * i / n) + '" y1="' + r(c.vh * 0.3) + '" x2="' +
            r(c.vw * i / n) + '" y2="' + r(c.vh * 0.95) + '" stroke="' + C.ink +
            '" stroke-width="' + r(c.sw * 0.7) + '" opacity="0.6"/>';
        }
        return '<rect x="' + r(c.sw / 2) + '" y="' + r(c.sw / 2) + '" width="' + r(c.vw - c.sw) +
          '" height="' + r(c.vh - c.sw) + '" fill="#ffffff" stroke="' + C.ink + '" stroke-width="' +
          r(c.sw) + '"/>' +
          '<rect x="' + r(c.sw / 2) + '" y="' + r(c.sw / 2) + '" width="' + r(c.vw - c.sw) +
          '" height="' + r(c.vh * 0.3) + '" fill="' + C.body + '"/>' + keys;
      }
    },

    'stand-mic': {
      aspect: 1,
      draw: function (c) {
        var cx = c.vw / 2, cy = c.vh / 2, rr = Math.min(cx, cy) - c.sw, legs = '';
        for (var i = 0; i < 3; i++) {
          var a = (i * 120 - 90) * Math.PI / 180;
          legs += '<line x1="' + r(cx) + '" y1="' + r(cy) + '" x2="' + r(cx + Math.cos(a) * rr) +
            '" y2="' + r(cy + Math.sin(a) * rr) + '" stroke="' + C.body + '" stroke-width="' +
            r(c.sw * 1.6) + '" stroke-linecap="round"/>';
        }
        return legs + '<circle cx="' + r(cx) + '" cy="' + r(cy) + '" r="' + r(rr * 0.3) + '" fill="' +
          C.body + '"/>';
      }
    },

    'stand-round': {
      aspect: 1,
      draw: function (c) {
        var cx = c.vw / 2, cy = c.vh / 2, rr = Math.min(cx, cy) - c.sw;
        return '<circle cx="' + r(cx) + '" cy="' + r(cy) + '" r="' + r(rr) + '" fill="' + C.light +
          '" stroke="' + C.ink + '" stroke-width="' + r(c.sw) + '"/>' +
          '<circle cx="' + r(cx) + '" cy="' + r(cy) + '" r="' + r(rr * 0.28) + '" fill="' + C.body + '"/>';
      }
    },

    'music-stand': {
      aspect: 1.6,
      draw: function (c) {
        return '<path d="M' + r(c.sw) + ',' + r(c.vh * 0.75) + ' L' + r(c.vw * 0.14) + ',' + r(c.sw) +
          ' H' + r(c.vw - c.sw) + ' L' + r(c.vw * 0.88) + ',' + r(c.vh * 0.75) + ' Z" fill="' +
          C.light + '" stroke="' + C.ink + '" stroke-width="' + r(c.sw) + '"/>' +
          '<circle cx="' + r(c.vw * 0.5) + '" cy="' + r(c.vh * 0.84) + '" r="' + r(c.vh * 0.14) +
          '" fill="' + C.body + '"/>';
      }
    },

    'chair': {
      aspect: 1,
      draw: function (c) {
        return '<rect x="' + r(c.sw) + '" y="' + r(c.vh * 0.22) + '" width="' + r(c.vw - c.sw * 2) +
          '" height="' + r(c.vh * 0.74) + '" rx="' + r(c.vw * 0.1) + '" fill="' + C.light +
          '" stroke="' + C.ink + '" stroke-width="' + r(c.sw) + '"/>' +
          '<rect x="' + r(c.sw) + '" y="' + r(c.sw) + '" width="' + r(c.vw - c.sw * 2) +
          '" height="' + r(c.vh * 0.2) + '" rx="' + r(c.vw * 0.06) + '" fill="' + C.body + '"/>';
      }
    },

    'table': {
      aspect: 2,
      draw: function (c) {
        return '<rect x="' + r(c.sw / 2) + '" y="' + r(c.sw / 2) + '" width="' + r(c.vw - c.sw) +
          '" height="' + r(c.vh - c.sw) + '" rx="' + r(c.sw) + '" fill="#ffffff" stroke="' + C.ink +
          '" stroke-width="' + r(c.sw * 1.2) + '"/>';
      }
    },

    'person': {
      aspect: 1,
      draw: function (c) {
        var cx = c.vw / 2, cy = c.vh / 2, rr = Math.min(cx, cy) - c.sw;
        return '<path d="M' + r(cx - rr) + ',' + r(cy + rr * 0.55) + ' a' + r(rr) + ',' + r(rr) +
          ' 0 0 1 ' + r(rr * 2) + ',0 Z" fill="' + C.mid + '"/>' +
          '<circle cx="' + r(cx) + '" cy="' + r(cy) + '" r="' + r(rr * 0.52) + '" fill="' + C.warm +
          '" stroke="' + C.ink + '" stroke-width="' + r(c.sw) + '"/>';
      }
    },

    'monitor-tv': {
      aspect: 3.4,
      draw: function (c) {
        return '<rect x="' + r(c.sw / 2) + '" y="' + r(c.vh * 0.34) + '" width="' + r(c.vw - c.sw) +
          '" height="' + r(c.vh * 0.44) + '" fill="' + C.body + '" stroke="' + C.ink +
          '" stroke-width="' + r(c.sw) + '"/>' +
          '<rect x="' + r(c.vw * 0.05) + '" y="' + r(c.vh * 0.38) + '" width="' + r(c.vw * 0.9) +
          '" height="' + r(c.vh * 0.3) + '" fill="' + C.face + '"/>' +
          '<rect x="' + r(c.vw * 0.36) + '" y="' + r(c.vh * 0.78) + '" width="' + r(c.vw * 0.28) +
          '" height="' + r(c.vh * 0.2) + '" fill="' + C.mid + '"/>';
      }
    },

    'screen': {
      aspect: 8,
      draw: function (c) {
        return '<rect x="' + r(c.sw / 2) + '" y="' + r(c.sw / 2) + '" width="' + r(c.vw - c.sw) +
          '" height="' + r(c.vh - c.sw) + '" fill="#ffffff" stroke="' + C.ink + '" stroke-width="' +
          r(c.sw * 1.4) + '"/>';
      }
    },

    'di-box': {
      aspect: 1.5,
      draw: function (c) {
        return box(c, { fill: '#3d5a80', rad: c.sw }) +
          '<circle cx="' + r(c.vw * 0.26) + '" cy="' + r(c.vh * 0.5) + '" r="' + r(c.vh * 0.16) +
          '" fill="' + C.light + '"/>' +
          '<circle cx="' + r(c.vw * 0.74) + '" cy="' + r(c.vh * 0.5) + '" r="' + r(c.vh * 0.16) +
          '" fill="' + C.light + '"/>';
      }
    },

    'power': {
      aspect: 1,
      draw: function (c) {
        var cx = c.vw / 2, cy = c.vh / 2, rr = Math.min(cx, cy) - c.sw;
        return '<circle cx="' + r(cx) + '" cy="' + r(cy) + '" r="' + r(rr) + '" fill="#f2c14e" stroke="' +
          C.ink + '" stroke-width="' + r(c.sw) + '"/>' +
          '<path d="M' + r(cx + rr * 0.18) + ',' + r(cy - rr * 0.62) + ' L' + r(cx - rr * 0.34) + ',' +
          r(cy + rr * 0.08) + ' H' + r(cx + rr * 0.04) + ' L' + r(cx - rr * 0.16) + ',' +
          r(cy + rr * 0.64) + ' L' + r(cx + rr * 0.38) + ',' + r(cy - rr * 0.12) + ' H' +
          r(cx + rr * 0.02) + ' Z" fill="' + C.ink + '"/>';
      }
    },

    'laptop': {
      aspect: 1.3,
      draw: function (c) {
        return '<rect x="' + r(c.sw / 2) + '" y="' + r(c.vh * 0.3) + '" width="' + r(c.vw - c.sw) +
          '" height="' + r(c.vh * 0.68) + '" rx="' + r(c.sw) + '" fill="' + C.light + '" stroke="' +
          C.ink + '" stroke-width="' + r(c.sw) + '"/>' +
          '<rect x="' + r(c.vw * 0.04) + '" y="' + r(c.sw / 2) + '" width="' + r(c.vw * 0.92) +
          '" height="' + r(c.vh * 0.3) + '" fill="' + C.body + '" stroke="' + C.ink +
          '" stroke-width="' + r(c.sw) + '"/>';
      }
    },

    'generic': {
      aspect: 1,
      draw: function (c) { return box(c, { fill: C.mid }); }
    }
  };

  /**
   * Build an SVG string for one symbol.
   * o.aspect   width / height of the drawing box (real-scale items pass their footprint)
   * o.pxW      the width the symbol will occupy on screen, used to keep line
   *            weight constant no matter how far the item is scaled down
   */
  function render(name, o) {
    o = o || {};
    var def = ICONS[name] || ICONS.generic;
    var aspect = o.aspect || def.aspect || 1;
    var vw, vh;
    if (aspect >= 1) { vw = 100; vh = 100 / aspect; } else { vh = 100; vw = 100 * aspect; }

    var pxW = Math.max(o.pxW || 40, 4);
    var unit = vw / pxW;                        // viewBox units per screen pixel
    var c = {
      vw: vw, vh: vh,
      sw: Math.min(Math.max((o.strokePx || 1) * unit, 0.4), vw * 0.08),
      fs: (o.fontPx || 7) * unit
    };

    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + r(vw) + '" height="' + r(vh) +
      '" viewBox="0 0 ' + r(vw) + ' ' + r(vh) + '" fill="none">' + def.draw(c) + '</svg>';
  }

  function toDataUri(svgString) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  }

  function dataUri(name, o) { return toDataUri(render(name, o)); }

  function aspectOf(name) {
    var def = ICONS[name] || ICONS.generic;
    return def.aspect || 1;
  }

  return {
    render: render,
    dataUri: dataUri,
    toDataUri: toDataUri,
    aspectOf: aspectOf,
    has: function (n) { return !!ICONS[n]; },
    names: function () { return Object.keys(ICONS); },
    esc: esc,
    colors: C
  };
})();

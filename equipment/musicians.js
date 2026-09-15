/*
 * musicians.js — people, their instruments and what they sit on, drawn from
 * above the way a stage plot sees them.
 *
 * Everything here is drawn in millimetres against a design footprint, then
 * fitted into whatever box the catalogue gives it without being stretched. So a
 * violin is 595 mm long in every symbol that holds one, and a player's shoulders
 * are 460 mm across whether they sit behind a flute or a tuba.
 *
 * Orientation: every player faces the bottom edge, which is the front of the
 * stage. Facing the audience, a player's right hand is on the left of the
 * drawing, so a violin sits on the right of the picture and its bow on the left.
 *
 * Loaded after icons.js, which it adds to through EquipmentIcons.define.
 */
(function () {
  'use strict';

  var I = window.EquipmentIcons;
  if (!I || !I.define) return;

  var INK = '#1b1b1d';

  function n(v) { return Math.round(v * 10) / 10; }

  /* ---------------- shading ---------------- */

  function rad(id, a, b, c) {
    return '<radialGradient id="' + id + '" cx="38%" cy="32%" r="75%">' +
      '<stop offset="0" stop-color="' + a + '"/>' +
      (c ? '<stop offset="0.6" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/>'
         : '<stop offset="1" stop-color="' + b + '"/>') +
      '</radialGradient>';
  }

  function lin(id, a, b) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>';
  }

  // One set of shades for every symbol, so a room full of players matches.
  var DEFS = '<defs>' +
    rad('sk', '#f1c9a5', '#c68b63') +                       // skin
    rad('hr', '#7a553b', '#2b1c13') +                       // hair
    rad('cl', '#555a66', '#1d1f25') +                       // concert black
    rad('wd', '#e39448', '#a4521c', '#5e2a0c') +            // violin varnish
    rad('sp', '#f6dfb2', '#d9aa66', '#a8763a') +            // spruce top
    rad('br', '#fff4c0', '#d9aa3e', '#7e5c17') +            // brass
    rad('sv', '#ffffff', '#c9ced6', '#7d838c') +            // silver
    lin('bk', '#4a4a50', '#0b0b0d') +                       // lacquer
    rad('hd', '#ffffff', '#f2f0ea', '#cfcac0') +            // drum head
    rad('cy', '#fbe29a', '#c49636', '#7a5716') +            // cymbal bronze
    rad('cu', '#f7bf8f', '#b8692f', '#6d3710') +            // copper kettle
    lin('rw', '#a65f36', '#5a2b15') +                       // rosewood
    rad('ch', '#62656e', '#2a2c32') +                       // chair
    rad('sb', '#f3c35a', '#b4461a', '#2a0f06') +            // sunburst
    '</defs>';

  /* ---------------- shapes, in millimetres ---------------- */

  function st(s, stroke) {
    return stroke === 'none' ? ' stroke="none"'
      : ' stroke="' + (stroke || INK) + '" stroke-width="' + n(s) + '"';
  }

  function circ(x, y, r, fill, s, stroke) {
    return '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(r) + '" fill="' + fill + '"' + st(s, stroke) + '/>';
  }

  function ell(x, y, rx, ry, fill, s, stroke, rot) {
    return '<ellipse cx="' + n(x) + '" cy="' + n(y) + '" rx="' + n(rx) + '" ry="' + n(ry) + '"' +
      (rot ? ' transform="rotate(' + n(rot) + ' ' + n(x) + ' ' + n(y) + ')"' : '') +
      ' fill="' + fill + '"' + st(s, stroke) + '/>';
  }

  function box(x, y, w, h, rr, fill, s, stroke) {
    return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) +
      '" rx="' + n(rr) + '" fill="' + fill + '"' + st(s, stroke) + '/>';
  }

  function line(x1, y1, x2, y2, w, colour, cap) {
    return '<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) +
      '" stroke="' + colour + '" stroke-width="' + n(w) + '" stroke-linecap="' + (cap || 'round') + '"/>';
  }

  // A limb or a tube: a dark outline under a coloured core, so it reads at any size.
  function tube(x1, y1, x2, y2, w, colour, s) {
    return line(x1, y1, x2, y2, w + s * 2, INK) + line(x1, y1, x2, y2, w, colour);
  }

  function path(d, fill, s, stroke, extra) {
    return '<path d="' + d + '" fill="' + fill + '"' + st(s, stroke) + (extra || '') + '/>';
  }

  function at(x, y, rot, inner, sx, sy) {
    return '<g transform="translate(' + n(x) + ' ' + n(y) + ')' +
      (rot ? ' rotate(' + n(rot) + ')' : '') +
      (sx || sy ? ' scale(' + (sx || 1) + ' ' + (sy || 1) + ')' : '') + '">' + inner + '</g>';
  }

  /* Lay a long instrument drawn along +y (far end at 0, near end at len) so its
     near end sits at x,y and it points at the given angle in degrees, screen
     style. sy squashes it along its length: an instrument tipped up toward the
     player is shorter seen from above. */
  function lay(x, y, angle, len, inner, sy, sx) {
    return '<g transform="translate(' + n(x) + ' ' + n(y) + ') rotate(' + n(angle + 90) + ')' +
      (sy || sx ? ' scale(' + (sx || 1) + ' ' + (sy || 1) + ')' : '') + ' translate(0 ' + n(-len) + ')">' + inner + '</g>';
  }

  /* ---------------- defining a symbol ---------------- */

  /* W, D: the design footprint in mm. The drawing is fitted into the box it is
     given without distortion, centred, so a catalogue entry a little wider or
     deeper than the design still draws true. */
  function define(name, W, D, draw) {
    I.define(name, {
      aspect: W / D,
      draw: function (c) {
        var k = Math.min(c.vw / W, c.vh / D);
        var ox = (c.vw - W * k) / 2, oy = (c.vh - D * k) / 2;
        var s = c.sw / k;
        return DEFS + '<g transform="translate(' + n(ox) + ' ' + n(oy) + ') scale(' +
          (Math.round(k * 1e6) / 1e6) + ')" stroke-linejoin="round">' + draw(s, W, D) + '</g>';
      }
    });
  }

  /* ---------------- a person from above ---------------- */

  /* Drawn about the middle of the shoulders, facing +y. Returns the layers
     separately so an instrument can sit between them: a guitar under the
     forearms, a violin under the chin, a bow in front of everything.

     From above you see the crown of the head, not a face: hair almost all the
     way round, the tip of the nose and the ears. o.right, o.left place each
     hand relative to the shoulders; leave one out and that arm hangs at the
     side. o.seated draws the thighs forward over the seat. */
  function person(s, o) {
    o = o || {};
    var sleeve = '#2f323a';
    var out = { legs: '', body: '', arms: '', head: '' };

    if (o.seated) {
      out.legs =
        box(-150, 30, 128, 380, 58, 'url(#cl)', s) +
        box(22, 30, 128, 380, 58, 'url(#cl)', s) +
        ell(-88, 445, 50, 30, '#101012', s) + ell(88, 445, 50, 30, '#101012', s);
    } else {
      out.legs = ell(-95, 110, 48, 30, '#101012', s) + ell(95, 110, 48, 30, '#101012', s);
    }

    out.body = path('M-225,10 C-226,-88 -124,-116 0,-116 C124,-116 226,-88 225,10 ' +
      'C223,84 134,106 0,106 C-134,106 -223,84 -225,10 Z', 'url(#cl)', s);

    function arm(sx, hand) {
      var side = sx < 0 ? -1 : 1;
      if (!hand) {
        return tube(sx, -10, sx + side * 22, 60, 84, sleeve, s) + circ(sx + side * 26, 78, 34, 'url(#sk)', s);
      }
      var hx = hand[0], hy = hand[1];
      // the elbow bends out and back from the straight line to the hand
      var ex = (sx + hx) / 2 + side * 55, ey = hy / 2 + 25;
      return tube(sx, -5, ex, ey, 86, sleeve, s) + tube(ex, ey, hx, hy, 70, sleeve, s) +
        circ(hx, hy, 36, 'url(#sk)', s);
    }
    out.arms = arm(-185, o.right) + arm(185, o.left);

    out.head =
      ell(-84, 8, 14, 22, 'url(#sk)', s * 0.7) + ell(84, 8, 14, 22, 'url(#sk)', s * 0.7) +
      ell(0, 12, 84, 96, 'url(#hr)', s) +
      path('M-34,96 C-20,112 20,112 34,96 C22,104 -22,104 -34,96 Z', '#c98e67', s * 0.5) +
      ell(0, 110, 11, 13, '#d9a07a', s * 0.6);

    return out;
  }

  function whole(p, extra) { return p.legs + p.body + (extra || '') + p.arms + p.head; }

  /* ---------------- what they sit and read at ---------------- */

  // Seat centred under the hips, a slim curved back rail behind the shoulders.
  function chair(s) {
    return box(-205, -95, 410, 390, 38, 'url(#ch)', s) +
      path('M-215,-92 C-190,-150 190,-150 215,-92 L198,-80 C168,-124 -168,-124 -198,-80 Z', '#1c1d21', s);
  }

  /* A music desk from above: the shelf tipped toward the player, who is behind
     it, so the lip that holds the music is on the player's side. */
  function stand(s) {
    var legs = '';
    for (var i = 0; i < 3; i++) {
      var a = (i * 120 + 90) * Math.PI / 180;
      legs += line(0, 20, Math.cos(a) * 150, 20 + Math.sin(a) * 150, 12, '#3a3b40');
    }
    return legs +
      path('M-250,-60 L250,-60 L235,60 L-235,60 Z', 'url(#bk)', s) +
      box(-255, -78, 510, 24, 6, '#2a2b30', s);
  }

  /* ---------------- people, furniture ---------------- */

  define('person', 550, 550, function (s) {
    return at(275, 265, 0, whole(person(s, {})));
  });

  define('chair', 450, 450, function (s) {
    return at(225, 250, 0, chair(s));
  });

  define('music-stand', 540, 320, function (s) {
    return at(270, 170, 0, stand(s));
  });

  /* ---------------- the string family ---------------- */

  /* The outline of a violin, a guitar or anything else with two bouts and a
     waist, running from y0 for len millimetres along +y. */
  function fig8(y0, len, up, waist, low) {
    var a = up / 2, w = waist / 2, b = low / 2;
    var yU = y0 + len * 0.22, yW = y0 + len * 0.5, yL = y0 + len * 0.76, y1 = y0 + len;
    function side(k) {
      return ' C' + n(k * a * 0.7) + ',' + n(y0) + ' ' + n(k * a) + ',' + n(y0 + len * 0.08) + ' ' + n(k * a) + ',' + n(yU);
    }
    return 'M0,' + n(y0) + side(1) +
      ' C' + n(a) + ',' + n(yU + len * 0.12) + ' ' + n(w) + ',' + n(yW - len * 0.12) + ' ' + n(w) + ',' + n(yW) +
      ' C' + n(w) + ',' + n(yW + len * 0.1) + ' ' + n(b) + ',' + n(yL - len * 0.14) + ' ' + n(b) + ',' + n(yL) +
      ' C' + n(b) + ',' + n(yL + len * 0.16) + ' ' + n(b * 0.6) + ',' + n(y1) + ' 0,' + n(y1) +
      ' C' + n(-b * 0.6) + ',' + n(y1) + ' ' + n(-b) + ',' + n(yL + len * 0.16) + ' ' + n(-b) + ',' + n(yL) +
      ' C' + n(-b) + ',' + n(yL - len * 0.14) + ' ' + n(-w) + ',' + n(yW + len * 0.1) + ' ' + n(-w) + ',' + n(yW) +
      ' C' + n(-w) + ',' + n(yW - len * 0.12) + ' ' + n(-a) + ',' + n(yU + len * 0.12) + ' ' + n(-a) + ',' + n(yU) +
      ' C' + n(-a) + ',' + n(y0 + len * 0.08) + ' ' + n(-a * 0.7) + ',' + n(y0) + ' 0,' + n(y0) + ' Z';
  }

  function taper(y0, y1, w0, w1, fill, s) {
    return path('M' + n(-w0 / 2) + ',' + n(y0) + ' L' + n(w0 / 2) + ',' + n(y0) +
      ' L' + n(w1 / 2) + ',' + n(y1) + ' L' + n(-w1 / 2) + ',' + n(y1) + ' Z', fill, s);
  }

  /* A violin drawn at its real 595 mm, then scaled up for the viola, cello and
     bass, which keep its proportions closely enough to read as one family.
     Scroll at y 0, tail at 590, and a spike below that for the ones that stand. */
  function bowedInst(s, L, o) {
    o = o || {};
    var k = L / 595, t = s / k;
    function fhole(x) {
      return path('M' + x + ',392 C' + (x - 14) + ',418 ' + (x + 14) + ',446 ' + x + ',472', 'none', t * 1.6) +
        circ(x, 392, 4, INK, 0, 'none') + circ(x, 472, 4, INK, 0, 'none');
    }
    var strings = '';
    for (var i = 0; i < 4; i++) {
      var x = -9 + i * 6;
      strings += line(x, 60, x * 1.5, 566, t * 0.5, '#ececec');
    }
    var g = path(fig8(235, 355, 165, 110, 205), 'url(#wd)', t) +
      path(fig8(243, 339, 151, 98, 191), 'none', t * 0.6, '#3b1a08', ' opacity="0.55"') +
      taper(40, 480, 22, 40, '#17130f', t) +
      box(-13, 22, 26, 90, 6, 'url(#wd)', t) + circ(0, 20, 19, 'url(#wd)', t) + circ(0, 20, 8, 'none', t * 0.7) +
      line(-13, 55, -34, 50, 9, '#17130f') + line(13, 55, 34, 50, 9, '#17130f') +
      line(-13, 85, -34, 82, 9, '#17130f') + line(13, 85, 34, 82, 9, '#17130f') +
      fhole(42) + fhole(-42) +
      line(-40, 452, 40, 452, 7, '#f1dfb8') +
      path('M-20,472 L20,472 L13,572 L-13,572 Z', '#17130f', t) + strings;
    if (o.chin) g += ell(-48, 558, 40, 26, '#17130f', t);
    if (o.pin) g += line(0, 590, 0, 660, 8, '#9a9aa0');
    return '<g transform="scale(' + n(k * 1000) / 1000 + ')">' + g + '</g>';
  }

  // A bow along +y: the stick, the white hair beside it, the frog at the hand end.
  function bow(s, L) {
    return line(0, 0, 0, L, 10, INK) + line(0, 0, 0, L, 7, '#6b3b1a') +
      line(12, 40, 12, L - 62, 5, '#f4f1e8') +
      box(-6, L - 72, 26, 58, 4, '#121214', s) + circ(9, L - 43, 5, 'url(#sv)', s * 0.5);
  }

  /* A flat-top guitar, headstock at y 0, body at the far end: 1010 mm. A
     classical guitar has the slotted head, a wider neck and no pickguard. */
  function acoustic(s, o) {
    o = o || {};
    var T = 500, strings = '', frets = '', count = o.strings || 6;
    for (var f = 1; f <= 14; f++) {
      var fy = 200 + 330 * (1 - Math.pow(0.94, f)) / (1 - Math.pow(0.94, 14));
      frets += line(-26, fy, 26, fy, s * 0.7, '#c9c9c9', 'butt');
    }
    for (var i = 0; i < count; i++) {
      var x = -13 + i * 26 / (count - 1);
      strings += line(x * 0.8, 28, x * 1.3, T + 362, s * 0.4, '#efeee9');
    }
    var head = o.classical
      ? box(-38, 0, 76, 190, 10, '#2a1c12', s) + box(-21, 26, 12, 138, 5, '#0d0906', 0, 'none') + box(9, 26, 12, 138, 5, '#0d0906', 0, 'none')
      : path('M-42,0 L42,0 L33,195 L-33,195 Z', '#1d140d', s) +
        circ(-53, 42, 13, 'url(#sv)', s) + circ(53, 42, 13, 'url(#sv)', s) +
        circ(-53, 95, 13, 'url(#sv)', s) + circ(53, 95, 13, 'url(#sv)', s) +
        circ(-53, 148, 13, 'url(#sv)', s) + circ(53, 148, 13, 'url(#sv)', s);
    return head +
      taper(190, T + 40, o.classical ? 54 : 46, o.classical ? 62 : 56, '#3b2516', s) + frets +
      path(fig8(T, 510, 290, 238, 385), 'url(#sp)', s) +
      path(fig8(T + 8, 494, 276, 226, 369), 'none', s * 1.4, '#6d4526', ' opacity="0.7"') +
      circ(0, T + 150, 55, 'none', 9, '#7a5230') +
      circ(0, T + 150, 44, '#140e09', s) +
      (o.classical ? '' : ell(-46, T + 210, 34, 25, '#1b1310', 0, 'none', -25)) +
      box(-62, T + 352, 124, 26, 8, '#241810', s) + line(-40, T + 358, 40, T + 358, 4, '#efe6d2') +
      strings;
  }

  /* A solid-body electric guitar or bass: bolt-on maple neck, sunburst body
     with two horns, white guard, pickups, bridge and knobs. */
  function electric(s, o) {
    o = o || {};
    var bass = !!o.bass, T = bass ? 620 : 560, count = bass ? 4 : 6, strings = '', tuners = '';
    for (var i = 0; i < count; i++) {
      var x = (bass ? -15 : -13) + i * (bass ? 30 : 26) / (count - 1);
      strings += line(x * 0.8, 40, x * 1.2, T + 318, s * (bass ? 0.7 : 0.4), '#efeee9');
      tuners += circ(-38, 48 + i * (bass ? 36 : 25), bass ? 12 : 9, 'url(#sv)', s * 0.7);
    }
    var bx = bass ? 1.08 : 1;
    function X(v) { return n(v * bx); }
    var body = 'M' + X(-50) + ',' + T + ' C' + X(-120) + ',' + (T - 40) + ' ' + X(-172) + ',' + (T + 10) + ' ' + X(-150) + ',' + (T + 90) +
      ' C' + X(-134) + ',' + (T + 150) + ' ' + X(-176) + ',' + (T + 220) + ' ' + X(-166) + ',' + (T + 300) +
      ' C' + X(-156) + ',' + (T + 410) + ' ' + X(-60) + ',' + (T + 452) + ' 0,' + (T + 446) +
      ' C' + X(70) + ',' + (T + 452) + ' ' + X(166) + ',' + (T + 402) + ' ' + X(160) + ',' + (T + 290) +
      ' C' + X(156) + ',' + (T + 210) + ' ' + X(130) + ',' + (T + 160) + ' ' + X(146) + ',' + (T + 100) +
      ' C' + X(162) + ',' + (T + 30) + ' ' + X(128) + ',' + (T - 42) + ' ' + X(70) + ',' + (T + 28) +
      ' C' + X(44) + ',' + (T + 58) + ' ' + X(-20) + ',' + (T + 50) + ' ' + X(-50) + ',' + T + ' Z';
    var guard = 'M-38,' + (T + 36) + ' C-104,' + (T + 26) + ' -130,' + (T + 96) + ' -114,' + (T + 156) +
      ' C-100,' + (T + 226) + ' -74,' + (T + 300) + ' -38,' + (T + 336) + ' L62,' + (T + 336) +
      ' C96,' + (T + 300) + ' 86,' + (T + 240) + ' 64,' + (T + 196) + ' L44,' + (T + 56) + ' Z';
    var pickups = bass
      ? box(-34, T + 170, 34, 24, 8, '#161616', s) + box(0, T + 190, 34, 24, 8, '#161616', s)
      : box(-38, T + 112, 76, 22, 10, '#f3f1ea', s) + box(-38, T + 166, 76, 22, 10, '#f3f1ea', s) + box(-38, T + 226, 76, 22, 10, '#f3f1ea', s);
    return path('M-24,196 L-24,38 C-24,8 14,-4 46,14 L62,60 L32,196 Z', '#e6c388', s) + tuners +
      taper(190, T + 70, bass ? 42 : 40, bass ? 58 : 54, '#e3bf80', s) +
      circ(0, 330, 5, '#2a2a2a', 0, 'none') + circ(0, 390, 5, '#2a2a2a', 0, 'none') +
      circ(0, 446, 5, '#2a2a2a', 0, 'none') + circ(0, 515, 5, '#2a2a2a', 0, 'none') +
      path(body, 'url(#sb)', s) + path(guard, '#f4f1ea', s * 0.8) + pickups +
      box(-40, T + 296, 80, 34, 4, 'url(#sv)', s) +
      circ(66, T + 318, 14, '#f3f1ea', s * 0.7) + circ(84, T + 358, 14, '#f3f1ea', s * 0.7) + circ(92, T + 398, 14, '#f3f1ea', s * 0.7) +
      strings;
  }

  /* ---------------- string players ---------------- */

  // Seated section player: chair, stand in front, and the pose and instrument.
  function sectionPlayer(s, cx, cy, standY, pose, layers) {
    var p = person(s, pose);
    return at(cx, cy, 0, chair(s)) + at(cx, standY, 0, stand(s)) +
      at(cx, cy, 0, p.legs + p.body + (layers.mid || '') + p.arms + p.head + (layers.front || ''));
  }

  function violinist(L, W, D, cx) {
    return function (s) {
      var along = L * 0.92;
      var a = 55 * Math.PI / 180;
      var scroll = [60 + Math.cos(a) * along * 0.8, 55 + Math.sin(a) * along * 0.8];
      return sectionPlayer(s, cx, 200, D - 110, { seated: true, right: [-190, 300], left: scroll }, {
        mid: lay(60, 55, 55, L, bowedInst(s, L, { chin: true }), 0.92),
        front: lay(-190, 300, -23, 750, bow(s, 750))
      });
    };
  }

  define('orch-violin', 850, 1000, violinist(595, 850, 1000, 400));
  define('orch-viola', 900, 1050, violinist(660, 900, 1050, 410));

  define('orch-cello', 950, 1300, function (s) {
    var L = 1240, pinLen = L * 660 / 595, a = -80, sy = 0.6;
    return sectionPlayer(s, 460, 200, 1190, { seated: true, right: [-250, 420], left: [150, 60] }, {
      mid: lay(40, 640, a, pinLen, bowedInst(s, L, { pin: true }), sy),
      front: lay(-250, 420, -6, 715, bow(s, 715))
    });
  });

  define('orch-double-bass', 1000, 1400, function (s) {
    var L = 1850, pinLen = L * 660 / 595;
    // Stands behind the bass with it leaning back against the left side, so
    // from above the body is tipped away and the neck rises past the ear.
    var p = person(s, { right: [70, 360], left: [235, -30] });
    return at(380, 350, 0, p.legs + p.body + lay(120, 600, -78, pinLen, bowedInst(s, L, { pin: true }), 0.42, 0.85) + p.arms + p.head) +
      at(380, 1290, 0, stand(s));
  });

  // A guitarist, sitting or standing, the instrument across the body with its
  // face tipped toward the audience, so from above it is seen narrowed.
  function guitarist(o) {
    return function (s) {
      var p = person(s, { seated: o.seated, right: o.right, left: o.left });
      return (o.seated ? at(o.cx, o.cy, 0, chair(s)) : '') +
        at(o.cx, o.cy, 0, p.legs + p.body + lay(o.near[0], o.near[1], o.angle, o.len, o.inst(s), 1, o.narrow) + p.arms + p.head);
    };
  }

  define('mus-guitar-acoustic', 1250, 1000, guitarist({
    seated: true, cx: 400, cy: 230, near: [-190, 270], angle: -12, len: 1010, narrow: 0.62,
    right: [-40, 215], left: [446, 135], inst: function (s) { return acoustic(s / 1, {}); }
  }));

  define('mus-guitar-classical', 1250, 1000, guitarist({
    seated: true, cx: 400, cy: 230, near: [-190, 290], angle: -22, len: 1010, narrow: 0.62,
    right: [-40, 225], left: [410, -40], inst: function (s) { return acoustic(s, { classical: true }); }
  }));

  define('mus-guitar-electric', 1200, 750, guitarist({
    cx: 380, cy: 230, near: [-170, 190], angle: -15, len: 990, narrow: 0.55,
    right: [-40, 165], left: [455, 25], inst: function (s) { return electric(s, {}); }
  }));

  define('mus-bass-electric', 1350, 750, guitarist({
    cx: 380, cy: 230, near: [-170, 190], angle: -15, len: 1160, narrow: 0.55,
    right: [-30, 160], left: [560, 0], inst: function (s) { return electric(s, { bass: true }); }
  }));

  define('mus-ukulele', 850, 650, guitarist({
    cx: 330, cy: 220, near: [-110, 150], angle: -18, len: 535, narrow: 0.6,
    right: [-20, 130], left: [226, 45],
    inst: function (s) { return '<g transform="scale(0.53)">' + acoustic(s / 0.53, { strings: 4 }) + '</g>'; }
  }));

  /* ---------------- winds and brass ---------------- */

  var BRASS = '#d6a93f', SILVER = '#c9ced6', BLACKWOOD = '#1c1b1e';

  // A bent tube through several points: dark outline under a coloured core.
  function pipe(pts, w, colour, s) {
    var d = 'M' + pts.map(function (p) { return n(p[0]) + ',' + n(p[1]); }).join(' L');
    return '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="' + n(w + s * 2) +
      '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + colour + '" stroke-width="' + n(w) +
      '" stroke-linecap="round" stroke-linejoin="round"/>';
  }

  /* A bell flaring along +y from width w0 at y0 to w1 at y1, with its rim.
     From above a bell pointing forward is seen side-on, as a trumpet shape. */
  function flare(x, y0, y1, w0, w1, fill, s) {
    var h = y1 - y0;
    return path('M' + n(x - w0 / 2) + ',' + n(y0) + ' C' + n(x - w0 / 2) + ',' + n(y0 + h * 0.6) + ' ' +
      n(x - w1 / 2) + ',' + n(y1 - h * 0.15) + ' ' + n(x - w1 / 2) + ',' + n(y1) + ' L' + n(x + w1 / 2) + ',' + n(y1) +
      ' C' + n(x + w1 / 2) + ',' + n(y1 - h * 0.15) + ' ' + n(x + w0 / 2) + ',' + n(y0 + h * 0.6) + ' ' + n(x + w0 / 2) + ',' + n(y0) + ' Z',
      fill, s) + ell(x, y1, w1 / 2, Math.max(w1 * 0.1, 4), fill, s);
  }

  // A bell pointing up, seen from above: the rim, and the dark throat inside it.
  function bellUp(x, y, r, s) {
    return circ(x, y, r, 'url(#br)', s) + circ(x, y, r * 0.8, '#3a2a0c', s * 0.6) +
      circ(x - r * 0.12, y - r * 0.12, r * 0.55, '#6b4f16', 0, 'none');
  }

  function keys(x0, y0, x1, y1, count, r, s) {
    var out = '';
    for (var i = 0; i < count; i++) {
      var t = (i + 0.5) / count;
      out += circ(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, 'url(#sv)', s * 0.5);
    }
    return out;
  }

  /* Straight woodwinds along +y, the far end (bell) at 0 and the mouth end at
     len. Black wood with silver rings and keys; the flute is all silver. */
  function straightWind(s, len, o) {
    var w = o.width || 26, colour = o.silver ? 'url(#sv)' : BLACKWOOD;
    var out = box(-w / 2, o.bell ? o.bell * 0.6 : 0, w, len - (o.bell ? o.bell * 0.6 : 0) - 20, w / 2, colour, s);
    if (o.bell) out += flare(0, o.bell * 0.9, 0, w, o.bell, colour, s);
    if (o.bulb) out += circ(0, o.bulb, w * 1.2, colour, s);
    (o.rings || []).forEach(function (y) { out += box(-w / 2 - 3, y - 6, w + 6, 12, 3, 'url(#sv)', s * 0.6); });
    out += keys(0, len * 0.18, 0, len * 0.78, o.keys || 8, w * 0.28, s);
    if (o.reed) out += line(0, len - 20, 0, len + 18, 5, '#b08a4a');
    if (o.mouthpiece) out += taper(len - 70, len, w, w * 0.55, BLACKWOOD, s) + box(-w * 0.6, len - 72, w * 1.2, 12, 3, 'url(#sv)', s * 0.5);
    return out;
  }

  // The flute runs to the player's right, held level at the lips.
  function flute(s, len) {
    return box(-11, 0, 22, len, 11, 'url(#sv)', s) +
      keys(0, len * 0.08, 0, len * 0.72, 12, 8, s) +
      ell(0, len - 55, 18, 11, 'url(#sv)', s) + circ(0, len - 55, 5, INK, 0, 'none') +
      circ(0, len, 13, 'url(#sv)', s);
  }

  function seatedWind(W, D, cx, pose, mid, front) {
    return function (s) {
      return sectionPlayer(s, cx, 200, D - 110, Object.assign({ seated: true }, pose),
        { mid: mid(s), front: front ? front(s) : '' });
    };
  }

  define('orch-flute', 1000, 1000, seatedWind(1000, 1000, 640, { right: [-330, 150], left: [-150, 140] },
    function (s) { return lay(-8, 118, 174, 670, flute(s, 670)); }));

  define('orch-piccolo', 800, 1000, seatedWind(800, 1000, 480, { right: [-230, 145], left: [-110, 135] },
    function (s) { return lay(-8, 118, 172, 320, flute(s, 320)); }));

  define('orch-oboe', 800, 1000, seatedWind(800, 1000, 400, { right: [-12, 330], left: [12, 220] },
    function (s) { return lay(0, 112, 90, 650, straightWind(s, 650, { width: 22, bell: 46, rings: [180, 420], keys: 10, reed: true }), 0.62); }));

  define('orch-cor-anglais', 800, 1050, seatedWind(800, 1050, 400, { right: [-12, 380], left: [12, 250] },
    function (s) { return lay(0, 112, 90, 810, straightWind(s, 810, { width: 24, bulb: 40, rings: [230, 520], keys: 10, reed: true }), 0.6); }));

  define('orch-clarinet', 800, 1000, seatedWind(800, 1000, 400, { right: [-12, 340], left: [12, 225] },
    function (s) { return lay(0, 112, 90, 660, straightWind(s, 660, { width: 28, bell: 72, rings: [130, 330, 560], keys: 9, mouthpiece: true }), 0.65); }));

  // The bass clarinet stands between the knees, its silver bell curling up at the floor.
  define('orch-bass-clarinet', 850, 1100, seatedWind(850, 1100, 420, { right: [-15, 300], left: [15, 200] },
    function (s) {
      return lay(0, 112, 90, 1000, straightWind(s, 1000, { width: 42, rings: [300, 650], keys: 10, mouthpiece: true }), 0.42) +
        bellUp(0, 560, 78, s) + pipe([[0, 112], [30, 150], [0, 200]], 12, SILVER, s);
    }));

  // The bassoon runs from the boot at the right hip up past the left shoulder.
  function bassoonInst(s, len, w) {
    return box(-w / 2, 0, w, len, w / 2, 'url(#wd)', s) + box(-w / 2 - 4, len * 0.08, w + 8, 16, 4, 'url(#sv)', s * 0.6) +
      box(-w / 2 - 4, len * 0.55, w + 8, 14, 4, 'url(#sv)', s * 0.6) + keys(w * 0.3, len * 0.45, w * 0.3, len * 0.95, 8, 6, s);
  }

  define('orch-bassoon', 900, 1050, seatedWind(900, 1050, 430, { right: [-120, 250], left: [60, 120] },
    function (s) {
      return lay(-140, 270, -55, 1340, bassoonInst(s, 1340, 44), 0.42) +
        pipe([[0, 112], [-40, 150], [-95, 195]], 8, SILVER, s);
    }));

  define('orch-contrabassoon', 1000, 1150, seatedWind(1000, 1150, 420, { right: [-150, 300], left: [40, 200] },
    function (s) {
      return box(-270, 250, 200, 360, 40, 'url(#wd)', s) + box(-250, 270, 70, 320, 34, '#6e3413', s * 0.6) +
        box(-160, 270, 70, 320, 34, '#6e3413', s * 0.6) + bellUp(-170, 620, 60, s) +
        pipe([[0, 112], [-60, 160], [-150, 240]], 9, SILVER, s);
    }));

  // Alto saxophone at the right side: crook to the mouth, body down, bell turned up.
  function saxophone(s) {
    return pipe([[0, 112], [-45, 150], [-70, 180]], 18, BRASS, s) +
      pipe([[-70, 180], [-110, 260], [-150, 360]], 44, BRASS, s) +
      keys(-80, 200, -140, 340, 6, 11, s) +
      ell(-110, 385, 72, 56, 'url(#br)', s) + ell(-106, 381, 52, 40, '#4a360e', s * 0.6);
  }

  define('orch-saxophone', 850, 1000, seatedWind(850, 1000, 440, { right: [-150, 335], left: [-80, 230] },
    function (s) { return saxophone(s); }));

  // Horn: the coil in the lap, the bell resting on the right thigh and the hand in it.
  function hornInst(s) {
    return ell(-175, 205, 150, 110, 'url(#br)', s) + ell(-175, 210, 118, 84, '#4a360e', s * 0.6) +
      circ(-40, 215, 120, 'none', 22, INK) + circ(-40, 215, 120, 'none', 16, BRASS) +
      circ(-40, 215, 80, 'none', 16, INK) + circ(-40, 215, 80, 'none', 11, BRASS) +
      pipe([[0, 112], [10, 150], [-20, 190]], 12, BRASS, s) +
      circ(10, 190, 16, 'url(#sv)', s) + circ(40, 215, 16, 'url(#sv)', s) + circ(40, 250, 16, 'url(#sv)', s);
  }

  define('orch-horn', 950, 1000, seatedWind(950, 1000, 520, { right: [-175, 210], left: [30, 200] },
    function (s) { return hornInst(s); }));

  /* Trumpet held level and forward: leadpipe, three valves, the bell at the far
     end. Drawn along +y with the mouthpiece at len. */
  function trumpetInst(s, len) {
    return flare(0, len * 0.55, 0, 18, 120, 'url(#br)', s) +
      pipe([[0, len * 0.5], [0, len]], 14, BRASS, s) +
      pipe([[-30, len * 0.4], [-30, len * 0.75], [30, len * 0.75], [30, len * 0.4]], 12, BRASS, s) +
      circ(0, len * 0.55, 17, 'url(#sv)', s) + circ(0, len * 0.62, 17, 'url(#sv)', s) + circ(0, len * 0.69, 17, 'url(#sv)', s) +
      circ(0, len, 12, 'url(#sv)', s);
  }

  define('orch-trumpet', 800, 1100, seatedWind(800, 1100, 400, { right: [-14, 420], left: [22, 380] },
    function (s) { return lay(0, 115, 90, 480, trumpetInst(s, 480)); }));

  /* Trombone: the slide straight ahead, the bell section alongside on the
     player's left with its bell looking forward too. */
  function tromboneInst(s, slide, bellW) {
    return pipe([[-12, 0], [-12, slide]], 10, BRASS, s) + pipe([[12, 0], [12, slide]], 10, BRASS, s) +
      pipe([[-12, 4], [12, 4]], 12, BRASS, s) + box(-22, slide * 0.45, 44, 14, 5, 'url(#sv)', s * 0.6) +
      pipe([[12, slide], [48, slide - 40], [60, slide * 0.4]], 14, BRASS, s) +
      flare(60, slide * 0.4, slide * 0.4 - 280, 20, bellW, 'url(#br)', s) +
      circ(0, slide + 18, 12, 'url(#sv)', s);
  }

  define('orch-trombone', 850, 1450, seatedWind(850, 1450, 420, { right: [-10, 560], left: [60, 260] },
    function (s) { return lay(0, 115, 90, 720, tromboneInst(s, 720, 210)); }));

  define('orch-bass-trombone', 900, 1550, seatedWind(900, 1550, 440, { right: [-10, 620], left: [70, 270] },
    function (s) {
      return lay(0, 115, 90, 800, tromboneInst(s, 800, 250)) +
        circ(95, 330, 60, 'none', 16, INK) + circ(95, 330, 60, 'none', 11, BRASS);
    }));

  // Tuba in the lap, the great bell rising past the left shoulder.
  define('orch-tuba', 1050, 1100, seatedWind(1050, 1100, 470, { right: [-40, 270], left: [150, 240] },
    function (s) {
      return pipe([[0, 112], [-20, 170], [-40, 230]], 16, BRASS, s) +
        box(-90, 220, 130, 110, 40, 'url(#br)', s) +
        circ(-60, 250, 17, 'url(#sv)', s) + circ(-30, 250, 17, 'url(#sv)', s) + circ(0, 250, 17, 'url(#sv)', s) + circ(30, 250, 17, 'url(#sv)', s) +
        bellUp(175, 60, 230, s);
    }));

  /* ---------------- standing horn players in a band ---------------- */

  define('mus-saxophone', 800, 800, function (s) {
    var p = person(s, { right: [-150, 335], left: [-80, 230] });
    return at(430, 260, 0, p.legs + p.body + saxophone(s) + p.arms + p.head);
  });

  define('mus-trumpet', 700, 950, function (s) {
    var p = person(s, { right: [-14, 420], left: [22, 380] });
    return at(350, 250, 0, p.legs + p.body + lay(0, 115, 90, 480, trumpetInst(s, 480)) + p.arms + p.head);
  });

  /* ---------------- percussion, keyboards, harp, conductor ---------------- */

  // A stool: the round seat a percussionist perches on.
  function stool(s) { return circ(0, -30, 170, 'url(#ch)', s); }

  // A mallet or a stick from the hand, ending in its head.
  function mallet(x1, y1, x2, y2, head, s) {
    return line(x1, y1, x2, y2, 12 + s * 2, INK) + line(x1, y1, x2, y2, 12, '#d9b98a') +
      (head ? circ(x2, y2, head, '#efe6d2', s) : '');
  }

  // A timpano: copper bowl, calf-white head, silver hoop and its tuning lugs,
  // and the pedal on the side nearest the player at px,py.
  function kettle(x, y, d, px, py, s) {
    var r = d / 2, dx = px - x, dy = py - y, k = Math.sqrt(dx * dx + dy * dy) || 1;
    var out = box(x + dx / k * (r + 20) - 70, y + dy / k * (r + 20) - 45, 140, 90, 16, '#26272c', s) +
      circ(x, y, r, 'url(#cu)', s) + circ(x, y, r - 26, 'url(#hd)', s) + circ(x, y, r - 13, 'none', 12, '#a9aeb6');
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      out += circ(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4), 15, 'url(#sv)', s * 0.6);
    }
    return out;
  }

  // A drum head seen from above: shell, head, hoop and lugs.
  function drum(x, y, d, shell, lugs, s) {
    var r = d / 2, out = circ(x, y, r, shell, s) + circ(x, y, r - 16, 'url(#hd)', s) + circ(x, y, r - 8, 'none', 8, '#9aa0a8');
    for (var i = 0; i < lugs; i++) {
      var a = i * 2 * Math.PI / lugs;
      out += circ(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.max(10, d * 0.03), 'url(#sv)', s * 0.5);
    }
    return out;
  }

  // A cymbal: bronze with lathe rings and a raised bell in the middle.
  function cymbal(x, y, d, s, ry) {
    var r = d / 2, k = ry || 1;
    return ell(x, y, r, r * k, 'url(#cy)', s) + ell(x, y, r * 0.72, r * 0.72 * k, 'none', s * 0.5, '#8a6a22') +
      ell(x, y, r * 0.45, r * 0.45 * k, 'none', s * 0.5, '#8a6a22') + ell(x, y, r * 0.2, r * 0.2 * k, 'url(#cy)', s * 0.8);
  }

  /* A keyboard from above, the player on the -y side. Low notes are on the
     player's left, which is the right of the drawing, so the black keys are laid
     out from the left edge starting at the top B. */
  function keyboard(x, y, w, h, octaves, s) {
    var whites = octaves * 7 + 1, kw = w / whites, pattern = [1, 1, 1, 0, 1, 1, 0], out = box(x, y, w, h, 3, '#fbfaf6', s);
    for (var i = 1; i < whites; i++) out += line(x + i * kw, y, x + i * kw, y + h, s * 0.6, '#9c9c9c', 'butt');
    for (var j = 0; j < whites - 1; j++) {
      if (pattern[j % 7]) out += box(x + (j + 1) * kw - kw * 0.3, y + h * 0.36, kw * 0.6, h * 0.64, 2, '#141416', 0, 'none');
    }
    return out;
  }

  /* Tuned bars in two rows, low notes on the player's left (right of the
     drawing), naturals nearest the player, accidentals beyond; resonator tubes
     show past the ends of the bars where an instrument has them. */
  function bars(W, D, count, fill, o, s) {
    o = o || {};
    var out = box(-W / 2, 0, W, D, 30, o.frame || '#2b2c31', s), step = (W - 80) / count;
    var pattern = [1, 1, 1, 0, 1, 1, 0];
    function bar(x, yMid, len, wBar) {
      var y0 = yMid - len / 2;
      return (o.resonators ? circ(x, y0 + len + wBar * 0.5, wBar * 0.42, '#15161a', 0, 'none') : '') +
        box(x - wBar / 2, y0, wBar, len, wBar * 0.2, fill, s * 0.7);
    }
    for (var i = 0; i < count; i++) {
      var t = i / (count - 1), x = -W / 2 + 40 + step * (i + 0.5), len = D * 0.4 * (0.55 + 0.45 * t);
      out += bar(x, D * 0.28, len, step * 0.8);
      if (i < count - 1 && pattern[i % 7]) out += bar(x + step / 2, D * 0.72, len * 0.95, step * 0.62);
    }
    if (o.rods) out += line(-W / 2 + 30, D * 0.28, W / 2 - 30, D * 0.28, 5, '#b9bec6') + line(-W / 2 + 30, D * 0.72, W / 2 - 30, D * 0.72, 5, '#b9bec6');
    return out;
  }

  function standingPlayer(s, cx, cy, pose, before, after) {
    var p = person(s, pose);
    return (before || '') + at(cx, cy, 0, p.legs + p.body + (after && after.mid || '') + p.arms + p.head + (after && after.front || ''));
  }

  define('orch-timpani', 2600, 1800, function (s) {
    var drums = kettle(-850, 520, 810, 0, 0, s) + kettle(-300, 860, 740, 0, 0, s) + kettle(300, 860, 660, 0, 0, s) + kettle(850, 520, 580, 0, 0, s);
    return at(1300, 330, 0, stool(s) + drums) +
      standingPlayer(s, 1300, 330, { seated: true, right: [-260, 330], left: [260, 330] }, '',
        { front: mallet(-260, 330, -380, 620, 30, s) + mallet(260, 330, 360, 660, 30, s) });
  });

  define('orch-snare-drum', 800, 1000, function (s) {
    var legs = '';
    for (var i = 0; i < 3; i++) { var a = (i * 120 + 90) * Math.PI / 180; legs += line(0, 0, Math.cos(a) * 230, Math.sin(a) * 230, 14, '#2c2d31'); }
    return at(400, 620, 0, legs + drum(0, 0, 360, 'url(#sv)', 10, s)) +
      standingPlayer(s, 400, 250, { right: [-110, 300], left: [110, 300] }, '',
        { front: mallet(-110, 300, -30, 360, 0, s) + mallet(110, 300, 40, 380, 0, s) });
  });

  // On its frame the drum stands on edge, so from above it is its shell, hoops at both heads.
  define('orch-bass-drum', 1300, 1200, function (s) {
    var rods = '';
    for (var i = 0; i < 8; i++) rods += line(10, 60 + i * 110, 450, 60 + i * 110, 5, '#9aa0a8');
    var bd = box(-40, -40, 540, 960, 30, 'none', 26, '#26272c') +
      box(0, 0, 460, 880, 20, 'url(#wd)', s) + rods +
      box(-12, -6, 30, 892, 10, '#1c1c1f', s) + box(442, -6, 30, 892, 10, '#1c1c1f', s);
    return at(700, 160, 0, bd) +
      standingPlayer(s, 380, 330, { right: [-100, 260], left: [250, 250] }, '',
        { front: mallet(250, 250, 320, 520, 55, s) });
  });

  define('orch-cymbals', 900, 900, function (s) {
    return standingPlayer(s, 450, 250, { right: [-210, 330], left: [210, 330] }, '',
      { front: cymbal(-190, 380, 500, s, 0.5) + cymbal(190, 380, 500, s, 0.5) });
  });

  function malletPlayer(W, D, count, fill, o, iW, iD, iy, heads) {
    return function (s) {
      var cx = W / 2;
      // iy: where the front of the instrument is, from the top of the footprint
      var tip = iy - 260 + iD * 0.28;
      var mallets = mallet(-230, 330, -300, tip, 26, s) + mallet(230, 330, 300, tip, 26, s);
      if (heads === 4) mallets += mallet(-230, 330, -110, tip, 26, s) + mallet(230, 330, 110, tip, 26, s);
      return at(cx, iy, 0, bars(iW, iD, count, fill, o, s)) +
        standingPlayer(s, cx, 260, { right: [-230, 330], left: [230, 330] }, '', { front: mallets });
    };
  }

  define('orch-marimba', 2600, 1400, malletPlayer(2600, 1400, 30, 'url(#rw)', { resonators: true }, 2400, 900, 350, 4));
  define('orch-xylophone', 1800, 1100, malletPlayer(1800, 1100, 22, 'url(#rw)', { resonators: true }, 1560, 650, 350, 2));
  define('orch-vibraphone', 1600, 1100, malletPlayer(1600, 1100, 22, 'url(#sv)', { resonators: true, rods: true }, 1400, 700, 350, 4));
  define('orch-glockenspiel', 1000, 900, malletPlayer(1000, 900, 18, 'url(#sv)', { frame: '#6b1f24' }, 820, 380, 350, 2));

  define('orch-tubular-bells', 1200, 1000, function (s) {
    var chimes = box(-520, 0, 1040, 330, 30, 'none', 22, '#26272c') + line(-500, 90, 500, 90, 14, '#26272c') + line(-500, 240, 500, 240, 14, '#26272c');
    for (var i = 0; i < 10; i++) chimes += circ(-450 + i * 100, 90, 34, 'url(#sv)', s) + circ(-400 + i * 100, 240, 28, 'url(#sv)', s);
    return at(600, 560, 0, chimes) +
      standingPlayer(s, 600, 250, { right: [-160, 320], left: [120, 300] }, '',
        { front: mallet(-160, 320, -120, 560, 0, s) + box(-150, 548, 70, 40, 10, '#e9dcc0', s) });
  });

  define('orch-tam-tam', 1400, 1100, function (s) {
    var frame = circ(-620, 0, 40, '#26272c', s) + circ(620, 0, 40, '#26272c', s) + line(-620, 0, 620, 0, 26, '#26272c') +
      ell(0, 0, 540, 60, 'url(#cy)', s) + ell(0, 0, 70, 12, '#8a6a22', s * 0.6);
    return at(700, 720, 0, frame) +
      standingPlayer(s, 560, 280, { right: [-120, 300], left: [180, 320] }, '',
        { front: mallet(180, 320, 260, 640, 70, s) });
  });

  define('orch-celesta', 1100, 1300, function (s) {
    return at(550, 180, 0, box(-330, -110, 660, 230, 30, 'url(#ch)', s)) +
      at(550, 560, 0, box(-520, 0, 1040, 620, 20, 'url(#rw)', s) + keyboard(-470, 0, 940, 150, 5, s)) +
      standingPlayer(s, 550, 200, { seated: true, right: [-180, 330], left: [180, 330] });
  });

  /* Grand and harpsichord cases: keyboard across the end nearest the player,
     the long straight spine on the bass side (the player's left, right of the
     drawing) and the curved bentside sweeping back to the tail. */
  function caseOutline(W, L) {
    var h = W / 2;
    return 'M' + n(-h) + ',0 L' + n(h) + ',0 L' + n(h) + ',' + n(L * 0.9) +
      ' C' + n(h) + ',' + n(L * 1.0) + ' ' + n(h * 0.55) + ',' + n(L * 1.02) + ' ' + n(h * 0.25) + ',' + n(L * 0.97) +
      ' C' + n(-h * 0.3) + ',' + n(L * 0.88) + ' ' + n(-h * 1.0) + ',' + n(L * 0.55) + ' ' + n(-h) + ',' + n(L * 0.3) + ' Z';
  }

  function grand(s, W, L, o) {
    o = o || {};
    var lid = o.harpsichord
      ? path(caseOutline(W, L), 'url(#rw)', s) + '<g transform="translate(0 30) scale(0.9 0.95)">' + path(caseOutline(W, L), 'url(#sp)', s) + '</g>' +
        circ(-W * 0.05, L * 0.55, 60, 'none', 10, '#6d4526') + box(-W / 2 + 20, 170, W - 40, 40, 6, '#1c1310', s)
      : path(caseOutline(W, L), 'url(#bk)', s) +
        path(caseOutline(W * 0.93, L * 0.95), 'none', s * 0.8, '#5c5c62', ' transform="translate(0 20)"') +
        box(-W * 0.3, 190, W * 0.6, 60, 8, '#0c0c0e', s * 0.6);
    return lid + box(-W / 2 + 10, -150, W - 20, 160, 10, o.harpsichord ? '#3a2416' : '#101012', s) +
      keyboard(-W / 2 + 40, -150, W - 80, 140, o.harpsichord ? 5 : 7, s);
  }

  define('orch-harpsichord', 1100, 3000, function (s) {
    return at(550, 520, 0, grand(s, 950, 2300, { harpsichord: true })) +
      at(550, 180, 0, box(-300, -100, 600, 210, 30, 'url(#ch)', s)) +
      standingPlayer(s, 550, 200, { seated: true, right: [-200, 330], left: [200, 330] });
  });

  // The pedal harp on the right shoulder: base between the knees, the soundbox
  // rising to the shoulder, the crown of the column out front and the neck
  // curving between them with the strings strung across.
  define('orch-harp', 1200, 1300, function (s) {
    var strings = '';
    for (var i = 1; i < 12; i++) {
      var t = i / 12;
      strings += line(-150 + 190 * t, 40 + 440 * t, -150 + 410 * t, 40 + 680 * t - 180 * Math.sin(t * Math.PI), s * 0.5, '#e8e2d2');
    }
    var harp = box(-140, 420, 380, 300, 60, 'url(#br)', s) +
      path('M-190,20 L-110,20 L90,450 L-30,470 Z', 'url(#wd)', s) + strings +
      path('M-150,30 C-20,-40 120,420 260,720', 'none', 54, INK) + path('M-150,30 C-20,-40 120,420 260,720', 'none', 46, '#c49636') +
      circ(260, 720, 70, 'url(#br)', s);
    return at(420, 250, 0, chair(s)) +
      standingPlayer(s, 420, 250, { seated: true, right: [-40, 260], left: [120, 330] }, '', { mid: harp });
  });

  // The conductor faces the orchestra, upstage, baton up, desk before them on the podium.
  define('orch-podium', 1000, 1100, function (s) {
    var p = person(s, { right: [-250, 200], left: [240, 190] });
    var conductor = p.legs + p.body + p.arms + p.head + mallet(-250, 200, -330, 430, 0, s).replace(/#d9b98a/g, '#f4f1e8');
    return at(500, 550, 0, box(-470, -520, 940, 1040, 30, '#3e2a24', s) + box(-440, -490, 880, 980, 20, '#5a2a2e', s * 0.6)) +
      at(500, 230, 180, stand(s)) + at(500, 640, 180, conductor);
  });

  /* ---------------- the backline pianos, redrawn ---------------- */

  define('piano-grand', 1500, 2200, function (s) {
    return at(750, 170, 0, grand(s, 1450, 1990, {}));
  });

  define('piano-upright', 1500, 600, function (s) {
    return at(750, 0, 0, box(-740, 10, 1480, 420, 16, 'url(#bk)', s) + box(-720, 30, 1440, 60, 8, '#0c0c0e', s * 0.6) +
      box(-700, 430, 1400, 30, 6, '#101012', s) + keyboard(-680, 440, 1360, 140, 7, s));
  });

  define('keyboard', 1400, 350, function (s) {
    return at(700, 0, 0, box(-690, 10, 1380, 330, 26, '#1a1b1f', s) + box(-650, 30, 1300, 70, 8, '#2c2e34', s * 0.6) +
      circ(-600, 65, 14, '#56585f', s * 0.5) + circ(-560, 65, 14, '#56585f', s * 0.5) + box(400, 45, 180, 40, 6, '#0e3b52', s * 0.5) +
      keyboard(-650, 120, 1300, 200, 5, s));
  });

  /* ---------------- the band ---------------- */

  function tripod(r, s) {
    var out = '';
    for (var i = 0; i < 3; i++) {
      var a = (i * 120 + 90) * Math.PI / 180;
      out += line(0, 0, Math.cos(a) * r, Math.sin(a) * r, 14, '#2c2d31');
    }
    return out + circ(0, 0, 16, '#2c2d31', s);
  }

  /* A right-handed kit from the drummer's seat: kick straight ahead with the
     rack toms on it, snare between the knees, hi-hat on the left foot (right of
     the drawing), floor tom and ride on the right hand side. */
  function drumKit(s) {
    return at(430, 250, 0, tripod(200, s)) + at(420, 650, 0, tripod(220, s)) + at(-540, 620, 0, tripod(240, s)) +
      box(-280, 290, 560, 470, 26, 'url(#rw)', s) + box(-290, 280, 580, 26, 10, '#18181b', s) + box(-290, 744, 580, 26, 10, '#18181b', s) +
      box(-40, 220, 80, 70, 10, 'url(#sv)', s) +
      drum(-140, 470, 300, 'url(#rw)', 6, s) + drum(160, 450, 330, 'url(#rw)', 6, s) +
      drum(-430, 330, 410, 'url(#rw)', 8, s) +
      drum(180, 250, 360, 'url(#sv)', 10, s) +
      cymbal(430, 250, 360, s) + cymbal(420, 650, 460, s) + cymbal(-540, 620, 540, s);
  }

  define('drumkit', 2200, 1800, function (s) {
    // the kit sits forward of the throne, with room for the knees behind the snare
    return at(1100, 330, 0, stool(s) + at(0, 150, 0, drumKit(s)));
  });

  define('mus-drummer', 2200, 1900, function (s) {
    var p = person(s, { seated: true, right: [-120, 270], left: [170, 250] });
    return at(1100, 330, 0, stool(s) + at(0, 150, 0, drumKit(s)) + p.legs + p.body + p.arms + p.head +
      mallet(-120, 270, 30, 420, 0, s) + mallet(170, 250, 260, 390, 0, s));
  });

  define('mus-congas', 1300, 950, function (s) {
    var p = person(s, { right: [-170, 420], left: [170, 430] });
    return at(650, 250, 0, drum(-320, 470, 280, 'url(#wd)', 6, s) + drum(-170, 430, 300, 'url(#wd)', 6, s) + drum(170, 440, 320, 'url(#wd)', 6, s) +
      p.legs + p.body + p.arms + p.head);
  });

  // The cajón is sat on, so it is under the player; the hands reach down to its front.
  define('mus-cajon', 700, 750, function (s) {
    var p = person(s, { seated: true, right: [-100, 250], left: [100, 250] });
    return at(350, 250, 0, box(-160, -130, 320, 320, 18, 'url(#sp)', s) + box(-150, 160, 300, 30, 6, '#3a2416', s * 0.6) +
      p.legs + p.body + p.arms + p.head);
  });

  define('mus-bongos', 800, 800, function (s) {
    var p = person(s, { right: [-90, 380], left: [110, 380] });
    return at(400, 250, 0, at(0, 400, 0, tripod(160, s)) + box(-30, 380, 60, 40, 8, 'url(#sv)', s) +
      drum(-100, 400, 190, 'url(#wd)', 5, s) + drum(110, 400, 230, 'url(#wd)', 5, s) +
      p.legs + p.body + p.arms + p.head);
  });

  // Keyboard on an X-stand, the player standing behind it.
  define('mus-keys', 1500, 950, function (s) {
    var p = person(s, { right: [-230, 330], left: [230, 330] });
    return at(750, 250, 0, line(-520, 330, 520, 640, 26, '#2c2d31') + line(-520, 640, 520, 330, 26, '#2c2d31') +
      box(-690, 300, 1380, 330, 26, '#1a1b1f', s) + box(-650, 540, 1300, 60, 8, '#2c2e34', s * 0.6) +
      keyboard(-650, 320, 1300, 200, 5, s) + p.legs + p.body + p.arms + p.head);
  });

  define('mus-pianist', 1600, 2600, function (s) {
    var p = person(s, { seated: true, right: [-220, 330], left: [220, 330] });
    return at(800, 560, 0, grand(s, 1450, 1990, {})) +
      at(800, 190, 0, box(-380, -100, 760, 220, 20, 'url(#bk)', s) + p.legs + p.body + p.arms + p.head);
  });

  // Accordion strapped to the chest: keys under the right hand, buttons under the left, bellows between.
  define('mus-accordion', 850, 750, function (s) {
    var p = person(s, { right: [-250, 230], left: [250, 230] }), pleats = '';
    for (var i = 0; i < 9; i++) pleats += line(-150 + i * 37, 130, -150 + i * 37, 330, 6, i % 2 ? '#1a1a1d' : '#7a1f24');
    var buttons = '';
    for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) buttons += circ(195 + c * 22, 160 + r * 45, 8, '#f3f1ea', s * 0.4);
    return at(425, 230, 0, p.legs + p.body +
      box(-240, 120, 480, 220, 20, '#8a1d24', s) + pleats +
      '<g transform="translate(-235 330) rotate(-90)">' + keyboard(0, 0, 200, 60, 2, s) + '</g>' + buttons +
      p.arms + p.head);
  });

  // Mandolin: teardrop body, oval sound hole, eight tuners on a flat head.
  function mandolinInst(s) {
    var tuners = '', strings = '';
    for (var i = 0; i < 4; i++) {
      tuners += circ(-40, 30 + i * 32, 10, 'url(#sv)', s * 0.6) + circ(40, 30 + i * 32, 10, 'url(#sv)', s * 0.6);
      strings += line(-10 + i * 7, 20, -14 + i * 9, 610, s * 0.4, '#efeee9');
    }
    return path('M-30,0 L30,0 L26,160 L-26,160 Z', '#1d140d', s) + tuners +
      taper(150, 360, 30, 38, '#3b2516', s) +
      path('M0,330 C120,330 140,470 128,560 C116,640 60,690 0,690 C-60,690 -116,640 -128,560 C-140,470 -120,330 0,330 Z', 'url(#sp)', s) +
      ell(0, 470, 34, 24, '#140e09', s) + box(-34, 590, 68, 18, 5, '#241810', s) + strings;
  }

  // Banjo: a drum for a body, white head, silver flange and brackets, long neck.
  function banjoInst(s) {
    var brackets = '';
    for (var i = 0; i < 16; i++) {
      var a = i * Math.PI / 8;
      brackets += circ(Math.cos(a) * 170, 780 + Math.sin(a) * 170, 9, 'url(#sv)', s * 0.5);
    }
    var strings = '';
    for (var j = 0; j < 5; j++) strings += line(-10 + j * 5, 30, -14 + j * 7, 880, s * 0.4, '#efeee9');
    return path('M-36,0 L36,0 L30,170 L-30,170 Z', '#1d140d', s) +
      circ(-46, 50, 10, 'url(#sv)', s * 0.6) + circ(46, 50, 10, 'url(#sv)', s * 0.6) + circ(-46, 110, 10, 'url(#sv)', s * 0.6) + circ(46, 110, 10, 'url(#sv)', s * 0.6) +
      taper(160, 640, 40, 50, '#3b2516', s) + circ(30, 380, 9, 'url(#sv)', s * 0.6) +
      circ(0, 780, 190, 'url(#rw)', s) + circ(0, 780, 172, 'url(#sv)', s) + circ(0, 780, 150, 'url(#hd)', s) + brackets +
      box(-40, 860, 80, 16, 4, '#efe6d2', s * 0.6) + path('M-22,880 L22,880 L14,950 L-14,950 Z', 'url(#sv)', s) + strings;
  }

  define('mus-mandolin', 950, 650, guitarist({
    cx: 380, cy: 220, near: [-120, 160], angle: -15, len: 690, narrow: 0.6,
    right: [-30, 140], left: [300, 30], inst: mandolinInst
  }));

  define('mus-banjo', 1150, 1000, guitarist({
    seated: true, cx: 380, cy: 230, near: [-150, 300], angle: -14, len: 950, narrow: 0.62,
    right: [-60, 230], left: [440, 120], inst: banjoInst
  }));

  define('mus-fiddle', 850, 750, function (s) {
    var L = 595, along = L * 0.92, a = 55 * Math.PI / 180;
    var p = person(s, { right: [-190, 300], left: [60 + Math.cos(a) * along * 0.8, 55 + Math.sin(a) * along * 0.8] });
    return at(360, 230, 0, p.legs + p.body + lay(60, 55, 55, L, bowedInst(s, L, { chin: true }), 0.92) + p.arms + p.head +
      lay(-190, 300, -23, 750, bow(s, 750)));
  });

  // Singer at a straight stand, the mic in front of the mouth and a hand on it.
  define('mus-singer', 700, 800, function (s) {
    var p = person(s, { right: [-70, 190] });
    return at(350, 260, 0, at(0, 330, 0, tripod(200, s)) + line(0, 330, 0, 200, 16, '#2c2d31') +
      p.legs + p.body + p.arms + p.head +
      box(-17, 150, 34, 110, 14, '#15151a', s) + circ(0, 150, 30, 'url(#sv)', s) + circ(0, 150, 30, 'none', s * 0.5));
  });

  // DJ booth: two turntables either side of the mixer, the DJ standing behind.
  function turntable(x, y, s) {
    var grooves = '';
    for (var i = 1; i < 5; i++) grooves += circ(x, y, 60 + i * 28, 'none', s * 0.4, '#3a3a3e');
    return box(x - 230, y - 180, 460, 360, 16, '#bfc3ca', s) + circ(x, y, 170, '#111113', s) + grooves +
      circ(x, y, 50, '#c0392b', s * 0.5) + circ(x, y, 6, '#d9dde3', 0, 'none') +
      line(x + 190, y - 140, x + 110, y + 90, 10, '#e3e6ea') + circ(x + 190, y - 140, 20, '#9aa0a8', s * 0.6);
  }

  define('mus-dj', 1500, 950, function (s) {
    var p = person(s, { right: [-300, 360], left: [260, 360] }), faders = '';
    for (var i = 0; i < 4; i++) faders += line(-60 + i * 40, 430, -60 + i * 40, 510, 8, '#0c0c0e') + box(-72 + i * 40, 462, 24, 16, 3, '#e3e6ea', 0, 'none');
    return at(750, 250, 0, box(-700, 260, 1400, 420, 20, '#26272c', s) +
      turntable(-440, 470, s) + turntable(440, 470, s) +
      box(-130, 320, 260, 300, 12, '#1c1d21', s) + faders +
      p.legs + p.body + p.arms + p.head);
  });

  window.Musicians = {
    define: define, person: person, whole: whole, chair: chair, stand: stand,
    shapes: { circ: circ, ell: ell, box: box, line: line, tube: tube, path: path, at: at, lay: lay }
  };
})();

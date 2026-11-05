// =====================================================================
// LEVEL 3  (build ruff567)
// ---------------------------------------------------------------------
// Level 3 = the rain level between boss 2 and boss 3.
//   * floating take-off platform (level2-platform.js, art level3_platform.webp)
//   * far backdrop skylineFarL3.webp, parallax ridge level3_parallax.webp, rock ground
//   * obstacle set cut from level3_assets.webp: rock stacks, bridges, towers, floating islands
//   * ELECTRIC hazards on the assets (pylon arcs, electric tower, charged island panel, cave crystals)
//   * a mid-level CAVE (level3_cave.webp): the blimp flies in through the entrance hole, through the
//     interior (ceiling, floor, pillars, crystal arcs) and out of the exit hole. No rain / clouds inside.
// Hooks (all guarded):
//   world-buildings.js  drawBuildings/drawStreet/... -> skipped while __airborneL3On(); collide -> __airborneL3Collide
//   main-loop.js        update -> __airborneL3Update ; rain clouds drawn ABOVE the rain, clipped out of the cave
//   effects-combat.js   drawRain clipped out of the cave
// =====================================================================
(function () {
  "use strict";

  // ---------- sprite rectangles in level3_assets.webp (1536x1024) ----------
  var SP = {
    rock0: [0, 0, 268, 252], rock1: [270, 0, 305, 252], rock2: [578, 0, 265, 252], rock3: [843, 0, 345, 252], rock4: [1188, 0, 348, 252],
    br0: [8, 280, 378, 140], br1: [386, 280, 300, 140], br2: [696, 268, 318, 152], br3: [1009, 286, 257, 132], br4: [1272, 265, 253, 155],
    tw0: [11, 421, 112, 290], tw1: [135, 423, 100, 287], tw2: [249, 445, 130, 265], tw3: [392, 439, 125, 270], tw4: [520, 426, 120, 287],
    tw5: [647, 437, 108, 276], tw6: [758, 448, 199, 266], tw7: [961, 432, 214, 279], py0: [1195, 441, 95, 269], py1: [1372, 441, 133, 269],
    is0: [6, 737, 142, 101], is1: [167, 739, 152, 103], is2: [336, 742, 132, 83], is3: [486, 741, 113, 102], is4: [692, 743, 172, 92],
    is5: [893, 739, 138, 103], is6: [1047, 729, 180, 98]
  };
  // electric nodes, fractions of the sprite: dir u/d/r, len in screen heights (H) — or "to" another struct (pylon pairs)
  var NODES = {
    tw7: [{ fx: 0.40, fy: 0.04, dir: "u", len: 0.30 }],
    is6: [{ fx: 0.10, fy: 0.86, dir: "d", len: 0.22 }],
    is1: [{ fx: 0.50, fy: 0.95, dir: "d", len: 0.16 }]
  };

  // ---------- cave geometry (sprite 2172x475, sprite px) ----------
  // Left: entry pipe -> long tunnel (row TUN_TOP is the tunnel ceiling = top of the screen) -> pipe that opens into the boss ARENA on the right.
  var CAVE_W = 2172, CAVE_H = 475, TUN_TOP = 168, CEIL_T = 176, FLOOR_T = 386, WATER_Y = 378;
  var WALL_L = 262, TUN_END = 1268;                 // tunnel interior x range; rock wings outside it (only the pipe corridors are open)
  var CORR_HALF = 22, PIPE_HALF = 30;
  var PIPE_L = [14, 258], PIPE_M = [1130, 1350];    // pipe hide zones (sprite px): open end .. mouth
  var PIPE_L_CY = 265, PIPE_M_CY = 272;
  var ARENA_L = 1370, ARENA_R = 1985, ARENA_CX = 1678, ARENA_FLOOR = 380, ARENA_WATER = 392;   // boss arena (open cavern)
  var ARENA_CEIL = [[1360, 170], [1430, 148], [1500, 122], [1550, 104], [1650, 94], [1750, 90], [1850, 100], [1930, 118], [1995, 140]];
  var ARENA_Z = 0.66;                               // camera pull-back once the blimp comes out of the exit pipe
  var CAVE_RECTS = [[WALL_L, -400, TUN_END, CEIL_T], [WALL_L, FLOOR_T, TUN_END, CAVE_H]];   // 0 = ceiling, 1 = floor (tunnel only)
  var CAVE_NODES = [];                              // no electricity in the cave: the crystals only glow and sparkle
  function pipeCY(lx) { return lx < 700 ? PIPE_L_CY : PIPE_M_CY; }
  function arenaCeil(lx) {
    var A = ARENA_CEIL; if (lx <= A[0][0]) return A[0][1]; if (lx >= A[A.length - 1][0]) return A[A.length - 1][1];
    for (var i = 1; i < A.length; i++) if (lx <= A[i][0]) { var t = (lx - A[i - 1][0]) / (A[i][0] - A[i - 1][0]); return A[i - 1][1] + (A[i][1] - A[i - 1][1]) * t; }
    return 100;
  }
  var CAVE_FX = {
    crystals: [[265,350,1],[362,358,1],[440,362,0],[580,358,1],[690,362,0],[810,358,1],[900,365,0],[1050,360,1],[1000,362,0],[1130,362,0],[1230,362,0],
      [320,212,0],[437,208,0],[515,208,1],[700,210,0],[820,212,1],[950,212,0],[1010,205,0],
      [1220,395,1],[1140,360,1],[1400,415,1],[1470,355,1],[1950,360,1],[2040,415,1],[1700,260,0],[1675,300,0],[1730,300,0],[1510,130,0],[1750,115,0],[1880,115,0],[1930,125,0]],
    lamps: [[377,272,"255,170,80"],[601,272,"255,170,80"],[826,272,"255,170,80"],[1058,272,"255,170,80"],[1700,250,"110,190,255"],[1690,390,"130,170,255"]],
    steam: [[300,235],[345,222],[470,240],[605,228],[700,240],[820,228],[960,250],[1100,235],[1430,205],[1500,180],[1880,175],[1960,190]],
    tips: [[312,208],[372,198],[482,188],[512,218],[582,198],[652,212],[712,198],[782,218],[832,208],[882,203],[942,192],[1012,228],[1052,203],[1112,203],[1202,218],
      [1490,162],[1570,162],[1610,142],[1670,162],[1730,162],[1790,132],[1850,122],[1930,172]],
    pipes: [[525,264],[655,245],[912,252],[958,252],[1110,258],[1480,212],[1915,212]]   // open pipe ends: water pours from these down to the floor
  };
  var caveMaskData = null;
  function caveMask() {      // coarse opaque/transparent map of the cave art (for the rock walls around the pipes)
    if (caveMaskData) return caveMaskData;
    var im = img("level3_cave"); if (!im || !im.naturalWidth) return null;
    try {
      var k = 4, w = Math.ceil(CAVE_W / k), h = Math.ceil(CAVE_H / k), c = document.createElement("canvas"); c.width = w; c.height = h;
      var g = c.getContext("2d"); g.drawImage(im, 0, 0, w, h); var px = g.getImageData(0, 0, w, h).data, d = new Uint8Array(w * h);
      for (var i = 0; i < d.length; i++) d[i] = px[i * 4 + 3] > 128 ? 1 : 0;
      caveMaskData = { w: w, h: h, k: k, d: d };
    } catch (e) { caveMaskData = null; }
    return caveMaskData;
  }
  function caveOpaque(m, x, y) { var ix = (x / m.k) | 0, iy = (y / m.k) | 0; if (ix < 0 || iy < 0 || ix >= m.w || iy >= m.h) return false; return m.d[iy * m.w + ix] === 1; }

  var on = false, structs = [], spawnX = 0, cave = null, caveDone = false, clockT = 0, playT = 0, groundX = 0, parX = 0;
  var fxP = [];
  var arena = null, orbs = [], afx = [];
  var maskCache = {};

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function U() { return Math.max(0.6, H / 420); }
  function img(k) { return (typeof images !== "undefined" && images) ? images[k] : null; }
  function ok(k) { var i = img(k); return !!(i && i.naturalWidth); }
  function assetsReady() { return ok("level3_assets") && ok("level3_cave") && ok("level3_parallax"); }

  function outro() {
    return (typeof bonusActive !== "undefined" && bonusActive) || (typeof bonusPending !== "undefined" && bonusPending) ||
      (typeof levelEndActive !== "undefined" && levelEndActive) || (typeof worldWindDown !== "undefined" && worldWindDown);
  }
  function trainingNow() {
    return !!(window.__airborneAirfield || window.__airborneTrainingFlight || window.__airborneRuffActive ||
      (typeof airfieldMode !== "undefined" && airfieldMode));
  }
  function l2Active() { return typeof window.__airborneL2On === "function" && window.__airborneL2On(); }
  function wanted() {
    if (trainingNow() || typeof bossesDefeatedCount !== "number") return false;
    if (bossesDefeatedCount === 2) return !outro() && !l2Active();
    if (bossesDefeatedCount === 3 && on) return true;      // boss 3 tail (bonus round + landing): the set simply scrolls away
    return false;
  }
  function exiting() { return typeof bossesDefeatedCount === "number" && bossesDefeatedCount >= 3 || outro(); }

  // ---------- masks ----------
  function maskFor(key) {
    if (maskCache[key]) return maskCache[key];
    var r = SP[key], m = { w: Math.max(2, Math.ceil(r[2] / 3)), h: Math.max(2, Math.ceil(r[3] / 3)), d: null };
    try {
      var c = document.createElement("canvas"); c.width = m.w; c.height = m.h;
      var g = c.getContext("2d"); g.drawImage(img("level3_assets"), r[0], r[1], r[2], r[3], 0, 0, m.w, m.h);
      var px = g.getImageData(0, 0, m.w, m.h).data; m.d = new Uint8Array(m.w * m.h);
      for (var i = 0; i < m.d.length; i++) m.d[i] = px[i * 4 + 3] > 90 ? 1 : 0;
    } catch (e) { m.d = null; }
    maskCache[key] = m; return m;
  }
  function solidAt(s, x, y) {
    var lx = (x - s.x) / s.w, ly = (y - s.y) / s.h;
    if (lx < 0 || lx >= 1 || ly < 0 || ly >= 1) return false;
    var m = s.mask; if (!m || !m.d) return true;
    return m.d[((ly * m.h) | 0) * m.w + ((lx * m.w) | 0)] === 1;
  }

  // ---------- placement ----------
  function baseY() { return H - 6 * U(); }     // outside assets stand on the very bottom edge of the screen
  function groundY() { return (typeof groundLevelY === "function") ? groundLevelY() : H * 0.9; }
  function mkStruct(key, x, y, h) {
    var r = SP[key], w = h * r[2] / r[3];
    var s = { k: key, src: r, x: x, y: y, w: w, h: h, mask: maskFor(key), nodes: [] };
    (NODES[key] || []).forEach(function (n) { s.nodes.push({ fx: n.fx, fy: n.fy, dir: n.dir, len: n.len * H, t: rnd(0, 3), cyc: rnd(0.85, 1.15) }); });
    structs.push(s); return s;
  }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }
  function spawnOne() {
    var u = U(), gY = baseY(), roll = Math.random(), s, x = spawnX, gap = rnd(0.55, 0.95) * W;
    if (roll < 0.24) {                                   // rock stacks (tunnel rocks have a gap you can fly through)
      var k = pick(["rock0", "rock1", "rock2", "rock3", "rock4"]), h = rnd(0.30, 0.44) * H;
      s = mkStruct(k, x, gY - h + 6 * u, h); spawnX = x + s.w + gap;
    } else if (roll < 0.52) {                            // towers
      var kt = pick(["tw0", "tw1", "tw2", "tw3", "tw4", "tw5", "tw6"]), ht = rnd(0.34, 0.52) * H;
      s = mkStruct(kt, x, gY - ht + 6 * u, ht); spawnX = x + s.w + gap;
    } else if (roll < 0.62) {                            // the charged electric tower
      var he = 0.44 * H; s = mkStruct("tw7", x, gY - he + 6 * u, he); spawnX = x + s.w + gap;
    } else if (roll < 0.74) {                            // pylon pair with an electric arc strung between them
      var hp = rnd(0.40, 0.50) * H, a = mkStruct("py0", x, gY - hp + 6 * u, hp);
      var b = mkStruct("py1", x + rnd(0.62, 0.8) * W, gY - hp * 1.0 + 6 * u, hp);
      a.nodes.push({ fx: 0.72, fy: 0.10, dir: "to", to: b, tfx: 0.20, tfy: 0.10, t: rnd(0, 3), cyc: 1 });
      b.partner = a; spawnX = b.x + b.w + gap;
    } else if (roll < 0.88) {                            // bridges hanging in the air
      var kb = pick(["br0", "br1", "br2", "br3", "br4"]), hb = rnd(0.12, 0.17) * H;
      s = mkStruct(kb, x, rnd(0.24, 0.50) * H, hb); spawnX = x + s.w + gap;
    } else {                                             // floating islands
      var ki = pick(["is0", "is1", "is2", "is3", "is4", "is5", "is6"]), hi = rnd(0.13, 0.19) * H;
      s = mkStruct(ki, x, rnd(0.20, 0.50) * H, hi); s.bob = rnd(0, 6.28); spawnX = x + s.w + gap;
    }
  }
  function caveDims() {
    var s = 1.45 * H / 420;
    return { h: CAVE_H * s, s: s, w: CAVE_W * s, top: -TUN_TOP * s };
  }
  function spawnCave() {
    var d = caveDims();
    cave = { x: Math.max(W + 60, spawnX), w: d.w, h: d.h, s: d.s, top: d.top, nodes: [] };
    CAVE_NODES.forEach(function (n) { cave.nodes.push({ fx: n[0] / CAVE_W, fy: n[1] / CAVE_H, dir: n[2], len: n[3], t: n[4], cyc: 1 }); });
    spawnX = cave.x + cave.w + 420;
    window.__airborneL3Cave = true;
  }

  function start() {
    on = true; structs = []; cave = null; caveDone = false; fxP = []; playT = 0; arena = null; orbs = []; window.__airborneL3Arena = false;
    spawnX = W + 260; window.__airborneL3Cave = false;
  }
  function stop() { on = false; structs = []; cave = null; fxP = []; arena = null; orbs = []; window.__airborneL3Cave = false; window.__airborneL3Arena = false; }
  window.__airborneL3On = function () { return on; };
  window.__airborneL3Sync = function () {
    if (typeof bossesDefeatedCount === "number" && bossesDefeatedCount !== 2 && !(bossesDefeatedCount === 3 && on)) { if (on) stop(); return; }
    if (wanted() && assetsReady()) start(); else if (on && !wanted()) stop();
  };
  window.__airborneL3InCave = function () {
    if (!cave) return false;
    return player.x > cave.x + (WALL_L + 40) * cave.s && player.x < cave.x + (ARENA_R - 40) * cave.s;
  };
  // cave on screen? the boss waits until it has been flown through
  // the normal score gate never starts boss 3 on this level: the boss is called once the blimp comes out of the exit pipe into the arena
  window.__airborneL3HoldBoss = function () { return !!(on && typeof bossesDefeatedCount === "number" && bossesDefeatedCount === 2 && !bossActive); };
  // rect of rock mass covering the screen (rain / clouds are clipped out of it)
  window.__airborneL3CaveRect = function () {
    if (!cave) return null;
    var x0 = Math.max(0, cave.x + WALL_L * cave.s), x1 = Math.min(W, cave.x + ARENA_R * cave.s);
    return x1 > x0 ? { x0: x0, x1: x1 } : null;
  };
  window.__airborneL3WithClip = function (fn) {
    var r = null; try { r = window.__airborneL3CaveRect(); } catch (e) {}
    if (!r) { try { fn(); } catch (e2) {} return; }
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(r.x0, 0, r.x1 - r.x0, H); ctx.clip("evenodd");
    try { fn(); } catch (e3) {}
    ctx.restore();
  };

  // ---------- electricity ----------
  var T_IDLE = 1.3, T_WARN = 0.8, T_BLAST = 1.0, T_COOL = 0.4, T_CYC = T_IDLE + T_WARN + T_BLAST + T_COOL;
  function phase(n) {
    var t = n.t % T_CYC;
    if (t < T_IDLE) return { p: "idle", f: t / T_IDLE };
    t -= T_IDLE; if (t < T_WARN) return { p: "warn", f: t / T_WARN };
    t -= T_WARN; if (t < T_BLAST) return { p: "blast", f: t / T_BLAST };
    return { p: "cool", f: (t - T_BLAST) / T_COOL };
  }
  function nodeEnds(host, n, scale) {   // screen start / end of the electric zone
    var x = host.x + n.fx * host.w, y = host.y + n.fy * host.h, ex = x, ey = y, len = (n.len || 0);
    if (n.dir === "u") ey = y - len; else if (n.dir === "d") ey = y + len; else if (n.dir === "r") ex = x + len;
    else if (n.dir === "to") { ex = n.to.x + n.tfx * n.to.w; ey = n.to.y + n.tfy * n.to.h; }
    return { x0: x, y0: y, x1: ex, y1: ey };
  }
  var glowC = {};
  function glow(rgb) {
    if (glowC[rgb]) return glowC[rgb];
    var c = document.createElement("canvas"); c.width = c.height = 64; var g = c.getContext("2d"), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, "rgba(" + rgb + ",1)"); rg.addColorStop(0.4, "rgba(" + rgb + ",0.4)"); rg.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64); glowC[rgb] = c; return c;
  }
  function glowAt(x, y, r, rgb, a) { ctx.globalAlpha = a; ctx.drawImage(glow(rgb), x - r, y - r, r * 2, r * 2); }
  function bolt(x0, y0, x1, y1, amp, steps, a, w) {
    var dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L, ny = dx / L;
    var pts = [[x0, y0]];
    for (var i = 1; i < steps; i++) { var f = i / steps, o = (Math.random() - 0.5) * 2 * amp; pts.push([x0 + dx * f + nx * o, y0 + dy * f + ny * o]); }
    pts.push([x1, y1]);
    [[w * 4.2, 0.16], [w * 2, 0.4], [w * 0.8, 1]].forEach(function (pw, k) {
      ctx.lineWidth = pw[0]; ctx.strokeStyle = k === 2 ? "rgba(235,248,255," + a + ")" : "rgba(110,190,255," + (a * pw[1]) + ")";
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
      ctx.stroke();
    });
  }
  function drawNode(host, n) {
    var e = nodeEnds(host, n), ph = phase(n), u = U();
    if (Math.max(e.x0, e.x1) < -40 || Math.min(e.x0, e.x1) > W + 40) return;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (ph.p === "idle") {                       // small crackles at the source
      glowAt(e.x0, e.y0, 9 * u, "120,200,255", 0.35 + 0.2 * Math.sin(clockT * 9 + n.t));
      if (Math.random() < 0.10) { var a = Math.random() * 6.28; bolt(e.x0, e.y0, e.x0 + Math.cos(a) * 14 * u, e.y0 + Math.sin(a) * 14 * u, 3 * u, 3, 0.8, 1); }
    } else if (ph.p === "warn") {                // charging: growing glow + flickering half arcs
      var k = 0.35 + 0.65 * ph.f;
      glowAt(e.x0, e.y0, (12 + 16 * k) * u, "150,215,255", 0.5 + 0.4 * k);
      if (Math.random() < 0.55) bolt(e.x0, e.y0, e.x0 + (e.x1 - e.x0) * 0.4 * k, e.y0 + (e.y1 - e.y0) * 0.4 * k, 6 * u, 5, 0.5 * k + 0.2, 1.1);
    } else if (ph.p === "blast") {               // full discharge
      glowAt(e.x0, e.y0, 30 * u, "170,225,255", 0.95); glowAt(e.x1, e.y1, 22 * u, "170,225,255", 0.8);
      var mx = (e.x0 + e.x1) / 2, my = (e.y0 + e.y1) / 2;
      glowAt(mx, my, Math.max(26, Math.hypot(e.x1 - e.x0, e.y1 - e.y0) * 0.28), "110,190,255", 0.3);
      bolt(e.x0, e.y0, e.x1, e.y1, 13 * u, 9, 0.95, 1.7);
      if (Math.random() < 0.6) bolt(e.x0, e.y0, e.x1, e.y1, 18 * u, 8, 0.6, 1.2);
    } else {
      glowAt(e.x0, e.y0, 10 * u, "120,200,255", 0.4 * (1 - ph.f));
    }
  }
  function drawNodes(host, nodes) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < nodes.length; i++) drawNode(host, nodes[i]);
    ctx.restore();
  }
  function hurtByNodes(host, nodes, pb) {
    var u = U();
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i]; if (phase(n).p !== "blast") continue;
      var e = nodeEnds(host, n), zw = 13 * u;
      var x0 = Math.min(e.x0, e.x1) - zw, x1 = Math.max(e.x0, e.x1) + zw, y0 = Math.min(e.y0, e.y1) - zw, y1 = Math.max(e.y0, e.y1) + zw;
      if (n.dir === "u" || n.dir === "d") { x0 = e.x0 - zw; x1 = e.x0 + zw; }
      if (pb.x1 > x0 && pb.x0 < x1 && pb.y1 > y0 && pb.y0 < y1) return true;
    }
    return false;
  }
  function playerBox(f) {
    var hw = (player.w || 80) * f, hh = (player.h || 50) * f;
    return { x0: player.x - hw, x1: player.x + hw, y0: player.y - hh, y1: player.y + hh };
  }

  // ---------- update ----------
  function frac() { return (typeof window.__airborneLevelFrac === "function") ? window.__airborneLevelFrac() : null; }
  window.__airborneL3Update = function (dt) {
    if (!(dt > 0) || dt > 0.1) dt = 0.016;
    clockT += dt;
    if (!on) {
      if (wanted() && assetsReady() && (typeof state === "undefined" || state === "playing")) start();
      return;
    }
    if (!wanted()) { stop(); return; }
    var frozen = (typeof worldScrollFrozen === "function") && worldScrollFrozen();
    var scale = (typeof obstacleSpeedScale === "function") ? obstacleSpeedScale() : 1;
    var takeoff = !!window.__airbornePlatformTakeoffActive;
    var ending = (typeof levelEndActive !== "undefined" && levelEndActive), exit = exiting();
    var sp = (frozen || takeoff) ? 0 : 70 * scale * dt;
    if (exit && !frozen && !takeoff) sp = 70 * Math.max(scale, 1) * dt;
    if (ending && !frozen) { var mul = (typeof window.__airborneLandScrollMul === "number") ? window.__airborneLandScrollMul : 1; sp = Math.max(0.15, mul) * Math.max(150, Math.min(230, W * 0.28)) * dt * (mul <= 0 ? 0 : 1); }
    if (sp > 0) playT += dt;
    if (sp > 0 && cave && playerInPipe()) sp *= 4;      // the ride through a pipe is quick
    if (arena) sp = (arena.st === "done" && !(typeof bossSinking !== "undefined" && bossSinking)) ? Math.max(sp, 280 * dt) : 0;   // arena: the world stops scrolling (the exit-away scroll after the boss is quick)
    groundX += sp; parX += sp * 0.32;
    structs.forEach(function (s) { s.x -= sp; });
    spawnX -= sp;
    if (cave) cave.x -= sp;
    structs = structs.filter(function (s) { return s.x + s.w > -260; });
    if (exit) structs = structs.filter(function (s) { return s.x < W + 20 || s.x + s.w < 0; });
    // cave sequence — once per level, early enough that it is long gone before the boss
    if (!cave && !caveDone && !exit && !takeoff && !bossActive && assetsReady()) {
      var fr = frac();
      if ((fr !== null && fr >= 0.78) || playT > 70) spawnCave();
    }
    if (cave && !arena && !exit && !takeoff && player.x > cave.x + (PIPE_M[1] + 10) * cave.s) startArena();
    if (arena) arenaUpdate(dt, frozen);
    if (cave && cave.x + cave.w < -60) { cave = null; caveDone = true; arena = null; orbs = []; window.__airborneL3Cave = false; window.__airborneL3Arena = false; }
    // outside set
    if (!exit && !takeoff && !bossActive) {
      var guard = 0;
      while (spawnX < W + 420 && guard++ < 8 && !(cave && spawnX >= cave.x - 40 && spawnX <= cave.x + cave.w + 360)) spawnOne();
      if (cave && spawnX < cave.x + cave.w + 420 && spawnX > cave.x - 40) spawnX = cave.x + cave.w + 420;
    }
    // float bob + electric timers
    structs.forEach(function (s) {
      if (s.bob !== undefined) s.by = Math.sin(clockT * 0.9 + s.bob) * 4 * U();
      s.nodes.forEach(function (n) { if (!frozen) n.t += dt * n.cyc; });
    });
    if (cave) cave.nodes.forEach(function (n) { if (!frozen) n.t += dt; });
    // electric damage
    var canHurt = (typeof state !== "undefined" && state === "playing") && !takeoff && !(typeof bonusActive !== "undefined" && bonusActive) && !ending && typeof takeHit === "function";
    if (canHurt) {
      var pb = playerBox(0.30), hit = false;
      for (var i = 0; i < structs.length && !hit; i++) { var s = structs[i]; if (s.x > W + 80 || s.x + s.w < -80) continue; if (hurtByNodes(s, s.nodes, pb)) hit = true; }
      if (!hit && cave) {
        var ch = { x: cave.x, y: cave.top, w: cave.w, h: cave.h };
        cave.nodes.forEach(function (n) { n.len2 = n.len * cave.h; });
        var cn = cave.nodes.map(function (n) { return { fx: n.fx, fy: n.fy, dir: n.dir, len: n.len * cave.h, t: n.t, cyc: n.cyc }; });
        if (hurtByNodes(ch, cn, pb)) hit = true;
      }
      if (hit) { try { takeHit(); } catch (e) {} }
    }
  };

  // ---------- collision ----------
  window.__airborneL3Collide = function () {
    if (!on) return false;
    if (typeof bonusActive !== "undefined" && bonusActive) return false;
    if (typeof levelEndActive !== "undefined" && levelEndActive) return false;
    if (window.__airbornePlatformTakeoffActive) return false;
    var hw = (player.w || 80) * 0.30, hh = (player.h || 50) * 0.28;
    if (cave && !arena) {                              // inside a pipe the blimp is held in the middle of it
      var pz = playerInPipe();
      if (pz) { var cy = cave.top + pz.cy * cave.s, lim = Math.max(2, CORR_HALF * cave.s - hh); player.y = Math.max(cy - lim, Math.min(cy + lim, player.y)); if (player.vy) player.vy = 0; }
    }
    var pts = [[0, 0], [-hw, 0], [hw, 0], [0, -hh], [0, hh], [-hw, hh], [hw, hh], [-hw, -hh], [hw, -hh]];
    for (var i = 0; i < structs.length; i++) {
      var s = structs[i];
      if (player.x + hw < s.x || player.x - hw > s.x + s.w) continue;
      var sy = s.y + (s.by || 0);
      for (var k = 0; k < pts.length; k++) {
        var px = player.x + pts[k][0], py = player.y + pts[k][1];
        var sc = { x: s.x, y: sy, w: s.w, h: s.h, mask: s.mask };
        if (solidAt(sc, px, py)) { try { takeHit(); } catch (e) {} return true; }
      }
    }
    if (cave && !arena) {                              // the tunnel: rock wings, ceiling, floor
      var c = cave, sC = c.s, lx = (player.x - c.x) / sC, ly0 = (player.y - c.top) / sC;
      var lhw = hw / sC, lhh = hh / sC, bad = false;
      if (lx + lhw > -200 && lx - lhw < PIPE_M[1] + 40) {
        if (lx - lhw < WALL_L || lx + lhw > TUN_END) {          // rock wings: only the pipe corridors are open
          var m = caveMask();
          if (m) {
            for (var q0 = 0; q0 < pts.length && !bad; q0++) {
              var qx = lx + pts[q0][0] / sC, qy = ly0 + pts[q0][1] / sC;
              if ((qx < WALL_L || (qx > TUN_END && qx < PIPE_M[1])) && caveOpaque(m, qx, qy)) { var pc = pipeCY(qx); if (!(qy >= pc - CORR_HALF && qy <= pc + CORR_HALF)) bad = true; }
            }
          }
        }
        if (lx + lhw > WALL_L && lx - lhw < TUN_END) {
          for (var r = 0; r < CAVE_RECTS.length && !bad; r++) {
            var q = CAVE_RECTS[r];
            if (lx + lhw > q[0] && lx - lhw < q[2] && ly0 + lhh > q[1] && ly0 - lhh < q[3]) {
              bad = true;
              if (r === 0) { player.y = c.top + (q[3] + lhh) * sC; if (player.vy < 0) player.vy = 0; }
              else player.y = c.top + (q[1] - lhh) * sC;
            }
          }
        }
        if (bad) { try { takeHit(); } catch (e2) {} return true; }
      }
    }
    return false;
  };

  // ---------- drawing ----------
  function drawParallax() {
    var im = img("level3_parallax"); if (!im) return;
    var gY = baseY(), tileH = H * 0.60, tileW = tileH * im.naturalWidth / im.naturalHeight, y = gY - tileH + H * 0.05;
    var off = -(parX % tileW);
    ctx.save(); ctx.globalAlpha = 0.95;
    for (var x = off - tileW, n = 0; x < W + 2 && n < 8; x += tileW - 1, n++) { if (x + tileW < 0) continue; ctx.drawImage(im, x, y, tileW, tileH); }
    ctx.restore();
  }
  function noise(i) { var s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); }
  function drawGround() {
    var gY = baseY(), step = 26, u = U(), base = Math.floor(groundX / step);
    var gr = ctx.createLinearGradient(0, gY - 6 * u, 0, H); gr.addColorStop(0, "#4a3d56"); gr.addColorStop(0.18, "#2e2538"); gr.addColorStop(1, "#120d1a");
    ctx.save(); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-10, H + 4);
    var xs = [];
    for (var i = -1; i * step - (groundX % step) < W + step; i++) {
      var x = i * step - (groundX % step), y = gY + (noise(base + i) - 0.5) * 9 * u - 2 * u; xs.push([x, y]); ctx.lineTo(x, y);
    }
    ctx.lineTo(W + step, H + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(150,125,170,0.55)"; ctx.lineWidth = 2; ctx.beginPath();
    xs.forEach(function (p, k) { if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
    ctx.restore();
  }
  function drawStructs() {
    var im = img("level3_assets");
    for (var i = 0; i < structs.length; i++) {
      var s = structs[i]; if (s.x > W + 60 || s.x + s.w < -60) continue;
      var y = s.y + (s.by || 0);
      try { ctx.drawImage(im, s.src[0], s.src[1], s.src[2], s.src[3], s.x, y, s.w, s.h); } catch (e) {}
      if (s.nodes.length) { var h2 = { x: s.x, y: y, w: s.w, h: s.h }; drawNodes(h2, s.nodes); }
      if (s.k === "tw7") {                       // the charged panel pulses
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        glowAt(s.x + s.w * 0.28, s.y + s.h * 0.42, s.w * 0.34, "90,170,255", 0.22 + 0.14 * Math.sin(clockT * 5)); ctx.restore();
      }
    }
  }
  // ----- pipe zones: [open end .. mouth], in screen px -----
  function pipeZones() {
    if (!cave) return null;
    var c = cave, k = c.s;
    return [{ x0: c.x + PIPE_L[0] * k, x1: c.x + PIPE_L[1] * k, cy: PIPE_L_CY }, { x0: c.x + PIPE_M[0] * k, x1: c.x + PIPE_M[1] * k, cy: PIPE_M_CY }];
  }
  function playerInPipe() {
    if (arena) return null;
    var z = pipeZones(); if (!z) return null;
    var band = (PIPE_HALF * cave.s) + (player.h || 50) * 0.3;
    for (var i = 0; i < z.length; i++) {
      var cy = cave.top + z[i].cy * cave.s;
      if (Math.abs(player.y - cy) <= band && player.x > z[i].x0 && player.x < z[i].x1) return z[i];
    }
    return null;
  }
  // the blimp is not drawn while it is inside a pipe (main-loop clips drawPlayer with these)
  window.__airborneL3BlimpHide = function () {
    if (!on || !cave) return null;
    var z = playerInPipe(); if (!z) return null;
    return [{ x0: z.x0, x1: z.x1 }];
  };
  // ----- cave effects: crystal sparkles, lamp glow, pipe steam, ceiling drips -----
  var fx = { sp: [], st: [], dr: [], rp: [], stT: [], drT: [], last: 0 };
  function rnd2(a, b) { return a + Math.random() * (b - a); }
  function star(x, y, r, a, rgb) {
    ctx.globalAlpha = a; ctx.drawImage(glow(rgb), x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
    ctx.globalAlpha = Math.min(1, a * 1.2); ctx.strokeStyle = "rgba(255,255,255,1)"; ctx.lineWidth = 1.1; ctx.beginPath();
    ctx.moveTo(x - r * 1.4, y); ctx.lineTo(x + r * 1.4, y); ctx.moveTo(x, y - r * 1.4); ctx.lineTo(x, y + r * 1.4); ctx.stroke();
  }
  function caveFx(c) {
    var now = clockT, dt = fx.last ? Math.min(0.05, now - fx.last) : 0.016; fx.last = now;
    var s = c.s, F = CAVE_FX, i, p, u = U();
    function sx(x) { return c.x + x * s; } function sy(y) { return c.top + y * s; }
    var floorY = sy(WATER_Y);
    // spawn
    for (i = 0; i < F.crystals.length; i++) {
      p = F.crystals[i]; var X = sx(p[0]); if (X < -20 || X > W + 20) continue;
      if (Math.random() < dt * 1.3) fx.sp.push({ x: X + rnd2(-9, 9) * s, y: sy(p[1]) + rnd2(-16, 4) * s, age: 0, life: rnd2(0.5, 1.1), r: rnd2(2.2, 4.2) * u, rgb: p[2] ? "190,140,255" : "130,215,255" });
    }
    if (fx.stT.length !== F.steam.length) { fx.stT = F.steam.map(function () { return rnd2(0.5, 4); }); }
    for (i = 0; i < F.steam.length; i++) {
      p = F.steam[i]; var SX = sx(p[0]); if (SX < -30 || SX > W + 30) continue;
      fx.stT[i] -= dt;
      if (fx.stT[i] <= 0) { fx.stT[i] = rnd2(3.2, 6.5); fx.st.push({ burst: 14, x: SX, y: sy(p[1]), t: 0, ax: p[0], ay: p[1] }); }
    }
    for (i = fx.st.length - 1; i >= 0; i--) {         // bursts emit a few puffs over ~0.8 s
      var b = fx.st[i]; b.t += dt;
      if (b.burst > 0 && Math.random() < dt * 22) { b.burst--; fx.sp.push({ k: "steam", x: sx(b.ax) + rnd2(-3, 3) * s, y: sy(b.ay), vx: rnd2(-8, 8) * u, vy: -rnd2(26, 48) * u, r: rnd2(5, 8) * u, gr: rnd2(9, 15) * u, age: 0, life: rnd2(1.3, 2.1), a: rnd2(0.28, 0.45) }); }
      if (b.burst <= 0 || b.t > 1.4) fx.st.splice(i, 1);
    }
    if (fx.drT.length !== F.tips.length) { fx.drT = F.tips.map(function () { return rnd2(0.3, 4.5); }); }
    for (i = 0; i < F.tips.length; i++) {
      p = F.tips[i]; var DX = sx(p[0]); if (DX < -10 || DX > W + 10) continue;
      fx.drT[i] -= dt;
      if (fx.drT[i] <= 0) { fx.drT[i] = rnd2(2.2, 6.0); fx.dr.push({ x: DX, y: sy(p[1]) + 2 * s, vy: 0, grow: 0 }); }
    }
    if (fx.sp.length > 260) fx.sp.splice(0, fx.sp.length - 260);
    if (fx.dr.length > 40) fx.dr.splice(0, fx.dr.length - 40);
    // lamps and crystal glow
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < F.lamps.length; i++) {
      p = F.lamps[i]; var LX = sx(p[0]); if (LX < -40 || LX > W + 40) continue;
      var fl = 0.55 + 0.25 * Math.sin(now * 3.1 + i * 2.3) + 0.12 * Math.sin(now * 11 + i);
      glowAt(LX, sy(p[1]), (26 + 6 * Math.sin(now * 2 + i)) * s * 0.9, p[2], Math.max(0.2, Math.min(0.85, fl)));
    }
    for (i = 0; i < F.crystals.length; i++) {
      p = F.crystals[i]; var CX = sx(p[0]); if (CX < -40 || CX > W + 40) continue;
      glowAt(CX, sy(p[1]) - 6 * s, 22 * s * (0.8 + 0.2 * Math.sin(now * 2.2 + i)), p[2] ? "175,120,255" : "100,190,255", 0.20 + 0.12 * Math.sin(now * 2.2 + i * 1.7));
    }
    // sparkles
    for (i = fx.sp.length - 1; i >= 0; i--) {
      p = fx.sp[i]; p.age += dt; if (p.age >= p.life) { fx.sp.splice(i, 1); continue; }
      if (p.k === "steam" || p.k === "drop") continue;
      var f = p.age / p.life, a = Math.sin(Math.PI * f); star(p.x, p.y, p.r * (0.6 + 0.6 * a), a * 0.95, p.rgb);
    }
    ctx.restore();
    // steam puffs (normal blending, soft white)
    ctx.save();
    for (i = 0; i < fx.sp.length; i++) {
      p = fx.sp[i]; if (p.k !== "steam") continue;
      var g = p.age / p.life; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.gr * dt; p.vy *= 0.985;
      ctx.globalAlpha = p.a * Math.sin(Math.PI * Math.min(1, g * 1.15)) * (1 - g * 0.3); ctx.drawImage(glow("232,240,250"), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    ctx.restore();
    // drips + splashes
    ctx.save();
    for (i = fx.dr.length - 1; i >= 0; i--) {
      var d = fx.dr[i];
      if (d.grow < 1) { d.grow += dt * 2.2; ctx.globalAlpha = 0.9; ctx.fillStyle = "rgba(190,225,255,0.9)"; ctx.beginPath(); ctx.arc(d.x, d.y, 1.2 * u * d.grow, 0, 6.283); ctx.fill(); continue; }
      d.vy += 560 * u * dt; d.y += d.vy * dt;
      if (d.y >= floorY) { fx.rp.push({ x: d.x, y: floorY, age: 0 }); for (var q = 0; q < 3; q++) fx.sp.push({ k: "drop", x: d.x, y: floorY, vx: rnd2(-30, 30) * u, vy: -rnd2(40, 90) * u, age: 0, life: 0.35 }); fx.dr.splice(i, 1); continue; }
      ctx.globalAlpha = 0.9; ctx.strokeStyle = "rgba(205,232,255,0.95)"; ctx.lineWidth = 1.7 * u; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(d.x, d.y - 5 * u); ctx.lineTo(d.x, d.y); ctx.stroke();
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5; ctx.drawImage(glow("150,205,255"), d.x - 5 * u, d.y - 5 * u, 10 * u, 10 * u); ctx.globalCompositeOperation = "source-over";
    }
    for (i = fx.sp.length - 1; i >= 0; i--) {       // splash droplets
      p = fx.sp[i]; if (p.k !== "drop") continue;
      p.vy += 520 * u * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > floorY + 2) { fx.sp.splice(i, 1); continue; }
      ctx.globalAlpha = 0.8 * (1 - p.age / p.life); ctx.fillStyle = "rgba(200,230,255,1)"; ctx.fillRect(p.x, p.y, 1.6 * u, 1.6 * u);
    }
    for (i = fx.rp.length - 1; i >= 0; i--) {         // ripples on the glowing floor
      var rp = fx.rp[i]; rp.age += dt; if (rp.age > 0.7) { fx.rp.splice(i, 1); continue; }
      ctx.globalAlpha = 0.5 * (1 - rp.age / 0.7); ctx.strokeStyle = "rgba(170,215,255,1)"; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(rp.x, rp.y, 3 * u + rp.age * 22 * u, 1.2 * u + rp.age * 6 * u, 0, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
  }
  // ----- far-background fog, open-pipe waterfalls, floor pools -----
  var FOG = null;
  function fogInit() {
    FOG = []; var i = 0, x;
    for (x = 300; x < 1220; x += 62, i++) FOG.push({ bx: x, by: 225 + ((i * 53) % 100), w: 220 + ((i * 37) % 120), h: 56 + ((i * 29) % 50), sp: 0.12 + (i % 5) * 0.05, ph: i * 1.7, am: 26 + (i % 4) * 12, a: 0.10 + (i % 3) * 0.03 });
    for (x = 1420; x < 1960; x += 70, i++) FOG.push({ bx: x, by: 210 + ((i * 41) % 110), w: 260 + ((i * 31) % 120), h: 70 + ((i * 23) % 50), sp: 0.10 + (i % 4) * 0.04, ph: i * 1.3, am: 30, a: 0.09 + (i % 3) * 0.02 });
    for (var j = 0; j < 8; j++) FOG.push({ bx: 300 + j * 120, by: 358, w: 300, h: 32, sp: 0.09 + (j % 3) * 0.04, ph: j * 2.3, am: 40, a: 0.09 });   // low ground mist in the tunnel
  }
  var POOLS = [[330, 46], [520, 40], [700, 38], [880, 46], [1010, 34], [1180, 44], [525, 58], [655, 58], [912, 58], [958, 58], [1110, 58], [1480, 50, 392], [1915, 50, 392]];
  function drawFog(c, now) {
    if (!FOG) fogInit();
    var s = c.s, x0 = Math.max(0, c.x + WALL_L * s), x1 = Math.min(W, c.x + ARENA_R * s); if (x1 <= x0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, c.top + CEIL_T * s, x1 - x0, (ARENA_FLOOR - CEIL_T) * s); ctx.clip(); ctx.globalCompositeOperation = "lighter";
    var g = glow("120,170,235");
    for (var i = 0; i < FOG.length; i++) {
      var f = FOG[i], X = c.x + (f.bx + Math.sin(now * f.sp + f.ph) * f.am) * s; if (X < -f.w * s || X > W + f.w * s) continue;
      var Y = c.top + (f.by + Math.sin(now * f.sp * 1.3 + f.ph) * 6) * s, w = f.w * s, h = f.h * s;
      ctx.globalAlpha = f.a * (0.8 + 0.2 * Math.sin(now * 0.7 + f.ph)); ctx.drawImage(g, X - w / 2, Y - h / 2, w, h);
    }
    ctx.restore();
  }
  function drawWater(c, now, dt) {
    var s = c.s, u = U(), i, p, F = CAVE_FX, wy0 = c.top + WATER_Y * s, wy = wy0;
    // pools on the floor
    ctx.save();
    for (i = 0; i < POOLS.length; i++) {
      p = POOLS[i]; var PX = c.x + p[0] * s; if (PX < -90 * s || PX > W + 90 * s) continue;
      wy = c.top + (p[2] || WATER_Y) * s;
      var rx = p[1] * s, ry = 5.2 * s, sh = 0.5 + 0.5 * Math.sin(now * 1.6 + i * 1.9);
      var gr = ctx.createRadialGradient(PX, wy, 1, PX, wy, rx);
      gr.addColorStop(0, "rgba(90,175,245,0.62)"); gr.addColorStop(0.7, "rgba(50,120,215,0.45)"); gr.addColorStop(1, "rgba(30,80,180,0)");
      ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(PX, wy, rx, ry, 0, 0, 6.283); ctx.fill();
      ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(190,230,255,1)"; ctx.lineWidth = 1;
      for (var k = 0; k < 2; k++) { var ph = (now * 0.5 + i * 0.37 + k * 0.5) % 1; ctx.globalAlpha = 0.35 * (1 - ph) * (0.6 + 0.4 * sh); ctx.beginPath(); ctx.ellipse(PX + (k ? 0.25 : -0.2) * rx, wy, rx * (0.15 + 0.55 * ph), ry * (0.2 + 0.7 * ph), 0, 0, 6.283); ctx.stroke(); }
      ctx.globalAlpha = 0.28 * sh; ctx.fillStyle = "rgba(210,240,255,1)"; ctx.fillRect(PX - rx * 0.35, wy - ry * 0.25, rx * 0.5, Math.max(1, 1.2 * s)); ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
    // waterfalls from the open pipe ends
    ctx.save(); ctx.lineCap = "round";
    for (i = 0; i < F.pipes.length; i++) {
      p = F.pipes[i]; var X = c.x + p[0] * s; if (X < -20 || X > W + 20) continue;
      var y0 = c.top + p[1] * s, y1 = c.top + (p[0] > ARENA_L ? ARENA_WATER : WATER_Y) * s, wob = Math.sin(now * 3 + i) * 0.8 * s, flow = 0.85 + 0.15 * Math.sin(now * 2.1 + i * 1.3);
      var lg = ctx.createLinearGradient(0, y0, 0, y1); lg.addColorStop(0, "rgba(170,220,255,0.42)"); lg.addColorStop(1, "rgba(110,180,245,0.22)");
      ctx.globalAlpha = flow; ctx.strokeStyle = lg; ctx.lineWidth = 3.2 * s; ctx.beginPath(); ctx.moveTo(X, y0); ctx.lineTo(X + wob, y1); ctx.stroke();
      ctx.setLineDash([5 * s, 13 * s, 9 * s, 8 * s]); ctx.lineDashOffset = -now * 150 * s - i * 13; ctx.globalAlpha = 0.5 * flow; ctx.strokeStyle = "rgba(225,244,255,0.9)"; ctx.lineWidth = 1.3 * s;
      ctx.beginPath(); ctx.moveTo(X - 0.8 * s, y0); ctx.lineTo(X - 0.8 * s + wob, y1); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalCompositeOperation = "lighter"; glowAt(X, y0 + 2 * s, 11 * s, "150,210,255", 0.55); glowAt(X + wob, y1, 15 * s, "140,205,255", 0.4 + 0.15 * Math.sin(now * 5 + i)); ctx.globalCompositeOperation = "source-over";
      // splash at the bottom
      if (Math.random() < dt * 18) fx.sp.push({ k: "drop", x: X + wob + rnd2(-2, 2) * s, y: y1, vx: rnd2(-38, 38) * u, vy: -rnd2(45, 105) * u, age: 0, life: 0.38 });
      if (Math.random() < dt * 3.2) fx.rp.push({ x: X + wob, y: y1, age: 0 });
    }
    ctx.restore();
  }
  function drawCave() {
    if (!cave) return;
    var c = cave, im = img("level3_cave"); if (!im) return;
    if (c.x > W + 40 || c.x + c.w < -40) return;
    ctx.drawImage(im, c.x, c.top, c.w, c.h);
    var now = clockT, dt = fx.last ? Math.min(0.05, Math.max(0, now - fx.last)) : 0.016;
    var ps = img("level3_pipe_r");                      // entry mouth of the pipe that leads into the arena (the art only has its exit end)
    if (ps && ps.naturalWidth) { var k2 = 1.12, w2 = ps.naturalWidth * k2 * c.s, h2 = ps.naturalHeight * k2 * c.s; ctx.drawImage(ps, c.x + 1272 * c.s - w2, c.top + PIPE_M_CY * c.s - h2 / 2, w2, h2); }
    drawFog(c, now);
    drawWater(c, now, dt);
    caveFx(c);
  }
  window.__airborneL3DrawFront = function () {};   // the pipes are part of the cave art now; the blimp is simply hidden inside them
  // ================= Boss arena: zoom-out, no scrolling, free flight, electric octopus =================
  var ARENA_SZ = 1.45;                                   // reference cave scale (boss / projectile sizes are relative to it)
  function arenaRect() {
    var c = cave, s = c.s;
    return { l: c.x + ARENA_L * s, r: c.x + ARENA_R * s, floor: c.top + ARENA_FLOOR * s, cx: c.x + ARENA_CX * s,
             ceilAt: function (x) { return c.top + arenaCeil((x - c.x) / s) * s; } };
  }
  function startArena() {
    var c = cave, z = ARENA_Z, Xc = c.x + ARENA_CX * c.s;
    arena = { st: "intro", t: 0, z: z, ax: (W / 2 - z * Xc) / (1 - z), ay: H, dlg: false, vx: 0, vy: 0 };
    structs = []; orbs = []; afx = [];
    window.__airborneL3Arena = true;
  }
  function arenaUpdate(dt, frozen) {
    if (frozen) return;
    arena.t += dt;
    if (arena.st === "intro") {
      if (bossActive && boss && boss.kind === "l3octo") arena.st = "fight";
      else if (arena.t > 1.7 && !arena.dlg && state === "playing" && !bossActive) {
        arena.dlg = true;
        try { if (typeof startBossDialogue === "function") startBossDialogue(3); } catch (e) { console.warn("[L3] boss start", e); }
      }
    } else if (arena.st === "fight") {
      if (!bossActive || !boss || boss.kind !== "l3octo") { arena.st = "done"; orbs = []; return; }
      try { hasFirepower = true; hasDualFire = true; } catch (e) {}      // double bullets for this battle
      updateOrbs(dt);
    }
    for (var i = afx.length - 1; i >= 0; i--) { var f = afx[i]; f.age += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 260 * dt; if (f.age > f.life) afx.splice(i, 1); }
  }
  // the camera pulls back while the blimp is in the arena (read by effects-combat / main-loop)
  window.__airborneL3ArenaZoom = function () {
    if (!arena || !cave) return false;
    if (arena.st === "intro" || arena.st === "fight") return true;
    try { return !!(bossSinking && bossSinking.mode === "ink_dissolve"); } catch (e) { return false; }
  };
  window.__airborneL3ArenaCam = function () { return arena ? { z: arena.z, ax: arena.ax, ay: arena.ay } : null; };
  window.__airborneL3ArenaOn = function () { return !!arena && arena.st !== "done"; };

  // ----- free flight: hold / drag to fly anywhere in the arena (arrow keys or WASD also work) -----
  var inp = { down: false, has: false, cx: 0, cy: 0, k: {} };
  (function () {
    function ptr(e) { var t = (e.touches && e.touches[0]) || e; if (t && typeof t.clientX === "number") { inp.cx = t.clientX; inp.cy = t.clientY; inp.has = true; } }
    window.addEventListener("pointerdown", function (e) { inp.down = true; ptr(e); }, true);
    window.addEventListener("pointermove", ptr, true);
    window.addEventListener("pointerup", function () { inp.down = false; }, true);
    window.addEventListener("pointercancel", function () { inp.down = false; }, true);
    window.addEventListener("blur", function () { inp.down = false; inp.k = {}; });
    window.addEventListener("keydown", function (e) { inp.k[e.code] = true; }, true);
    window.addEventListener("keyup", function (e) { inp.k[e.code] = false; }, true);
  })();
  function pointerWorld() {
    var cv = (typeof canvas !== "undefined" && canvas) ? canvas : document.querySelector("canvas"); if (!cv) return null;
    var r = cv.getBoundingClientRect(), lx = (inp.cx - r.left) / r.width * W, ly = (inp.cy - r.top) / r.height * H;
    var cam = window.__airborneCam || {}, z = cam.z || 1, ax = cam.ax != null ? cam.ax : W / 2, ay = cam.ay != null ? cam.ay : H;
    return { x: (lx - ax * (1 - z)) / z, y: (ly - ay * (1 - z)) / z };
  }
  window.__airborneL3Flight = function (dt) {
    if (!on || !arena || !cave || arena.st === "done" || state !== "playing") return false;
    var R = arenaRect(), hw = (player.w || 80) * 0.36, hh = (player.h || 50) * 0.36, sf = cave.s / ARENA_SZ, SP = 300 * sf;
    var tvx = 0, tvy = 0, k = inp.k;
    var kx = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0), ky = (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0);
    if (kx || ky) { var kl = Math.hypot(kx, ky); tvx = kx / kl * SP; tvy = ky / kl * SP; }
    else if (inp.down && inp.has) {
      var pw = pointerWorld();
      if (pw) { var dx = pw.x - player.x, dy = pw.y - player.y, d = Math.hypot(dx, dy); if (d > 3) { var kk = Math.min(1, d / (70 * sf)); tvx = dx / d * SP * kk; tvy = dy / d * SP * kk; } }
    }
    var a = Math.min(1, dt * 7); arena.vx += (tvx - arena.vx) * a; arena.vy += (tvy - arena.vy) * a;
    player.x += arena.vx * dt; player.y += arena.vy * dt;
    var minX = R.l + hw; if (player.x < minX) player.x += (minX - player.x) * Math.min(1, dt * 6);
    if (player.x > R.r - hw) player.x = R.r - hw;
    var top = R.ceilAt(player.x) + hh + 6 * sf, bot = R.floor - hh;
    if (player.y < top) { player.y = top; if (arena.vy < 0) arena.vy = 0; }
    if (player.y > bot) { player.y = bot; if (arena.vy > 0) arena.vy = 0; }
    player.vy = 0;
    var tr = Math.max(-0.35, Math.min(0.45, arena.vy / 700)); player.rotation += (tr - player.rotation) * Math.min(1, dt * 8);
    return true;
  };

  // ----- the boss: mechanical octopus, flies around the right half of the arena, crackling with electricity -----
  var OCT = { fw: 320, fh: 216, cols: 6, n: 36, fps: 19 };
  window.__airborneL3BossReady = function () { return ok("level3_octo"); };
  window.__airborneL3BossInit = function (b) {
    if (!arena || !cave || !ok("level3_octo")) return;
    var R = arenaRect(), sf = cave.s / ARENA_SZ;
    b.kind = "l3octo"; b.w = 250 * sf; b.h = b.w * OCT.fh / OCT.fw;
    b.x = R.r - b.w - 30 * sf; b.y = (R.ceilAt(R.cx) + R.floor) / 2 - b.h / 2;
    b.targetX = b.x; b.arrived = true;
    b.l3 = { vx: 0, vy: 0, tx: b.x, ty: b.y, rt: 0, t: 0, orbT: 2.0, shockT: 6.5, sh: null, shHit: false, fr: 0, frT: 0, arcs: [], fan: 0 };
    try { hasFirepower = true; hasDualFire = true; powerup = null; powerupRespawnTimer = 1e9; } catch (e) {}
    orbs = [];
  };
  function bossPt(b, fx, fy) { return { x: b.x + b.w * fx, y: b.y + b.h * fy }; }
  var OCT_ORBS = [[0.085, 0.36], [0.075, 0.80], [0.375, 0.17]];      // glowing tips / head crystal (sprite fractions)
  window.__airborneL3BossUpdate = function (b, dt) {
    if (!arena || !cave || !b.l3) return;
    var L = b.l3, R = arenaRect(), sf = cave.s / ARENA_SZ, hp = Math.max(0, Math.min(1, b.health / b.maxHealth));
    L.t += dt; L.frT += dt; while (L.frT >= 1 / OCT.fps) { L.frT -= 1 / OCT.fps; L.fr = (L.fr + 1) % OCT.n; }
    // roam: up / down and left / right, but only in the right half of the arena
    var xmin = R.cx + 24 * sf, xmax = R.r - b.w - 10 * sf, ymax = R.floor - b.h - 8 * sf;
    L.rt -= dt;
    if (L.rt <= 0) {
      L.rt = 1.2 + Math.random() * 1.6;
      L.tx = xmin + Math.random() * Math.max(10, xmax - xmin);
      var ymin = R.ceilAt(L.tx + b.w / 2) + 10 * sf;
      L.ty = Math.max(ymin, (0.27 * H - arena.ay * (1 - arena.z)) / arena.z + 34 * sf) + Math.random() * Math.max(10, ymax - ymin - 60);
    }
    var spd = (150 + 70 * (1 - hp)) * sf, dx = L.tx - b.x, dy = L.ty - b.y, d = Math.hypot(dx, dy) || 1;
    var wantX = dx / d * Math.min(spd, d * 2.4), wantY = dy / d * Math.min(spd, d * 2.4);
    var a = Math.min(1, dt * 2.2); L.vx += (wantX - L.vx) * a; L.vy += (wantY - L.vy) * a;
    b.x += L.vx * dt; b.y += L.vy * dt + Math.sin(L.t * 2.4) * 18 * sf * dt;
    var hudY = (0.27 * H - arena.ay * (1 - arena.z)) / arena.z + 34 * sf;      // keep the boss (and its health bar) clear of the HUD strip
    b.x = Math.max(xmin, Math.min(xmax, b.x)); var yTop = Math.max(R.ceilAt(b.x + b.w / 2) + 6 * sf, hudY); b.y = Math.max(yTop, Math.min(ymax, b.y));
    // electric orbs thrown at the blimp
    L.orbT -= dt;
    if (L.orbT <= 0 && !L.sh) {
      L.orbT = 2.1 - 0.8 * (1 - hp) + Math.random() * 0.5;
      L.fan = (L.fan + 1) % 3;
      var o0 = bossPt(b, OCT_ORBS[0][0], OCT_ORBS[0][1]), ang = Math.atan2(player.y - o0.y, player.x - o0.x), n = (hp < 0.55 && L.fan === 0) ? 3 : 1;
      for (var i = 0; i < n; i++) {
        var aa = ang + (n === 1 ? 0 : (i - 1) * 0.30), sp = (235 + 50 * (1 - hp)) * sf;
        orbs.push({ x: o0.x, y: o0.y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, r: 21 * sf, hp: 2, t: Math.random(), rot: 0 });
      }
      burst(o0.x, o0.y, 8, "170,225,255", 120 * sf);
    }
    // shock nova: charge, then discharge a ring of lightning
    L.shockT -= dt;
    if (!L.sh && L.shockT <= 0) { L.sh = { t: 0 }; L.shHit = false; L.shockT = 8 - 3 * (1 - hp) + Math.random() * 1.5; }
    if (L.sh) {
      L.sh.t += dt;
      var cx = b.x + b.w * 0.5, cy = b.y + b.h * 0.52, RR = 175 * sf;
      if (L.sh.t > 1.2 && L.sh.t < 2.1 && !L.shHit && typeof takeHit === "function") {
        var pd = Math.hypot(player.x - cx, player.y - cy);
        if (pd < RR + (player.w || 80) * 0.18) { L.shHit = true; try { takeHit(); } catch (e) {} }
      }
      if (L.sh.t >= 2.2) L.sh = null;
    }
    // body contact
    var ddx = Math.abs(player.x - (b.x + b.w / 2)), ddy = Math.abs(player.y - (b.y + b.h / 2));
    if (ddx < (player.w / 2) * 0.6 + b.w * 0.27 && ddy < (player.h / 2) * 0.6 + b.h * 0.27) { try { takeHit(); } catch (e) {} }
  };
  function burst(x, y, n, rgb, spd) {
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = spd * (0.3 + Math.random()); afx.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.3, age: 0, life: 0.35 + Math.random() * 0.35, rgb: rgb, r: 1.4 + Math.random() * 1.6 }); }
    if (afx.length > 160) afx.splice(0, afx.length - 160);
  }
  function updateOrbs(dt) {
    var R = arenaRect(), hw = (player.w || 80) * 0.30;
    for (var i = orbs.length - 1; i >= 0; i--) {
      var o = orbs[i]; o.x += o.vx * dt; o.y += o.vy * dt; o.t += dt; o.rot += dt * 5;
      var dead = false;
      if (typeof bullets !== "undefined") {
        for (var j = bullets.length - 1; j >= 0 && !dead; j--) {
          var bl = bullets[j];
          if (Math.abs(bl.x - o.x) < o.r + 6 && Math.abs(bl.y - o.y) < o.r + 6) {
            bullets.splice(j, 1); o.hp--; burst(o.x, o.y, 5, "190,230,255", 140);
            if (o.hp <= 0) dead = true;
          }
        }
      }
      if (!dead && Math.hypot(player.x - o.x, player.y - o.y) < o.r * 0.85 + hw * 0.6) { dead = true; try { takeHit(); } catch (e) {} }
      if (o.x < R.l - 120 || o.x > R.r + 160 || o.y < R.ceilAt(o.x) - 160 || o.y > R.floor + 80) dead = true;
      if (dead) { burst(o.x, o.y, 14, "170,225,255", 190); try { if (typeof sfxExplosion === "function") sfxExplosion(0.15); } catch (e) {} orbs.splice(i, 1); }
    }
  }
  function drawOrbs() {
    var im = img("level3_orb"), sf = cave ? cave.s / ARENA_SZ : 1;
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i], sz = o.r * 2.5;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; glowAt(o.x, o.y, o.r * 2.6, "120,190,255", 0.55 + 0.2 * Math.sin(o.t * 14)); ctx.restore();
      if (im && im.naturalWidth) {
        var f = ((o.t * 17) | 0) % 25, sw = 128;
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
        ctx.drawImage(im, (f % 5) * sw, ((f / 5) | 0) * sw, sw, sw, -sz / 2, -sz / 2, sz, sz); ctx.restore();
      }
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      if (Math.random() < 0.5) { var a = Math.random() * 6.283; bolt(o.x, o.y, o.x + Math.cos(a) * o.r * 1.9, o.y + Math.sin(a) * o.r * 1.9, 5 * sf, 4, 0.8, 1.1); }
      ctx.restore();
    }
  }
  window.__airborneL3DrawBoss = function (b, shakeX) {
    var im = img("level3_octo"); if (!im || !b.l3) return;
    var L = b.l3, sf = cave ? cave.s / ARENA_SZ : 1, f = L.fr, x = b.x + (shakeX || 0);
    ctx.save();
    ctx.drawImage(im, (f % OCT.cols) * OCT.fw, ((f / OCT.cols) | 0) * OCT.fh, OCT.fw, OCT.fh, x, b.y, b.w, b.h);
    var hit = (typeof bossHitFlashUntil !== "undefined" && performance.now() < bossHitFlashUntil);
    if (hit) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.28; ctx.drawImage(im, (f % OCT.cols) * OCT.fw, ((f / OCT.cols) | 0) * OCT.fh, OCT.fw, OCT.fh, x, b.y, b.w, b.h); }
    // electricity: glowing tips, crackling arcs between the tips and the body, a charge-up and a ring discharge
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    var body = { x: x + b.w * 0.5, y: b.y + b.h * 0.52 }, T = clockT;
    for (var i = 0; i < OCT_ORBS.length; i++) {
      var p = { x: x + b.w * OCT_ORBS[i][0], y: b.y + b.h * OCT_ORBS[i][1] };
      glowAt(p.x, p.y, (22 + 6 * Math.sin(T * 9 + i * 2)) * sf, "150,215,255", 0.55 + 0.25 * Math.sin(T * 13 + i));
      if (Math.random() < 0.35) bolt(p.x, p.y, body.x + (Math.random() - 0.5) * b.w * 0.3, body.y + (Math.random() - 0.5) * b.h * 0.3, 9 * sf, 6, 0.8, 2.0);
      if (Math.random() < 0.3) { var a = Math.random() * 6.283; bolt(p.x, p.y, p.x + Math.cos(a) * 34 * sf, p.y + Math.sin(a) * 34 * sf, 6 * sf, 4, 0.9, 1.8); }
    }
    if (Math.random() < 0.45) {                                   // loose arcs around the hull
      var a1 = Math.random() * 6.283, a2 = a1 + 0.5 + Math.random() * 1.2, rx = b.w * 0.36, ry = b.h * 0.34;
      bolt(body.x + Math.cos(a1) * rx, body.y + Math.sin(a1) * ry, body.x + Math.cos(a2) * rx * 1.15, body.y + Math.sin(a2) * ry * 1.15, 10 * sf, 6, 0.75, 1.9);
    }
    glowAt(body.x, body.y, b.w * 0.7, "100,170,255", 0.10 + 0.05 * Math.sin(T * 6));
    if (L.sh) {
      var RR = 175 * sf, t = L.sh.t;
      if (t < 1.2) {                                              // charging: contracting ring + growing glow + sparks
        var k = t / 1.2; glowAt(body.x, body.y, (50 + 70 * k) * sf, "170,225,255", 0.35 + 0.5 * k);
        ctx.globalAlpha = 0.25 + 0.4 * k; ctx.strokeStyle = "rgba(170,225,255,1)"; ctx.lineWidth = 2 * sf; ctx.setLineDash([8 * sf, 8 * sf]);
        ctx.beginPath(); ctx.arc(body.x, body.y, RR * (1.1 - 0.1 * k), 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
        if (Math.random() < 0.7) { var a3 = Math.random() * 6.283; bolt(body.x, body.y, body.x + Math.cos(a3) * RR * 0.5 * k, body.y + Math.sin(a3) * RR * 0.5 * k, 10 * sf, 6, 0.85, 2.0); }
      } else if (t < 2.1) {                                       // discharge: ring of lightning
        var kf = 1 - (t - 1.2) / 0.9; glowAt(body.x, body.y, RR * 1.2, "130,200,255", 0.22 * kf + 0.05);
        for (var q = 0; q < 11; q++) { var aq = q / 11 * 6.283 + T * 0.5; bolt(body.x, body.y, body.x + Math.cos(aq) * RR, body.y + Math.sin(aq) * RR, 18 * sf, 9, Math.min(1, 1.0 * kf + 0.35), 4.6); }
        ctx.globalAlpha = 0.6 * kf + 0.1; ctx.strokeStyle = "rgba(200,235,255,1)"; ctx.lineWidth = 3 * sf; ctx.beginPath(); ctx.arc(body.x, body.y, RR, 0, 6.283); ctx.stroke();
      }
    }
    ctx.restore();
    drawOrbs();
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (var m = 0; m < afx.length; m++) { var fp = afx[m]; ctx.globalAlpha = Math.max(0, 1 - fp.age / fp.life); glowAt(fp.x, fp.y, fp.r * 3.2 * sf, fp.rgb, Math.max(0, 1 - fp.age / fp.life)); }
    ctx.restore();
  };

  window.__airborneL3Draw = function () {
    if (!on) return;
    ctx.save();
    try { drawParallax(); drawGround(); drawStructs(); drawCave(); } catch (e) { console.warn("[L3] draw", e); }
    ctx.restore();
  };
  window.__airborneL3Debug = function () { return { on: on, structs: structs.length, cave: cave ? { x: cave.x, w: cave.w, top: cave.top } : null, playT: playT, caveDone: caveDone }; };
  window.__airborneL3Test = { structs: function () { return structs; }, cave: function () { return cave; }, spawnCave: function () { if (!cave) spawnCave(); return cave; } };
})();

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

  // ---------- cave geometry (sprite is 2079x372) ----------
  var CAVE_W = 2079, CAVE_H = 372;
  var CAVE_CEIL = 118, CAVE_FLOOR = 298, CAVE_CAP = 270, HOLE_Y0 = 140, HOLE_Y1 = 272, CAVE_EDGE = 30;
  var CAVE_RECTS = [   // solid pillars / slabs (sprite px)
    [644, 176, 770, 204], [680, 204, 736, 298],        // pillar A
    [380, 236, 550, 280],                                // slab 1
    [730, 260, 860, 300],                                // slab 2
    [956, 190, 1120, 222], [1000, 222, 1080, 298],      // pillar B
    [1090, 256, 1240, 280],                              // slab 3
    [1260, 200, 1420, 236], [1310, 236, 1380, 298],     // pillar C
    [1460, 196, 1600, 232],                              // slab D
    [1600, 220, 1720, 260]                               // slab 4
  ];
  var CAVE_NODES = [   // crystal arcs [fx(of 1039), fy(of 186), dir, len(frac of cave height), cycle offset]
    [354, 86, "u", 0.30, 0.0], [520, 93, "u", 0.30, 0.9], [670, 98, "u", 0.30, 1.8], [765, 96, "u", 0.30, 2.6],
    [240, 150, "u", 0.30, 1.3], [600, 150, "u", 0.34, 0.4], [815, 150, "u", 0.34, 2.1], [440, 148, "u", 0.30, 2.9]
  ];

  var on = false, structs = [], spawnX = 0, cave = null, caveDone = false, clockT = 0, playT = 0, groundX = 0, parX = 0;
  var fxP = [];
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
    var h = H, s = h / CAVE_H;
    return { h: h, s: s, w: CAVE_W * s, top: groundY() - (CAVE_FLOOR / CAVE_H) * h };
  }
  function spawnCave() {
    var d = caveDims();
    cave = { x: Math.max(W + 60, spawnX), w: d.w, h: d.h, s: d.s, top: d.top, nodes: [] };
    CAVE_NODES.forEach(function (n) { cave.nodes.push({ fx: n[0] / 1039, fy: n[1] / 186, dir: n[2], len: n[3], t: n[4], cyc: 1 }); });
    spawnX = cave.x + cave.w + 420;
    window.__airborneL3Cave = true;
  }

  function start() {
    on = true; structs = []; cave = null; caveDone = false; fxP = []; playT = 0;
    spawnX = W + 260; window.__airborneL3Cave = false;
  }
  function stop() { on = false; structs = []; cave = null; fxP = []; window.__airborneL3Cave = false; }
  window.__airborneL3On = function () { return on; };
  window.__airborneL3Sync = function () {
    if (typeof bossesDefeatedCount === "number" && bossesDefeatedCount !== 2 && !(bossesDefeatedCount === 3 && on)) { if (on) stop(); return; }
    if (wanted() && assetsReady()) start(); else if (on && !wanted()) stop();
  };
  window.__airborneL3InCave = function () {
    if (!cave) return false;
    return player.x > cave.x + CAVE_CAP * cave.s * 0.9 && player.x < cave.x + cave.w - CAVE_CAP * cave.s * 0.9;
  };
  // cave on screen? the boss waits until it has been flown through
  window.__airborneL3HoldBoss = function () { return !!(cave && cave.x < W + 200 && cave.x + cave.w > -50); };
  // rect of rock mass covering the screen (rain / clouds are clipped out of it)
  window.__airborneL3CaveRect = function () {
    if (!cave) return null;
    var x0 = Math.max(0, cave.x + CAVE_EDGE * cave.s), x1 = Math.min(W, cave.x + cave.w - CAVE_EDGE * cave.s);
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
    groundX += sp; parX += sp * 0.32;
    structs.forEach(function (s) { s.x -= sp; });
    spawnX -= sp;
    if (cave) cave.x -= sp;
    structs = structs.filter(function (s) { return s.x + s.w > -260; });
    if (exit) structs = structs.filter(function (s) { return s.x < W + 20 || s.x + s.w < 0; });
    // cave sequence — once per level, early enough that it is long gone before the boss
    if (!cave && !caveDone && !exit && !takeoff && !bossActive && assetsReady()) {
      var fr = frac();
      if ((fr !== null && fr >= 0.26 && fr < 0.7) || playT > 40) spawnCave();
    }
    if (cave && cave.x + cave.w < -60) { cave = null; caveDone = true; window.__airborneL3Cave = false; }
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
    if (cave) {
      var c = cave, sC = c.s, lx = (player.x - c.x) / sC, ly0 = (player.y - c.top) / sC;
      var lhw = hw / sC, lhh = hh / sC;
      if (player.x > c.x + CAVE_EDGE * sC && player.x - hw < c.x + c.w - CAVE_EDGE * sC) {
        var bad = false, inLeft = (lx - lhw) < CAVE_CAP, inRight = (lx + lhw) > CAVE_W - CAVE_CAP;
        if (inLeft || inRight) { if (ly0 - lhh < HOLE_Y0 || ly0 + lhh > HOLE_Y1) bad = true; }
        else {
          if (ly0 - lhh < CAVE_CEIL) { player.y = c.top + (CAVE_CEIL + lhh) * sC; if (player.vy < 0) player.vy = 0; bad = true; }
          if (ly0 + lhh > CAVE_FLOOR) { player.y = c.top + (CAVE_FLOOR - lhh) * sC; bad = true; }
          for (var r = 0; r < CAVE_RECTS.length && !bad; r++) {
            var q = CAVE_RECTS[r];
            if (lx + lhw > q[0] && lx - lhw < q[2] && ly0 + lhh > q[1] && ly0 - lhh < q[3]) bad = true;
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
  function drawCave() {
    if (!cave) return;
    var c = cave, im = img("level3_cave"); if (!im) return;
    if (c.x > W + 40 || c.x + c.w < -40) return;
    var sC = c.s, mx0 = c.x + CAVE_EDGE * sC, mx1 = c.x + c.w - CAVE_EDGE * sC;
    // rock mass above and below the cut-away so nothing of the outside world shows through
    var gr = ctx.createLinearGradient(0, 0, 0, c.top + 40 * sC); gr.addColorStop(0, "#0b0814"); gr.addColorStop(1, "#201733");
    ctx.fillStyle = gr; ctx.fillRect(mx0, 0, mx1 - mx0, c.top + 130 * sC);
    ctx.fillStyle = "#150f20"; ctx.fillRect(mx0, c.top + c.h - 4 * sC, mx1 - mx0, H);
    ctx.drawImage(im, c.x, c.top, c.w, c.h);
    // arcs on the crystals
    var host = { x: c.x, y: c.top, w: c.w, h: c.h };
    var nodes = c.nodes.map(function (n) { return { fx: n.fx, fy: n.fy, dir: n.dir, len: n.len * c.h, t: n.t, cyc: n.cyc }; });
    drawNodes(host, nodes);
    // ambient crystal glow so the interior pulses
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < c.nodes.length; i++) {
      var n = c.nodes[i], gx = c.x + n.fx * c.w, gy = c.top + n.fy * c.h;
      if (gx < -40 || gx > W + 40) continue;
      glowAt(gx, gy, 38 * sC, "90,150,255", 0.14 + 0.08 * Math.sin(clockT * 2 + i));
    }
    ctx.restore();
  }
  // Cave entrance / exit rims (rock, lantern, pipes) are drawn again AFTER the blimp: while the blimp is passing the
  // entrance or exit it is layered under the cave; once it is inside the cave it is above it.
  var FRONT_W = 340;
  window.__airborneL3DrawFront = function () {
    if (!on || !cave) return;
    var c = cave, im = img("level3_cave"); if (!im) return;
    if (c.x > W + 40 || c.x + c.w < -40) return;
    var fw = FRONT_W * c.s;
    ctx.save();
    try {
      if (c.x < W && c.x + fw > 0) ctx.drawImage(im, 0, 0, FRONT_W, CAVE_H, c.x, c.top, fw, c.h);
      var rx = c.x + c.w - fw;
      if (rx < W && rx + fw > 0) ctx.drawImage(im, CAVE_W - FRONT_W, 0, FRONT_W, CAVE_H, rx, c.top, fw, c.h);
    } catch (e) {}
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

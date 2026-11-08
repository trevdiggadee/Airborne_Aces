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
    is5: [893, 739, 138, 103], is6: [1047, 729, 180, 98],
    lamp1: [1431, 743, 57, 164], lamp2: [1493, 748, 31, 164], redpole: [1389, 749, 23, 159], ppost: [1251, 759, 21, 51], volt: [1167, 824, 119, 82],
    crateA: [14, 856, 75, 50], crateB: [103, 855, 63, 51], rail: [178, 866, 130, 42], barrelB: [586, 845, 56, 64], elbow: [659, 841, 90, 68], barrelR: [765, 850, 40, 59],
    tank: [863, 836, 37, 72], crateC: [979, 844, 87, 63], crateD: [1077, 851, 65, 56], mesh: [207, 931, 102, 73], mach: [15, 934, 97, 69], pipes: [124, 929, 59, 75], pipeBig: [1087, 930, 144, 75], pipeL: [1239, 935, 136, 69]
  };
  // electric nodes, fractions of the sprite: dir u/d/r, len in screen heights (H) — or "to" another struct (pylon pairs)
  var NODES = {};

  // ---------- cave geometry (sprite 2048x479, sprite px) ----------
  // Left: entry pipe -> long tunnel (row TUN_TOP is the tunnel ceiling = top of the screen) -> open archway into the boss ARENA on the right.
  var CAVE_W = 4300, CAVE_H = 480, TUN_TOP = 0, CEIL_T = 132, FLOOR_T = 402, WATER_Y = 400;
  var WALL_L = 240;                                 // tunnel interior starts here; the rock wing to its left is only open through the entry pipe
  var CORR_HALF = 22, PIPE_HALF = 54;
  var PIPE_L = [10, 235], PIPE_L_CY = 220;          // entry pipe hide zone (sprite px): open end .. mouth
  var EXIT_X = 4165, EXIT_CY = 215;                 // exit pipe at the far end of the boss room
  var ARENA_L = 3260, ARENA_R = 4100, ARENA_CX = 3638, ARENA_FLOOR = 396, ARENA_WATER = 410;   // boss arena (open cavern)
  var ARENA_CEIL = [[3200, 134], [3500, 130], [3800, 130], [4100, 140]];
  var ARENA_Z = 0.84;                               // camera pull-back (whole room visible) once the blimp is in the arena
  var CAVE_RECTS = [[WALL_L, -400, ARENA_L, CEIL_T], [WALL_L, FLOOR_T, ARENA_L, CAVE_H]];   // 0 = ceiling, 1 = floor (tunnel only)
  var CAVE_NODES = [];                              // no electricity in the cave: the crystals only glow and sparkle
  function pipeCY(lx) { return PIPE_L_CY; }
  function arenaCeil(lx) {
    var A = ARENA_CEIL; if (lx <= A[0][0]) return A[0][1]; if (lx >= A[A.length - 1][0]) return A[A.length - 1][1];
    for (var i = 1; i < A.length; i++) if (lx <= A[i][0]) { var t = (lx - A[i - 1][0]) / (A[i][0] - A[i - 1][0]); return A[i - 1][1] + (A[i][1] - A[i - 1][1]) * t; }
    return 100;
  }
  var CAVE_FX = {
    crystals: [[272,387,0],[382,385,1],[487,379,0],[558,417,1],[641,387,0],[924,390,1],[1178,390,0],[1265,423,1],[1496,382,0],[2111,401,1],[2320,421,0],[2326,389,1],[2579,423,0],[2604,388,1],[2919,398,0],[3343,367,1],[3642,392,0],[3864,359,1],[3926,363,0],[4088,415,1],[433,116,0],[484,107,0],[635,113,0],[795,108,0],[885,121,0],[978,109,0],[1225,108,0],[1272,105,0],[1528,109,0],[1585,119,0],[1661,107,0],[1754,94,0],[2053,120,0],[2163,107,0],[2442,118,0],[2591,109,0],[2762,111,0],[2940,97,0],[3050,104,0],[3123,105,0],[3168,97,0],[3329,62,0],[3358,84,0],[3517,81,0],[3541,121,0],[3738,123,0],[3782,63,0],[3920,77,0],[3984,88,0]],
    lamps: [[356,213,"255,170,80"],[876,211,"255,170,80"],[1036,140,"255,170,80"],[1171,145,"255,170,80"],[1278,216,"255,170,80"],[1282,358,"255,170,80"],[1408,125,"255,170,80"],[1540,160,"255,170,80"],[1643,206,"255,170,80"],[1750,133,"255,170,80"],[1910,131,"255,170,80"],[1991,133,"255,170,80"],[2119,210,"255,170,80"],[2198,161,"255,170,80"],[2478,198,"255,170,80"],[2895,185,"255,170,80"],[3008,229,"255,170,80"],[3073,162,"255,170,80"],[3079,339,"255,170,80"],[3083,230,"255,170,80"],[3113,284,"255,170,80"],[3196,374,"255,170,80"],[3824,187,"255,170,80"],[3956,133,"255,170,80"],[4055,210,"255,170,80"],[3638,128,"140,200,255"]],
    steam: [[548, 168], [725, 150], [1000, 152], [1450, 150], [1800, 148], [2250, 150], [2650, 150], [3450, 150]],
    tips: [[433,132],[484,123],[635,129],[795,124],[885,137],[978,125],[1225,124],[1272,121],[1528,125],[1585,135],[1661,123],[1754,110],[2053,136],[2163,123],[2442,134],[2591,125],[2762,127],[2940,113],[3050,120],[3123,121],[3168,113],[3329,78],[3358,100],[3517,97],[3541,137],[3738,139],[3782,79],[3920,93],[3984,104]],
    pipes: []
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
  var arena = null, orbs = [], afx = [], pshock = 0;
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
  function gl() { return Math.max(58, H * 0.088); }
  function baseY() { return H - gl() + gl() * 0.14; }     // outside assets stand on the very bottom edge of the screen
  function groundY() { return (typeof groundLevelY === "function") ? groundLevelY() : H * 0.9; }
  function mkStruct(key, x, y, h) {
    var r = SP[key], w = h * r[2] / r[3];
    var s = { k: key, src: r, x: x, y: y, w: w, h: h, mask: maskFor(key), nodes: [] };
    (NODES[key] || []).forEach(function (n) { s.nodes.push({ fx: n.fx, fy: n.fy, dir: n.dir, len: n.len * H, t: rnd(0, 3), cyc: rnd(0.85, 1.15) }); });
    structs.push(s); return s;
  }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }
  var DECO = [["barrelB", 0.075], ["barrelR", 0.07], ["crateA", 0.06], ["crateB", 0.065], ["crateC", 0.075], ["crateD", 0.065], ["tank", 0.085], ["rail", 0.05], ["elbow", 0.07], ["mesh", 0.085], ["mach", 0.08], ["pipes", 0.09], ["pipeBig", 0.09], ["pipeL", 0.08], ["volt", 0.095], ["lamp1", 0.2], ["lamp2", 0.2], ["redpole", 0.2]];
  function mkDeco(k, x, h) { var r = SP[k], s = { k: k, src: r, x: x, y: baseY() - h + 3 * U(), w: h * r[2] / r[3], h: h, mask: null, nodes: [], deco: true, ph: Math.random() * 6 }; structs.push(s); return s; }
  function sprinkle(x0, x1) {
    var n = 1 + ((Math.random() * 3) | 0), x = x0 + 20;
    for (var i = 0; i < n && x < x1 - 60; i++) { var d = pick(DECO), s = mkDeco(d[0], x, d[1] * H * rnd(0.9, 1.15)); x += s.w + rnd(0.04, 0.16) * W; }
  }
  function spawnOne() {
    var u = U(), gY = baseY(), roll = Math.random(), s, x = spawnX, gap = rnd(0.55, 0.95) * W, x0 = x;
    if (roll < 0.22) {                                   // rock stacks (tunnel rocks have a gap you can fly through)
      var k = pick(["rock0", "rock1", "rock2", "rock3", "rock4"]), h = rnd(0.30, 0.44) * H;
      s = mkStruct(k, x, gY - h + 6 * u, h); spawnX = x + s.w + gap;
    } else if (roll < 0.48) {                            // towers
      var kt = pick(["tw0", "tw1", "tw2", "tw3", "tw4", "tw5", "tw6"]), ht = rnd(0.34, 0.52) * H;
      s = mkStruct(kt, x, gY - ht + 6 * u, ht); spawnX = x + s.w + gap;
    } else if (roll < 0.60) {                            // the charged electric tower: its arc runs to a mast
      var he = 0.44 * H; s = mkStruct("tw7", x, gY - he + 6 * u, he);
      var hm = 0.46 * H, m = mkStruct("tw1", x + s.w + rnd(0.28, 0.42) * W, gY - hm + 6 * u, hm);
      s.nodes.push({ fx: 0.40, fy: 0.04, dir: "to", to: m, tfx: 0.46, tfy: 0.03, t: rnd(0, 3), cyc: 1 });
      spawnX = m.x + m.w + gap;
    } else if (roll < 0.72) {                            // pylon pair with an electric arc strung between them
      var hp = rnd(0.40, 0.50) * H, a = mkStruct("py0", x, gY - hp + 6 * u, hp);
      var b = mkStruct("py1", x + rnd(0.62, 0.8) * W, gY - hp * 1.0 + 6 * u, hp);
      a.nodes.push({ fx: 0.72, fy: 0.10, dir: "to", to: b, tfx: 0.20, tfy: 0.10, t: rnd(0, 3), cyc: 1 });
      b.partner = a; spawnX = b.x + b.w + gap;
    } else if (roll < 0.80) {                            // bridges standing on the ground (never floating)
      var kb = pick(["br0", "br1", "br2", "br3", "br4"]), hb = rnd(0.24, 0.32) * H;
      s = mkStruct(kb, x, gY - hb + 6 * u, hb); spawnX = x + s.w + gap;
    } else {                                             // floating islands (two of them carry an arc down to a ground rod)
      var ki = pick(["is0", "is1", "is2", "is3", "is4", "is5", "is6", "is6", "is1"]), hi = rnd(0.13, 0.19) * H;
      s = mkStruct(ki, x, rnd(0.20, 0.50) * H, hi); s.bob = rnd(0, 6.28); spawnX = x + s.w + gap;
      if (ki === "is6" || ki === "is1") {
        s.y = rnd(0.26, 0.36) * H; var fx = ki === "is6" ? 0.12 : 0.5, fy = ki === "is6" ? 0.86 : 0.95;
        var th = 0.15 * H, rod = mkDeco("ppost", s.x + fx * s.w - 6 * u, th);
        s.nodes.push({ fx: fx, fy: fy, dir: "to", to: rod, tfx: 0.5, tfy: 0.02, t: rnd(0, 3), cyc: 1 });
      }
    }
    sprinkle(x0, spawnX);
  }
  function caveDims() {
    var s = 0.9 * H / 420;
    return { h: CAVE_H * s, s: s, w: CAVE_W * s, top: H - CAVE_H * s };
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
    if (cave && !arena && sp > 0 && !exit && playerInPipe()) sp *= 2;      // pipe travel 2x
    if (sp > 0) playT += dt;
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
    if (cave && !arena && !exit && !takeoff && player.x > cave.x + (ARENA_L + 30) * cave.s) startArena();
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
      if (pz) { var cy = cave.top + pz.cy * cave.s, lim = Math.max(2, CORR_HALF * cave.s - hh), py0 = player.y; player.y = Math.max(cy - lim, Math.min(cy + lim, player.y)); if (player.vy) player.vy = 0; }
    }
    var pts = [[0, 0], [-hw, 0], [hw, 0], [0, -hh], [0, hh], [-hw, hh], [hw, hh], [-hw, -hh], [hw, -hh]];
    for (var i = 0; i < structs.length; i++) {
      var s = structs[i]; if (s.deco) continue;
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
      if (lx + lhw > -200 && lx - lhw < ARENA_L + 40) {
        if (lx - lhw < WALL_L) {          // rock wing on the left: only the entry pipe is open
          var m = caveMask();
          if (m) {
            for (var q0 = 0; q0 < pts.length && !bad; q0++) {
              var qx = lx + pts[q0][0] / sC, qy = ly0 + pts[q0][1] / sC;
              if (qx < WALL_L && caveOpaque(m, qx, qy) && !(qx < PIPE_L[1] + 24 && Math.abs(qy - PIPE_L_CY) < PIPE_HALF + 16)) { var pc = pipeCY(qx); if (!(qy >= pc - CORR_HALF && qy <= pc + CORR_HALF)) bad = true; }
            }
          }
        }
        if (lx + lhw > WALL_L && lx - lhw < ARENA_L) {
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
    var im = img("level3_ground"), g = gl(), h = g * 2.1, top = (H - g) - h * 0.30;
    if (!im || !im.naturalWidth) { ctx.fillStyle = "#2e2538"; ctx.fillRect(0, H - g, W, g); return; }
    var tw = h * im.naturalWidth / im.naturalHeight, off = -(groundX % tw);
    ctx.save(); ctx.fillStyle = "#2f2b3b"; ctx.fillRect(0, top + h * 0.88, W, H);
    for (var x = off - tw, n = 0; x < W + 2 && n < 8; x += tw - 1, n++) { if (x + tw < 0) continue; ctx.drawImage(im, x, top, tw, h); }
    ctx.restore();
  }
  function drawStructs() {
    var im = img("level3_assets");
    for (var i = 0; i < structs.length; i++) {
      var s = structs[i]; if (s.x > W + 60 || s.x + s.w < -60) continue;
      var y = s.y + (s.by || 0);
      try { ctx.drawImage(im, s.src[0], s.src[1], s.src[2], s.src[3], s.x, y, s.w, s.h); } catch (e) {}
      if (s.nodes.length) { var h2 = { x: s.x, y: y, w: s.w, h: s.h }; drawNodes(h2, s.nodes); }
      if (s.deco) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        if (s.k === "lamp1") glowAt(s.x + s.w * 0.22, y + s.h * 0.1, s.h * 0.35, "255,200,110", 0.32 + 0.06 * Math.sin(clockT * 6 + s.ph));
        else if (s.k === "lamp2") glowAt(s.x + s.w * 0.5, y + s.h * 0.08, s.h * 0.3, "255,210,120", 0.3 + 0.06 * Math.sin(clockT * 5 + s.ph));
        else if (s.k === "redpole") glowAt(s.x + s.w * 0.5, y + s.h * 0.1, s.h * 0.2, "255,50,40", Math.sin(clockT * 3 + s.ph) > 0 ? 0.7 : 0.1);
        else if (s.k === "volt") glowAt(s.x + s.w * 0.5, y + s.h * 0.5, s.h * 0.6, "100,180,255", 0.22 + 0.12 * Math.sin(clockT * 4 + s.ph));
        else if (s.k === "ppost") { glowAt(s.x + s.w * 0.5, y + s.h * 0.02, s.h * 0.5, "150,215,255", 0.35 + 0.2 * Math.sin(clockT * 9 + s.ph)); }
        ctx.restore();
      }
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
    return [{ x0: c.x + PIPE_L[0] * k, x1: c.x + PIPE_L[1] * k, cy: PIPE_L_CY }];
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
    var z = playerInPipe(), out = [];
    if (z) out.push({ x0: z.x0, x1: z.x1 });
    var ex0 = cave.x + EXIT_X * cave.s, ex1 = cave.x + CAVE_W * cave.s, ecy = cave.top + EXIT_CY * cave.s;
    if (Math.abs(player.y - ecy) < 40 * cave.s + (player.h || 50) * 0.3 && player.x > ex0) out.push({ x0: ex0, x1: ex1 + 400 });
    return out.length ? out : null;
  };
  // ----- cave effects: crystal sparkles, lamp glow, pipe steam, ceiling drips -----
  var fx = { sp: [], st: [], dr: [], rp: [], stT: [], drT: [], last: 0 };
  function rnd2(a, b) { return a + Math.random() * (b - a); }
  function star(x, y, r, a, rgb) {                 // soft diffuse glow (no hard cross)
    ctx.globalAlpha = a * 0.7; ctx.drawImage(glow(rgb), x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
    ctx.globalAlpha = a * 0.35; ctx.drawImage(glow("255,255,255"), x - r * 1.0, y - r * 1.0, r * 2, r * 2);
    ctx.globalAlpha = 1;
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
    for (x = 260; x < 3260; x += 70, i++) FOG.push({ bx: x, by: 235 + ((i * 53) % 120), w: 220 + ((i * 37) % 120), h: 56 + ((i * 29) % 50), sp: 0.12 + (i % 5) * 0.05, ph: i * 1.7, am: 26 + (i % 4) * 12, a: 0.08 + (i % 3) * 0.03 });
    for (x = 3300; x < 4100; x += 70, i++) FOG.push({ bx: x, by: 220 + ((i * 41) % 120), w: 260 + ((i * 31) % 120), h: 70 + ((i * 23) % 50), sp: 0.10 + (i % 4) * 0.04, ph: i * 1.3, am: 30, a: 0.08 + (i % 3) * 0.02 });
  }
  var POOLS = [];
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
  // ================= sprite bats (level3_bats.webp): roost on the ceiling, startle, chase and dive at the blimp (they bite) =================
  var BAT_R = {"hang":[[193,56,67,137],[296,58,67,132],[398,60,67,128],[501,61,66,126],[603,60,66,124],[704,60,65,123],[806,59,66,124],[908,58,66,122],[1010,58,65,124],[1110,58,65,124],[1210,58,67,123],[1313,59,69,124],[1420,60,68,126]],"fly":[[172,287,124,129],[296,304,104,117],[405,332,120,86],[535,331,157,85],[696,337,182,88],[878,309,194,136],[1079,331,184,98],[1263,327,127,106],[1390,315,134,108]],"attack":[[178,556,132,106],[314,566,110,97],[424,558,141,106],[569,566,103,117],[672,556,125,128],[797,558,150,127],[947,561,134,124],[1081,569,138,117],[1219,585,82,84],[1308,587,101,82],[1427,571,97,99]],"dive":[[173,815,112,111],[300,812,93,119],[416,814,97,116],[542,830,100,103],[675,833,91,102],[798,816,91,120],[934,823,111,130],[1043,828,112,125],[1180,834,100,96],[1297,824,93,97],[1412,811,108,105]]};
  var PROP_R = {"rockBig":[18,72,158,171],"crystalBlue":[438,61,191,194],"crystalDark":[635,26,165,224],"st1":[835,26,168,162],"st2":[1031,26,113,189],"st3":[1165,26,146,192],"st4":[1335,26,164,128],"spike":[816,135,107,119],"crystalSm":[941,151,148,119],"pl1":[18,293,294,112],"pl2":[327,295,251,119],"pl3":[593,267,332,168],"pl4":[937,302,195,108],"pl5":[1154,307,129,107],"wall":[1321,175,198,311],"hook":[1080,434,133,183],"post":[919,430,138,167],"lamp":[17,574,90,263],"hangLamp":[116,581,151,254],"plamp":[272,619,73,214],"wheel":[345,599,47,231],"rockCry":[392,610,108,219],"crLamp":[500,598,81,230],"furn1":[592,599,148,237],"furn2":[761,606,171,233],"gauge":[939,622,138,217],"crate1":[1146,650,101,93],"crate2":[1282,648,97,95],"barrel":[1408,646,73,97],"sign":[1101,757,178,100],"arrow":[1299,775,86,49],"hazard":[1404,770,111,41],"cl1":[16,867,103,124],"cl2":[127,872,76,113],"cl3":[213,890,49,92],"cl4":[266,892,74,85],"gem":[364,878,70,110],"coin":[452,905,63,70],"star":[533,902,68,71],"orb":[612,892,85,89],"lantern":[711,889,64,102],"box":[797,897,95,90],"spring1":[916,888,97,103],"spring2":[1034,880,127,119],"arch":[1178,839,348,163]};
  var BATS = null;
  function batsInit() {
    BATS = []; var seed = 11, i;
    function r() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function mk(x, y) { return { x: x, y: y, ph: r() * 6.28, sc: 0.8 + r() * 0.4, st: "hang", t: 0, dur: 0, vx: 0, vy: 0, px: 0, py: 0, wait: 1.5 + r() * 8, cd: 0, fr: Math.floor(r() * 13), face: 1 }; }
    for (i = 0; i < 70; i++) { var x = 280 + (i + r() * 0.85) * (2950 / 70); BATS.push(mk(x, 132 + r() * 12)); }
    for (i = 0; i < 38; i++) { var xx = 3280 + (i + r() * 0.85) * (800 / 38); BATS.push(mk(xx, arenaCeil(xx) + 4 + r() * 8)); }
  }
  function canHurtNow() { return (typeof state !== "undefined" && state === "playing") && !window.__airbornePlatformTakeoffActive && !(typeof bonusActive !== "undefined" && bonusActive) && !(typeof levelEndActive !== "undefined" && levelEndActive) && typeof takeHit === "function"; }
  function sprite(list, idx, x, y, k, flip, top, rot, alpha) {
    var sh = img("level3_bats"); if (!sh || !sh.naturalWidth) return;
    var L = BAT_R[list], q = L[((idx % L.length) + L.length) % L.length], dw = q[2] * k, dh = q[3] * k;
    ctx.save(); ctx.translate(x, top ? y : y); if (rot) ctx.rotate(rot); if (flip < 0) ctx.scale(-1, 1);
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(sh, q[0], q[1], q[2], q[3], -dw / 2, top ? 0 : -dh / 2, dw, dh); ctx.restore();
  }
  function drawBats(c, now, dt) {
    if (!BATS) batsInit();
    var s = c.s, pw = (player.w || 80), ph = (player.h || 50), att = 0, i, k = 0.18 * s, hurt = canHurtNow();
    for (i = 0; i < BATS.length; i++) if (BATS[i].st === "chase" || BATS[i].st === "dive") att++;
    for (i = 0; i < BATS.length; i++) {
      var b = BATS[i], hx = c.x + b.x * s, hy = c.top + b.y * s, kk = k * b.sc;
      if (hx < -120 && b.st === "hang" || hx > W + 120 && b.st === "hang") { continue; }
      b.t += dt; b.cd -= dt;
      if (b.st === "hang") {
        b.wait -= dt;
        var dx = player.x - hx, dy = player.y - hy;
        var near = Math.abs(dx) < 80 * s && dy > -20 * s && dy < 150 * s;
        var inCave = hx > 10 && hx < W - 10 && state === "playing";
        if (inCave && b.cd <= 0 && att < 3 && Math.abs(dx) < 230 * s && dy > 0 && dy < 260 * s && (b.wait <= 0 || near) && Math.random() < 0.5) {
          b.st = "chase"; b.t = 0; b.px = hx; b.py = hy + 40 * s * b.sc; b.vx = 0; b.vy = 60 * s; att++; b.dur = 4.5;
        } else if (inCave && near && b.cd <= 0) { b.st = "fly"; b.t = 0; b.dur = 2 + Math.random() * 1.5; b.px = hx; b.py = hy + 40 * s * b.sc; b.vx = (Math.random() - 0.5) * 220 * s; b.vy = 40 * s; }
        else if (b.wait <= 0) b.wait = 2 + Math.random() * 7;
        var fr = Math.floor((now * 3 + b.ph) % 26); fr = fr < 13 ? fr : 25 - fr;     // slow breathing / eyes opening
        sprite("hang", fr, hx, hy - 3 * s, kk, 1, true, Math.sin(now * 1.1 + b.ph) * 0.03);
        if (fr > 8) { ctx.save(); ctx.globalCompositeOperation = "lighter"; glowAt(hx, hy + 30 * kk * 4 / 4 + 16 * s, 8 * s, "255,60,60", 0.28); ctx.restore(); }
      } else {
        var ang = 0, tx, ty;
        if (b.st === "fly") {
          b.vy += (Math.sin(b.t * 3.1 + b.ph) * 150 * s - b.vy) * Math.min(1, dt * 2.5) * 0.6 - 18 * s * dt;
          b.vx += (Math.sin(b.t * 2.3 + b.ph * 2) * 150 * s - b.vx) * Math.min(1, dt * 1.8);
          if (b.t > b.dur) { b.st = "back"; b.t = 0; }
        } else if (b.st === "chase") {
          tx = player.x; ty = player.y - ph * 0.1; var ddx = tx - b.px, ddy = ty - b.py, dd = Math.hypot(ddx, ddy) || 1, sp = 190 * s;
          b.vx += (ddx / dd * sp - b.vx) * Math.min(1, dt * 3); b.vy += (ddy / dd * sp - b.vy) * Math.min(1, dt * 3);
          if (dd < 120 * s && b.t > 0.4) { b.st = "dive"; b.t = 0; b.dvx = ddx / dd * 360 * s; b.dvy = ddy / dd * 360 * s; }
          else if (b.t > b.dur) { b.st = "back"; b.t = 0; b.cd = 3; }
        } else if (b.st === "dive") {
          b.vx = b.dvx; b.vy = b.dvy; if (b.t > 0.75) { b.st = "back"; b.t = 0; b.cd = 7; }
        } else {                                                     // back: return to the roost
          tx = hx; ty = hy + 38 * s * b.sc; var rx = tx - b.px, ry = ty - b.py, rd = Math.hypot(rx, ry) || 1;
          b.vx += (rx / rd * 250 * s - b.vx) * Math.min(1, dt * 3.5); b.vy += (ry / rd * 250 * s - b.vy) * Math.min(1, dt * 3.5);
          if (rd < 9 * s) { b.st = "hang"; b.t = 0; b.wait = 5 + Math.random() * 9; continue; }
        }
        b.px += b.vx * dt; b.py += b.vy * dt;
        if (b.px < -200 || b.px > W + 200) { b.st = "hang"; b.t = 0; continue; }
        if (b.vx > 25 * s) b.face = 1; else if (b.vx < -25 * s) b.face = -1;
        ang = Math.max(-0.35, Math.min(0.35, b.vy / (900 * s))) * b.face;
        var isA = b.st === "chase" || b.st === "dive";
        if (b.st === "dive") sprite("dive", Math.min(10, Math.floor(b.t / 0.75 * 11)), b.px, b.py, kk * 1.1, b.face, false, ang);
        else if (b.st === "chase") sprite("attack", Math.floor(b.t * 14 + b.ph * 3), b.px, b.py, kk * 1.1, b.face, false, ang);
        else sprite("fly", Math.floor(b.t * 14 + b.ph * 3), b.px, b.py, kk, b.face, false, ang);
        if (isA) {
          ctx.save(); ctx.globalCompositeOperation = "lighter"; glowAt(b.px + b.face * 7 * s, b.py - 2 * s, 9 * s, "255,50,60", 0.4); glowAt(b.px, b.py, 22 * s, "150,80,255", 0.18); ctx.restore();
        }
      }
    }
  }
  // ================= atmosphere: ground fog, glittering crystals, props with effects =================
  var GL = [];                          // glitter / embers (w:1 = cave coordinates, w:0 = screen)
  var fogTex = null;
  function fogTexture() {
    if (fogTex) return fogTex;
    var cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; var g = cv.getContext("2d"), seed = 7;
    function r() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 34; i++) {
      var x = r() * 512, y = 40 + r() * 80, rad = 26 + r() * 46;
      for (var d = -1; d <= 1; d++) {
        var gr = g.createRadialGradient(x + d * 512, y, 0, x + d * 512, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.28)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.beginPath(); g.ellipse(x + d * 512, y, rad * 1.5, rad * 0.55, 0, 0, 6.283); g.fill();
      }
    }
    var fade = g.createLinearGradient(0, 0, 0, 128); fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(0.45, "rgba(0,0,0,0.0)"); g.globalCompositeOperation = "destination-in";
    var fm = g.createLinearGradient(0, 0, 0, 128); fm.addColorStop(0, "rgba(0,0,0,0)"); fm.addColorStop(0.5, "rgba(0,0,0,1)"); fm.addColorStop(1, "rgba(0,0,0,1)"); g.fillStyle = fm; g.fillRect(0, 0, 512, 128);
    fogTex = cv; return cv;
  }
  function fogBand(c, now, layer) {      // layer 0 back, 1 mid, 2 front (drawn after the blimp)
    var s = c.s, T = fogTexture(), cfg = [[0.55, 12, 190, 0.7, "170,150,255"], [0.7, -17, 230, 0.55, "130,170,255"], [0.85, 26, 270, 0.4, "190,170,255"]][layer];
    var zones = [[WALL_L, ARENA_L, WATER_Y], [ARENA_L, ARENA_R, ARENA_WATER]];
    ctx.save();
    for (var z = 0; z < zones.length; z++) {
      var zx0 = Math.max(0, c.x + zones[z][0] * s), zx1 = Math.min(W, c.x + zones[z][1] * s); if (zx1 <= zx0) continue;
      var bh = cfg[2] * s * 0.6, by = c.top + zones[z][2] * s - bh * 0.78;
      ctx.beginPath(); ctx.rect(zx0, by - 4, zx1 - zx0, bh + 40 * s); ctx.clip();
      var tw = 512 * (bh / 128) * 1.5, off = ((now * cfg[1] * s * 0.5) % tw + tw) % tw, base = c.x * cfg[0] ;
      var start = -(((off + base) % tw) + tw) % tw;
      var tint = glowTint(cfg[4]);
      for (var X = start; X < W + tw; X += tw) {
        if (X + tw < zx0 || X > zx1) continue;
        ctx.globalAlpha = cfg[3] * (0.85 + 0.15 * Math.sin(now * 0.6 + X)); ctx.drawImage(tint, X, by, tw, bh);
      }
      ctx.restore(); ctx.save();
    }
    ctx.restore();
  }
  var tintC = {};
  function glowTint(rgb) {
    if (tintC[rgb]) return tintC[rgb];
    var T = fogTexture(), cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; var g = cv.getContext("2d");
    g.fillStyle = "rgb(" + rgb + ")"; g.fillRect(0, 0, 512, 128); g.globalCompositeOperation = "destination-in"; g.drawImage(T, 0, 0); tintC[rgb] = cv; return cv;
  }
  // props: [sheet rect name, cave x, base y, scale, glow rgb or null, kind]
  var PROPS = [
    ["cl1", 560, 410, 0.28, "90,170,255", "cry"], ["spring1", 760, 410, 0.26, "90,200,255", "spring"], ["cl2", 1060, 410, 0.28, "200,140,255", "cry"],
    ["crystalBlue", 1420, 412, 0.22, "100,190,255", "cry"], ["cl3", 1700, 410, 0.28, "200,140,255", "cry"], ["crate2", 2000, 412, 0.28, null, ""], ["barrel", 2035, 412, 0.28, null, ""],
    ["cl4", 2420, 410, 0.28, "110,170,255", "cry"], ["spring2", 2750, 410, 0.24, "90,200,255", "spring"], ["crystalDark", 3010, 412, 0.2, "200,120,255", "cry"],
    ["crystalBlue", 3330, 404, 0.22, "100,190,255", "cry"], ["crystalDark", 3930, 404, 0.2, "200,120,255", "cry"]
  ];



  // ---------- extra cave atmosphere: light shafts, drifting fireflies/spores, ceiling shade, arena energy glow ----------
  var MOTES = null, SHAFTS = [];
  var MOTE_C = ["120,230,255", "200,150,255", "255,210,140", "150,255,220"];
  function atmos2(c, now, dt) {
    var s = c.s, i;
    function sx(x) { return c.x + x * s; } function sy(y) { return c.top + y * s; }
    if (!MOTES) { MOTES = []; for (i = 0; i < 150; i++) MOTES.push({ x: WALL_L + Math.random() * (ARENA_R - WALL_L - 40), y: 160 + Math.random() * 240, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.9, rgb: MOTE_C[i % 4], r: 1 + Math.random() * 1.6 }); }
    ctx.save();
    // ceiling shade: ambient occlusion band under the roof
    var x0 = Math.max(0, sx(WALL_L)), x1 = Math.min(W, sx(ARENA_R));
    if (x1 > x0) { var gr = ctx.createLinearGradient(0, sy(CEIL_T - 6), 0, sy(CEIL_T + 70)); gr.addColorStop(0, "rgba(6,4,18,0.55)"); gr.addColorStop(1, "rgba(6,4,18,0)"); ctx.fillStyle = gr; ctx.fillRect(x0, sy(CEIL_T - 6), x1 - x0, 76 * s); }
    // light shafts
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < SHAFTS.length; i++) {
      var X = sx(SHAFTS[i][0]); if (X < -140 || X > W + 140) continue;
      var a = 0.11 + 0.06 * Math.sin(now * 0.5 + SHAFTS[i][1]), ty = sy(CEIL_T - 4), by = sy(396), sl = 70 * s, sw = Math.sin(now * 0.25 + SHAFTS[i][1]) * 12 * s;
      var g = ctx.createLinearGradient(0, ty, 0, by); g.addColorStop(0, "rgba(170,205,255," + a * 1.6 + ")"); g.addColorStop(1, "rgba(120,150,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X - 10 * s, ty); ctx.lineTo(X + 18 * s, ty); ctx.lineTo(X + 18 * s + sl + 40 * s + sw, by); ctx.lineTo(X - 10 * s + sl - 20 * s + sw, by); ctx.closePath(); ctx.fill();
    }
    // fireflies / spores
    for (i = 0; i < MOTES.length; i++) {
      var m = MOTES[i]; m.x += Math.sin(now * 0.35 * m.sp + m.ph) * 9 * dt; m.y += Math.cos(now * 0.28 * m.sp + m.ph * 1.7) * 7 * dt - 1.5 * dt;
      if (m.y < 150) m.y = 396; if (m.x < WALL_L) m.x = ARENA_R - 40; if (m.x > ARENA_R) m.x = WALL_L + 5;
      var MX = sx(m.x); if (MX < -10 || MX > W + 10) continue;
      var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 1.6 * m.sp + m.ph * 3));
      glowAt(MX, sy(m.y), m.r * 5 * s, m.rgb, 0.8 * tw); glowAt(MX, sy(m.y), m.r * 1.6 * s, "255,255,255", 0.7 * tw);
    }
    // arena: breathing glow on the floor emblem + rising energy motes
    var AX = sx(ARENA_CX);
    if (AX > -300 && AX < W + 300) {
      var br = 0.5 + 0.5 * Math.sin(now * 1.2);
      ctx.save(); ctx.translate(AX, sy(ARENA_FLOOR - 3)); ctx.scale(1, 0.22); glowAt(0, 0, 200 * s * (0.92 + 0.1 * br), "150,110", 0.0); ctx.restore();
      ctx.save(); ctx.translate(AX, sy(ARENA_FLOOR - 3)); ctx.scale(1, 0.2); glowAt(0, 0, 230 * s * (0.92 + 0.1 * br), "170,120,255", 0.26 + 0.14 * br); glowAt(0, 0, 120 * s, "120,200,255", 0.2 + 0.1 * br); ctx.restore();
      if (Math.random() < dt * 8) GL.push({ w: 1, x: ARENA_CX + (Math.random() - 0.5) * 300, y: ARENA_FLOOR - 4, vx: (Math.random() - 0.5) * 8, vy: -(20 + Math.random() * 30), age: 0, life: 1.6 + Math.random(), r: 1.6 + Math.random() * 1.6, rgb: Math.random() < 0.5 ? "190,150,255" : "130,220,255", tw: 1 });
    }
    ctx.restore();
  }
  // ---------- shared crystal effect: layered halo, rotating soft rays, pulse, floor reflection ----------
  function crystalFx(X, Y, s, rgb, i, now, size) {
    var p = 0.5 + 0.5 * Math.sin(now * 1.25 + i * 1.9), q = 0.5 + 0.5 * Math.sin(now * 2.9 + i * 0.7), r0 = (size || 22) * s;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    glowAt(X, Y, r0 * 2.6, rgb, 0.07 + 0.07 * p);                    // wide diffuse halo
    glowAt(X, Y, r0 * 1.4, rgb, 0.14 + 0.14 * p);
    glowAt(X, Y, r0 * 0.55, "255,255,255", 0.10 + 0.22 * q * p);     // hot core that breathes
    var ang = now * 0.12 + i * 1.3, k, L = r0 * (1.5 + 0.5 * p);      // slow rotating soft rays
    ctx.lineCap = "round";
    for (k = 0; k < 4; k++) {
      var an = ang + k * 1.5708, ex = X + Math.cos(an) * L, ey = Y + Math.sin(an) * L * 0.8, gr = ctx.createLinearGradient(X, Y, ex, ey);
      gr.addColorStop(0, "rgba(" + rgb + ",0.22)"); gr.addColorStop(1, "rgba(" + rgb + ",0)");
      ctx.strokeStyle = gr; ctx.lineWidth = Math.max(1, 2.2 * s); ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(ex, ey); ctx.stroke();
    }
    ctx.restore();
  }
  // ---------- lamps, crystals, boss-room beam, ripples, pipe glow ----------
  var MOTH = null;
  function atmos3(c, now, dt) {
    var s = c.s, i, k, F = CAVE_FX, W2 = W;
    function sx(x) { return c.x + x * s; } function sy(y) { return c.top + y * s; }
    // crystals (baked into the art)
    for (i = 0; i < F.crystals.length; i++) {
      var p = F.crystals[i], CX = sx(p[0]); if (CX < -60 || CX > W2 + 60) continue;
      var rgb = p[2] ? "185,125,255" : "105,195,255", cyY = sy(p[1]) - 4 * s;
      crystalFx(CX, cyY, s, rgb, i, now, 20);
      if (p[1] > 330) {                                               // reflection on the floor
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(CX, sy(WATER_Y + 2)); ctx.scale(1, 0.18); glowAt(0, 0, 44 * s, rgb, 0.16 + 0.08 * Math.sin(now * 1.3 + i)); ctx.restore();
      }
    }
    // lamps: flickering halo, hot core, floor spill, drifting moths
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < F.lamps.length; i++) {
      var l = F.lamps[i], LX = sx(l[0]); if (LX < -120 || LX > W2 + 120) continue;
      var LY = sy(l[1]), f = 0.82 + 0.1 * Math.sin(now * 5.3 + i * 2.1) + 0.06 * Math.sin(now * 17 + i * 5) + (Math.sin(now * 1.7 + i * 9) > 0.96 ? -0.25 : 0);
      glowAt(LX, LY, 92 * s, l[2], 0.10 * f); glowAt(LX, LY, 40 * s, l[2], 0.22 * f); glowAt(LX, LY, 11 * s, "255,245,215", 0.45 * f);
      if (l[1] < 340) { ctx.save(); ctx.translate(LX, sy(WATER_Y)); ctx.scale(1, 0.16); glowAt(0, 0, 110 * s, l[2], 0.10 * f); ctx.restore(); }
      for (k = 0; k < 2; k++) {                                        // moths
        var ma = now * (1.1 + k * 0.5) + i * 3 + k * 2.4, mx = LX + Math.cos(ma) * (20 + k * 9) * s, my = LY + Math.sin(ma * 1.3) * (12 + k * 6) * s;
        glowAt(mx, my, 3.2 * s, "255,230,170", 0.55);
      }
    }
    ctx.restore();
    // boss room: diffuse crystal beam from the floor emblem up to the ceiling lamp, ripples on the floor, glowing rings
    var BX = sx(ARENA_CX);
    if (BX > -300 && BX < W2 + 300) {
      var pu = 0.5 + 0.5 * Math.sin(now * 1.1), by0 = sy(ARENA_FLOOR - 4), by1 = sy(150), bh = by0 - by1;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      var G = glow("140,205,255"), Gw = glow("230,245,255");
      ctx.globalAlpha = 0.30 + 0.12 * pu; ctx.drawImage(G, BX - 95 * s, by1 - 30 * s, 190 * s, bh + 60 * s);                // wide diffuse column
      ctx.globalAlpha = 0.38 + 0.15 * pu; ctx.drawImage(Gw, BX - 32 * s, by1, 64 * s, bh);                                   // bright core column
      ctx.globalAlpha = 1;
      glowAt(BX, by0, 90 * s * (0.9 + 0.1 * pu), "170,120,255", 0.5); glowAt(BX, by0, 40 * s, "255,255,255", 0.45); glowAt(BX, by1 + 6 * s, 50 * s, "150,210,255", 0.4);
      for (k = 0; k < 3; k++) {                                        // expanding ripples on the floor
        var rp = ((now * 0.3 + k / 3) % 1), rr = (40 + rp * 330) * s;
        ctx.save(); ctx.translate(BX, sy(ARENA_FLOOR + 6)); ctx.scale(1, 0.2); ctx.strokeStyle = "rgba(170,200,255," + (0.45 * (1 - rp)) + ")"; ctx.lineWidth = 4 * s * (1 - rp * 0.6); ctx.beginPath(); ctx.arc(0, 0, rr, 0, 6.283); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
      if (Math.random() < dt * 14) GL.push({ w: 1, x: ARENA_CX + (Math.random() - 0.5) * 26, y: ARENA_FLOOR - 6, vx: (Math.random() - 0.5) * 10, vy: -(40 + Math.random() * 60), age: 0, life: 1.6 + Math.random() * 1.2, r: 1.3 + Math.random() * 1.7, rgb: Math.random() < 0.5 ? "200,230,255" : "190,150,255", tw: 1 });
    }
    // pipe mouths: warm glow and a wisp of steam
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    var pm = [[90, PIPE_L_CY], [EXIT_X + 70, EXIT_CY]];
    for (i = 0; i < pm.length; i++) { var PX = sx(pm[i][0]); if (PX > -100 && PX < W2 + 100) glowAt(PX, sy(pm[i][1]), 46 * s, "255,190,100", 0.14 + 0.06 * Math.sin(now * 2 + i)); }
    ctx.restore();
  }
  var STAL = null;
  function stalInit() { STAL = [[800, "st1"], [1450, "st2"], [2050, "st3"], [2650, "st1"], [3150, "st3"], [1150, "st3"]].map(function (a) { return { x: a[0], n: a[1], st: "hang", t: 0, y: 0, vy: 0 }; }); }
  var PLATS = [["pl4", 1000, 285, 0.34], ["pl5", 1650, 280, 0.4], ["pl4", 2250, 288, 0.34], ["pl5", 2900, 282, 0.4]];
  var embers = [];
  function drawPropsAndAtmos(c, now, dt, layer) {
    var s = c.s, sh = img("level3_props"), i, p; if (!sh || !sh.naturalWidth) return;
    function sx(x) { return c.x + x * s; } function sy(y) { return c.top + y * s; }
    function put(name, x, y, k, flip, rot, alpha, midAnchor) {
      var q = PROP_R[name]; if (!q) return; var dw = q[2] * k * s, dh = q[3] * k * s;
      ctx.save(); ctx.translate(sx(x), sy(y)); if (rot) ctx.rotate(rot); if (alpha !== undefined) ctx.globalAlpha = alpha;
      ctx.drawImage(sh, q[0], q[1], q[2], q[3], -dw / 2, midAnchor ? 0 : -dh, dw, dh); ctx.restore();
    }
    // floor props
    for (i = 0; i < PROPS.length; i++) {
      p = PROPS[i]; var X = sx(p[1]); if (X < -80 || X > W + 80) continue;
      var q = PROP_R[p[0]], k = p[3], pulse = 0.5 + 0.5 * Math.sin(now * (p[5] === "lamp" ? 9 : 1.6) + i * 2.1);
      if (p[5] === "spring") { var comp = Math.pow(Math.max(0, Math.sin(now * 2.2 + i)), 8) * 0.12; ctx.save(); ctx.translate(X, sy(p[2])); ctx.scale(1 + comp * 0.5, 1 - comp); ctx.drawImage(sh, q[0], q[1], q[2], q[3], -q[2] * k * s / 2, -q[3] * k * s, q[2] * k * s, q[3] * k * s); ctx.restore(); }
      else put(p[0], p[1], p[2], k, 1);
      var cy = sy(p[2] - q[3] * k * 0.55);
      if (p[4]) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        var fl = p[5] === "lamp" ? 0.3 + 0.12 * pulse + 0.1 * Math.random() * (Math.random() < 0.15 ? 1 : 0) : p[5] === "furn" ? 0.28 + 0.1 * pulse : 0.2 + 0.14 * pulse;
        if (p[5] === "cry") { ctx.restore(); crystalFx(X, cy, s, p[4], i, clockT, q[3] * k * 0.5); ctx.save(); ctx.globalCompositeOperation = "lighter"; } else glowAt(X, cy, 44 * s * (0.95 + 0.08 * pulse), p[4], fl); ctx.restore();
        if (p[5] === "cry" && Math.random() < dt * 2.4) GL.push({ w: 1, x: p[1] + (Math.random() - 0.5) * q[2] * k * 0.8, y: p[2] - Math.random() * q[3] * k, vx: 0, vy: -3, age: 0, life: 0.9 + Math.random() * 0.8, r: 1.6 + Math.random() * 1.6, rgb: p[4], tw: 1 });
      }
      if (p[5] === "furn" && Math.random() < dt * 5) embers.push({ w: 1, x: p[1] + (Math.random() - 0.5) * 14, y: p[2] - q[3] * k * 0.95, vx: (Math.random() - 0.5) * 8, vy: -(14 + Math.random() * 22), age: 0, life: 1 + Math.random() * 1.2, r: 1.2 + Math.random(), rgb: "255,160,60" });
      if (p[5] === "steam" && Math.random() < dt * 2.2) fx.sp.push({ k: "steam", x: X + 6 * s, y: sy(p[2] - q[3] * k * 0.9), vx: rnd2(-6, 6) * U(), vy: -rnd2(24, 40) * U(), r: rnd2(4, 6) * U(), gr: rnd2(8, 13) * U(), age: 0, life: rnd2(1.2, 1.9), a: rnd2(0.25, 0.4) });
    }
    // swaying scaffold hook
    var hxx = 1850, sw = Math.sin(now * 1.3) * 0.07; if (sx(hxx) > -60 && sx(hxx) < W + 60) put("hook", hxx, 134, 0.34, 1, sw, undefined, true);
    // floating rock platforms (obstacles) – bob up and down
    for (i = 0; i < PLATS.length; i++) {
      p = PLATS[i]; var by = p[2] + Math.sin(now * 1.1 + i * 2) * 6, pq = PROP_R[p[0]], PX = sx(p[1]); if (PX < -120 || PX > W + 120) continue;
      put(p[0], p[1], by + pq[3] * p[3] * 0.35, p[3], 1);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; glowAt(PX, sy(by + pq[3] * p[3] * 0.6), 34 * s, "170,120,255", 0.18 + 0.08 * Math.sin(now * 2 + i)); ctx.restore();
      if (canHurtNow()) {
        var hw = pq[2] * p[3] * s * 0.5, topY = sy(by - pq[3] * p[3] * 0.1), botY = sy(by + pq[3] * p[3] * 0.8);
        if (Math.abs(player.x - PX) < hw * 0.9 + (player.w || 80) * 0.3 && player.y + (player.h || 50) * 0.28 > topY && player.y - (player.h || 50) * 0.28 < botY) { try { takeHit(); } catch (e) {} }
      }
    }
    // stalactites that shake and drop when the blimp passes
    if (!STAL) stalInit();
    for (i = 0; i < STAL.length; i++) {
      var S = STAL[i], SX = sx(S.x), sq = PROP_R[S.n], ks = 0.3, topC = 132; if (SX < -60 || SX > W + 60) continue;
      var dxs = Math.abs(player.x - SX);
      if (S.st === "hang") { if (dxs < 90 * s && player.y < sy(300) && state === "playing" && Math.random() < dt * 1.2) { S.st = "shake"; S.t = 0; } put(S.n, S.x, topC, ks, 1, 0, 1, true); }
      else if (S.st === "shake") { S.t += dt; var jx = (Math.random() - 0.5) * 2.2 * s; ctx.save(); ctx.translate(jx, 0); put(S.n, S.x, topC, ks, 1, 0, 1, true); ctx.restore();
        if (Math.random() < dt * 18) GL.push({ w: 1, x: S.x + (Math.random() - 0.5) * 10, y: topC + 4, vx: 0, vy: 20, age: 0, life: 0.5, r: 1.2, rgb: "150,200,255" });
        if (S.t > 0.8) { S.st = "fall"; S.vy = 0; S.y = 0; } }
      else if (S.st === "fall") {
        S.vy += 900 * s * dt; S.y += S.vy * dt; var fy = sy(topC) + S.y, hh = sq[3] * ks * s;
        put(S.n, S.x, topC + S.y / s, ks, 1, 0, 1, true);
        if (canHurtNow() && Math.abs(player.x - SX) < sq[2] * ks * s * 0.35 + (player.w || 80) * 0.3 && fy + hh > player.y - (player.h || 50) * 0.3 && fy < player.y + (player.h || 50) * 0.3) { try { takeHit(); } catch (e) {} S.y = 1e6; }
        if (fy + hh >= sy(WATER_Y) || S.y > 1e5) { for (var g2 = 0; g2 < 14; g2++) GL.push({ w: 1, x: S.x + (Math.random() - 0.5) * 12, y: WATER_Y - 4, vx: (Math.random() - 0.5) * 60, vy: -(30 + Math.random() * 60), age: 0, life: 0.7 + Math.random() * 0.5, r: 1.6 + Math.random() * 1.6, rgb: Math.random() < 0.5 ? "130,215,255" : "200,150,255", g: 200 }); S.st = "gone"; S.t = 0; }
      } else { S.t += dt; if (S.t > 9) { S.st = "hang"; S.t = 0; } }
    }
    // crystal glow + glitter around the baked crystals
    var F = CAVE_FX;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < F.crystals.length; i++) {
      p = F.crystals[i]; var CX = sx(p[0]); if (CX < -40 || CX > W + 40) continue;
      var pl = 0.5 + 0.5 * Math.sin(now * 1.4 + i * 1.7);
      if (Math.random() < dt * 1.6) GL.push({ w: 1, x: p[0] + (Math.random() - 0.5) * 22, y: p[1] - Math.random() * 22, vx: 0, vy: -2, age: 0, life: 0.9 + Math.random() * 1.1, r: 1.5 + Math.random() * 2, rgb: p[2] ? "220,180,255" : "170,230,255", tw: 1 });
    }
    // glitter + embers
    var arr = [GL, embers], ai, j;
    for (ai = 0; ai < 2; ai++) {
      var A = arr[ai];
      for (j = A.length - 1; j >= 0; j--) {
        var e = A[j]; e.age += dt; if (e.age > e.life) { A.splice(j, 1); continue; }
        if (e.g) e.vy += e.g * dt; e.x += e.vx * dt * (e.w ? 1 / s : 1); e.y += e.vy * dt * (e.w ? 1 / s : 1);
        var X2 = e.w ? sx(e.x) : e.x, Y2 = e.w ? sy(e.y) : e.y, f = e.age / e.life, tw = e.tw ? (0.5 + 0.5 * Math.sin(e.age * 14 + e.r * 9)) : 1;
        var a = Math.sin(Math.min(1, f) * 3.14159) * tw;
        if (e.tw) star(X2, Y2, e.r * s * 0.9, a * 0.9, e.rgb); else { glowAt(X2, Y2, e.r * s * 3, e.rgb, a * 0.8); }
      }
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawCave() {
    if (!cave) return;
    var c = cave, im = img("level3_cave"); if (!im) return;
    if (c.x > W + 40 || c.x + c.w < -40) return;
    ctx.save();                                           // dark rock behind the dome: never any sky outside the roof
    ctx.beginPath(); ctx.rect(c.x, c.top - c.h * 0.9, c.w, c.h * 2.8); ctx.clip();
    ctx.drawImage(im, c.x, c.top - c.h * 0.9, c.w, c.h * 2.8);
    ctx.fillStyle = "rgba(6,3,16,0.72)"; ctx.fillRect(c.x, c.top - c.h * 0.9, c.w, c.h * 2.8);
    ctx.restore();
    ctx.drawImage(im, c.x, c.top, c.w, c.h);
    var now = clockT, dt = fx.last ? Math.min(0.05, Math.max(0, now - fx.last)) : 0.016;
    drawPropsAndAtmos(c, now, dt);
    try { atmos2(c, now, dt); atmos3(c, now, dt); } catch (e2) {}
    drawBats(c, now, dt);
    drawFog(c, now);
    fogBand(c, now, 0); fogBand(c, now, 1);
    drawWater(c, now, dt);
    caveFx(c);
  }
  window.__airborneL3DrawFront = function () {      // after the blimp: electric shock arcs when an orb or the ring hits it
    if (on && cave && cave.x < W && cave.x + cave.w > 0) { try { fogBand(cave, clockT, 2); } catch (e) {} }
    if (!on || !arena || pshock <= 0) return;
    var sf = cave ? cave.s / ARENA_SZ : 1, k = Math.min(1, pshock / 1.1), hw = (player.w || 80) * 0.55, hh = (player.h || 50) * 0.6;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    glowAt(player.x, player.y, hw * 1.5, "120,190,255", 0.35 * k + 0.1 * Math.random());
    for (var i = 0; i < 6; i++) {
      var a = Math.random() * 6.283, a2 = a + (Math.random() - 0.5) * 1.4;
      bolt(player.x + Math.cos(a) * hw * 0.3, player.y + Math.sin(a) * hh * 0.3, player.x + Math.cos(a2) * hw * (0.9 + Math.random() * 0.5), player.y + Math.sin(a2) * hh * (0.9 + Math.random() * 0.7), 12 * sf, 5, 0.9 * k + 0.2, 2.4);
    }
    ctx.restore();
  };
  // ================= Boss arena: zoom-out, no scrolling, free flight, electric octopus =================
  var ARENA_SZ = 0.9;                                   // reference cave scale (boss / projectile sizes are relative to it)
  function arenaRect() {
    var c = cave, s = c.s;
    return { l: c.x + ARENA_L * s, r: c.x + ARENA_R * s, floor: c.top + ARENA_FLOOR * s, cx: c.x + ARENA_CX * s,
             ceilAt: function (x) { return c.top + arenaCeil((x - c.x) / s) * s; } };
  }
  function startArena() {
    var c = cave, z = ARENA_Z, Xc = c.x + ARENA_CX * c.s;
    var xr = c.x + CAVE_W * c.s;
    arena = { st: "intro", t: 0, z: z, ax: (W - z * xr) / (1 - z), ay: H, dlg: false, vx: 0, vy: 0 };
    structs = []; orbs = []; afx = [];
    window.__airborneL3Arena = true;
  }
  function arenaUpdate(dt, frozen) {
    if (frozen) return;
    arena.t += dt; if (pshock > 0) pshock -= dt;
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
    var R = arenaRect(), hw = (player.w || 80) * 0.36, hh = (player.h || 50) * 0.36, sf = cave.s / ARENA_SZ, k = inp.k;
    // the normal game flight: gravity + tap-to-flap (flap() is called by the usual input handlers)
    player.vy += GRAVITY * dt; if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
    player.y += player.vy * dt;
    // the camera is fixed: ease the blimp to its station on the left of the room (arrow keys / A-D nudge it for dodging)
    var kx = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0);
    arena.home = (arena.home === undefined ? R.l + (R.r - R.l) * 0.39 : arena.home) + kx * 170 * sf * dt;
    arena.home = Math.max(R.l + hw + 8, Math.min(R.l + (R.r - R.l) * 0.5, arena.home));
    player.x += (arena.home - player.x) * Math.min(1, dt * 4); arena.vx = 0;
    var top = R.ceilAt(player.x) + hh + 6 * sf, bot = R.floor - hh;
    if (player.y < top) { player.y = top; if (player.vy < 0) player.vy = 0; }
    if (player.y > bot) { player.y = bot; if (player.vy > 0) player.vy = 0; }
    arena.vy = player.vy;
    var tr = Math.max(-0.4, Math.min(0.5, player.vy / 650)); player.rotation += (tr - player.rotation) * Math.min(1, dt * 8);
    return true;
  };

  // ----- the boss: mechanical octopus, flies around the right half of the arena, crackling with electricity -----
  var OCT = { fw: 320, fh: 216, cols: 6, n: 36, fps: 19 };
  window.__airborneL3BossReady = function () { return ok("level3_octo"); };
  window.__airborneL3BossInit = function (b) {
    if (!arena || !cave || !ok("level3_octo")) return;
    var R = arenaRect(), sf = cave.s / ARENA_SZ;
    b.kind = "l3octo"; b.w = 290 * 0.75 * sf; b.h = b.w * OCT.fh / OCT.fw;
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
        orbs.push({ x: o0.x, y: o0.y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, r: 24 * sf, hp: 2, t: Math.random(), rot: 0 });
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
        if (pd < RR + (player.w || 80) * 0.18) { L.shHit = true; pshock = 1.1; try { takeHit(); } catch (e) {} }
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
      if (!dead && Math.hypot(player.x - o.x, player.y - o.y) < o.r * 0.85 + hw * 0.6) { dead = true; pshock = 1.1; try { takeHit(); } catch (e) {} }
      if (o.x < R.l - 120 || o.x > R.r + 160 || o.y < R.ceilAt(o.x) - 160 || o.y > R.floor + 80) dead = true;
      if (dead) { burst(o.x, o.y, 14, "170,225,255", 190); try { if (typeof sfxExplosion === "function") sfxExplosion(0.15); } catch (e) {} orbs.splice(i, 1); }
    }
  }
  function drawOrbs() {
    var sf = cave ? cave.s / ARENA_SZ : 1;
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i], r = o.r;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; glowAt(o.x, o.y, r * 2.8, "110,180,255", 0.5 + 0.2 * Math.sin(o.t * 14)); ctx.restore();
      ctx.save(); ctx.translate(o.x, o.y);
      var g = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r);                 // plasma ball
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.28, "rgba(150,215,255,0.98)"); g.addColorStop(0.7, "rgba(40,95,210,0.96)"); g.addColorStop(1, "rgba(14,28,90,0.97)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
      ctx.rotate(o.rot);                                                          // steel spikes + rim
      ctx.fillStyle = "#8a97a8"; ctx.strokeStyle = "#1a2030"; ctx.lineWidth = Math.max(0.8, r * 0.07);
      for (var k = 0; k < 4; k++) { ctx.save(); ctx.rotate(k * 1.5708 + 0.4); ctx.beginPath(); ctx.moveTo(r * 0.82, -r * 0.2); ctx.lineTo(r * 1.5, 0); ctx.lineTo(r * 0.82, r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.strokeStyle = "rgba(170,185,205,0.95)"; ctx.lineWidth = Math.max(1, r * 0.13); ctx.beginPath(); ctx.arc(0, 0, r * 0.96, 0, 6.283); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (var q = 0; q < 5; q++) { var a = q / 5 * 6.283 + o.rot * 0.6 + Math.random() * 0.4; bolt(o.x, o.y, o.x + Math.cos(a) * r * 0.9, o.y + Math.sin(a) * r * 0.9, r * 0.35, 4, 0.95, 1.5); }
      if (Math.random() < 0.6) { var a2 = Math.random() * 6.283; bolt(o.x + Math.cos(a2) * r, o.y + Math.sin(a2) * r, o.x + Math.cos(a2) * r * 2.1, o.y + Math.sin(a2) * r * 2.1, 6 * sf, 4, 0.8, 1.4); }
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

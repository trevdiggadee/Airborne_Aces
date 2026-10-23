// =====================================================================
// LEVEL 2 INDUSTRIAL SKYLINE  (build ruff522)
// ---------------------------------------------------------------------
// Replaces ONLY the colliding building strip in Level 2 with structures cut from the
// steampunk pack (level2_structures.webp):
//   * buildings, factories, towers and scaffold pylons at very different heights, so the
//     pilot has to climb up and down instead of skimming one flat roofline
//   * brass steam stacks that hiss, warn, then blast a damaging jet
//     (up from rooftops / canyon floors, sideways from tall walls)
//   * coins and crystals placed ON the course (roof arcs, climb trails, canyon dips)
//     instead of floating randomly — 1 crystal for every 10 coins
// Parallax layers behind the buildings (sky, skyline, telephone poles, street, lamps) are
// untouched. If the atlas image is missing the game falls back to the old strip.
// Hooks: world-buildings.js (initBuildings / drawBuildings / checkBuildingCollision),
//        main-loop.js (update), world-atmosphere.js (no back clouds in level 2),
//        ruff-tutorial.js (__airborneAddCollectible).
// =====================================================================
(function () {
  "use strict";

  var ATLAS = {"truss3": [0, 0, 36, 227], "truss2": [38, 0, 59, 221], "truss1": [99, 0, 40, 213], "clock_mansion": [141, 0, 120, 193], "mega_factory": [263, 0, 237, 183], "factory3": [502, 0, 147, 171], "fac_tower": [651, 0, 217, 157], "apartment": [870, 0, 81, 150], "steam_co": [0, 229, 157, 128], "gable_house": [159, 229, 72, 120], "silo_a": [233, 229, 40, 116], "long_hall": [275, 229, 158, 114], "green_dome": [435, 229, 76, 110], "stack_a": [513, 229, 14, 110], "tall_tower": [529, 229, 41, 107], "silo_b": [572, 229, 34, 104], "arch_complex": [608, 229, 223, 102], "chimney_dome": [833, 229, 90, 102], "mansard": [925, 229, 95, 101], "gothic": [0, 359, 53, 101], "warehouse": [55, 359, 157, 100], "arch_hall": [214, 359, 120, 100], "clock_small": [336, 359, 48, 99], "stack_c": [386, 359, 14, 95], "awning_house": [402, 359, 64, 91], "stack_b": [468, 359, 28, 86], "barn_arch": [498, 359, 104, 85], "tower_house": [604, 359, 61, 80], "small_house": [667, 359, 65, 80], "long_low": [734, 359, 97, 78], "small_green": [833, 359, 67, 63]};

  var CLASSES = {
    tall: ["mega_factory", "fac_tower", "factory3", "clock_mansion", "steam_co", "apartment", "truss1", "truss2", "truss3"],
    mid:  ["long_hall", "tower_house", "gable_house", "green_dome", "tall_tower", "chimney_dome", "mansard", "gothic",
           "warehouse", "arch_hall", "arch_complex", "clock_small"],
    low:  ["awning_house", "barn_arch", "small_house", "long_low", "small_green"]
  };
  var STACKS = ["stack_a", "stack_b", "stack_c"];

  // ---- steam vent cycle (seconds) ----
  var T_IDLE = 1.9, T_WARN = 1.0, T_BLAST = 1.1, T_COOL = 0.5;
  var T_CYCLE = T_IDLE + T_WARN + T_BLAST + T_COOL;

  var atlasImg = null, atlasReady = false, atlasFailed = false;
  var tops = {};              // per sprite: Int16Array of first-solid-row for every pixel column
  var on = false;             // layer currently replacing the strip
  var structs = [];           // placed structures
  var vents = [];             // steam vents
  var canyonRefs = [];        // ground proxies for canyon coins / vents
  var spawnX = 0;             // x where the next structure starts
  var spawnCount = 0;
  var recentTall = 0;
  var coinsPlaced = 0, crystalsPlaced = 0;
  var clockT = 0;
  var lastClass = "low";
  var sinceCanyon = 0;
  var pendingCrystal = false;

  function now() { return (typeof performance !== "undefined") ? performance.now() : Date.now(); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function U() { return (typeof H === "number" ? H : 800) / 800; }
  function gY() { return (typeof groundLevelY === "function") ? groundLevelY() : H * 0.91; }

  // ------------------------------------------------------------------
  // Atlas loading + silhouette profiles
  // ------------------------------------------------------------------
  function loadAtlas() {
    if (atlasImg) return;
    atlasImg = new Image();
    atlasImg.onload = function () {
      try {
        var c = document.createElement("canvas");
        c.width = atlasImg.naturalWidth; c.height = atlasImg.naturalHeight;
        var g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(atlasImg, 0, 0);
        Object.keys(ATLAS).forEach(function (k) {
          var r = ATLAS[k];
          var d = g.getImageData(r[0], r[1], r[2], r[3]).data;
          var t = new Int16Array(r[2]);
          for (var x = 0; x < r[2]; x++) {
            t[x] = r[3];
            for (var y = 0; y < r[3]; y++) {
              if (d[(y * r[2] + x) * 4 + 3] > 70) { t[x] = y; break; }
            }
          }
          tops[k] = t;
        });
        atlasReady = true;
      } catch (e) {
        atlasFailed = true;   // tainted canvas etc → keep the classic strip
        console.warn("[L2] atlas profile failed, using classic buildings", e);
      }
    };
    atlasImg.onerror = function () { atlasFailed = true; console.warn("[L2] level2_structures.webp missing — using classic buildings"); };
    atlasImg.src = "level2_structures.webp?v=ruff522";
  }
  loadAtlas();

  // ------------------------------------------------------------------
  // When is the Level 2 skyline wanted?
  // ------------------------------------------------------------------
  function holdingLevel1() {
    return (typeof bonusActive !== "undefined" && bonusActive) ||
           (typeof bonusPending !== "undefined" && bonusPending) ||
           (typeof levelEndActive !== "undefined" && levelEndActive) ||
           (typeof worldWindDown !== "undefined" && worldWindDown);
  }
  function trainingNow() {
    return !!(window.__airborneAirfield || window.__airborneTrainingFlight || window.__airborneRuffActive ||
              (typeof airfieldMode !== "undefined" && airfieldMode));
  }
  function wanted() {
    if (trainingNow()) return false;
    if (typeof bossesDefeatedCount !== "number") return false;
    if (bossesDefeatedCount === 2 && on) return true;        // boss 2 fight tail: bonus round + landing
    if (bossesDefeatedCount !== 1) return false;
    return !holdingLevel1();
  }
  // used by world-atmosphere: no back clouds anywhere in Level 2
  window.__airborneL2CloudsOff = function () { return wanted() || on; };
  window.__airborneL2On = function () { return on; };

  // ------------------------------------------------------------------
  // Placement
  // ------------------------------------------------------------------
  function scaleFor(name) {
    var r = ATLAS[name];
    var u = U();
    var s = 2.3 * u;
    var maxW = (typeof W === "number" ? W : 412) * 0.72;
    if (r[2] * s > maxW) s = maxW / r[2];
    var maxH = (gY() - H * 0.30);                  // always leave sky above the tallest roof
    if (r[3] * s > maxH) s = maxH / r[3];
    return s;
  }

  function makeStruct(name, x) {
    var r = ATLAS[name], s = scaleFor(name);
    var w = r[2] * s, h = r[3] * s;
    return { name: name, x: x, y: gY() - h, w: w, h: h, s: s, hasVent: false };
  }

  function topAt(st, worldX) {          // screen y of the solid top at world x (1e9 = open air)
    var t = tops[st.name]; if (!t) return st.y;
    var f = (worldX - st.x) / st.w;
    if (f < 0 || f >= 1) return 1e9;
    var col = Math.min(t.length - 1, Math.floor(f * t.length));
    return t[col] >= ATLAS[st.name][3] ? 1e9 : st.y + t[col] * st.s;
  }

  function addCoinRef(ref, ox, oy) {
    if (typeof window.__airborneAddCollectible !== "function") return;
    window.__airborneAddCollectible("coin", ref, ox, oy); coinsPlaced++;
  }
  function addCrystalRef(ref, ox, oy) {
    if (typeof window.__airborneAddCollectible !== "function") return;
    window.__airborneAddCollectible("crystal", ref, ox, oy); crystalsPlaced++;
  }
  function crystalDue() { return Math.floor(coinsPlaced / 10) > crystalsPlaced; }

  function addVent(host, kind, ox, oy, len) {
    vents.push({
      host: host, kind: kind, ox: ox, oy: oy, len: len,
      t: rnd(0, T_CYCLE * 0.6), seed: Math.random() * 100
    });
  }

  function placeStructure(cls, x, allowVent) {
    var name = pick(CLASSES[cls]);
    var st = makeStruct(name, x);
    structs.push(st);
    var u = U(), g = gY();
    var roofY = st.y;

    // ---- rooftop steam stack (low / mid roofs only so the sky above stays open) ----
    if (allowVent && cls !== "tall" && st.h < H * 0.32 && Math.random() < 0.7) {
      var sk = pick(STACKS), sr = ATLAS[sk];
      var ss = Math.min(1.5 * u, (roofY - H * 0.27) / sr[3]);
      if (ss > 0.7 * u) {
        var fx = rnd(0.3, 0.7), sx = st.x + st.w * fx;
        var base = topAt(st, sx); if (base > 1e8) base = roofY;
        var sw = sr[2] * ss, sh = sr[3] * ss;
        var stackSt = { name: sk, x: sx - sw / 2, y: base - sh + 3 * u, w: sw, h: sh, s: ss, isStack: true, host: st, hostOx: sx - sw / 2 - st.x, hostBase: base - st.y };
        structs.push(stackSt);
        var len = Math.max(H * 0.10, Math.min(H * 0.20, stackSt.y - H * 0.22));
        addVent(stackSt, "up", sw / 2, 0, len);
        st.hasVent = true;
      }
    }
    // ---- sideways jet from tall walls (aimed back at the approaching blimp) ----
    if (allowVent && cls === "tall" && !st.hasVent && Math.random() < 0.65 && st.name.indexOf("truss") !== 0) {
      var wy = st.y + st.h * rnd(0.45, 0.7);
      addVent(st, "left", 0, wy - st.y, Math.min(W * 0.34, 150 * u));
      st.hasVent = true;
    }
    return st;
  }

  function placeCanyon(x, width) {
    // an open gap with a steam stack in the middle; ground proxy lets coins/crystals ride the scroll
    var ref = { x: x, y: gY(), w: width, canyon: true };
    canyonRefs.push(ref);
    var sk = pick(STACKS), sr = ATLAS[sk];
    var ss = 1.9 * U();
    var sw = sr[2] * ss, sh = sr[3] * ss;
    var stackSt = { name: sk, x: x + width / 2 - sw / 2, y: gY() - sh + 3 * U(), w: sw, h: sh, s: ss, isStack: true, canyon: ref, canyonOx: width / 2 - sw / 2 };
    structs.push(stackSt);
    var len = Math.max(H * 0.12, Math.min(H * 0.22, stackSt.y - H * 0.2));
    addVent(stackSt, "up", sw / 2, 0, len);
    return { ref: ref, stack: stackSt };
  }

  function decorate(prev, st, canyon) {
    var u = U();
    // roof arc (coins hug the roofline, wide spacing; skipped on roofs too tall to hover over)
    if (st && !st.isStack && st.y > H * 0.30 && Math.random() < 0.34) {
      var n = 4, gapPx = 62 * u, span = Math.min(st.w * 0.9, gapPx * (n - 1));
      var ox0 = (st.w - span) / 2;
      var crystalAt = crystalDue() ? 1 + Math.floor(Math.random() * 2) : -1;
      for (var i = 0; i < n; i++) {
        var f = i / (n - 1);
        var cx = st.x + ox0 + span * f;
        var rt = topAt(st, cx); if (rt > 1e8) rt = st.y + st.h * 0.2;
        var up = 0.085 * H + Math.sin(f * Math.PI) * 0.035 * H;
        var cy = Math.max(H * 0.17, rt - up);
        if (i === crystalAt) addCrystalRef(st, ox0 + span * f, cy - st.y);
        else addCoinRef(st, ox0 + span * f, cy - st.y);
      }
    }
    // climb trail: guide the pilot up the step to a taller neighbour
    if (prev && st && !prev.isStack && !st.isStack && st.y < prev.y - H * 0.08 && Math.random() < 0.5) {
      var x0 = prev.x + prev.w * 0.55, y0 = prev.y - 0.07 * H;
      var x1 = st.x - 14 * u, y1 = Math.max(H * 0.16, st.y - 0.09 * H);
      for (var j = 0; j < 3; j++) {
        var ff = j / 2;
        addCoinRef(prev, (x0 - prev.x) + (x1 - x0) * ff, (y0 + (y1 - y0) * ff) - prev.y);
      }
    }
    // descent trail into a canyon (coins beside the vent column, never inside it)
    if (canyon) {
      var ref = canyon.ref;
      var side = Math.random() < 0.5 ? 0.14 : 0.86;
      for (var k = 0; k < 3; k++) {
        addCoinRef(ref, ref.w * (side + (side < 0.5 ? 1 : -1) * k * 0.05), -(0.16 - k * 0.04) * H);
      }
      if (crystalDue()) {          // risky spot: low in the canyon, right beside the vent
        addCrystalRef(ref, ref.w * (side < 0.5 ? 0.30 : 0.70), -0.065 * H);
      }
    }
    // crystal on the very top of a tall structure (reward for climbing)
    if (st && !st.isStack && st.h > H * 0.36 && crystalDue() && Math.random() < 0.6) {
      addCrystalRef(st, st.w * 0.5, -0.07 * H);
    }
  }

  function nextClass() {
    var c;
    if (lastClass === "tall") c = Math.random() < 0.6 ? "mid" : "low";
    else if (lastClass === "low") c = Math.random() < 0.5 ? "mid" : "tall";
    else c = Math.random() < 0.40 ? "tall" : (Math.random() < 0.5 ? "low" : "mid");
    if (c === "tall" && recentTall >= 2) c = "mid";
    return c;
  }

  function spawnOne(first) {
    var u = U();
    var prev = null;
    for (var i = structs.length - 1; i >= 0; i--) { if (!structs[i].isStack) { prev = structs[i]; break; } }
    // occasional open canyon with a steam stack
    if (!first && sinceCanyon >= 3 && Math.random() < 0.55) {
      sinceCanyon = 0;
      var cw = rnd(190, 260) * u;
      var cn = placeCanyon(spawnX, cw);
      decorate(prev, null, cn);
      spawnX += cw;
      return;
    }
    var cls = first ? "low" : nextClass();
    lastClass = cls;
    recentTall = (cls === "tall") ? recentTall + 1 : 0;
    sinceCanyon++;
    var gap = Math.random() < 0.4 ? 0 : rnd(6, 34) * u;
    var st = placeStructure(cls, spawnX + gap, !first && spawnCount > 2);
    decorate(prev, st, null);
    spawnX = st.x + st.w;
    spawnCount++;
  }

  function reset() {
    structs = []; vents = []; canyonRefs = [];
    spawnCount = 0; recentTall = 0; coinsPlaced = 0; crystalsPlaced = 0; lastClass = "low"; sinceCanyon = 0;
    spawnX = (typeof W === "number" ? W : 412) * 0.85;
    try { if (typeof window.__airborneResetCampaignCollectibles === "function") window.__airborneResetCampaignCollectibles(); } catch (e) {}
    for (var i = 0; i < 40 && spawnX < W * 2.2; i++) spawnOne(i < 2);
  }

  function start() {
    on = true;
    reset();
  }
  function stop() {
    on = false; structs = []; vents = []; canyonRefs = [];
  }

  // called from initBuildings() — the world is being rebuilt (level start / level change)
  window.__airborneL2Sync = function () {
    var shouldBe = wanted() && atlasReady && !atlasFailed;
    // count 2 + latched is handled inside wanted(); a fresh rebuild re-evaluates strictly
    if (typeof bossesDefeatedCount === "number" && bossesDefeatedCount !== 1) { if (on) stop(); return; }
    if (shouldBe) start(); else if (on) stop();
  };

  // ------------------------------------------------------------------
  // Update
  // ------------------------------------------------------------------
  function ventPhase(v) {
    var t = v.t % T_CYCLE;
    if (t < T_IDLE) return { p: "idle", k: 0.28, f: t / T_IDLE };
    t -= T_IDLE;
    if (t < T_WARN) return { p: "warn", k: 0.55 + 0.25 * (t / T_WARN), f: t / T_WARN };
    t -= T_WARN;
    if (t < T_BLAST) return { p: "blast", k: 1, f: t / T_BLAST };
    t -= T_BLAST;
    return { p: "cool", k: 0.5 * (1 - t / T_COOL), f: t / T_COOL };
  }

  function ventPos(v) {
    var h = v.host;
    var x = h.x + v.ox, y = h.y + v.oy;
    return { x: x, y: y };
  }

  function playerBox() {
    var hw = (player.w || 80) * 0.30, hh = (player.h || 50) * 0.30;
    return { x0: player.x - hw, x1: player.x + hw, y0: player.y - hh, y1: player.y + hh };
  }

  window.__airborneL2Update = function (dt) {
    if (!(dt > 0) || dt > 0.1) dt = 0.016;
    clockT += dt;
    // late activation (atlas finished loading after level start) / deactivation
    if (!on) {
      if (atlasReady && !atlasFailed && wanted() && (typeof state === "undefined" || state === "playing")) start();
      return;
    }
    if (trainingNow()) { stop(); return; }
    var frozen = (typeof worldScrollFrozen === "function") && worldScrollFrozen();
    var scale = (typeof obstacleSpeedScale === "function") ? obstacleSpeedScale() : 1;
    var ending = (typeof levelEndActive !== "undefined" && levelEndActive);
    var sp = frozen ? 0 : 48 * scale * dt * (ending ? 8 : 1);   // same ground speed as the street

    structs.forEach(function (s) {
      if (s.isStack) return;
      s.x -= sp;
    });
    // stacks ride their host
    structs.forEach(function (s) {
      if (!s.isStack) return;
      if (s.host) { s.x = s.host.x + s.hostOx; s.y = s.host.y + s.hostBase - s.h + 3 * U(); }
      else if (s.canyon) { s.canyon.x -= 0; s.x = s.canyon.x + s.canyonOx; }
    });
    canyonRefs.forEach(function (r) { r.x -= sp; });
    spawnX -= sp;
    // cull
    structs = structs.filter(function (s) { return s.x + s.w > -260; });
    canyonRefs = canyonRefs.filter(function (r) { return r.x + r.w > -260; });
    vents = vents.filter(function (v) { return structs.indexOf(v.host) >= 0; });

    // endless supply (but stop during the landing sequence)
    if (!ending) {
      var guard = 0;
      while (spawnX < W + 420 && guard++ < 8) spawnOne(false);
    }

    // steam timing + damage
    var canHurt = (typeof state !== "undefined" && state === "playing") && !window.__airbornePlatformTakeoffActive &&
      !(typeof bonusActive !== "undefined" && bonusActive) && !ending && typeof takeHit === "function";
    var pb = canHurt ? playerBox() : null;
    vents.forEach(function (v) {
      if (!frozen) v.t += dt;
      var pos = ventPos(v);
      v.sx = pos.x; v.sy = pos.y;
      if (!pb || pos.x < -80 || pos.x > W + 80) return;
      var ph = ventPhase(v);
      if (ph.p !== "blast") return;
      var zw = 15 * U() * (0.8 + 0.5 * ph.f);
      var x0, x1, y0, y1;
      if (v.kind === "up") { x0 = pos.x - zw; x1 = pos.x + zw; y0 = pos.y - v.len; y1 = pos.y; }
      else { x0 = pos.x - v.len; x1 = pos.x; y0 = pos.y - zw; y1 = pos.y + zw; }
      if (pb.x1 > x0 && pb.x0 < x1 && pb.y1 > y0 && pb.y0 < y1) {
        try { takeHit(); } catch (e) {}
      }
    });
  };

  // ------------------------------------------------------------------
  // Collision with the solid structures (silhouette based, like the old strip)
  // ------------------------------------------------------------------
  window.__airborneL2Collide = function () {
    if (!on) return false;
    if (typeof bonusActive !== "undefined" && bonusActive) return false;
    if (typeof levelEndActive !== "undefined" && levelEndActive) return false;
    if (window.__airbornePlatformTakeoffActive) return false;
    var hw = (player.w || 80) * 0.5 * 0.7;
    var px1 = player.x - hw, px2 = player.x + hw;
    var pBottom = player.y + (player.h || 50) * 0.5 * 0.7;
    for (var i = 0; i < structs.length; i++) {
      var s = structs[i];
      if (px2 <= s.x || px1 >= s.x + s.w) continue;
      var best = 1e9;
      for (var k = 0; k <= 4; k++) {
        var sx = px1 + (px2 - px1) * (k / 4);
        var t = topAt(s, sx);
        if (t < best) best = t;
      }
      if (pBottom > best) { try { takeHit(); } catch (e) {} return true; }
    }
    return false;
  };

  // ------------------------------------------------------------------
  // Drawing
  // ------------------------------------------------------------------
  function drawSteam(v) {
    var ph = ventPhase(v);
    var x = v.sx, y = v.sy;
    if (x === undefined || x < -120 || x > W + 120) return;
    var u = U();
    var t = clockT;
    var N = ph.p === "blast" ? 22 : (ph.p === "warn" ? 12 : (ph.p === "cool" ? 8 : 5));
    var len = v.len * (ph.p === "blast" ? (0.55 + 0.45 * Math.min(1, ph.f * 3)) : (ph.p === "warn" ? 0.28 : 0.2));
    ctx.save();
    // pressure glow on the nozzle while warning
    if (ph.p === "warn") {
      var pulse = 0.5 + 0.5 * Math.sin(t * 24);
      ctx.globalAlpha = 0.35 + 0.4 * pulse * ph.f;
      ctx.fillStyle = "#ff8a3c";
      ctx.beginPath(); ctx.arc(x, y, 7 * u + 3 * pulse * u, 0, Math.PI * 2); ctx.fill();
    }
    // faint hazard column during the blast so the danger zone reads clearly
    if (ph.p === "blast") {
      var zw = 15 * u * (0.8 + 0.5 * ph.f);
      var g = (v.kind === "up") ? ctx.createLinearGradient(0, y, 0, y - v.len) : ctx.createLinearGradient(x, 0, x - v.len, 0);
      g.addColorStop(0, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = g;
      if (v.kind === "up") ctx.fillRect(x - zw, y - v.len, zw * 2, v.len);
      else ctx.fillRect(x - v.len, y - zw, v.len, zw * 2);
    }
    for (var i = 0; i < N; i++) {
      var sp = (ph.p === "blast") ? 1.8 : 0.7;
      var u1 = ((t * sp + i / N + v.seed) % 1);
      var dist = u1 * len;
      var wob = Math.sin(i * 7.3 + t * 3 + v.seed) * (3 + 10 * u1) * u;
      var r = (4 + 16 * u1) * u * (ph.p === "blast" ? 1.25 : 0.9);
      var a = ph.k * (1 - u1) * (ph.p === "blast" ? 0.7 : 0.5);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = (i % 3 === 0) ? "#f4f6f7" : "#dfe5e8";
      ctx.beginPath();
      if (v.kind === "up") ctx.arc(x + wob, y - dist, r, 0, Math.PI * 2);
      else ctx.arc(x - dist, y + wob, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWallNozzle(v) {
    var x = v.sx, y = v.sy, u = U();
    if (x === undefined || x < -60 || x > W + 60) return;
    ctx.save();
    ctx.fillStyle = "#7a5a2e"; ctx.fillRect(x - 16 * u, y - 5 * u, 16 * u, 10 * u);
    ctx.fillStyle = "#c9a45c"; ctx.fillRect(x - 20 * u, y - 8 * u, 5 * u, 16 * u);
    ctx.fillStyle = "#3a2a14"; ctx.fillRect(x - 21 * u, y - 4 * u, 2 * u, 8 * u);
    ctx.restore();
  }

  window.__airborneL2Draw = function () {
    if (!on || !atlasReady) return;
    ctx.save();
    ctx.globalAlpha = 1;
    // buildings first, stacks over them
    var order = structs.slice().sort(function (a, b) { return (a.isStack ? 1 : 0) - (b.isStack ? 1 : 0); });
    for (var i = 0; i < order.length; i++) {
      var s = order[i];
      if (s.x > W + 10 || s.x + s.w < -10) continue;
      var r = ATLAS[s.name];
      ctx.drawImage(atlasImg, r[0], r[1], r[2], r[3], s.x, s.y, s.w, s.h);
    }
    vents.forEach(function (v) { if (v.kind === "left") drawWallNozzle(v); });
    vents.forEach(drawSteam);
    ctx.restore();
  };

  window.__airborneL2Test = { vents: function () { return vents; }, structs: function () { return structs; }, T_IDLE: T_IDLE, T_WARN: T_WARN };
  window.__airborneL2Debug = function () {
    return { on: on, structs: structs.length, vents: vents.length, coins: coinsPlaced, crystals: crystalsPlaced, atlasReady: atlasReady, atlasFailed: atlasFailed };
  };
})();

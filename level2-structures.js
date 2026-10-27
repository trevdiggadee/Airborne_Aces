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

  var ATLAS = {"truss3": [0, 0, 36, 227], "truss2": [38, 0, 59, 221], "truss1": [99, 0, 41, 213], "clock_mansion": [142, 0, 127, 193], "mega_factory": [271, 0, 197, 183], "factory3": [470, 0, 113, 171], "fac_tower": [585, 0, 169, 157], "apartment": [756, 0, 70, 150], "steam_co": [828, 0, 168, 128], "gable_house": [0, 229, 70, 120], "silo_a": [72, 229, 41, 116], "long_hall": [115, 229, 164, 114], "green_dome": [281, 229, 70, 110], "stack_a": [353, 229, 12, 110], "tall_tower": [367, 229, 40, 107], "silo_b": [409, 229, 36, 104], "arch_complex": [447, 229, 202, 102], "chimney_dome": [651, 229, 70, 102], "mansard": [723, 229, 78, 101], "gothic": [803, 229, 56, 101], "warehouse": [0, 351, 171, 100], "arch_hall": [173, 351, 126, 100], "clock_small": [301, 351, 48, 99], "stack_c": [351, 351, 11, 95], "awning_house": [364, 351, 65, 91], "stack_b": [431, 351, 6, 86], "barn_arch": [439, 351, 118, 85], "tower_house": [559, 351, 64, 80], "small_house": [625, 351, 62, 80], "long_low": [689, 351, 92, 78], "small_green": [783, 351, 64, 63]};

  // rooftop industrial props (pipes, tanks, water tower, crane) from level2_props.webp — rects in 1x units
  var PROPS = {"p_plant": [0, 0, 138, 169], "p_tank_b": [142, 0, 50, 159], "p_valve_tank": [196, 0, 39, 145], "p_pipe_red": [239, 0, 25, 145], "p_tank_a": [268, 0, 61, 136], "p_water_tower": [333, 0, 59, 128], "p_valve_post": [396, 0, 24, 81], "p_tank_h": [424, 0, 124, 78], "p_crane": [552, 0, 97, 78], "p_gauge_post": [653, 0, 19, 77], "p_boiler": [676, 0, 41, 70], "p_hut": [721, 0, 43, 63]};
  // second prop sheet (steam pipes / industrial systems / lattice towers) — rects in 1x units, image is 2x
  var PROPS2 = {"p2_tank_dome": [0, 0, 61, 138], "p2_valve_tank": [63, 0, 40, 152], "p2_red_valve": [105, 0, 27, 149], "p2_tank_big": [134, 0, 52, 165], "p2_plant2": [188, 0, 136, 169], "p2_tank_h2": [326, 0, 123, 80], "p2_gauge": [451, 0, 20, 79], "p2_wheel_post": [473, 0, 27, 83], "p2_boiler2": [0, 171, 42, 73], "p2_drum_a": [44, 171, 26, 38], "p2_drum_b": [72, 171, 31, 49], "p2_truss_a": [105, 171, 43, 215], "p2_truss_b": [150, 171, 62, 223], "p2_truss_c": [214, 171, 38, 230], "p2_gantry": [254, 171, 94, 67], "p2_box": [166, 403, 45, 55], "p2_hut2": [213, 403, 44, 44]};
  var PROP_KEYS = Object.keys(PROPS).concat(Object.keys(PROPS2));
  var propsImg = null, propsReady = false, PS = 2;
  var props2Img = null, props2Ready = false, PS2 = 2;
  function propRect(k) { return PROPS[k] || PROPS2[k]; }

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

  var AS = 1;                 // atlas pixel multiple; ATLAS rects stay in 1x units
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
        AS = Math.max(1, Math.round(atlasImg.naturalWidth / 1024));   // atlas resolution multiple (1 = original, 4 = 4x upscaled)
        var g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(atlasImg, 0, 0);
        Object.keys(ATLAS).forEach(function (k) {
          var r = ATLAS[k];
          var d = g.getImageData(r[0] * AS, r[1] * AS, r[2] * AS, r[3] * AS).data;
          var rowPx = r[2] * AS, half = Math.floor(AS / 2);
          var t = new Int16Array(r[2]);
          for (var x = 0; x < r[2]; x++) {
            t[x] = r[3];
            for (var y = 0; y < r[3]; y++) {
              if (d[((y * AS + half) * rowPx + x * AS + half) * 4 + 3] > 70) { t[x] = y; break; }
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
    atlasImg.src = "level2_structures.webp?v=ruff528";
  }
  loadAtlas();
  (function loadProps() {
    propsImg = new Image();
    propsImg.onload = function () {
      try {
        PS = Math.max(1, Math.round(propsImg.naturalWidth / 1024));
        var c = document.createElement("canvas");
        c.width = propsImg.naturalWidth; c.height = propsImg.naturalHeight;
        var g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(propsImg, 0, 0);
        Object.keys(PROPS).forEach(function (k) {
          var r = PROPS[k];
          var d = g.getImageData(r[0] * PS, r[1] * PS, r[2] * PS, r[3] * PS).data;
          var rowPx = r[2] * PS, half = Math.floor(PS / 2);
          var t = new Int16Array(r[2]);
          for (var x = 0; x < r[2]; x++) {
            t[x] = r[3];
            for (var y = 0; y < r[3]; y++) {
              if (d[((y * PS + half) * rowPx + x * PS + half) * 4 + 3] > 70) { t[x] = y; break; }
            }
          }
          tops[k] = t;
        });
        propsReady = true;
      } catch (e) { propsReady = false; }
    };
    propsImg.onerror = function () { propsReady = false; };
    propsImg.src = "level2_props.webp?v=ruff547";
    props2Img = new Image();
    props2Img.onload = function () {
      try {
        PS2 = Math.max(1, Math.round(props2Img.naturalWidth / 512));
        var c2 = document.createElement("canvas");
        c2.width = props2Img.naturalWidth; c2.height = props2Img.naturalHeight;
        var g2 = c2.getContext("2d", { willReadFrequently: true });
        g2.drawImage(props2Img, 0, 0);
        Object.keys(PROPS2).forEach(function (k) {
          var r = PROPS2[k];
          var d = g2.getImageData(r[0] * PS2, r[1] * PS2, r[2] * PS2, r[3] * PS2).data;
          var rowPx = r[2] * PS2, half = Math.floor(PS2 / 2);
          var t = new Int16Array(r[2]);
          for (var x = 0; x < r[2]; x++) {
            t[x] = r[3];
            for (var y = 0; y < r[3]; y++) {
              if (d[((y * PS2 + half) * rowPx + x * PS2 + half) * 4 + 3] > 70) { t[x] = y; break; }
            }
          }
          tops[k] = t;
        });
        props2Ready = true;
      } catch (e) { props2Ready = false; }
    };
    props2Img.onerror = function () { props2Ready = false; };
    props2Img.src = "level2_props2.webp?v=ruff548";
  })();
  function rectOf(name) { return ATLAS[name] || PROPS[name] || PROPS2[name]; }

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
    return t[col] >= rectOf(st.name)[3] ? 1e9 : st.y + t[col] * st.s;
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
    // ---- rooftop industrial prop (tank / water tower / pipework / crane) — solid, rides the roof ----
    for (var pn = 0; pn < (st.w > 120 * u ? 2 : 1); pn++)
    if (propsReady && !st.isStack && st.w > 56 * u && st.h < H * 0.34 && Math.random() < (pn ? 0.4 : 0.7)) {
      var pk = pick(props2Ready ? PROP_KEYS : Object.keys(PROPS)), pr = propRect(pk);
      var targetH = H * rnd(0.085, 0.15);
      if (pk.indexOf("p2_truss") === 0) targetH = H * rnd(0.15, 0.22);
      else if (pk === "p2_gantry" || pk === "p2_tank_h2") targetH = H * rnd(0.07, 0.10);
      var ps = Math.min(targetH / pr[3], (st.w * 0.7) / pr[2]);
      ps = Math.min(ps, (roofY - H * 0.27) / pr[3]);
      if (ps > 0.45 * u) {
        var pw = pr[2] * ps, ph2 = pr[3] * ps, tries = 0, okx = null;
        while (tries++ < 10 && okx === null) {
          var cxf = rnd(0.18, 0.82), cxx = st.x + st.w * cxf;
          var clash = false;
          structs.forEach(function (o) { if (o.isStack && o.host === st && Math.abs((o.x + o.w / 2) - cxx) < (o.w + pw) / 2 + 8 * u) clash = true; });
          if (!clash && cxx - pw / 2 > st.x + 2 && cxx + pw / 2 < st.x + st.w - 2) {
            var tmin = 1e9, tmax = -1e9;     // only sit on a flat stretch of roof (no perching on domes / gables)
            for (var qq = 0; qq <= 6; qq++) { var tv = topAt(st, cxx - pw / 2 + pw * qq / 6); if (tv > 1e8) { tmax = 1e9; break; } if (tv < tmin) tmin = tv; if (tv > tmax) tmax = tv; }
            if (tmax - tmin <= 4 * u) okx = cxx;
          }
        }
        if (okx !== null) {
          var pbase = 1e9;
          for (var q = 0; q <= 6; q++) { var tq = topAt(st, okx - pw / 2 + pw * q / 6); if (tq < pbase) pbase = tq; }
          if (pbase > 1e8) pbase = roofY;
          structs.push({ name: pk, isProp: true, x: okx - pw / 2, y: pbase - ph2 + 3 * u, w: pw, h: ph2, s: ps, isStack: true, host: st, hostOx: okx - pw / 2 - st.x, hostBase: pbase - st.y });
        }
      }
    }
    // (no sideways jets — steam only blasts straight up from stacks)
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
    var sp = frozen ? 0 : 48 * scale * dt;   // same ground speed as the street (also during the landing approach)

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

    updateAtmo(dt, sp);

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

  // ------------------------------------------------------------------
  // Level 2 atmosphere: smoggy ground haze, drifting soot-smoke wisps (behind the buildings)
  // and glowing furnace embers floating past (in front of them)
  // ------------------------------------------------------------------
  var wisps = [], smokes = [], smokeT = {}, cloudsFar = [], cloudsMid = [];
  var CLOUDS = {"c0": [10, 18, 374, 188], "c1": [369, 66, 393, 130], "c2": [31, 223, 281, 121], "c3": [349, 231, 401, 112], "c4": [17, 367, 428, 123], "c5": [472, 371, 278, 124]};
  var CLOUD_KEYS = Object.keys(CLOUDS);
  var cloudImg = null, cloudReady = false;
  (function () {
    cloudImg = new Image();
    cloudImg.onload = function () { cloudReady = true; };
    cloudImg.onerror = function () { cloudReady = false; };
    cloudImg.src = "level2_clouds2.webp?v=ruff547";
  })();
  // chimney tops on level2_city_layer.webp (x, y in the 2172x724 image)
  var CITY_CHIMNEYS = [[85,145],[140,153],[320,321],[629,117],[1002,246],[1359,332],[1435,229],[1465,226],[1746,227],[1992,281],[2050,294]];

  function newCloud(layer, anywhere) {
    var w = (typeof W === "number" ? W : 412), h = (typeof H === "number" ? H : 800), u = U();
    var k = pick(CLOUD_KEYS), r = CLOUDS[k];
    var far = layer === "far";
    var dw = (far ? rnd(150, 240) : rnd(190, 320)) * u;
    return { k: k, w: dw, h: dw * r[3] / r[2],
             x: anywhere ? rnd(-dw, w) : w + rnd(10, 160),
             y: far ? rnd(h * 0.12, h * 0.40) : rnd(h * 0.20, h * 0.52),
             a: far ? rnd(0.55, 0.75) : rnd(0.7, 0.9), v: far ? rnd(0.10, 0.18) : rnd(0.30, 0.5) };
  }
  function seedAtmo() {
    var w = (typeof W === "number" ? W : 412), h = (typeof H === "number" ? H : 800), u = U();
    wisps = []; smokes = []; smokeT = {}; cloudsFar = []; cloudsMid = [];
    for (var i = 0; i < 10; i++) wisps.push({ x: rnd(0, w * 1.4), y: rnd(h * 0.40, h * 0.82), r: rnd(80, 170) * u, a: rnd(0.14, 0.26), v: rnd(5, 14), ph: rnd(0, 6.3) });
    for (var f = 0; f < 5; f++) cloudsFar.push(newCloud("far", true));
    for (var m = 0; m < 4; m++) cloudsMid.push(newCloud("mid", true));
  }
  function updateAtmo(dt, sp) {
    if (!wisps.length) seedAtmo();
    var w = (typeof W === "number" ? W : 412), h = (typeof H === "number" ? H : 800), u = U();
    var scale = (typeof obstacleSpeedScale === "function") ? obstacleSpeedScale() : 1;
    var move = sp > 0 ? scale : 0;                 // world speed factor (0 while frozen)
    wisps.forEach(function (s) {
      s.x -= (s.v * (0.4 + 0.6 * move)) * dt; s.ph += dt * 0.4;
      if (s.x < -s.r * 1.6) { s.x = w + s.r * 1.6; s.y = rnd(h * 0.40, h * 0.82); }
    });
    [[cloudsFar, "far"], [cloudsMid, "mid"]].forEach(function (pr) {
      var arr = pr[0];
      arr.forEach(function (c, i) {
        c.x -= 48 * move * c.v * dt + 3 * dt;
        if (c.x + c.w < -10) arr[i] = newCloud(pr[1], false);
      });
    });
    // smoke from the city's chimneys (emitters ride the scrolling city layer)
    var info = (typeof window.__airborneL2CityInfo === "function") ? window.__airborneL2CityInfo() : null;
    if (info && info.tiles.length) {
      var k = info.tileW / 2172;
      for (var ti = 0; ti < info.tiles.length; ti++) {
        for (var ci = 0; ci < CITY_CHIMNEYS.length; ci++) {
          var ex = info.tiles[ti] + CITY_CHIMNEYS[ci][0] * k, ey = info.y + CITY_CHIMNEYS[ci][1] * k;
          if (ex < -30 || ex > w + 30) continue;
          var key = ti + "_" + ci + "_" + Math.round(info.tiles[ti] - ex + 99999);
          var id = ci + "_" + Math.floor((ex - info.tiles[ti] * 0) * 0) ;
          smokeT[ci + "|" + ti] = (smokeT[ci + "|" + ti] || rnd(0, 0.5)) - dt;
          if (smokeT[ci + "|" + ti] <= 0) {
            smokeT[ci + "|" + ti] = rnd(0.28, 0.5);
            smokes.push({ x: ex + rnd(-2, 2) * u, y: ey, r: rnd(3, 5) * u, g: rnd(0.9, 1.5) * u, age: 0, life: rnd(4.5, 7), a: rnd(0.45, 0.7), d: rnd(0, 1) });
          }
        }
      }
    }
    for (var si = smokes.length - 1; si >= 0; si--) {
      var p = smokes[si];
      p.age += dt;
      if (p.age >= p.life) { smokes.splice(si, 1); continue; }
      p.x -= (15 * move + 10 + p.age * 3) * dt;     // city scroll + wind that strengthens with height
      p.y -= (16 + 10 * p.d) * u * dt;
      p.r += p.g * 4.5 * dt;
    }
    if (smokes.length > 400) smokes.splice(0, smokes.length - 400);
  }
  function drawCloudArr(arr) {
    if (!cloudReady) return;
    arr.forEach(function (c) {
      var r = CLOUDS[c.k];
      ctx.globalAlpha = c.a;
      try { ctx.drawImage(cloudImg, r[0], r[1], r[2], r[3], c.x, c.y, c.w, c.h); } catch (e) {}
    });
    ctx.globalAlpha = 1;
  }
  // far clouds sit behind the city strip (called from world-atmosphere's city layer)
  window.__airborneL2CloudsFar = function () {
    if (!cloudsFar.length) return;
    ctx.save(); drawCloudArr(cloudsFar); ctx.restore();
  };
  function drawAtmoBack() {
    if (!wisps.length) return;
    var w = (typeof W === "number" ? W : 412), h = (typeof H === "number" ? H : 800), gy = gY();
    var cx = window.__airborneCamExt || { l: 0, r: 0, t: 0 };   // boss zoom-out: cover the whole pulled-back view
    var ex0 = -cx.l - 4, ew = w + cx.l + cx.r + 8;
    ctx.save();
    // sooty smog tint high in the sky
    var top = ctx.createLinearGradient(0, -cx.t, 0, h * 0.5);
    top.addColorStop(0, "rgba(58,44,40,0.30)"); top.addColorStop(1, "rgba(58,44,40,0)");
    ctx.fillStyle = top; ctx.fillRect(ex0, -cx.t, ew, h * 0.5 + cx.t);
    // mid-air smog band
    var band = ctx.createLinearGradient(0, h * 0.28, 0, gy - h * 0.1);
    band.addColorStop(0, "rgba(150,118,92,0)"); band.addColorStop(0.5, "rgba(150,118,92,0.20)"); band.addColorStop(1, "rgba(150,118,92,0)");
    ctx.fillStyle = band; ctx.fillRect(ex0, h * 0.28, ew, gy - h * 0.38);
    // dark cloud layer drifting in front of the city
    drawCloudArr(cloudsMid);
    // chimney smoke plumes
    for (var i = 0; i < smokes.length; i++) {
      var p = smokes[i], t = p.age / p.life;
      var a = p.a * Math.min(1, p.age * 2) * (1 - t) * (1 - t * 0.3);
      var gcol = 52 + Math.floor(40 * t);
      var rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      rg.addColorStop(0, "rgba(" + gcol + "," + (gcol - 4) + "," + (gcol - 8) + "," + a + ")");
      rg.addColorStop(1, "rgba(" + gcol + "," + (gcol - 4) + "," + (gcol - 8) + ",0)");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    // drifting soot wisps
    wisps.forEach(function (s) {
      var a = s.a * (0.75 + 0.25 * Math.sin(s.ph));
      var rg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
      rg.addColorStop(0, "rgba(110,92,80," + a + ")"); rg.addColorStop(1, "rgba(110,92,80,0)");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 1.5, s.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    });
    // warm smog bank hugging the ground
    var g = ctx.createLinearGradient(0, gy - h * 0.5, 0, gy);
    g.addColorStop(0, "rgba(206,150,92,0)"); g.addColorStop(1, "rgba(206,150,92,0.42)");
    ctx.fillStyle = g; ctx.fillRect(ex0, gy - h * 0.5, ew, h * 0.5);
    ctx.restore();
  }

  window.__airborneL2Draw = function () {
    if (!on || !atlasReady) return;
    ctx.save();
    ctx.globalAlpha = 1;
    drawAtmoBack();
    // buildings first, stacks over them
    var order = structs.slice().sort(function (a, b) { return (a.isStack ? 1 : 0) - (b.isStack ? 1 : 0); });
    for (var i = 0; i < order.length; i++) {
      var s = order[i];
      var cxx = window.__airborneCamExt || { l: 0, r: 0 };
      if (s.x > W + cxx.r + 10 || s.x + s.w < -cxx.l - 10) continue;
      if (s.isProp) {
        if (!propsReady) continue;
        if (PROPS2[s.name]) {
          if (!props2Ready) continue;
          var pr2 = PROPS2[s.name];
          ctx.drawImage(props2Img, pr2[0] * PS2, pr2[1] * PS2, pr2[2] * PS2, pr2[3] * PS2, s.x, s.y, s.w, s.h);
          continue;
        }
        var pr = PROPS[s.name];
        ctx.drawImage(propsImg, pr[0] * PS, pr[1] * PS, pr[2] * PS, pr[3] * PS, s.x, s.y, s.w, s.h);
        continue;
      }
      var r = ATLAS[s.name];
      ctx.drawImage(atlasImg, r[0] * AS, r[1] * AS, r[2] * AS, r[3] * AS, s.x, s.y, s.w, s.h);
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

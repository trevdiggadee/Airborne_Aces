"use strict";

  // ---------- Buildings — now continuous panoramic street-row strips (one
  // per level, cycling through until more level-specific art is provided),
  // scrolling in sync with the rest of the ground plane. Replaces the old
  // discrete per-building-sprite system. ----------
  const BUILDING_ROW_KEYS = ['streetrow1', 'streetrow2'];

  // Height profiles — measured directly from each image's alpha channel (60
  // samples across the width, each giving the fraction of the way down from
  // the top where solid content actually starts). Used so collision follows
  // the real building silhouette instead of a flat rectangle across the
  // whole strip — otherwise the player takes damage over open sky above a
  // short building just because it's within the same tile as a tall one.
  const STREETROW1_PROFILE = [0.302, 0.302, 0.302, 0.302, 0.24, 0.252, 0.406, 0.348, 0.348, 0.346, 0.365, 0.61, 0.61, 0.61, 0.431, 0.177, 0.15, 0.177, 0.177, 0.177, 0.542, 0.35, 0.35, 0.342, 0.342, 0.35, 0.431, 0.431, 0.431, 0.45, 0.142, 0.012, 0.104, 0.535, 0.448, 0.392, 0.404, 0.419, 0.621, 0.621, 0.625, 0.662, 0.683, 0.302, 0.233, 0.206, 0.202, 0.208, 0.223, 0.198, 0.219, 0.229, 0.433, 0.446, 0.456, 0.46, 0.492, 0.488, 0.452, 0.44];
  // Regenerated for the new level2_buildings_strip.png artwork (62 stitched
  // industrial buildings) — the old profile was measured against the
  // previous streetrow2.webp art and no longer matches this silhouette.
  // Sample columns that land in a transparent gap between buildings read as
  // 1.0 (solid starts at the very bottom), so open sky above a gap never
  // falsely triggers a hit.
  const STREETROW2_PROFILE = [0.802, 0.365, 0.497, 0.234, 0.581, 0.575, 0.593, 0.659, 0.323, 0.503, 0.018, 0.281, 0.551, 0.317, 0.695, 0.653, 0.425, 0.683, 0.491, 0.377, 0.581, 0.683, 0.647, 0.503, 1.0, 0.629, 0.467, 0.581, 1.0, 0.216, 0.647, 0.611, 0.713, 0.311, 0.581, 0.611, 0.653, 0.455, 0.623, 0.707, 0.701, 0.677, 0.587, 1.0, 0.683, 0.509, 0.557, 0.407, 0.772, 0.192, 0.689, 0.551, 0.587, 0.719, 0.665, 0.629, 0.341, 0.599, 0.281, 0.587];
  const BUILDING_ROW_PROFILES = { streetrow1: STREETROW1_PROFILE, streetrow2: STREETROW2_PROFILE };

  function buildingProfileTopFrac(b, sampleX) {
    const profile = BUILDING_ROW_PROFILES[buildingRowKey];
    if (!profile) return 0;
    const localFrac = Math.max(0, Math.min(0.9999, (sampleX - b.x) / b.w));
    const idx = Math.floor(localFrac * profile.length);
    return profile[idx];
  }
  let buildings = []; // tiles of the current strip: { x, w, h }
  let buildingRowKey = null;
  // When true, ground layers (buildings, street, lamps, powerlines) scroll off
  // and do NOT respawn — used for the level-1 landing sequence.
  let worldWindDown = false;
  let worldWindDownSpeedMult = 1.6;

  // True only after the blimp has landed — approach still scrolls the world
  function worldScrollFrozen() {
    if (window.__airborneWorldFrozen) return true;
    if (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked) return true;
    if (typeof levelEndPhase === "string" &&
        (levelEndPhase === "victory" || levelEndPhase === "stats" || levelEndPhase === "fadeOut")) {
      return true;
    }
    return false;
  }

  function currentBuildingRowKey() {
    // Keep level-1 buildings through boss-1 defeat, bonus round, and landing.
    if (bossesDefeatedCount === 1) {
      const holdL1 =
        (typeof bonusActive !== "undefined" && bonusActive) ||
        (typeof bonusPending !== "undefined" && bonusPending) ||
        (typeof levelEndActive !== "undefined" && levelEndActive) ||
        worldWindDown;
      if (holdL1) return BUILDING_ROW_KEYS[0];
    }
    let key = BUILDING_ROW_KEYS[bossesDefeatedCount % BUILDING_ROW_KEYS.length];
    // Fall back to level-1 strip if level-2 art is missing
    const img = (typeof images !== "undefined") ? images[key] : null;
    if (!img || !img.naturalWidth) key = BUILDING_ROW_KEYS[0];
    return key;
  }

  function makeBuildingRowTile(xStart, key) {
    const img = images[key];
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 3.2;
    const h = H * 0.396; // was 0.33, +20%
    const w = h * aspect;
    return { x: xStart, w, h };
  }

  function initBuildings() {
    buildingRowKey = currentBuildingRowKey();
    buildings = [];
    let x = 0;
    while (x < W + 200) {
      const b = makeBuildingRowTile(x, buildingRowKey);
      buildings.push(b);
      x += b.w; // edge-to-edge — pre-blended to tile seamlessly
    }
    initStreetlamps();
    initPowerlines();
    initSketchSkyline();
    initStreetTiles();
  }

  function updateBuildings(dtScale) {
    if (airfieldMode) return;
    // Keep scrolling during approach; freeze only once the blimp has landed
    if (worldScrollFrozen()) {
      return;
    }
    const targetKey = currentBuildingRowKey();
    if (targetKey !== buildingRowKey) {
      // Don't swap strips during bonus / pre-landing; wait for wind-down or resume
      if ((typeof bonusActive !== "undefined" && bonusActive) ||
          (typeof bonusPending !== "undefined" && bonusPending) ||
          (typeof levelEndActive !== "undefined" && levelEndActive)) {
        // keep scrolling current strip
      } else {
        initBuildings(); // level changed — rebuild with that level's strip
        return;
      }
    }
    const speed = 0.8 * dtScale * (obstacleSpeedScale());
    buildings.forEach(b => (b.x -= speed));
    while (buildings.length && buildings[0].x + buildings[0].w < -10) {
      buildings.shift();
    }
    const last = buildings[buildings.length - 1];
    if (!last || last.x + last.w < W + 200) {
      const startX = last ? last.x + last.w : 0;
      buildings.push(makeBuildingRowTile(startX, buildingRowKey));
    }
  }

  function groundLayersCleared() {
    // City freezes in place now; ready as soon as freeze/wind-down is active
    return worldWindDown;
  }

  function startWorldWindDown(speedMult) {
    worldWindDown = true;
    worldWindDownSpeedMult = speedMult || 1.8;
  }

  function stopWorldWindDown() {
    worldWindDown = false;
    worldWindDownSpeedMult = 1.6;
  }

  function obstacleSpeedScale() {
    // keep the ground scroll speed in step with the flying-obstacle speed ramp
    // Guard against NaN/0 so retry never leaves the world crawling
    const base = (typeof obstacleSpeed === "number" && isFinite(obstacleSpeed) && obstacleSpeed > 0)
      ? obstacleSpeed
      : 220;
    return base / 220;
  }

  // shared ground line — raised up from the very bottom edge so there's room
  // for a proper street/sidewalk band beneath the buildings instead of just
  // a flat color strip
  function groundLevelY() {
    return H - Math.max(58, H * 0.088);
  }

  // ---------- Pre–Level-1 Airfield training strip ----------
  let airfieldMode = false;
  let airfieldPhase = null; // taxi | accel | climb | lesson | done
  let airfieldTiles = [];
  let airfieldTip = "";
  let airfieldTipAge = 0;
  let airfieldPhaseT = 0;
  let airfieldTakeoffSpeed = 0;
  let airfieldLesson = 0;
  let airfieldLessonT = 0;
  let airfieldSub = "tip";
  let airfieldLandT = 0;
  let airfieldScoreT = 0;
  let airfieldStartScore = 0;
  let airfieldClimbStartY = 0;
  let airfieldRunwayT = 0;
  let airfieldAltFrac = 0;
  let airfieldStripY = 0;
  let airfieldStripGone = false;
  let airfieldUseLandingArt = false;

  function isAirfieldMode() { return !!airfieldMode; }
  function syncAirfieldGlobals() {
    window.__airborneAirfield = !!airfieldMode;
    window.__airborneAirfieldPhase = airfieldPhase;
    window.__airborneAirfieldPaused = !!window.__airborneAirfieldPaused;
  }

  window.__airborneAirfieldBoost = function () {
    if (!airfieldMode) return;
    if (airfieldPhase !== "taxi" && airfieldPhase !== "accel") return;
    airfieldTakeoffSpeed = Math.min(215, (airfieldTakeoffSpeed || 28) + 28);
    window.__airborneAirfieldHold = true;
  };

  function initAirfieldStrip() {
    airfieldTiles = [];
    airfieldStripY = 0;
    airfieldStripGone = false;
    airfieldUseLandingArt = false;
    const img = (typeof images !== "undefined" && images) ? images.airfield_strip : null;
    const aspect = (img && img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : 5;
    // Size: fit bottom band, then +3%
    let hh = Math.max(50, Math.min(H * 0.38, H * 0.46));
    hh = hh * 1.07; // +~4% larger
    let ww = Math.max(120, hh * aspect);
    // Single image, no loop — start slightly left so runway is under blimp
    const startX = (W || 300) * 0.05 - ww * 0.08;
    airfieldTiles.push({ x: startX, w: ww, h: hh, startX: startX });
  }

  function ensureAirfieldStripVisible() {
    // Landing field art — approaches from the right like a normal level pad
    airfieldUseLandingArt = true;
    airfieldStripGone = false;
    airfieldStripY = 0;
    const img = (typeof images !== "undefined" && images)
      ? (images.landing_field || images.airfield_strip)
      : null;
    const aspect = (img && img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : 4.5;
    let h = Math.max(55, Math.min(H * 0.4, H * 0.48)) * 1.07;
    let w = Math.max(140, h * aspect);
    // Start off-screen right so it scrolls in for approach
    const startX = W * 0.55;
    airfieldTiles = [{ x: startX, w: w, h: h, startX: startX }];
  }

  function beginAirfieldTraining() {
    airfieldMode = true;
    airfieldPhase = "taxi";
    airfieldPhaseT = 0;
    airfieldRunwayT = 0;
    airfieldClimbStartY = 0;
    airfieldAltFrac = 0;
    airfieldTakeoffSpeed = 50;
    airfieldStripGone = false;
    airfieldUseLandingArt = false;
    airfieldStripY = 0;
    airfieldLesson = 0;
    airfieldLessonT = 0;
    airfieldSub = "practice";
    window.__airborneAirfieldHold = false;
    window.__airborneAirfieldBoostPending = false;
    window.__airborneScriptedPose = null;
    if (typeof levelEndPad !== "undefined") levelEndPad = null;
    if (typeof levelEndActive !== "undefined") levelEndActive = false;

    airfieldTip = "HOLD to accelerate!";
    airfieldTipAge = 0;
    airfieldLandT = 0;
    airfieldScoreT = 0;
    window.__airborneAirfieldInvuln = true;
    window.__airborneAirfieldPaused = false;
    window.__airborneAirfieldBlockBoss = true;
    syncAirfieldGlobals();
    initAirfieldStrip();
    buildings = [];
    if (typeof sketchSkylineTiles !== "undefined") sketchSkylineTiles = [];
    if (typeof powerlineTiles !== "undefined") powerlineTiles = [];
    if (typeof streetTiles !== "undefined") streetTiles = [];
    if (typeof initClouds === "function") initClouds();
    if (typeof applyPlayerBlimpSize === "function") applyPlayerBlimpSize();
    if (typeof player !== "undefined" && player) {
      const gy = groundLevelY();
      const ph = player.h > 0 ? player.h : 40;
      player.x = W * 0.25;
      player.y = gy - ph * 0.15;
      player.vy = 0;
      player.rotation = 0;
    }
    if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 50;
    if (typeof spawnInterval !== "undefined") spawnInterval = 999;
    if (typeof obstacles !== "undefined") obstacles = [];
    if (typeof powerup !== "undefined") powerup = null;
    if (typeof bombs !== "undefined") bombs = [];
    if (typeof rockets !== "undefined") rockets = [];
    const sm = document.getElementById("stormMeter");
    if (sm) sm.style.visibility = "hidden";
    if (typeof sfxAirfieldEngineStart === "function") sfxAirfieldEngineStart();
    if (typeof sfxAirfieldWindStart === "function") sfxAirfieldWindStart();
    // R.U.F.F. instructor
    if (typeof window.__airborneBeginRuff === "function") {
      try { window.__airborneBeginRuff(); } catch (e) { console.warn("R.U.F.F.", e); }
    }
  }

  function endAirfieldTrainingToMap() {
    airfieldMode = false;
    airfieldPhase = "done";
    airfieldTip = "";
    window.__airborneAirfieldInvuln = false;
    window.__airborneAirfieldHold = false;
    window.__airborneAirfieldPaused = false;
    window.__airborneAirfieldBlockBoss = false;
    syncAirfieldGlobals();
    const sm = document.getElementById("stormMeter");
    if (sm) sm.style.visibility = "";
    if (typeof obstacles !== "undefined") obstacles = [];
    if (typeof spawnInterval !== "undefined") spawnInterval = 1.7;
    if (typeof sfxAirfieldEngineStop === "function") sfxAirfieldEngineStop();
    if (typeof sfxAirfieldWindStop === "function") sfxAirfieldWindStop();
    // Return to map — do NOT start city Level 1 from here
    if (typeof state !== "undefined") state = "start";
    if (window.__airborneShowWorldMap) {
      window.__airborneShowWorldMap({ mode: "start" });
    } else if (window.__airborneShowMenu) {
      window.__airborneShowMenu();
    }
  }

  // Each lesson: fly/practice first (~20s), THEN pause for explanation tip
  const AIRFIELD_LESSONS = [
    { tip: "Fly through the GOLD RINGS for bonus points!", practice: 20, spawn: 1.6, obstacles: false, rings: true },
    { tip: "Dodge obstacles — fly through the gaps!", practice: 22, spawn: 2.4, obstacles: true, rings: true },
    { tip: "Collect HEARTS to restore health.", practice: 20, spawn: 2.2, obstacles: true, rings: false },
    { tip: "Fill the POWER meter — then use your special!", practice: 22, spawn: 2.1, obstacles: true, rings: false }
  ];

  function updateAirfield(dt) {
    if (!airfieldMode) return;
    try {
    if (!(dt > 0) || !isFinite(dt)) dt = 0.016;

    airfieldPhaseT = (airfieldPhaseT || 0) + dt;
    syncAirfieldGlobals();
    window.__airborneAirfieldBlockBoss = true;

    const holding = !!window.__airborneAirfieldHold;
    if (!(airfieldTakeoffSpeed > 0)) airfieldTakeoffSpeed = 50;

    // Scroll strip LEFT only (single image, no loop).
    // Sink gradually only toward the END of the image.
    if (airfieldPhase === "taxi" || airfieldPhase === "accel" || airfieldPhase === "climb" ||
        airfieldPhase === "lesson") {
      const scrollSpd = Math.max(airfieldTakeoffSpeed || 0, (airfieldPhase === "lesson" ? 210 : 0));
      if (scrollSpd > 0) {
        (airfieldTiles || []).forEach(function(tile) {
          if (!tile) return;
          tile.x -= scrollSpd * dt;
        });
        // Remove only when fully off-screen left — never re-add / loop
        airfieldTiles = (airfieldTiles || []).filter(function(tile) {
          return tile && tile.x + (tile.w || 0) > -20;
        });
        if (!airfieldTiles.length) airfieldStripGone = true;
      }

      // Progress through the one image (0 = start, 1 = fully scrolled past)
      let progress = 0;
      if (airfieldTiles && airfieldTiles.length) {
        const tile = airfieldTiles[0];
        const startX = (typeof tile.startX === "number") ? tile.startX : 0;
        const w = tile.w || 1;
        progress = Math.max(0, Math.min(1, (startX - tile.x) / w));
      } else {
        progress = 1;
      }

      // Sink gradually in the last half of the strip image (no early sink)
      if (progress < 0.50) {
        airfieldStripY = 0;
      } else {
        const sinkU = (progress - 0.50) / 0.50; // 0→1 over last 50%
        const ease = sinkU * sinkU * (3 - 2 * sinkU); // smooth
        airfieldStripY = ease * (H * 0.48 + 30);
      }
      airfieldAltFrac = progress;
    }

    // ---- RUNWAY ----
    if (airfieldPhase === "taxi" || airfieldPhase === "accel") {
      window.__airborneAirfieldInvuln = true;
      window.__airborneAirfieldPaused = false;

      if (window.__airborneAirfieldBoostPending) {
        window.__airborneAirfieldBoostPending = false;
        airfieldTakeoffSpeed += 35;
      }
      airfieldTakeoffSpeed += (holding ? 90 : 20) * dt;
      if (airfieldTakeoffSpeed > 220) airfieldTakeoffSpeed = 220;
      if (typeof obstacleSpeed !== "undefined") obstacleSpeed = airfieldTakeoffSpeed;

      // Keep blimp on runway
      if (typeof player !== "undefined" && player) {
        const gy = groundLevelY();
        const ph = player.h > 0 ? player.h : 40;
        player.x = W * 0.25;
        player.y = gy - ph * 0.15;
        player.vy = 0;
        player.rotation = holding ? -0.08 : 0;
      }

      airfieldTip = holding ? "Accelerating…" : "HOLD to accelerate!";

      if (airfieldPhase === "taxi" && airfieldPhaseT > 0.3) {
        airfieldPhase = "accel";
        airfieldPhaseT = 0;
      }

      // Take off when fast enough OR after a few seconds
      if (airfieldTakeoffSpeed >= 160 || airfieldPhaseT > 3.5 || (holding && airfieldPhaseT > 1.5)) {
        airfieldPhase = "climb";
        airfieldPhaseT = 0;
        if (typeof player !== "undefined" && player) {
          airfieldClimbStartY = player.y;
        }
        try { if (typeof sfxAirfieldTakeoff === "function") sfxAirfieldTakeoff(); } catch (e) {}
        syncAirfieldGlobals();
      }

    // ---- CLIMB ----
    } else if (airfieldPhase === "climb") {
      window.__airborneAirfieldInvuln = true;
      window.__airborneAirfieldPaused = false;

      const dur = 2.0;
      const tClimb = Math.min(1, airfieldPhaseT / dur);
      // smooth ease
      const e = tClimb * tClimb * (3 - 2 * tClimb);

      const gy = groundLevelY();
      const startY = airfieldClimbStartY > 0 ? airfieldClimbStartY : gy - 30;
      const endY = H * 0.4;

      if (typeof player !== "undefined" && player) {
        player.y = startY + (endY - startY) * e;
        player.x = W * 0.25 + (W * 0.28 - W * 0.25) * e;
        player.vy = 0;
        player.rotation = -0.2 * Math.sin(tClimb * Math.PI);
      }

      airfieldTakeoffSpeed = Math.max(180, 160 + e * 60);
      if (typeof obstacleSpeed !== "undefined") obstacleSpeed = airfieldTakeoffSpeed;
      airfieldTip = "Liftoff!";

      if (tClimb >= 1) {
        airfieldPhase = "lesson";
        airfieldPhaseT = 0;
        airfieldLesson = 0;
        airfieldLessonT = 0;
        airfieldSub = "practice";
        if (typeof player !== "undefined" && player) {
          player.x = W * 0.28;
          player.y = H * 0.4;
          player.vy = 0;
          player.rotation = 0;
        }
        if (typeof obstacles !== "undefined") obstacles = [];
        const L0 = AIRFIELD_LESSONS[0];
        if (typeof spawnInterval !== "undefined") spawnInterval = (L0.rings || L0.obstacles) ? L0.spawn : 999;
        window.__airborneAirfieldRings = !!L0.rings;
        window.__airborneAirfieldObstacles = !!L0.obstacles;
        if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 210;
        const sm = document.getElementById("stormMeter");
        if (sm) sm.style.visibility = "";
        airfieldTip = "You're flying!";
        window.__airborneAirfieldPaused = false;
        window.__airborneAirfieldInvuln = false;
        syncAirfieldGlobals();
      }

    // ---- LESSON ----
    } else if (airfieldPhase === "lesson") {
      // R.U.F.F. may request landing
      if (window.__airborneRuffRequestLand) {
        window.__airborneRuffRequestLand = false;
        airfieldPhase = "land";
        airfieldPhaseT = 0;
        airfieldLandT = 0;
        window.__airborneAirfieldPaused = true;
        window.__airborneAirfieldInvuln = true;
        if (typeof obstacles !== "undefined") obstacles = [];
        if (typeof spawnInterval !== "undefined") spawnInterval = 999;
        ensureAirfieldStripVisible();
        airfieldTip = "Line up and ease her down…";
        syncAirfieldGlobals();
        return;
      }
      // If R.U.F.F. is active, skip old lesson auto-advance — R.U.F.F. drives stages
      if (window.__airborneRuffActive) {
        window.__airborneAirfieldPaused = false;
        window.__airborneAirfieldInvuln = false;
        if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 210;
        // Flags set by R.U.F.F. stages
        if (typeof spawnInterval !== "undefined") {
          const needSpawn = window.__airborneAirfieldRings || window.__airborneAirfieldObstacles;
          spawnInterval = needSpawn ? 1.9 : 999;
        }
        airfieldTip = "";
        syncAirfieldGlobals();
        return;
      }
      const lessons = AIRFIELD_LESSONS;
      if (airfieldLesson >= lessons.length) {
        airfieldPhase = "land";
        airfieldPhaseT = 0;
        airfieldLandT = 0;
        window.__airborneAirfieldPaused = true;
        window.__airborneAirfieldInvuln = true;
        if (typeof obstacles !== "undefined") obstacles = [];
        if (typeof spawnInterval !== "undefined") spawnInterval = 999;
        ensureAirfieldStripVisible();
        airfieldTip = "Prepare to land…";
        syncAirfieldGlobals();
        return;
      }
      const L = lessons[airfieldLesson];
      airfieldLessonT = (airfieldLessonT || 0) + dt;

      // Continuous practice — no freeze pauses; tips show as overlay only
      window.__airborneAirfieldPaused = false;
      window.__airborneAirfieldInvuln = false;
      if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 210;
      if (typeof spawnInterval !== "undefined") spawnInterval = (L.rings || L.obstacles) ? L.spawn : 999;
      window.__airborneAirfieldRings = !!L.rings;
      window.__airborneAirfieldObstacles = !!L.obstacles;

      // Show tip for last ~4s of each practice segment
      const showTipAt = Math.max(0, L.practice - 4);
      if (airfieldLessonT >= showTipAt) {
        airfieldTip = L.tip;
      } else {
        const left = Math.max(0, Math.ceil(L.practice - airfieldLessonT));
        airfieldTip = left > 0 ? ("Flying… " + left + "s") : L.tip;
      }

      if (airfieldLessonT >= L.practice) {
        airfieldLesson++;
        airfieldLessonT = 0;
        if (airfieldLesson < lessons.length) {
          const Ln = lessons[airfieldLesson];
          if (typeof spawnInterval !== "undefined") spawnInterval = (Ln.rings || Ln.obstacles) ? Ln.spawn : 999;
          window.__airborneAirfieldRings = !!Ln.rings;
          window.__airborneAirfieldObstacles = !!Ln.obstacles;
          airfieldTip = "Flying…";
        }
      }
      syncAirfieldGlobals();

    // ---- LAND ----
    } else if (airfieldPhase === "land") {
      window.__airborneAirfieldPaused = true;
      window.__airborneAirfieldInvuln = true;
      airfieldLandT = (airfieldLandT || 0) + dt;
      if (typeof obstacles !== "undefined") obstacles = [];
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      // Spawn landing field once (from the right), then scroll it left like a level
      if (!airfieldUseLandingArt || !airfieldTiles.length) {
        ensureAirfieldStripVisible();
      }
      airfieldStripY = 0;
      const approachSpd = 120;
      (airfieldTiles || []).forEach(function(tile) {
        if (!tile) return;
        // Scroll left until pad sits under player
        const targetX = W * 0.08;
        if (tile.x > targetX) {
          tile.x -= approachSpd * dt;
          if (tile.x < targetX) tile.x = targetX;
        }
      });
      if (typeof player !== "undefined" && player) {
        const gy = H - ((airfieldTiles[0] && airfieldTiles[0].h) ? airfieldTiles[0].h * 0.22 : 40);
        const ph = player.h > 0 ? player.h : 40;
        const landY = Math.min(groundLevelY(), gy) - ph * 0.12;
        // Start descent after field has moved in a bit
        const u = Math.min(1, Math.max(0, (airfieldLandT - 0.8) / 3.0));
        const e = u * u * (3 - 2 * u);
        player.y = H * 0.4 + (landY - H * 0.4) * e;
        player.x = W * 0.28;
        player.vy = 0;
        player.rotation = -0.08 * (1 - u) * Math.sin(Math.min(1, u * 1.2) * Math.PI);
      }
      airfieldTip = airfieldLandT > 3.5 ? "Touchdown!" : "Line up… ease her down…";
      if (airfieldLandT >= 4.2) {
        airfieldPhase = "score";
        airfieldScoreT = 0;
        try {
          if (typeof sfxAirfieldLand === "function") sfxAirfieldLand();
          if (typeof sfxAirfieldEngineStop === "function") sfxAirfieldEngineStop();
        } catch (e) {}
      }
      syncAirfieldGlobals();

    // ---- SCORE ----
    } else if (airfieldPhase === "score") {
      window.__airborneAirfieldPaused = true;
      window.__airborneAirfieldInvuln = true;
      airfieldScoreT = (airfieldScoreT || 0) + dt;
      if (typeof player !== "undefined" && player) {
        const gy = groundLevelY();
        const ph = player.h > 0 ? player.h : 40;
        player.y = gy - ph * 0.15;
        player.x = W * 0.28;
        player.vy = 0;
        player.rotation = 0;
      }
      if (airfieldScoreT >= 3.5) {
        if (window.__airborneRuffActive) {
          // R.U.F.F. shows flight report instead of immediate map
          window.__airborneAirfieldPhase = "score";
        } else {
          endAirfieldTrainingToMap();
        }
      }
      syncAirfieldGlobals();
    }
    } catch (err) {
      console.warn("updateAirfield", err);
    }
  }

  function uComplete(t, dur) {
    return t >= dur;
  }


  function drawAirfieldStrip() {
    if (!airfieldMode) return;
    if (typeof images === "undefined" || !images) return;
    // Never loop: once scrolled off, stay gone until landing art is requested
    if (airfieldStripGone && !airfieldUseLandingArt) return;
    const imgKey = airfieldUseLandingArt ? "landing_field" : "airfield_strip";
    const img = images[imgKey] || images.airfield_strip;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    if (!airfieldTiles || !airfieldTiles.length) {
      if (airfieldStripGone && !airfieldUseLandingArt) return;
      try { initAirfieldStrip(); } catch (e) { return; }
      if (!airfieldTiles || !airfieldTiles.length) return;
    }
    const sink = (typeof airfieldStripY === "number" && isFinite(airfieldStripY)) ? airfieldStripY : 0;
    airfieldTiles.forEach(function(tile) {
      if (!tile) return;
      let tw = tile.w, th = tile.h, tx = tile.x;
      if (!(tw > 0) || !(th > 0) || !isFinite(tx)) {
        const aspect = img.naturalWidth / img.naturalHeight;
        th = Math.max(50, Math.min(H * 0.38, H * 0.45)) * 1.07; // +4% height-ish
        tw = th * aspect;
        tile.w = tw; tile.h = th;
        if (!isFinite(tx)) { tx = 0; tile.x = 0; }
      }
      // Anchor firmly to bottom of canvas
      const y = H - th + sink;
      if (!isFinite(y) || y > H + 40) return;
      try { ctx.drawImage(img, tx, y, tw, th); } catch (e) {}
    });
  }

  function drawAirfieldShadow() {
    try {
      if (!airfieldMode || typeof player === "undefined" || !player) return;
      if (airfieldPhase === "score" || airfieldPhase === "lesson") return;
      const gy = groundLevelY();
      const frac = Math.max(0, Math.min(1, airfieldAltFrac || 0));
      const scale = 1 - frac * 0.75;
      const alpha = 0.35 * (1 - frac * 0.65);
      if (scale < 0.15 || alpha < 0.05) return;
      const pw = player.w > 0 ? player.w : 50;
      const sw = pw * 0.8 * scale;
      const sh = Math.max(4, sw * 0.18);
      const sx = player.x || W * 0.22;
      const sy = gy - 2;
      if (!isFinite(sx) || !isFinite(sy) || !isFinite(sw)) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(20,16,10,1)";
      ctx.translate(sx, sy);
      ctx.scale(1, Math.max(0.2, sh / Math.max(1, sw)));
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, sw / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } catch (e) {}
  }

  function drawAirfieldTip() {
    if (!airfieldMode) return;

    if (airfieldPhase === "score") {
      const panelW = Math.min(300, W * 0.78);
      const panelH = 120;
      const x = (W - panelW) / 2;
      const y = H * 0.28;
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "rgba(18, 28, 42, 0.82)";
      roundRectPath(ctx, x, y, panelW, panelH, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(212, 175, 55, 0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.textAlign = "center";
      ctx.fillStyle = "#f5e6c8";
      ctx.font = "bold 16px 'Rockwell', Georgia, serif";
      ctx.fillText("TRAINING COMPLETE", W / 2, y + 36);
      ctx.font = "14px 'Rockwell', Georgia, serif";
      const sc = (typeof score !== "undefined") ? score : 0;
      ctx.fillText("Score: " + sc, W / 2, y + 64);
      ctx.font = "12px 'Rockwell', Georgia, serif";
      ctx.fillStyle = "rgba(245,230,200,0.8)";
      ctx.fillText("Returning to map…", W / 2, y + 92);
      ctx.restore();
      return;
    }

    if (!airfieldTip) return;
    const boxW = Math.min(260, W * 0.42);
    const boxH = 64;
    const x = W - boxW - 12;
    const y = 52;
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "rgba(18, 28, 42, 0.72)";
    roundRectPath(ctx, x, y, boxW, boxH, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(212, 175, 55, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#f5e6c8";
    ctx.font = "bold 11px 'Rockwell', Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillText("TRAINING", x + 12, y + 18);
    ctx.font = "12px 'Rockwell', Georgia, serif";
    ctx.fillStyle = "rgba(245, 230, 200, 0.95)";
    wrapText(ctx, airfieldTip, x + 12, y + 36, boxW - 22, 14);
    ctx.restore();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = String(text).split(" ");
    let line = "";
    let ly = y;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, ly);
        line = words[i];
        ly += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, ly);
  }



  function drawBuildings() {
    if (airfieldMode) return;
    const groundY = groundLevelY();
    const img = images[buildingRowKey];
    if (!img || !img.naturalWidth) return;
    buildings.forEach(b => {
      ctx.drawImage(img, b.x, groundY - b.h, b.w, b.h);
    });
  }

  // ---------- Distant sketch-skyline layer — sits behind the power lines,
  // positioned twice as high up (twice the vertical offset from the ground)
  // so it reads as further back/taller in the distance. Same tiling/scroll
  // approach as the power lines, just slower since it's further away. ----------
  let sketchSkylineTiles = [];

  function initSketchSkyline() {
    sketchSkylineTiles = [];
    const img = images.sketchSkyline;
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 1.5;
    const h = H * 0.495; // was 0.33, +50% (now anchored at ground, same base as power lines)
    const w = h * aspect;
    let x = 0;
    while (x < W + w) {
      sketchSkylineTiles.push({ x: x, w: w, h: h });
      x += w - 1;
    }
  }

  function updateSketchSkyline(dtScale) {
    // Hold the skyline still only after touchdown
    if (worldScrollFrozen()) return;
    const speed = 0.35 * dtScale * obstacleSpeedScale(); // between parallax layer 3 (0.28) and power lines (0.4) — matches its position in the draw order
    sketchSkylineTiles.forEach(t => (t.x -= speed));
    while (sketchSkylineTiles.length && sketchSkylineTiles[0].x + sketchSkylineTiles[0].w < -10) {
      sketchSkylineTiles.shift();
    }
    const last = sketchSkylineTiles[sketchSkylineTiles.length - 1];
    if (!last || last.x + last.w < W + 200) {
      const startX = last ? last.x + last.w - 1 : 0;
      const h = last ? last.h : H * 0.495;
      const aspect = last ? last.w / last.h : 1.5;
      sketchSkylineTiles.push({ x: startX, w: h * aspect, h: h });
    }
  }

  function drawSketchSkyline() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    const img = images.sketchSkyline;
    if (!img || !img.naturalWidth) return;
    const groundY = groundLevelY();
    // Anchored to the same ground base as the power lines (not floating above
    // them) — taller now, so it still reaches well above where it used to.
    const bottomY = groundY;
    ctx.save();
    ctx.globalAlpha = 0.8; // darker/more visible while still reading as distant (was 0.5)
    sketchSkylineTiles.forEach(t => {
      ctx.drawImage(img, t.x, bottomY - t.h, t.w, t.h);
    });
    ctx.restore();
  }

  // ---------- Power line silhouette layer — a background parallax strip that
  // sits behind the buildings and drifts at half their scroll speed (a bit
  // further back = a bit slower). The art has a transparent top half — that
  // comes through automatically via drawImage's alpha, nothing special
  // needed here as long as the source PNG keeps its alpha channel intact
  // (a JPEG re-export of it would flatten the transparent area to white). ----------
  let powerlineTiles = [];

  function initPowerlines() {
    powerlineTiles = [];
    const img = images.powerlines;
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 3;
    const h = H * 0.2904; // was 0.242, +20%
    const w = h * aspect;
    let x = 0;
    while (x < W + w) {
      powerlineTiles.push({ x: x, w: w, h: h });
      x += w - 1; // slight overlap so the seam never shows
    }
  }

  function updatePowerlines(dtScale) {
    if (worldScrollFrozen()) return;
    const speed = 0.4 * dtScale * obstacleSpeedScale();
    powerlineTiles.forEach(t => (t.x -= speed));
    while (powerlineTiles.length && powerlineTiles[0].x + powerlineTiles[0].w < -10) {
      powerlineTiles.shift();
    }
    const last = powerlineTiles[powerlineTiles.length - 1];
    if (!last || last.x + last.w < W + 200) {
      const startX = last ? last.x + last.w - 1 : 0;
      const h = last ? last.h : H * 0.2904;
      const img = images.powerlines;
      const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 4;
      powerlineTiles.push({ x: startX, w: h * aspect, h: h });
    }
  }

  function drawPowerlines() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    const img = images.powerlines;
    if (!img || !img.naturalWidth) return;
    const groundY = groundLevelY();
    ctx.save();
    powerlineTiles.forEach(t => {
      ctx.drawImage(img, t.x, groundY - t.h, t.w, t.h);
    });
    ctx.restore();
  }

  // ---------- Street — a single tiled texture image replacing the old
  // procedural sidewalk+road strip, anchored to the very bottom of the
  // screen. Scrolls in sync with the buildings so it reads as one
  // continuous street, and is drawn after (in front of/above) the
  // buildings layer. ----------
  let streetTiles = [];

  function streetTileHeight() {
    return H - groundLevelY();
  }

  function initStreetTiles() {
    streetTiles = [];
    const img = images.streetTexture;
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 4;
    const h = streetTileHeight();
    const w = h * aspect;
    let x = 0;
    while (x < W + w) {
      streetTiles.push({ x, w, h });
      x += w - 1;
    }
  }

  function updateStreet(dtScale) {
    if (worldScrollFrozen()) return;
    const speed = 0.8 * dtScale * obstacleSpeedScale();
    if (!streetTiles.length) initStreetTiles();
    streetTiles.forEach(t => (t.x -= speed));
    while (streetTiles.length && streetTiles[0].x + streetTiles[0].w < -10) {
      streetTiles.shift();
    }
    const last = streetTiles[streetTiles.length - 1];
    if (!last || last.x + last.w < W + 200) {
      const img = images.streetTexture;
      const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 4;
      const h = last ? last.h : Math.max(58, H * 0.088);
      const startX = last ? last.x + last.w : 0;
      streetTiles.push({ x: startX, w: h * aspect, h });
    }
  }

  function drawStreet() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    const img = images.streetTexture;
    if (!img || !img.naturalWidth) return;
    streetTiles.forEach(t => {
      ctx.drawImage(img, t.x, H - t.h, t.w, t.h);
    });
  }

  // ---------- Smokestack smoke (decorative) — level 3 factory buildings puff
  // smoke from their chimneys as they scroll by. Chimney x-positions below
  // were measured directly from each building's art (tallest opaque column
  // near the top edge of the image). ----------
  const BUILDING_SMOKESTACKS = {
    bldg_l3_factoryrow:   [0.07, 0.234],
    bldg_l3_smokestacks:  [0.296, 0.723],
    bldg_l3_furnacehouse: [0.389],
    bldg_l3_minetower:    [0.544],
    bldg_l3_clocktower:   [0.31]
  };
  let buildingSmokeParticles = [];

  function updateBuildingSmoke(dt) {
    const groundY = groundLevelY();
    const worldSpeedPxPerSec = 48 * obstacleSpeedScale(); // matches the buildings' own scroll speed
    buildings.forEach(b => {
      const stacks = BUILDING_SMOKESTACKS[b.key];
      if (!stacks) return;
      if (b.smokeTimer == null) b.smokeTimer = Math.random() * 0.6;
      b.smokeTimer -= dt;
      if (b.smokeTimer <= 0) {
        b.smokeTimer = 0.4 + Math.random() * 0.4;
        const top = groundY - b.h;
        stacks.forEach(frac => {
          buildingSmokeParticles.push({
            x: b.x + b.w * frac + (Math.random() - 0.5) * 4,
            y: top + (Math.random() - 0.5) * 3,
            vx: -worldSpeedPxPerSec + (Math.random() - 0.5) * 10,
            vy: -20 - Math.random() * 12,
            size: 5 + Math.random() * 4,
            life: 2.4 + Math.random() * 1.4,
            age: 0
          });
        });
      }
    });

    buildingSmokeParticles.forEach(p => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy *= 0.992;
      p.vx *= 0.995;
      p.size += dt * 5.5; // smoke expands as it rises and disperses
    });
    buildingSmokeParticles = buildingSmokeParticles.filter(p => p.age < p.life);
  }

  function drawBuildingSmoke() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    buildingSmokeParticles.forEach(p => {
      const t = p.age / p.life;
      const alpha = (1 - t) * 0.32;
      ctx.save();
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, "rgba(175,170,162,0.85)");
      grad.addColorStop(1, "rgba(175,170,162,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // ---------- Street lamps (decorative, no collision) — level 1 only. A
  // single lamp image, spaced out along the sidewalk, sized to never exceed
  // 25% of the (now fixed) building height. Drawn after the buildings so
  // they sit in front of the building facades. ----------
  let streetlamps = [];
  const STREETLAMP_GAP_MIN = 260;
  const STREETLAMP_GAP_MAX = 420;

  function isStreetlampLevel() {
    return gameplayScore < BOSSES[0].threshold; // level 1 = before the first boss
  }

  function makeStreetlamp(xStart) {
    const img = images.streetlamp1;
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 0.3;
    const h = (H * 0.396) * 0.25; // matches the fixed building height (now +20%), capped at 25% of it
    const w = h * aspect;
    return { x: xStart, w, h };
  }

  function initStreetlamps() {
    streetlamps = [];
    if (!isStreetlampLevel()) return;
    let x = 150;
    while (x < W + 400) {
      streetlamps.push(makeStreetlamp(x));
      x += STREETLAMP_GAP_MIN + Math.random() * (STREETLAMP_GAP_MAX - STREETLAMP_GAP_MIN);
    }
  }

  function updateStreetlamps(dtScale) {
    if (!isStreetlampLevel()) {
      if (streetlamps.length) streetlamps = [];
      return;
    }
    if (worldScrollFrozen()) return;
    const speed = 0.8 * dtScale * (obstacleSpeedScale()); // same speed as buildings — same ground plane
    streetlamps.forEach(l => (l.x -= speed));
    while (streetlamps.length && streetlamps[0].x + streetlamps[0].w < -10) {
      streetlamps.shift();
    }
    const last = streetlamps[streetlamps.length - 1];
    if (!last || last.x < W + 400) {
      const gap = STREETLAMP_GAP_MIN + Math.random() * (STREETLAMP_GAP_MAX - STREETLAMP_GAP_MIN);
      const startX = last ? last.x + gap : W + 200;
      streetlamps.push(makeStreetlamp(startX));
    }
  }

  function drawStreetlamps() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    if (!isStreetlampLevel()) return;
    const img = images.streetlamp1;
    if (!img || !img.naturalWidth) return;
    const groundY = groundLevelY();
    streetlamps.forEach(l => {
      const top = groundY - l.h;
      ctx.drawImage(img, l.x, top, l.w, l.h);
    });
  }

  // ---------- Ground vehicles (decorative, no collision) — real art, two
  // types driving each direction (matching each image's natural facing, so
  // nothing needs to be mirrored). ----------
  let groundVehicles = [];
  let vehicleSpawnTimer = 3 + Math.random() * 4;
  // dir: 1 = drives left-to-right (art faces right), -1 = right-to-left (art faces left)
  const VEHICLE_DEFS = [
    { key: "vehicle_towtruck", dir: 1 },
    { key: "vehicle_tanker", dir: 1 },
    { key: "vehicle_transit", dir: -1 },
    { key: "vehicle_roadster", dir: -1 }
  ];

  function spawnGroundVehicle() {
    const def = VEHICLE_DEFS[Math.floor(Math.random() * VEHICLE_DEFS.length)];
    const img = images[def.key];
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 2.4;
    const scale = Math.min(1.6, W / 500);
    const h = 46 * scale;
    const w = h * aspect;
    groundVehicles.push({
      key: def.key,
      x: def.dir === 1 ? -w - 20 : W + 20,
      w, h,
      dir: def.dir,
      speed: (26 + Math.random() * 22) * scale
    });
  }

  function updateGroundVehicles(dt, dtScale) {
    if (worldScrollFrozen()) return;
    vehicleSpawnTimer -= dt;
    if (vehicleSpawnTimer <= 0) {
      vehicleSpawnTimer = 4.5 + Math.random() * 6;
      if (groundVehicles.length < 3) spawnGroundVehicle();
    }
    const worldScroll = 0.8 * dtScale * obstacleSpeedScale(); // same ground-plane speed as buildings
    groundVehicles.forEach(v => {
      v.x += v.dir * v.speed * dt - worldScroll;
    });
    groundVehicles = groundVehicles.filter(v => v.x > -160 && v.x < W + 160);
  }

  function drawGroundVehicles() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    // anchored toward the bottom of the street band (where the road portion
    // of the texture is expected to be) rather than the top edge, which
    // sits right against the buildings/sidewalk
    const vehicleBottomY = H - streetTileHeight() * 0.18;
    groundVehicles.forEach(v => {
      const img = images[v.key];
      if (!img || !img.naturalWidth) return;
      const y = vehicleBottomY - v.h;
      ctx.drawImage(img, v.x, y, v.w, v.h);
    });
  }

  function checkBuildingCollision() {
    if (bonusActive) return; // invincible during the bonus round
    if (window.__airborneAirfield || (typeof airfieldMode !== "undefined" && airfieldMode)) return;
    if (window.__airborneAirfieldInvuln) return;
    const groundY = groundLevelY();
    const px1 = player.x - (player.w / 2) * 0.7;
    const px2 = player.x + (player.w / 2) * 0.7;
    const pBottom = player.y + (player.h / 2) * 0.7;

    for (const b of buildings) {
      const overlapsX = px2 > b.x && px1 < b.x + b.w;
      if (!overlapsX) continue;
      // sample the real silhouette height at the player's own position, rather
      // than treating the whole tile as one flat-topped block
      const sampleX = Math.max(b.x, Math.min(b.x + b.w, player.x));
      const topFrac = buildingProfileTopFrac(b, sampleX);
      const solidTop = (groundY - b.h) + topFrac * b.h;
      if (pBottom > solidTop) {
        takeHit();
        return;
      }
    }
  }

  // ---------- Far backdrop (decorative, no collision) — the farthest-back
  // image layer, sitting behind the skyline parallax layer and everything
  // else. Drawn at partial opacity so the procedural sky gradient still
  // shows/tints through it. ----------
  let skylineX = 0;
  function updateSkyline(dtScale) {
    const speed = 0.05 * dtScale * obstacleSpeedScale(); // very slow — reads as far away, but still moving with the scene
    skylineX -= speed;
  }
  function drawSkyline() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    // The Far_Bg.jpg asset was shipping with its transparent areas baked in
    // as a literal checkerboard (instead of being flattened onto a solid/sky
    // color before export), so drawing it here was punching a checkerboard
    // hole straight through the sky. Rather than depend on that external
    // image at all, paint a soft procedural haze band using the SAME colors
    // as the live sky gradient (getSkyColors) — it always matches the
    // current day/dusk/night/dawn tint exactly, and can never fail to load,
    // 404, or show through as broken/transparent.
    const sky = getSkyColors(gameplayScore);
    ctx.save();
    ctx.globalAlpha = 0.35;
    const haze = ctx.createLinearGradient(0, 0, 0, H);
    haze.addColorStop(0, sky.top);
    haze.addColorStop(1, sky.bottom);
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ---------- Clouds (decorative, no collision) ----------
  let clouds = [];
  function initClouds() {
    clouds = [];
    for (let i = 0; i < 3; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 40 + Math.random() * (H * 0.35),
        // At least 50% smaller (was 0.4–0.9, now 0.15–0.40)
        scale: 0.15 + Math.random() * 0.25,
        speed: 0.15 + Math.random() * 0.2,
        alpha: 0.35 + Math.random() * 0.3
      });
    }
  }
  function updateClouds(dtScale) {
    // Freeze clouds only after touchdown
    if (worldScrollFrozen()) return;
    const img = images.cloud;
    const baseW = (img && img.naturalWidth) ? img.naturalWidth : 256;
    clouds.forEach(c => {
      c.x -= c.speed * dtScale;
      // Fully off-screen (entire cloud past left edge) before recycling
      const drawnW = baseW * c.scale;
      if (c.x + drawnW < 0) {
        c.x = W + 20 + Math.random() * 100;
        c.y = 40 + Math.random() * (H * 0.35);
        c.scale = 0.15 + Math.random() * 0.25;
        c.speed = 0.15 + Math.random() * 0.2;
        c.alpha = 0.35 + Math.random() * 0.3;
      }
    });
  }
  function drawClouds() {
    const img = images.cloud;
    if (!img || !img.naturalWidth) return;
    clouds.forEach(c => {
      const w = img.naturalWidth * c.scale;
      const h = img.naturalHeight * c.scale;
      ctx.globalAlpha = c.alpha;
      ctx.drawImage(img, c.x, c.y, w, h);
      ctx.globalAlpha = 1;
    });
  }

  // ---------- Distant bird flock (decorative, no collision) — a small V-shaped
  // group that periodically drifts across the far background, part of the
  // same parallax feel as the clouds/skyline, using the existing bird sprites
  // scaled down and faded for distance ----------
  let birdFlocks = [];
  let birdFlockTimer = 6 + Math.random() * 8; // first flock arrives fairly soon

  function spawnBirdFlock() {
    const useB = Math.random() < 0.5;
    const keys = useB ? BIRD_B_KEYS : BIRD_A_KEYS;
    const count = 4 + Math.floor(Math.random() * 4); // 4-7 birds
    const members = [{ ox: 0, oy: 0, phase: Math.random() * Math.PI * 2 }];
    for (let i = 1; i < count; i++) {
      const side = i % 2 === 1 ? -1 : 1;
      const rank = Math.ceil(i / 2);
      members.push({
        ox: rank * (10 + Math.random() * 4),
        oy: rank * (5 + Math.random() * 3) * side,
        phase: Math.random() * Math.PI * 2
      });
    }
    birdFlocks.push({
      x: W + 60,
      y: H * (0.08 + Math.random() * 0.32),
      size: 16 + Math.random() * 8, // small — reads as distant
      speed: 26 + Math.random() * 18, // slow parallax drift, much slower than gameplay obstacles
      alpha: 0.4 + Math.random() * 0.22,
      keys,
      members,
      animFrame: Math.floor(Math.random() * OBSTACLE_ANIM_FRAME_COUNT),
      animTimer: Math.random() / OBSTACLE_ANIM_FPS,
      bobPhase: Math.random() * Math.PI * 2
    });
  }

  function updateBirdFlocks(dt) {
    if (worldScrollFrozen()) return;
    birdFlockTimer -= dt;
    if (birdFlockTimer <= 0) {
      birdFlockTimer = 22 + Math.random() * 26; // periodic — not a constant presence
      spawnBirdFlock();
    }
    const frameDuration = 1 / OBSTACLE_ANIM_FPS;
    birdFlocks.forEach(f => {
      f.x -= f.speed * dt;
      f.bobPhase += dt * 0.8;
      f.animTimer += dt;
      while (f.animTimer >= frameDuration) {
        f.animTimer -= frameDuration;
        f.animFrame = (f.animFrame + 1) % OBSTACLE_ANIM_FRAME_COUNT;
      }
    });
    birdFlocks = birdFlocks.filter(f => f.x > -80);
  }

  function drawBirdFlocks() {
    birdFlocks.forEach(f => {
      const img = images[f.keys[f.animFrame]];
      if (!img || !img.naturalWidth) return;
      const aspect = img.naturalHeight / img.naturalWidth;
      const w = f.size;
      const h = w * aspect;
      const baseY = f.y + Math.sin(f.bobPhase) * 5;
      ctx.globalAlpha = f.alpha;
      f.members.forEach(m => {
        const bob = Math.sin(f.bobPhase * 1.3 + m.phase) * 3;
        ctx.drawImage(img, f.x + m.ox - w / 2, baseY + m.oy + bob - h / 2, w, h);
      });
      ctx.globalAlpha = 1;
    });
  }


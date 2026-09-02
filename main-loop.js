"use strict";

  // ---------- Main loop ----------
  let lastTime = null;

  // ---------- Cinematic camera (boss intro zoom) ----------
  // Uses CSS scale on the game canvas so perspective runway/world math stays correct.
  // Zoom out ~25% (scale 0.75), hold 5s with tension, zoom back in.
  window.__airborneCam = window.__airborneCam || {
    z: 1, phase: "idle", t: 0, hold: 5, paused: false
  };
  function camCanvas() {
    return (typeof canvas !== "undefined" && canvas) ? canvas
      : document.getElementById("gameCanvas") || document.querySelector("canvas");
  }
  function applyCamCss(z) {
    var c = camCanvas();
    if (!c) return;
    var zz = (z != null) ? z : 1;
    c.style.transformOrigin = "center center";
    c.style.transition = "none";
    c.style.transform = (Math.abs(zz - 1) < 0.002) ? "none" : ("scale(" + zz.toFixed(4) + ")");
  }
  function startBossCamCinematic() {
    // Boss zoom disabled — never pause the game
    try {
      window.__airborneBossCamPause = false;
      if (window.__airborneCam) {
        window.__airborneCam.phase = "idle";
        window.__airborneCam.z = 1;
        window.__airborneCam.paused = false;
      }
      applyCamCss(1);
    } catch (e) {}
    return;
    var cam = window.__airborneCam;
    if (cam.phase && cam.phase !== "idle") return;
    cam.phase = "zoomOut";
    cam.t = 0;
    cam.hold = 5.0;
    cam.paused = true;
    window.__airborneBossCamPause = true;
    try {
      if (typeof sfxThunder === "function") sfxThunder();
      if (typeof trainBeep === "function") {
        trainBeep(90, 0.5, 0.25, "sawtooth");
        setTimeout(function() { try { trainBeep(70, 0.7, 0.28, "sawtooth"); } catch (e) {} }, 400);
        setTimeout(function() { try { trainBeep(55, 0.9, 0.3, "sawtooth"); } catch (e) {} }, 900);
      }
      if (typeof playTrainingBossMusic === "function") playTrainingBossMusic();
    } catch (e) {}
  }
  window.__airborneStartBossCam = startBossCamCinematic;

  function updateBossCam(dt) {
    var cam = window.__airborneCam;
    if (!cam) return;
    // Always clear zoom if disabled / stuck
    if (cam.phase !== "idle" || cam.z !== 1) {
      /* zoom disabled — force reset */
    }
    if (cam.phase !== "idle") {
      cam.phase = "idle";
      cam.z = 1;
      cam.paused = false;
      window.__airborneBossCamPause = false;
      try { applyCamCss(1); } catch (e) {}
      return;
    }
    if (cam.phase === "idle") {
      if (Math.abs(cam.z - 1) > 0.002) {
        cam.z += (1 - cam.z) * Math.min(1, dt * 5);
        applyCamCss(cam.z);
      } else if (cam.z !== 1) {
        cam.z = 1;
        applyCamCss(1);
      }
      return;
    }
    cam.t += dt;
    if (cam.phase === "zoomOut") {
      var u = Math.min(1, cam.t / 0.9);
      var e = 1 - Math.pow(1 - u, 3);
      cam.z = 1 + (0.75 - 1) * e; // 25% zoom out
      applyCamCss(cam.z);
      if (u >= 1) {
        cam.phase = "hold";
        cam.t = 0;
        cam.z = 0.75;
        applyCamCss(0.75);
        try {
          if (typeof sfxTrainingBossWarn === "function") sfxTrainingBossWarn();
          if (typeof trainBeep === "function") {
            trainBeep(100, 0.35, 0.22, "square");
            setTimeout(function(){ try { trainBeep(80, 0.5, 0.25, "sawtooth"); } catch(e){} }, 350);
            setTimeout(function(){ try { trainBeep(60, 0.65, 0.28, "sawtooth"); } catch(e){} }, 750);
          }
        } catch (e) {}
      }
    } else if (cam.phase === "hold") {
      cam.z = 0.75 + Math.sin(cam.t * 1.2) * 0.008;
      applyCamCss(cam.z);
      if (cam.t >= cam.hold) {
        cam.phase = "zoomIn";
        cam.t = 0;
      }
    } else if (cam.phase === "zoomIn") {
      var u2 = Math.min(1, cam.t / 0.95);
      var e2 = 1 - Math.pow(1 - u2, 3);
      cam.z = 0.75 + (1 - 0.75) * e2;
      applyCamCss(cam.z);
      if (u2 >= 1) {
        cam.z = 1;
        cam.phase = "idle";
        cam.t = 0;
        cam.paused = false;
        window.__airborneBossCamPause = false;
        applyCamCss(1);
      }
    }
  }
  // Canvas CSS zoom — no ctx transform (avoids warping runway perspective)
  function applyBossCam() { return false; }

  // ---------- Day/night sky cycle — tied to gameplayScore so it advances with real dodging skill ----------
  function getSkyColors(gpScore) {
    // Longer day stretch so brightness stays consistent through early bosses
    // (boss 1 @50, boss 2 @100 no longer drop into heavy dusk/night)
    const stops = [
      { at: 0,   top: [245, 230, 200], bottom: [139, 111, 71] },  // day
      { at: 130, top: [245, 230, 200], bottom: [139, 111, 71] },  // hold day
      { at: 170, top: [255, 190, 130], bottom: [130, 85, 65] },   // soft dusk
      { at: 210, top: [55, 55, 95],    bottom: [35, 30, 55] },    // milder night
      { at: 250, top: [255, 205, 150], bottom: [135, 95, 75] },   // dawn
      { at: 280, top: [245, 230, 200], bottom: [139, 111, 71] }   // day
    ];
    const cycle = ((gpScore % 280) + 280) % 280;
    let a = stops[0], b = stops[1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (cycle >= stops[i].at && cycle <= stops[i + 1].at) { a = stops[i]; b = stops[i + 1]; break; }
    }
    const span = (b.at - a.at) || 1;
    const t = (cycle - a.at) / span;
    const lerp = (c1, c2) => c1.map((v, i) => Math.round(v + (c2[i] - v) * t));
    const top = lerp(a.top, b.top);
    const bottom = lerp(a.bottom, b.bottom);
    return {
      top: "rgb(" + top[0] + "," + top[1] + "," + top[2] + ")",
      bottom: "rgb(" + bottom[0] + "," + bottom[1] + "," + bottom[2] + ")"
    };
  }

  let loopErrorShown = false;
  function showRuntimeError(err) {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;top:8px;left:8px;right:8px;z-index:9999;" +
      "background:rgba(120,20,20,0.96);color:#fff;font:11px/1.4 monospace;" +
      "padding:10px;border-radius:8px;max-height:50vh;overflow:auto;white-space:pre-wrap;" +
      "box-shadow:0 2px 10px rgba(0,0,0,0.5);";
    el.textContent = "RUNTIME ERROR: " + (err && err.stack ? err.stack : String(err));
    document.body.appendChild(el);
    console.error(err);
  }

  // ---------- Old-film grain overlay (subtle vintage effect, gameplay only) ----------
  // A small noise tile is generated once and reused as a repeating pattern —
  // far cheaper than regenerating per-pixel noise every frame. Jittering its
  // offset each frame is what sells the "flickering grain" look.
  let filmGrainPattern = null;
  function buildFilmGrainPattern() {
    const tile = document.createElement("canvas");
    tile.width = 128; tile.height = 128;
    const tctx = tile.getContext("2d");
    const imgData = tctx.createImageData(128, 128);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
    tctx.putImageData(imgData, 0, 0);
    filmGrainPattern = ctx.createPattern(tile, "repeat");
  }

  function drawFilmGrain() {
    if (!filmGrainPattern) buildFilmGrainPattern();
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    // Stable alpha — random flicker felt like lag/dimming
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = filmGrainPattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawVignette() {
    // One soft vignette only (was drawn twice and very heavy → dim + lag)
    ctx.save();
    const vg = ctx.createRadialGradient(
      W / 2, H / 2,
      Math.min(W, H) * 0.4,
      W / 2, H / 2,
      Math.max(W, H) * 0.75
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.65, "rgba(0,0,0,0.04)");
    vg.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  
  // ===== Always-on training Ruff (does not depend on ruff-tutorial state) =====
  window.__airborneRuffFrameT = window.__airborneRuffFrameT || 0;
  window.__airborneRuffFrame = window.__airborneRuffFrame || 0;

  // Independent training lesson driver (backup if tutorial stage logic stalls)
  window.__airborneLessonDriverT = window.__airborneLessonDriverT || 0;
  function tickTrainingLessonDriver(dt) {
    try {
      if (!window.__airborneAirfield) {
        window.__airborneLessonDriverT = 0;
        window.__airborneLessonDriverArmed = false;
        return;
      }
      var ph = window.__airborneAirfieldPhase;
      var st = window.__airborneRuffStage || "intro";
      // Arm once we reach flight lesson phase
      if (ph === "lesson" || ph === "climb") {
        window.__airborneLessonDriverArmed = true;
      }
      if (!window.__airborneLessonDriverArmed) return;
      if (st === "intro" || st === "takeoff") {
        window.__airborneRuffStage = "cruise";
        if (typeof window.__airborneBeginRuff === "function") {
          /* force via setStage path */
        }
        try {
          // Call into tutorial setStage if exported later; use flag
          window.__airborneForceRuffCruise = true;
        } catch (e) {}
        window.__airborneLessonDriverT = 0;
        return;
      }
      window.__airborneLessonDriverT += dt;
      var order = ["cruise","altitude","rings","platforms","obstacles","shield","airship","combined","boss1","landing"];
      var idx = order.indexOf(st);
      if (idx < 0) return;
      // Failsafe only — primary progression is ruff-tutorial setStage timers
      var durations = [12, 18, 32, 34, 24, 32, 28, 32, 50, 24];
      var need = durations[idx] || 24;
      if (window.__airborneLessonDriverT >= need) {
        window.__airborneLessonDriverT = 0;
        var next = order[idx + 1];
        if (!next) return;
        window.__airborneForceSetStage = next;
        console.log("[LessonDriver] →", next);
      }
    } catch (e) {
      console.warn("lessonDriver", e);
    }
  }


  
  function drawTrainingPlatformsEmergency() {
    try {
      var list = window.__airborneRuffPlatforms;
      if (!list || !list.length) return;
      if (typeof ctx === "undefined" || !ctx) return;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p) continue;
        var w = +p.w || 0, h = +p.h || 0;
        if (w < 4 || h < 4) continue;
        var ox = (+p.x || 0) + (+p.sway || 0);
        var oy = (+p.y || 0) - h * 0.5 + (+p.bobY || 0);
        if (!isFinite(ox) || !isFinite(oy)) continue;
        var img = (typeof images !== "undefined" && images && p.key) ? images[p.key] : null;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, ox, oy, w, h);
        } else {
          ctx.fillStyle = "#e8c87a";
          ctx.fillRect(ox, oy, w, h);
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 3;
          ctx.strokeRect(ox, oy, w, h);
        }
      }
      ctx.restore();
    } catch (e) {
      console.warn("plat emergency", e);
    }
  }


function drawTrainingRuffEmergency(dt) {
    try {
      if (!(window.__airborneAirfield || window.__airborneTrainingFlight || window.__airborneRuffActive)) return;
      if (window.__airborneRuffStage === "report") return;
      if (typeof ctx === "undefined" || !ctx) return;
      var W0 = (typeof W !== "undefined" && W > 0) ? W : 400;
      var H0 = (typeof H !== "undefined" && H > 0) ? H : 600;
      var stage = window.__airborneRuffStage || "intro";
      var dti = (typeof dt === "number" && dt > 0) ? Math.min(dt, 0.05) : 0.016;

      // Intro phases: 0–1.4s fly-in, 1.4–end of intro hover near dest
      if (stage === "intro") {
        window.__airborneRuffIntroT = (window.__airborneRuffIntroT || 0) + dti;
        var tFly = Math.min(1, window.__airborneRuffIntroT / 1.6);
        var ease = 1 - Math.pow(1 - tFly, 3);
        var startX = W0 * 0.95, startY = H0 * 0.14;
        var destX = W0 * 0.22, destY = H0 * 0.24;
        window.__airborneRuffX = startX + (destX - startX) * ease;
        window.__airborneRuffY = startY + (destY - startY) * ease + Math.sin(window.__airborneRuffIntroT * 2.0) * 5;
        window.__airborneRuffFollowBlend = 0;
      } else {
        // Smooth blend toward follow (closer to blimp, not high above)
        window.__airborneRuffFollowBlend = Math.min(1, (window.__airborneRuffFollowBlend || 0) + dti / 1.2);
        var b = window.__airborneRuffFollowBlend;
        var fx = W0 * 0.20, fy = H0 * 0.35;
        if (typeof player !== "undefined" && player && player.x > 0) {
          fx = player.x - ((player.w || 60) * 0.50 + 28);
          fy = player.y - ((player.h || 40) * 0.12 + 6) + Math.sin((performance.now() / 1000) * 2.0) * 5;
        }
        var ox = (window.__airborneRuffX > 0) ? window.__airborneRuffX : fx;
        var oy = (window.__airborneRuffY > 0) ? window.__airborneRuffY : fy;
        window.__airborneRuffX = ox + (fx - ox) * Math.max(0.08, b * 0.2);
        window.__airborneRuffY = oy + (fy - oy) * Math.max(0.08, b * 0.2);
      }
      var x = Math.max(36, Math.min(W0 * 0.62, window.__airborneRuffX));
      var y = Math.max(H0 * 0.08, Math.min(H0 * 0.75, window.__airborneRuffY));
      window.__airborneRuffX = x;
      window.__airborneRuffY = y;

      // Animation 10 fps — less choppy
      window.__airborneRuffFrameT = (window.__airborneRuffFrameT || 0) + dti;
      if (window.__airborneRuffFrameT >= 0.1) {
        window.__airborneRuffFrameT -= 0.1;
        window.__airborneRuffFrame = ((window.__airborneRuffFrame || 0) + 1) % 36;
      }
      var fi = ((window.__airborneRuffFrame || 0) | 0) + 1;
      var key = "ruff_" + (fi < 10 ? "0" + fi : String(fi));
      var img = (typeof images !== "undefined") ? images[key] : null;
      if (!img || !img.naturalWidth) {
        for (var i = 1; i <= 36; i++) {
          var k = "ruff_" + (i < 10 ? "0" + i : String(i));
          if (images && images[k] && images[k].naturalWidth) { img = images[k]; break; }
        }
      }
      var size = 92;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (img && img.naturalWidth) {
        ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
      } else {
        ctx.fillStyle = "rgba(255, 200, 60, 0.95)";
        ctx.beginPath();
        ctx.arc(x, y, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1208";
        ctx.font = "bold 12px system-ui,sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("R.U.F.F.", x, y + 4);
      }
      ctx.restore();
    } catch (e) {
      console.warn("emergency Ruff", e);
    }
  }




function loop(ts) {
    try {
    if (lastTime === null) lastTime = ts;
    let dt = (ts - lastTime) / 1000;
    dt = Math.min(dt, 0.033); // clamp for tab-switch hitches
    // Dramatic slow-mo while boss 1 sinks
    if (typeof defeatSlowMo !== "undefined" && defeatSlowMo &&
        typeof defeatSlowMoUntil !== "undefined" && performance.now() < defeatSlowMoUntil) {
      dt *= 0.2756; // slo-mo +5% again (faster than 0.2625)
    } else if (typeof defeatSlowMo !== "undefined" && defeatSlowMo &&
               typeof defeatSlowMoUntil !== "undefined" && performance.now() >= defeatSlowMoUntil) {
      defeatSlowMo = false;
    }
    lastTime = ts;

    try { updateBossCam(dt); } catch (e) {}

    // background — slowly cycles day → dusk → night → dawn as gameplayScore climbs
    const sky = getSkyColors(gameplayScore);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const dtScale = dt * 60; // normalize movement speeds tuned at 60fps baseline

    // Art Deco sky layer (very slow continuous scroll, always on screen)
    try {
      if (window.__airborneUpdateArtDecoLayers) window.__airborneUpdateArtDecoLayers(dtScale);
      if (window.__airborneDrawArtDecoSky) window.__airborneDrawArtDecoSky();
      if (window.__airborneUpdateSkyDust) window.__airborneUpdateSkyDust(dtScale);
      if (window.__airborneDrawSkyDust) window.__airborneDrawSkyDust();
    } catch (e) {}

    updateParallaxLayers(dtScale);
    if (typeof updateMountainParallax === "function") updateMountainParallax(dtScale);
    updateSkyline(dtScale);
    drawSkyline();

    // Front cloud layer OFF for now
    // updateClouds(dtScale);
    updateBirdFlocks(dt);
    // Balloons behind mountains only (no balloons behind clouds)
    try { if (window.__airborneDrawTrainingBgBalloonsBehindMountains) window.__airborneDrawTrainingBgBalloonsBehindMountains(); } catch (e) {}
    // Mountains — no clouds behind mountains
    if (typeof drawMountainParallax === "function") drawMountainParallax();
    // Art deco cloud band AFTER mountains (not behind)
    try { if (window.__airborneDrawArtDecoCloudBand) window.__airborneDrawArtDecoCloudBand(); } catch (e) {}
    drawBirdFlocks();
    if (typeof drawAirfieldStrip === "function") drawAirfieldStrip();
    
    updateDustParticles(dt);
    
    updatePlayerBlimpAnimation(dt);

    // Training systems only while not paused
    if (state !== "paused" && (window.__airborneAirfield || window.__airborneRuffActive)) {
      const _updAf0 = (typeof window.updateAirfield === "function") ? window.updateAirfield
        : (typeof updateAirfield === "function") ? updateAirfield : null;
      if (_updAf0) { try { _updAf0(dt); } catch (e) { console.warn("updAf", e); } }
      if (typeof window.__airborneUpdateRuff === "function") {
        try { window.__airborneUpdateRuff(dt); } catch (e) { console.warn("updRuff", e); }
      }
      try { tickTrainingLessonDriver(dt); } catch (eLD) {}
      try {
        if (typeof window.__airborneRuffPlatforms !== "undefined") {
          // force canvas draw + DOM every frame while platforms exist
          drawTrainingPlatformsEmergency();
        }
      } catch (eP2) {}
      // Ruff lesson failsafe — never soft-lock on intro/takeoff
      try {
        if (window.__airborneAirfield) {
          window.__airborneTrainT = (window.__airborneTrainT || 0) + dt;
          if (window.__airborneRuffStage === "intro" && window.__airborneTrainT > 16) {
            window.__airborneForceSetStage = "takeoff";
            window.__airborneRuffIntroFly = false;
            window.__airborneAirfieldPaused = false;
            window.__airborneTrainingFlight = true;
          }
          // Keep training flight flag true for whole airfield run
          if (window.__airborneAirfield && window.__airborneRuffStage !== "report") {
            window.__airborneTrainingFlight = true;
            window.__airborneRuffActive = true;
          }
        } else {
          window.__airborneTrainT = 0;
        }
      } catch (eFs) {}
    }
    if (state === "paused") {
      // Fully frozen — still render current frame below
    } else if (state === "playing" || window.__airbornePlaying || (window.__airborneAirfield && state !== "paused")) {
      elapsedMs = performance.now() - runStartTime;
      updateFlipClock(elapsedMs);
      try {
        const hub = document.getElementById("ruffFlightTracePct");
        if (hub) {
          const totalSec = Math.floor(elapsedMs / 1000);
          const mm = Math.floor(totalSec / 60);
          const s = totalSec % 60;
          hub.textContent = mm + ":" + String(s).padStart(2, "0");
        }
      } catch (e) {}
      if (typeof ensureCollectDock === "function") ensureCollectDock();
      else if (typeof updateCollectDock === "function") updateCollectDock();
      // Playing-path updates (skip duplicate airfield if already ticked above)
      if (!(window.__airborneAirfield || window.__airborneRuffActive)) {
        const _updAf = (typeof window.updateAirfield === "function") ? window.updateAirfield
          : (typeof updateAirfield === "function") ? updateAirfield : null;
        if (_updAf) _updAf(dt);
        if (typeof window.__airborneUpdateRuff === "function") window.__airborneUpdateRuff(dt);
        try { tickTrainingLessonDriver(dt); } catch (eLD) {}
      try {
        if (typeof window.__airborneRuffPlatforms !== "undefined") {
          // force canvas draw + DOM every frame while platforms exist
          drawTrainingPlatformsEmergency();
        }
      } catch (eP2) {}
      }
      updateBuildings(dtScale);
      updatePowerlines(dtScale);
      updateSketchSkyline(dtScale);
      updateStreet(dtScale);
      updateBuildingSmoke(dt);
      updateStreetlamps(dtScale);
      updateGroundVehicles(dt, dtScale);
      updatePlayer(dt);
      updateObstacles(dt);
      updateCheckpointPickup(dt);
      checkBuildingCollision();
      if (bossActive) {
        updateBoss(dt);
        updateBombs(dt);
        updateShellTrailParticles(dt);
        updateRockets(dt);
        updatePlayerBombs(dt);
      }
      // Sink sequence continues after bossActive is cleared
      if (typeof updateBossSinking === 'function') updateBossSinking(dt);
      updatePowerup(dt);
      updateBullets(dt);
      updateHealPickup(dt);
      updateShieldPickup(dt);
      updateWindParticles(dt);
      updateStorm(dt); try { if (window.tickUnifiedProgress) window.tickUnifiedProgress(dt); } catch(e) {};
      try { if (window.PowerFX) window.PowerFX.update(dt); } catch (e) {}
      updateBonusRound(dt);
      updateLevelEnd(dt);
      updateComboPopups();
      updateRain(dt);
      updateCloudWisps(dt);
      updateDefeatDebris(dt);
      updateShockwaves(dt);
      updateBossWarning(dt);
      updateScreenEffects(dt);
    } else if (state === "start" && buildings.length === 0) {
      initBuildings();
      initClouds();
      initParallaxLayers();
      
      resetPlayer();
    } else if (state !== "playing" && state !== "paused") {
      updateBuildings(dtScale * 0.4);
      updatePowerlines(dtScale * 0.4);
      updateSketchSkyline(dtScale * 0.4);
      updateStreet(dtScale * 0.4);
      updateBuildingSmoke(dt);
      updateStreetlamps(dtScale * 0.4);
      updateGroundVehicles(dt, dtScale * 0.4);
      updateDefeatDebris(dt);
      updateShockwaves(dt);
      updateBossWarning(dt);
      
      updateScreenEffects(dt);
    }

    // City parallax only off-airfield (mountains already drawn behind strip above)
    if (!(typeof isAirfieldMode === "function" && isAirfieldMode()) && !window.__airborneAirfield) {
      drawParallaxLayers();
      drawSketchSkyline();
    }
    // Campaign city ground only off airfield / training
    if (!(typeof isAirfieldMode === "function" && isAirfieldMode()) && !window.__airborneAirfield) {
      drawPowerlines();
      drawBuildings();
      drawBuildingSmoke();
      drawStreet();
      drawStreetlamps();
      drawGroundVehicles();
    }
    drawBossShadow();
    drawWindParticlesBack();
    // Training background balloons — behind blimps and clouds
    try { if (window.__airborneDrawTrainingBgBalloons) window.__airborneDrawTrainingBgBalloons(); } catch (e) {}
    drawObstacles();
    if (bossActive) {
      drawBoss();
      drawBombs();
      drawRockets();
      drawPlayerBombs();
    }
    if (typeof drawBossSinking === 'function') drawBossSinking();
    drawHitParticles(); try { if (window.PowerFX) window.PowerFX.draw(ctx); } catch (e) {}
      try { if (window.__airborneDrawFireballs) window.__airborneDrawFireballs(); } catch (e) {}
      try { if (window.__airborneDrawHeatseekers) window.__airborneDrawHeatseekers(); } catch (e) {}
      try { if (window.__airborneDrawMeteors) window.__airborneDrawMeteors(); } catch (e) {}
      try { if (window.__airborneDrawWarSharkExtras) window.__airborneDrawWarSharkExtras(); try { if (window.__airborneDrawBombBlasts) window.__airborneDrawBombBlasts(); } catch(e) {}; } catch (e) {};
    drawPowerup();
    drawBonusRound();
    drawLevelEnd();
    drawBullets();
    drawHealPickup();
    drawShieldPickup();
    drawBlimpHeadlight();
    if (typeof drawAirfieldShadow === "function") drawAirfieldShadow();
    // Ensure power-up fade never leaves the blimp transparent
    try { ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; } catch (e) {}
    try { if (window.__airborneDrawRoyalBehind) window.__airborneDrawRoyalBehind(); } catch (e) {}
        try { if (window.__airborneDrawTrainingPlatforms) window.__airborneDrawTrainingPlatforms(); } catch (e) {}
    drawPlayer(); try { if (window.__airborneDrawActivePowerVisual) window.__airborneDrawActivePowerVisual(); } catch(e) {};
    try { if (window.drawHitCoins) window.drawHitCoins(); } catch (e) {}
    try { if (typeof drawRingFronts === "function") drawRingFronts(); else if (window.__airborneDrawRingFronts) window.__airborneDrawRingFronts(); } catch (e) {}
    // Soft clouds FRONT layer OFF for now
    // drawClouds();
    // R.U.F.F. on top of world (not under strip/mountains)
    try {
      if (typeof window.__airborneDrawRuff === "function") window.__airborneDrawRuff();
    } catch (eRuff) { console.warn("drawRuff failed", eRuff); }
    try { drawTrainingRuffEmergency(typeof dt === "number" ? dt : 0.016); } catch (eER) {}
    // Platforms ON TOP so they cannot be covered
    try { drawTrainingPlatformsEmergency(); } catch (ePE) {}
    try { if (window.__airborneDrawTrainingPlatforms) window.__airborneDrawTrainingPlatforms(); } catch (e) {}
    drawWindParticlesFront();
    drawShieldEffect();
    drawStorm();
    try { if (window.__airborneDrawRoyal) window.__airborneDrawRoyal(); } catch (e) {}
    drawRain();
    drawCloudWisps();
    drawDustParticles();
    drawCheckpointPickup();
    drawBossWarning();
    drawBossBanner();
    if (typeof drawAirfieldRollSmoke === "function") drawAirfieldRollSmoke();
    if (typeof drawAirfieldTip === "function") drawAirfieldTip();
    drawDefeatDebris();
    drawShockwaves();
    drawBonusHUD();
    drawComboPopups();
    try { if (window.updateFlightTrainingBanner) window.updateFlightTrainingBanner(dt); } catch (e) {}
    try { if (window.updateEndCelebration) window.updateEndCelebration(dt); } catch (e) {}
    try { if (window.drawFlightTrainingBanner) window.drawFlightTrainingBanner(); } catch (e) {}
    try { if (window.drawEndCelebration) window.drawEndCelebration(); } catch (e) {}
    try { if (window.updateBossDamageNums) window.updateBossDamageNums(dt); } catch (e) {}
    // Vignette + film grain removed — were causing uneven dimming and lag
    } catch (err) {
      if (!loopErrorShown) {
        loopErrorShown = true;
        showRuntimeError(err);
        console.error(err);
      }
      // keep looping so a single draw glitch does not freeze a blank screen
    }

    requestAnimationFrame(loop);
  }

  loadAssets(() => {
    try {
      resize();
      initBuildings();
      initClouds();
      initParallaxLayers();
      
      resetPlayer();
      requestAnimationFrame(loop);
      if (pendingStart) {
        pendingStart = false;
        if (typeof window.__airborneOnAssetsReady === "function") {
          // Re-queue so map-level / tutorial logic runs
          window.__airbornePendingMapLevel = window.__airbornePendingMapLevel || null;
          pendingStart = true;
          try { window.__airborneOnAssetsReady(); } catch (e) { startGame(); }
        } else {
          startGame();
        }
      }
    } catch (err) {
      showRuntimeError(err);
    }
  });

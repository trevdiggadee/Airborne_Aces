"use strict";

  // ---------- Main loop ----------
  let lastTime = null;

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

  function loop(ts) {
    try {
    if (lastTime === null) lastTime = ts;
    let dt = (ts - lastTime) / 1000;
    dt = Math.min(dt, 0.033); // clamp for tab-switch hitches
    // Dramatic slow-mo while boss 1 sinks
    if (typeof defeatSlowMo !== "undefined" && defeatSlowMo &&
        typeof defeatSlowMoUntil !== "undefined" && performance.now() < defeatSlowMoUntil) {
      dt *= 0.68; // mild slow-mo — was 0.38 and felt sluggish
    } else if (typeof defeatSlowMo !== "undefined" && defeatSlowMo &&
               typeof defeatSlowMoUntil !== "undefined" && performance.now() >= defeatSlowMoUntil) {
      defeatSlowMo = false;
    }
    lastTime = ts;

    // background — slowly cycles day → dusk → night → dawn as gameplayScore climbs
    const sky = getSkyColors(gameplayScore);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const dtScale = dt * 60; // normalize movement speeds tuned at 60fps baseline

    updateParallaxLayers(dtScale);
    if (typeof updateMountainParallax === "function") updateMountainParallax(dtScale);
    updateSkyline(dtScale);
    drawSkyline();

    updateClouds(dtScale);
    updateBirdFlocks(dt);
    
    drawClouds();
    drawBirdFlocks();
    if (typeof drawAirfieldStrip === "function") drawAirfieldStrip();
    
    updateDustParticles(dt);
    
    updatePlayerBlimpAnimation(dt);

    if (state === "playing") {
      elapsedMs = performance.now() - runStartTime;
      updateFlipClock(elapsedMs);
      if (typeof updateAirfield === "function") updateAirfield(dt);
      if (typeof window.__airborneUpdateRuff === "function") window.__airborneUpdateRuff(dt);
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
      updateStorm(dt);
      updateBonusRound(dt);
      updateLevelEnd(dt);
      updateComboPopups();
      updateRain(dt);
      updateCloudWisps(dt);
      updateDefeatDebris(dt);
      updateShockwaves(dt);
      updateBossWarning(dt);
      updateScreenEffects(dt);
    } else if (state === "paused") {
      // Freeze world — still draw below, no simulation advance
    } else if (state === "start" && buildings.length === 0) {
      initBuildings();
      initClouds();
      initParallaxLayers();
      
      resetPlayer();
    } else if (state !== "playing") {
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

    if (!(typeof isAirfieldMode === "function" && isAirfieldMode()) && !window.__airborneAirfield) {
      drawParallaxLayers();
    if (typeof drawMountainParallax === "function") drawMountainParallax();
      drawSketchSkyline();
    }
    drawPowerlines();
    drawBuildings();
    drawBuildingSmoke();
    drawStreet();
    drawStreetlamps();
    drawGroundVehicles();
    drawBossShadow();
    drawWindParticlesBack();
    drawObstacles();
    if (bossActive) {
      drawBoss();
      drawBombs();
      drawRockets();
      drawPlayerBombs();
    }
    if (typeof drawBossSinking === 'function') drawBossSinking();
    drawHitParticles();
    drawPowerup();
    drawBonusRound();
    drawLevelEnd();
    drawBullets();
    drawHealPickup();
    drawShieldPickup();
    drawBlimpHeadlight();
    if (typeof drawAirfieldShadow === "function") drawAirfieldShadow();
    drawPlayer();
    if (typeof window.__airborneDrawRuff === "function") window.__airborneDrawRuff(); // companion near ship
    drawWindParticlesFront();
    drawShieldEffect();
    drawStorm();
    drawRain();
    drawCloudWisps();
    drawDustParticles();
    drawCheckpointPickup();
    drawBossWarning();
    drawBossBanner();
    if (typeof drawAirfieldTip === "function") drawAirfieldTip();
    drawDefeatDebris();
    drawShockwaves();
    drawBonusHUD();
    drawComboPopups();
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

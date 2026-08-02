"use strict";

  // ---------- Main loop ----------
  let lastTime = null;

  // ---------- Day/night sky cycle — tied to gameplayScore so it advances with real dodging skill ----------
  function getSkyColors(gpScore) {
    const stops = [
      { at: 0,   top: [245, 230, 200], bottom: [139, 111, 71] },  // day
      { at: 70,  top: [255, 178, 110], bottom: [120, 70, 60] },   // dusk
      { at: 120, top: [40, 40, 80],    bottom: [25, 20, 45] },    // night
      { at: 190, top: [255, 200, 140], bottom: [130, 90, 70] },   // dawn
      { at: 240, top: [245, 230, 200], bottom: [139, 111, 71] }   // back to day
    ];
    const cycle = ((gpScore % 240) + 240) % 240;
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
    ctx.globalAlpha = 0.05 + Math.random() * 0.025; // slight flicker frame to frame
    const jx = (Math.random() - 0.5) * 10;
    const jy = (Math.random() - 0.5) * 10;
    ctx.translate(jx, jy);
    ctx.fillStyle = filmGrainPattern;
    ctx.fillRect(-jx - 4, -jy - 4, W + 8, H + 8);
    ctx.restore();

    // soft vignette to complete the vintage-film feel
    ctx.save();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
    vg.addColorStop(0, "rgba(10,6,3,0)");
    vg.addColorStop(1, "rgba(10,6,3,0.28)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function loop(ts) {
    try {
    if (lastTime === null) lastTime = ts;
    let dt = (ts - lastTime) / 1000;
    dt = Math.min(dt, 0.033); // clamp for tab-switch hitches
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
    updateSkyline(dtScale);
    drawSkyline();

    updateClouds(dtScale);
    updateBirdFlocks(dt);
    
    drawClouds();
    drawBirdFlocks();
    
    updateDustParticles(dt);
    
    updatePlayerBlimpAnimation(dt);

    if (state === "playing") {
      elapsedMs = performance.now() - runStartTime;
      updateFlipClock(elapsedMs);
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
      updatePowerup(dt);
      updateBullets(dt);
      updateHealPickup(dt);
      updateShieldPickup(dt);
      updateWindParticles(dt);
      updateStorm(dt);
      updateBonusRound(dt);
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

    drawParallaxLayers();
    drawSketchSkyline();
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
    drawHitParticles();
    drawPowerup();
    drawBonusRound();
    drawBullets();
    drawHealPickup();
    drawShieldPickup();
    drawBlimpHeadlight();
    drawPlayer();
    drawWindParticlesFront();
    drawShieldEffect();
    drawStorm();
    drawRain();
    drawCloudWisps();
    drawDustParticles();
    drawCheckpointPickup();
    drawBossWarning();
    drawBossBanner();
    drawDefeatDebris();
    drawShockwaves();
    drawBonusHUD();
    drawComboPopups();
    if (state === "playing") drawFilmGrain();
    } catch (err) {
      if (!loopErrorShown) {
        loopErrorShown = true;
        showRuntimeError(err);
      }
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
        startGame();
      }
    } catch (err) {
      showRuntimeError(err);
    }
  });

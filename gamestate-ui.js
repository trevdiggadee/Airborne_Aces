"use strict";

  // ---------- Game state ----------
  let state = "start"; // start | playing | over | paused
  let score = 0;
  let gameplayScore = 0; // dodge-only score used for boss pacing; excludes bonus-round points
  let best = 0;
  try {
    best = parseInt(localStorage.getItem("aa_best") || "0", 10) || 0;
  } catch (e) { best = 0; }

  // ---------- Checkpoint pickup — collectible glowing item after each bonus round ----------
  let checkpointPickup = null; // { x, y, r, bobPhase, targetNum, collected, vx }
  let checkpointReached = 0; // next boss number the player still has to face (0 = none)
  let checkpointScore = 0; // score stored when checkpoint was collected — enables second life
  let checkpointGameplayScore = 0; // gameplayScore at that same moment — keeps boss pacing in sync on resume
  let checkpointBossesDefeated = 0;

  /* ===== Tutorial System ===== */
  // A short guided intro shown once at the start of a run: the guide character
  // flies in from off-screen, then walks the player through the core mechanics
  // one tip at a time before handing off to real gameplay.
  const TUTORIAL_STEPS = [
    "Tap or click anywhere to fly \u2014 let go and you'll dip back down!",
    "Dodge the buildings, birds, and balloons in your way!",
    "Watch your hearts \u2014 losing them all ends the run!",
    "Fill the storm meter by flying well, then tap it to unleash it!",
    "Reach each boss to keep the adventure going. Good luck, ace!"
  ];
  const TUTORIAL_STEP_MS = 3200; // time each tip stays up before auto-advancing

  // injects the fly-in / bob / sparkle animation once, so this file doesn't
  // depend on CSS defined elsewhere
  let tutorialStyleInjected = false;
  function injectTutorialStyle() {
    if (tutorialStyleInjected) return;
    tutorialStyleInjected = true;
    const style = document.createElement("style");
    style.textContent = `
      #tutorialGuide.tutFlyIn #tutGuideImg {
        animation: tutCharFlyIn 0.9s cubic-bezier(.25,.85,.25,1.15) both,
                   tutFloat 2.2s ease-in-out 0.9s infinite;
      }
      @keyframes tutCharFlyIn {
        0%   { opacity: 0; transform: translate(190px, -210px) rotate(24deg) scale(0.6); filter: blur(6px); }
        50%  { opacity: 1; filter: blur(1px); }
        72%  { transform: translate(-12px, 9px) rotate(-7deg) scale(1.1); filter: blur(0px); }
        88%  { transform: translate(4px, -4px) rotate(3deg) scale(0.97); }
        100% { transform: translate(0,0) rotate(0deg) scale(1); filter: blur(0px); }
      }
      @keyframes tutFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      #tutBubbleText { transition: opacity 0.18s ease; }
      #tutBubbleText.tutFading { opacity: 0; }
    `;
    document.head.appendChild(style);
  }

  function sfxTutorialArrive() {
    if (typeof playTone !== "function") return;
    playTone({ freq: 950, duration: 0.3, type: "sawtooth", vol: 0.055, sweep: -700, attack: 0.005, reverbSend: 0.2 });
    playTone({ freq: 500, duration: 0.22, type: "sine", vol: 0.04, sweep: -260, startDelay: 0.04 });
    [0, 4, 7].forEach((iv, i) => {
      playTone({ freq: (typeof noteFreq === "function" ? noteFreq(72 + iv) : 440 * Math.pow(2, (iv) / 12)),
        duration: 0.24, type: "triangle", vol: 0.09, sweep: 50, startDelay: 0.34 + i * 0.055, attack: 0.005, reverbSend: 0.3 });
    });
  }

  function sfxTutorialTip() {
    if (typeof playTone !== "function") return;
    playTone({ freq: 720, duration: 0.09, type: "triangle", vol: 0.05, sweep: 60, attack: 0.003 });
  }

  function startTutorial() {
    state = "tutorial";
    injectTutorialStyle();
    ensureAudio();

    const overlay = document.getElementById("tutorialGuide");
    const img = document.getElementById("tutGuideImg");
    const textEl = document.getElementById("tutBubbleText");
    const skipBtn = document.getElementById("tutSkipBtn");

    // dedicated tutorial guide art if it's been added to the asset list;
    // falls back to the heart mascot so this never shows a broken image
    const guideImg = (images.tutorialGuide && images.tutorialGuide.naturalWidth) ? images.tutorialGuide
      : (images.heartPickup && images.heartPickup.naturalWidth) ? images.heartPickup : null;
    img.src = guideImg ? guideImg.src : "";

    overlay.classList.remove("hidden");
    overlay.classList.remove("tutFlyIn");
    void overlay.offsetWidth; // restart the fly-in animation each time this runs
    overlay.classList.add("tutFlyIn");
    sfxTutorialArrive();

    let step = 0;
    let done = false;
    let stepTimer = null;

    function showStep(i) {
      textEl.classList.add("tutFading");
      setTimeout(() => {
        textEl.textContent = TUTORIAL_STEPS[i];
        textEl.classList.remove("tutFading");
        sfxTutorialTip();
      }, 180);
    }

    function nextStep() {
      if (done) return;
      step++;
      if (step >= TUTORIAL_STEPS.length) { finish(); return; }
      showStep(step);
      stepTimer = setTimeout(nextStep, TUTORIAL_STEP_MS);
    }

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(stepTimer);
      overlay.classList.add("hidden");
      overlay.classList.remove("tutFlyIn");
      skipBtn.removeEventListener("click", finish);
      if (state === "tutorial") { state = "playing"; startGame(); }
    }

    // first tip shows right as the guide lands, timed to its fly-in
    setTimeout(() => showStep(0), 850);
    stepTimer = setTimeout(nextStep, 850 + TUTORIAL_STEP_MS);

    skipBtn.addEventListener("click", finish);
  }
 // bossesDefeatedCount at that same moment — keeps the level/background in sync on resume

  const startOverlay = document.getElementById("startOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const scoreVal = document.getElementById("scoreVal");

  function bumpScorePop() {
    scoreVal.classList.remove("pop");
    void scoreVal.offsetWidth; // restart the animation
    scoreVal.classList.add("pop");
  }

  // ---------- Survival timer (top-right) ----------
  const timerFrame = document.getElementById("timerFrame");
  let runStartTime = 0;
  let elapsedMs = 0;

// ---------- Flip Clock logic — mechanical card flip animation ----------
  const flipClockState = { m1: '0', m2: '0', s1: '0', s2: '0' };

  function updateFlipClock(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const mStr = String(m).padStart(2, '0');
    const sStr = String(s).padStart(2, '0');
    const newDigits = { m1: mStr[0], m2: mStr[1], s1: sStr[0], s2: sStr[1] };

    Object.entries(newDigits).forEach(([pos, newVal]) => {
      const oldVal = flipClockState[pos];
      if (newVal !== oldVal) {
        flipClockState[pos] = newVal;
        animateFlip(pos, oldVal, newVal);
      }
    });
  }

  function animateFlip(pos, fromVal, toVal) {
    const staticEl = document.getElementById('fc-' + pos + '-static');
    const cardEl = document.getElementById('fc-' + pos);
    const topEl = document.getElementById('fc-' + pos + '-top');
    const bottomEl = document.getElementById('fc-' + pos + '-bottom');

    if (!staticEl || !cardEl || !topEl || !bottomEl) return;

    // Set up the flip: top half shows old value, bottom half will show new value
    topEl.querySelector('.digit').textContent = fromVal;
    bottomEl.querySelector('.digit').textContent = toVal;

    // Show the animated card, hide the static one
    staticEl.style.display = 'none';
    cardEl.style.display = '';

    // Reset animations
    topEl.classList.remove('flipping');
    bottomEl.classList.remove('flipping');
    void topEl.offsetWidth; // force reflow

    // Start the flip
    topEl.classList.add('flipping');
    bottomEl.classList.add('flipping');

    // After animation completes, update static to new value and show it
    setTimeout(() => {
      staticEl.textContent = toVal;
      staticEl.style.display = '';
      cardEl.style.display = 'none';
      topEl.classList.remove('flipping');
      bottomEl.classList.remove('flipping');
    }, 450);
  }

  // ---------- Health (4 hits before a crash) ----------
  const MAX_HEALTH = 4;
  const HEART_KEYS = ["asset_extra_11", "asset_extra_12", "asset_extra_13", "asset_extra_14", "heartPickup"];
  const HEART_URLS = [
    "asset_extra_11.webp?cb=2", // 0 hits left
    "asset_extra_12.webp?cb=2",   // 1 hit left
    "asset_extra_13.webp?cb=2",   // 2 hits left
    "asset_extra_14.webp?cb=2",   // 3 hits left
    "heartPickup.webp?cb=2"   // 4 hits left (full health)
  ];
  const HEART_IMAGES = PLACEHOLDER_MODE ? HEART_KEYS.map(renderPlaceholder) : HEART_URLS;
  const MAX_BONUS_HEARTS = 2; // how many extra hearts can stack on top of a full bar
  const healthMeter = document.getElementById("healthMeter");
  const healthImg = document.getElementById("healthImg");
  const bonusHeartsEl = document.getElementById("bonusHearts");
  let health = MAX_HEALTH;
  let invulnerableUntil = 0; // timestamp (ms) — no damage taken before this
  window.__airborneCollectRings = 0;
  window.__airborneCollectCrystals = 0;

  function updateCollectDock() {
    const r = document.getElementById("collectRings");
    const c = document.getElementById("collectCrystals");
    const p = document.getElementById("collectPowerPct");
    if (r) {
      const v = String(window.__airborneCollectRings || 0);
      if (r.textContent !== v) {
        r.textContent = v;
        r.classList.remove("pop"); void r.offsetWidth; r.classList.add("pop");
      }
    }
    if (c) {
      const v = String(window.__airborneCollectCrystals || 0);
      if (c.textContent !== v) {
        c.textContent = v;
        c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop");
      }
    }
    let charge = 0;
    if (typeof stormCharge === "number") {
      const maxC = (typeof STORM_MAX === "number" && STORM_MAX > 0) ? STORM_MAX : 100;
      charge = Math.max(0, Math.min(1, stormCharge / maxC));
    }
    if (p) {
      const v = String(Math.round(charge * 100));
      if (p.textContent !== v) {
        p.textContent = v;
        p.classList.remove("pop"); void p.offsetWidth; p.classList.add("pop");
      }
    }
  }
  window.updateCollectDock = updateCollectDock;

  function ensureCollectDock() {
    let dock = document.getElementById("collectDock");
    if (!dock) {
      dock = document.createElement("div");
      dock.id = "collectDock";
      dock.innerHTML =
        '<div class="cd-panel cd-rings"><div class="cd-icon cd-ring-icon"></div>' +
        '<div class="cd-counter"><span class="cd-digit" id="collectRings">0</span></div></div>' +
        '<div class="cd-panel cd-crystals"><div class="cd-icon cd-crystal-icon"></div>' +
        '<div class="cd-counter"><span class="cd-digit" id="collectCrystals">0</span></div></div>' +
        '<div class="cd-panel cd-power"><div class="cd-icon cd-power-icon"></div>' +
        '<div class="cd-counter"><span class="cd-digit" id="collectPowerPct">0</span></div></div>';
      const host = document.getElementById("gameScreen") || document.body;
      host.appendChild(dock);
    }
    // Under HUD, centered — inline styles as safety net
    dock.style.cssText =
      "position:fixed;left:50%;transform:translateX(-50%);" +
      "top:calc(20.39vw + 6px);bottom:auto;z-index:14;" +
      "display:flex;align-items:center;justify-content:center;gap:8px;" +
      "background:none;border:none;box-shadow:none;" +
      "opacity:1;visibility:visible;pointer-events:auto;";

    let mute = document.getElementById("muteBtn");
    if (!mute) {
      mute = document.createElement("button");
      mute.id = "muteBtn";
      mute.type = "button";
      mute.setAttribute("aria-label", "Pause and settings");
      dock.appendChild(mute);
    } else if (mute.parentElement !== dock) {
      dock.appendChild(mute);
    }
    mute.classList.add("cd-mute");
    if (!mute.querySelector(".cd-mute-gear")) {
      mute.innerHTML = '<span class="cd-mute-gear">⚙</span>';
    }
    // Clear any old fixed top positioning
    mute.style.position = "relative";
    mute.style.left = "auto";
    mute.style.right = "auto";
    mute.style.top = "auto";
    mute.style.bottom = "auto";
    mute.style.zIndex = "14";
    updateCollectDock();
  }
  window.ensureCollectDock = ensureCollectDock;

  function updateHealthDisplay() {
    healthImg.src = HEART_IMAGES[Math.max(0, Math.min(MAX_HEALTH, health))];

    const bonus = Math.max(0, health - MAX_HEALTH);
    while (bonusHeartsEl.children.length > bonus) {
      bonusHeartsEl.removeChild(bonusHeartsEl.lastChild);
    }
    while (bonusHeartsEl.children.length < bonus) {
      const img = document.createElement("img");
      img.src = HEART_IMAGES[4];
      img.alt = "Bonus heart";
      bonusHeartsEl.appendChild(img);
    }
  }

  function takeHit() {
    if (state !== "playing") return;
    if (bonusActive) return;
    // Scripted airfield phases — no damage
    if (window.__airborneAirfieldInvuln ||
        (window.__airborneAirfield &&
         (window.__airborneAirfieldPhase === "taxi" ||
          window.__airborneAirfieldPhase === "accel" ||
          window.__airborneAirfieldPhase === "climb" ||
          window.__airborneAirfieldPhase === "land" ||
          window.__airborneAirfieldPhase === "rollout" ||
          window.__airborneAirfieldPhase === "skid" ||
          window.__airborneAirfieldPhase === "score" ||
          window.__airborneAirfieldPhase === "done"))) {
      return;
    }
    if (shieldActive) {
      spawnHitParticles(player.x, player.y);
      sfxDeflect();
      shieldImpactTime = performance.now();
      return;
    }
    // Shared i-frames — prevents multi-hit / meter flicker same frame
    if (performance.now() < invulnerableUntil) return;

    health--;
    dodgeStreak = 0;
    if (health < 0) health = 0;
    updateHealthDisplay();
    if (healthMeter) {
      healthMeter.classList.remove("hit");
      void healthMeter.offsetWidth;
      healthMeter.classList.add("hit");
    }
    invulnerableUntil = performance.now() + 1600;
    try { sfxHit(); } catch (e) {}
    try { triggerScreenShake(3, 160); } catch (e) {}
    try { spawnHitParticles(player.x, player.y); } catch (e) {}

    // Training: never game-over — soft recover at 0, longer i-frames (less flicker)
    if (window.__airborneAirfield && window.__airborneAirfieldPhase === "lesson") {
      if (health <= 0) {
        health = MAX_HEALTH;
        updateHealthDisplay();
        if (typeof player !== "undefined" && player) {
          player.y = H * 0.4;
          player.vy = 0;
        }
        invulnerableUntil = performance.now() + 2200;
      }
      return;
    }

    if (health <= 0) {
      crash();
    }
  }

  function startGame() {
    ensureAudio();
    setMusicTheme(THEME_NORMAL);
    startMusic();
    // force hide overlays
    document.getElementById("startOverlay").classList.add("hidden");
    document.getElementById("gameOverOverlay").classList.add("hidden");
    score = 0;
    gameplayScore = 0;
    dodgeStreak = 0;
    comboPopups = [];
    shieldPickup = null;
    shieldActive = false;
    shieldSpawnTimer = 25 + Math.random() * 15;
    rainDrops = [];
    lightningState = null;
    lightningTimer = 3 + Math.random() * 3;
    stormCloudsDecorative = []; cloudWisps = [];
    scoreVal.textContent = "0";
    elapsedMs = 0;
    runStartTime = performance.now();
    updateFlipClock(elapsedMs);
    health = MAX_HEALTH;
    invulnerableUntil = 0;
    updateHealthDisplay();
    obstacles = [];
    spawnTimer = 0;
    spawnInterval = 1.7;
    obstacleSpeed = 220;
    lastBossTriggered = 0;
    checkpointPickup = null;
    checkpointReached = 0;
    checkpointScore = 0;
    checkpointGameplayScore = 0;
    checkpointBossesDefeated = 0;
    bossNumber = 0;
    bossesDefeatedCount = 0;
    bossActive = false;
    boss = null;
    powerup = null;
    hasFirepower = false;
    hasDualFire = false;
    hasArcBomb = false;
    powerupRespawnTimer = 0;
    bullets = [];
    bulletTimer = 0;
    bombs = [];
    bombTimer = 0;
    playerBombs = [];
    playerBombTrailParticles = [];
    arcBombTimer = 0;
    bonusActive = false;
    bonusType = null;
    bonusPending = false;
    if (typeof levelEndActive !== "undefined") { levelEndActive = false; levelEndPhase = null; levelEndPad = null; levelEndFade = 0; }
    if (typeof stopWorldWindDown === "function") stopWorldWindDown();
    window.__airborneWorldFrozen = false;
    if (typeof resetHudFade === "function") resetHudFade();
    if (typeof initBuildings === "function") initBuildings();
    if (typeof initParallaxLayers === "function") initParallaxLayers();
    // Force baseline scroll speed every fresh run (retry included)
    obstacleSpeed = 220;
    spawnInterval = 1.7;
    bonusPendingType = null;
    bonusItems = [];
    bonusTotal = 0;
    bonusCollected = 0;
    bonusPoints = 0;
    rockets = [];
    rocketTimer = 0;
    bossThrowFrame = 0;
    bossThrowFrameTimer = 0;
    bossThrowBombSpawned = false;
    bossBanner = null;
    bossHitFlashUntil = 0;
    bossShakeUntil = 0;
    hitParticles = [];
    explosionBursts = [];
    windParticles = [];
    healPickup = null;
    healSpawnTimer = 6 + Math.random() * 5;
    stormCharge = 0;
    stormMilestoneCount = Math.floor(score / STORM_CHARGE_PER_MILESTONE);
    stormWasReady = false;
    stormActive = false;
    stormCloud = null;
    stormChainBolts = [];
    updateStormMeterDisplay();
    defeatDebris = [];
    shockwaves = [];
    groundVehicles = [];
    buildingSmokeParticles = [];
    defeatSlowMo = false;
    resetPlayer();
    blimpPersonality.squashX = 1;
    blimpPersonality.squashY = 1;
    blimpPersonality.exhaustParticles = [];
    blimpPersonality.propAngle = 0;
    blimpPersonality.propBlurOpacity = 0;
    initBuildings();
    initClouds();
    birdFlocks = [];
    birdFlockTimer = 6 + Math.random() * 8;
    initParallaxLayers();

    // Map level select — jump progress so you're actually on that stage
    const mapLvl = window.__airbornePendingMapLevel;
    window.__airbornePendingMapLevel = null;
    state = "playing";
    startOverlay.classList.add("hidden");
    gameOverOverlay.classList.add("hidden");

    if (mapLvl && mapLvl >= 2) {
      applyMapLevelProgress(mapLvl);
    } else {
      // Always train on level 1 / hangar start
      window.__airbornePendingMapLevel = null;
      const startTrain = window.beginAirfieldTraining ||
        (typeof beginAirfieldTraining === "function" ? beginAirfieldTraining : null);
      if (startTrain) {
        try {
          startTrain();
          console.log("[Airborne] Training started", window.__airborneAirfield, window.__airborneAirfieldPhase, window.__airborneRuffStage);
        } catch (err) {
          console.error("[Airborne] Training failed", err);
        }
        if (typeof player !== "undefined" && player && typeof groundLevelY === "function") {
          const gy = groundLevelY();
          const ph = player.h > 0 ? player.h : 40;
          player.y = gy - ph * 0.15;
          player.x = W * 0.25;
          player.vy = 0;
          player.rotation = 0;
        }
      } else {
        console.error("[Airborne] beginAirfieldTraining missing");
        showBanner("LEVEL 1", 2000, "level");
      }
    }
  }

  // Map post 1..6 → bosses already cleared, score at that stage's floor
  function applyMapLevelProgress(mapLevelId) {
    const lvl = Math.max(1, Math.min(6, Number(mapLevelId) || 1));
    const defeated = Math.min(5, lvl - 1);
    const thresholds = [0, 50, 100, 150, 200, 250];
    const gp = thresholds[defeated] || 0;

    // Write progress in bosses.js scope (shared lets), not a phantom global
    if (typeof window.__airborneSetRunProgress === "function") {
      window.__airborneSetRunProgress(defeated, gp);
    } else {
      bossesDefeatedCount = defeated;
      lastBossTriggered = defeated;
    }
    gameplayScore = gp;
    score = gp;
    if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
    checkpointReached = defeated;
    checkpointScore = score;
    checkpointGameplayScore = gameplayScore;
    checkpointBossesDefeated = defeated;

    if (typeof initBuildings === "function") initBuildings();
    if (typeof initParallaxLayers === "function") initParallaxLayers();
    if (typeof initClouds === "function") initClouds();
    // Banner after art refresh so it isn't overwritten by LEVEL 1
    showBanner("LEVEL " + lvl, 2400, "level");
  }
  window.__airborneApplyMapLevel = applyMapLevelProgress;

  function crash() {
    if (state !== "playing") return;
    state = "over";
    state = "over";
    window.__airborneWorldFrozen = false;
    if (typeof stopWorldWindDown === "function") stopWorldWindDown();
    if (typeof resetHudFade === "function") resetHudFade();
    sfxCrash();
    triggerScreenShake(10, 600);
    triggerScreenFlash(0.4, 400);
    stopMusic();
    defeatDebris = [];
    shockwaves = [];
    groundVehicles = [];
    buildingSmokeParticles = [];
    defeatSlowMo = false;
    if (score > best) {
      best = score;
      try { localStorage.setItem("aa_best", String(best)); } catch (e) {}
    }
    document.getElementById("finalScore").textContent = score;
    document.getElementById("bestScoreLine").textContent = "Best: " + best;
    const hideCk = checkpointReached <= 0 || window.__airborneAirfield || window.__airborneRuffActive;
    document.getElementById("checkpointBtn").classList.toggle("hidden", hideCk);
    gameOverOverlay.classList.remove("hidden");
  }

  document.getElementById("startBtn").addEventListener("click", () => { ensureAudio(); sfxClick(); startGame(); document.getElementById("startOverlay").classList.add("hidden"); });
  document.getElementById("retryBtn").addEventListener("click", () => { ensureAudio(); sfxClick(); startGame(); });

  document.getElementById("checkpointBtn").addEventListener("click", () => {
    ensureAudio();
    sfxClick();
    restartFromCheckpoint();
  });

  document.getElementById("menuBtn").addEventListener("click", () => {
    ensureAudio();
    sfxClick();
    state = "start";
    checkpointReached = 0;
    checkpointScore = 0;
    checkpointGameplayScore = 0;
    checkpointBossesDefeated = 0;
    gameOverOverlay.classList.add("hidden");
    document.getElementById("gameScreen").style.display = "none";
    const menuScreenEl = document.getElementById("menuScreen");
    menuScreenEl.style.display = "";
    if (window.__airborneShowMenu) window.__airborneShowMenu();
  });

  function restartFromCheckpoint() {
    // If still in / was training, never jump to level landing — restart training
    if (window.__airborneAirfield || window.__airborneRuffActive) {
      ensureAudio();
      gameOverOverlay.classList.add("hidden");
      if (typeof beginAirfieldTraining === "function") beginAirfieldTraining();
      else if (window.beginAirfieldTraining) window.beginAirfieldTraining();
      state = "playing";
      health = MAX_HEALTH;
      updateHealthDisplay();
      return;
    }
    // Resume game from last checkpoint — keep score, reset health, clear threats
    ensureAudio();
    setMusicTheme(THEME_NORMAL);
    startMusic();
    window.__airborneWorldFrozen = false;
    if (typeof stopWorldWindDown === "function") stopWorldWindDown();
    if (typeof resetHudFade === "function") resetHudFade();

    // Restore score to checkpoint level
    score = checkpointScore;
    scoreVal.textContent = score;
    // gameplayScore and lastBossTriggered drive boss pacing — without restoring
    // these too, they'd stay at their pre-crash values (later than the checkpoint),
    // which could let the player skip straight past a boss they never actually beat
    gameplayScore = checkpointGameplayScore;
    bossesDefeatedCount = checkpointBossesDefeated;
    lastBossTriggered = Math.max(0, checkpointReached - 1);

    // Reset health
    health = MAX_HEALTH;
    invulnerableUntil = performance.now() + 2000;
    updateHealthDisplay();

    // Clear all threats
    obstacles = [];
    bombs = [];
    rockets = [];
    playerBombs = [];
    playerBombTrailParticles = [];
    bullets = [];
    hitParticles = [];
    explosionBursts = [];
    windParticles = [];
    comboPopups = [];

    // Clear boss state
    bossActive = false;
    boss = null;
    bossNumber = 0;
    bossThrowFrame = 0;
    bossThrowFrameTimer = 0;
    bossThrowBombSpawned = false;
    bossBanner = null;
    bossHitFlashUntil = 0;
    bossShakeUntil = 0;

    // Clear powerups and pickups
    powerup = null;
    hasFirepower = false;
    hasDualFire = false;
    hasArcBomb = false;
    powerupRespawnTimer = 0;
    checkpointPickup = null;
    healPickup = null;
    shieldPickup = null;
    shieldActive = false;

    // Reset timers
    spawnTimer = 0;
    spawnInterval = Math.max(0.95, 1.7 - score * 0.03);
    obstacleSpeed = 220 + Math.min(160, score * 6);
    bulletTimer = 0;
    bombTimer = 0;
    rocketTimer = 0;
    arcBombTimer = 0;
    healSpawnTimer = 6 + Math.random() * 5;
    shieldSpawnTimer = 25 + Math.random() * 15;

    // Reset bonus state
    bonusActive = false;
    bonusType = null;
    bonusPending = false;
    bonusPendingType = null;
    bonusItems = [];
    bonusTotal = 0;
    bonusCollected = 0;
    bonusPoints = 0;

    // Reset storm
    stormCharge = 0;
    stormCloudsDecorative = []; cloudWisps = [];
    stormMilestoneCount = 0;
    stormWasReady = false;
    stormActive = false;
    stormCloud = null;
    stormChainBolts = [];
    updateStormMeterDisplay();
    defeatDebris = [];
    shockwaves = [];
    groundVehicles = [];
    buildingSmokeParticles = [];
    defeatSlowMo = false;

    // Reset player
    resetPlayer();
    blimpPersonality.squashX = 1;
    blimpPersonality.squashY = 1;
    blimpPersonality.exhaustParticles = [];
    blimpPersonality.propAngle = 0;
    blimpPersonality.propBlurOpacity = 0;

    // Reset buildings and clouds
    initBuildings();
    initClouds();
    initParallaxLayers(); // resync the background to the restored level immediately — no crossfade, no stray "LEVEL X" banner

    // Resume
    state = "playing";
    runStartTime = performance.now() - elapsedMs;
    gameOverOverlay.classList.add("hidden");
    showBanner("RESUMED FROM CHECKPOINT!", 2000, "checkpoint");
  }


  // ---------- In-game pause / volume panel (bottom-right ⚙) ----------
  let pausedFromState = "playing";
  const pauseOverlay = document.getElementById("pauseOverlay");
  const pauseMusicSlider = document.getElementById("pauseMusicSlider");
  const pauseSfxSlider = document.getElementById("pauseSfxSlider");
  const pauseMusicVal = document.getElementById("pauseMusicVal");
  const pauseSfxVal = document.getElementById("pauseSfxVal");
  const pauseResumeBtn = document.getElementById("pauseResumeBtn");
  const pauseMuteToggle = document.getElementById("pauseMuteToggle");

  function syncPauseSliders() {
    const mv = Math.round(((typeof musicVolumePref !== "undefined") ? musicVolumePref : 0.25) * 100);
    const sv = Math.round(((typeof sfxVolumePref !== "undefined") ? sfxVolumePref : 1) * 100);
    if (pauseMusicSlider) pauseMusicSlider.value = String(mv);
    if (pauseSfxSlider) pauseSfxSlider.value = String(sv);
    if (pauseMusicVal) pauseMusicVal.textContent = mv + "%";
    if (pauseSfxVal) pauseSfxVal.textContent = sv + "%";
    const isMuted = (typeof muted !== "undefined") ? muted : false;
    if (pauseMuteToggle) pauseMuteToggle.textContent = isMuted ? "Unmute All" : "Mute All";
  }

  function setMusicVolFromUI(pct) {
    const v = Math.max(0, Math.min(1, pct / 100));
    if (typeof setMusicVolumePref === "function") setMusicVolumePref(v);
    else if (window.__airborneSetMusicVolume) window.__airborneSetMusicVolume(v);
    // Direct fallback on the MP3 element
    const gm = document.getElementById("gameplayMusic");
    if (gm) {
      const isMuted = (typeof muted !== "undefined" && muted);
      gm.volume = isMuted ? 0 : v;
    }
    if (pauseMusicVal) pauseMusicVal.textContent = Math.round(v * 100) + "%";
  }

  function setSfxVolFromUI(pct) {
    const v = Math.max(0, Math.min(1, pct / 100));
    if (typeof setSfxVolumePref === "function") setSfxVolumePref(v);
    if (pauseSfxVal) pauseSfxVal.textContent = Math.round(v * 100) + "%";
  }

  function openPauseMenu() {
    if (state !== "playing" && state !== "bossDialogue") return;
    pausedFromState = state;
    state = "paused";
    syncPauseSliders();
    if (pauseOverlay) {
      pauseOverlay.classList.remove("hidden");
      pauseOverlay.setAttribute("aria-hidden", "false");
    }
    if (typeof sfxClick === "function") sfxClick();
  }

  function closePauseMenu() {
    if (state !== "paused") return;
    state = pausedFromState || "playing";
    if (pauseOverlay) {
      pauseOverlay.classList.add("hidden");
      pauseOverlay.setAttribute("aria-hidden", "true");
    }
    if (typeof sfxClick === "function") sfxClick();
  }

  if (pauseMusicSlider) {
    pauseMusicSlider.addEventListener("input", () => {
      setMusicVolFromUI(parseInt(pauseMusicSlider.value, 10));
    });
    pauseMusicSlider.addEventListener("change", () => {
      setMusicVolFromUI(parseInt(pauseMusicSlider.value, 10));
    });
    pauseMusicSlider.addEventListener("pointerdown", (e) => e.stopPropagation());
    pauseMusicSlider.addEventListener("click", (e) => e.stopPropagation());
  }
  if (pauseSfxSlider) {
    pauseSfxSlider.addEventListener("input", () => {
      setSfxVolFromUI(parseInt(pauseSfxSlider.value, 10));
    });
    pauseSfxSlider.addEventListener("change", () => {
      setSfxVolFromUI(parseInt(pauseSfxSlider.value, 10));
    });
    pauseSfxSlider.addEventListener("pointerdown", (e) => e.stopPropagation());
    pauseSfxSlider.addEventListener("click", (e) => e.stopPropagation());
  }
  if (pauseResumeBtn) {
    pauseResumeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closePauseMenu();
    });
  }
  if (pauseMuteToggle) {
    pauseMuteToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof ensureAudio === "function") ensureAudio();
      const next = !(typeof muted !== "undefined" && muted);
      if (typeof setMuted === "function") setMuted(next);
      else if (window.__airborneSetMuted) window.__airborneSetMuted(next);
      // Direct MP3 mute/unmute
      const gm = document.getElementById("gameplayMusic");
      if (gm) {
        if (next) gm.volume = 0;
        else gm.volume = (typeof musicVolumePref !== "undefined") ? musicVolumePref : 0.25;
      }
      syncPauseSliders();
      const btn = document.getElementById("muteBtn");
      if (btn) {
        btn.dataset.mode = "settings";
        btn.textContent = "⚙";
      }
    });
  }
  if (pauseOverlay) {
    pauseOverlay.addEventListener("click", (e) => {
      if (e.target === pauseOverlay) closePauseMenu();
    });
  }

  const muteBtn = document.getElementById("muteBtn");
  if (muteBtn) {
    muteBtn.dataset.mode = "settings";
    muteBtn.classList.add("cd-mute");
    muteBtn.innerHTML = '<span class="cd-mute-gear">⚙</span>';
    muteBtn.setAttribute("aria-label", "Pause and settings");
    muteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof ensureAudio === "function") ensureAudio();
      if (state === "paused") {
        closePauseMenu();
      } else if (state === "playing" || state === "bossDialogue") {
        openPauseMenu();
      } else {
        // Menu / game-over — toggle mute only
        const next = !(typeof muted !== "undefined" && muted);
        if (typeof setMuted === "function") setMuted(next);
        muteBtn.dataset.mode = "settings";
        muteBtn.classList.add("cd-mute");
        muteBtn.innerHTML = '<span class="cd-mute-gear">⚙</span>';
      }
    });
  }

  // Bridge for the menu screen: calling this begins gameplay immediately,
  // skipping this screen's own start overlay. If assets are still loading
  // (should be near-instant since they're embedded base64), the start is
  // queued and fires the moment loading finishes.
  let pendingStart = false;
  function bridgeStart() {
    if (assetsLoaded === assetKeys.length) {
      if (window.__airbornePendingMapLevel && Number(window.__airbornePendingMapLevel) >= 1) {
        startGame();
      } else {
        startTutorial();
      }
    } else {
      pendingStart = true;
    }
  }
  window.__airborneGameStart = bridgeStart;

  // When assets finish loading after a map-start was queued
  window.__airborneOnAssetsReady = function() {
    if (!pendingStart) return;
    pendingStart = false;
    if (window.__airbornePendingMapLevel && Number(window.__airbornePendingMapLevel) >= 1) {
      startGame();
    } else {
      startTutorial();
    }
  };

  function handleInput(e) {
    if (e.cancelable) e.preventDefault();
    ensureAudio();
    // Mark hold immediately so takeoff accel responds same frame
    if (state === "playing" && window.__airborneAirfield &&
        (window.__airborneAirfieldPhase === "taxi" || window.__airborneAirfieldPhase === "accel") &&
        window.__airborneRuffStage !== "intro") {
      window.__airborneAirfieldHold = true;
    }
    if (state === "playing") flap();
  }
  function handleInputUp(e) {
    // Only clear hold when no touches remain
    if (e && e.touches && e.touches.length > 0) return;
    window.__airborneAirfieldHold = false;
  }
  canvas.addEventListener("touchstart", handleInput, { passive: false });
  canvas.addEventListener("mousedown", handleInput);
  canvas.addEventListener("pointerdown", handleInput);
  // Capture holds even if a HUD element is under the finger
  document.addEventListener("pointerdown", function(e) {
    if (state === "playing" && window.__airborneAirfield &&
        (window.__airborneAirfieldPhase === "taxi" || window.__airborneAirfieldPhase === "accel")) {
      window.__airborneAirfieldHold = true;
      if (typeof window.__airborneAirfieldBoost === "function") window.__airborneAirfieldBoost();
    }
  }, true);
  canvas.addEventListener("touchend", handleInputUp, { passive: true });
  canvas.addEventListener("touchcancel", handleInputUp, { passive: true });
  canvas.addEventListener("mouseup", handleInputUp);
  canvas.addEventListener("pointerup", handleInputUp);
  window.addEventListener("mouseup", handleInputUp);
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      ensureAudio();
      if (state === "playing") flap();
    }
  });


  // =====================================================================
  // FEATURE ADDITIONS: Screen Effects, Atmospheric Particles, 
  // Parallax Layers, Blimp Personality
  // =====================================================================

  // ---------- Screen Effects System ----------
  const screenChromatic = document.getElementById('screenChromatic');
  const screenFlash = document.getElementById('screenFlash');
  let screenShakeIntensity = 0;
  let screenShakeDecay = 0;
  let screenShakeOffsetX = 0;
  let screenShakeOffsetY = 0;

  function triggerScreenShake(intensity, durationMs) {
    screenShakeIntensity = intensity;
    screenShakeDecay = intensity / (durationMs / 1000);
  }

  function updateScreenEffects(dt) {
    // Chromatic aberration on high-speed moments
    if (screenChromatic) {
      const speed = Math.abs(player.vy);
      const chromaIntensity = Math.min(1, (speed - 300) / 400);
      screenChromatic.classList.toggle('active', chromaIntensity > 0.3 || bossActive);
      screenChromatic.style.opacity = (0.05 + chromaIntensity * 0.08).toFixed(3);
    }

    // Screen shake decay
    if (screenShakeIntensity > 0) {
      screenShakeIntensity -= screenShakeDecay * dt;
      if (screenShakeIntensity < 0) screenShakeIntensity = 0;
      screenShakeOffsetX = (Math.random() - 0.5) * screenShakeIntensity * 2;
      screenShakeOffsetY = (Math.random() - 0.5) * screenShakeIntensity * 2;
      canvas.style.transform = 'translate(' + screenShakeOffsetX.toFixed(1) + 'px,' + screenShakeOffsetY.toFixed(1) + 'px)';
    } else {
      canvas.style.transform = '';
    }
  }

  function triggerScreenFlash(opacity, durationMs) {
    if (!screenFlash) return;
    screenFlash.style.opacity = opacity;
    screenFlash.style.transition = 'opacity ' + (durationMs * 0.3) + 'ms ease-in, opacity ' + (durationMs * 0.7) + 'ms ease-out ' + (durationMs * 0.3) + 'ms';
    requestAnimationFrame(() => {
      screenFlash.style.opacity = '0';
    });
  }


"use strict";

// ============================================================
// R.U.F.F. — Radio Utility Flight Friend (Training Instructor)
// ============================================================

(function () {
  const RUFF_FRAME_COUNT = 36;
  const CRYSTAL_FRAME_COUNT = 25;
  const CRYSTAL_SCORE = 15;

  // Pilot rank progression — HUD shows Rookie until end-of-level rank-up
  const PILOT_RANKS = [
    { id: 0, name: "Cadet",           title: "Starting pilot",   minScore: 0 },
    { id: 1, name: "Air Scout",       title: "Learning the skies", minScore: 500 },
    { id: 2, name: "Sky Ranger",      title: "Proven pilot",     minScore: 1200 },
    { id: 3, name: "Squadron Leader", title: "Experienced ace",  minScore: 2500 },
    { id: 4, name: "Ace Pilot",       title: "Elite flyer",      minScore: 4000 },
    { id: 5, name: "Sky Marshal",     title: "Master of the air", minScore: 6000 },
    { id: 6, name: "Legendary Ace",   title: "Ultimate rank",    minScore: 10000 }
  ];

  function getPilotRank(totalScore, stats) {
    // Training / early game: always Cadet. Higher ranks unlock with future achievements.
    void totalScore; void stats;
    return PILOT_RANKS[0];
    // Future:
    // let rank = PILOT_RANKS[0];
    // for (let i = 0; i < PILOT_RANKS.length; i++) {
    //   if ((totalScore || 0) >= PILOT_RANKS[i].minScore) rank = PILOT_RANKS[i];
    // }
    // return rank;
  }

  // ---------- State ----------
  let ruffActive = false;
  let ruffStage = "idle"; // see STAGES
  let ruffStageT = 0;
  let ruffLineIdx = 0;
  let ruffLineT = 0;
  let ruffLines = [];
  let ruffWaitingInput = false;
  let ruffWaitingCollect = 0; // crystals needed
  let ruffWaitingAvoid = false;
  let ruffWaitingRing = 0;
  let ruffBob = 0;
  let ruffFrame = 0;
  let ruffFrameT = 0;
  let ruffX = 0;
  let ruffJetParticles = [];
  let ruffSpeakLines = [];
  let ruffMotionGhosts = [];
  let ruffY = 0;
  let ruffSpeakClose = 0;
  let ruffTilt = 0;
  let ruffScalePulse = 1;
  let ruffStats = {
    crystals: 0,
    coins: 0,
    rings: 0,
    powerups: 0,
    obstaclesAvoided: 0,
    bestCombo: 0,
    landingStars: 3
  };
  let ruffCrystals = [];
  let ruffCoins = [];
    ruffAirship = null;
    window.__airborneAirshipCleared = false;
  const COIN_SCORE = 10;
  let ruffMarkers = [];
  let ruffCombo = 0;
  let ruffSkipAll = false;
  let ruffIntroDone = false;
  let ruffSparkles = [];
  let ruffIntroFly = false;
  let ruffIntroFlyT = 0;
  let ruffIntroLineArmed = false;
  let ruffPowerOrb = null;

  // Stage order
  const STAGE_ORDER = [
    "intro",
    "takeoff",
    "altitude",
    "crystals",
    "obstacles",
    "shield",
    "powerup",
    "rings",
    "combined",
    "landing",
    "report"
  ];

  const DIALOGUE = {
    intro: [
      "Testing… testing… can you hear me, rookie?",
      "Excellent. That means the radio works.",
      "Whether the pilot works remains to be determined.",
      "I'm R.U.F.F. Your Radio Utility Flight Friend.",
      "Today I'll teach you everything before real airspace."
    ],
    takeoff: [
      "First lesson: getting off the ground.",
      "HOLD the screen to accelerate down the runway.",
      "There we go! Easy does it — you're flying now."
    ],
    altitude: [
      "Your blimp doesn't just go up. You control how high she flies.",
      "Small taps. Small movements. Stay between the markers."
    ],
    crystals: [
      "See those blue crystals? Those are Sky Crystals.",
      "Collect them whenever you can — they boost your score."
    ],
    obstacles: [
      "Now let's see if you can avoid something.",
      "Birds, balloons, and other flyers will cost you a heart if you hit them.",
      "Steer around them — I recommend not flying directly into one."
    ],
    shield: [
      "See that glowing shield icon?",
      "Grab it and you'll be protected for a short time.",
      "Hits bounce off while the shield is up — very handy."
    ],
    powerup: [
      "Now THAT is something you want. Power-up ahead!",
      "Power-ups give special abilities. Use them wisely."
    ],
    rings: [
      "Alright, rookie. Time for some precision flying.",
      "Fly through the rings. Chain them for a combo."
    ],
    combined: [
      "Okay, rookie. You've learned the basics.",
      "Now let's see what you remember. Stay sharp!"
    ],
    landing: [
      "Training isn't complete until you can bring her home.",
      "Line up with the strip and ease her down."
    ],
    crash: [
      "Ground inspection complete.",
      "Well… that's one way to inspect an obstacle."
    ],
    good: [
      "Excellent.",
      "Nice.",
      "Now you're getting greedy. I like it.",
      "Keep it going!",
      "That was close.",
      "Beautiful!"
    ]
  };

  // ---------- DOM ----------

  const TRACE_STAGES = [
    "intro", "takeoff", "altitude", "crystals", "obstacles",
    "shield", "powerup", "rings", "combined", "landing"
  ];
  const TRACE_LABELS = {
    intro: "Radio check",
    takeoff: "Takeoff",
    altitude: "Altitude",
    crystals: "Sky crystals",
    obstacles: "Obstacles",
    shield: "Shield",
    powerup: "Power-up",
    rings: "Rings",
    combined: "Combined",
    landing: "Landing",
    report: "Flight report"
  };

  function ensureFlightTraceDom() {
    // Circular meter uses CSS vars — no node DOM needed
  }

  function showFlightTraceBanner() {
    const el = titleEl();
    if (!el) return;
    el.innerHTML =
      '<span class="ft-gear ft-gear-l" aria-hidden="true"></span>' +
      '<span class="ft-banner-text">FLIGHT TRAINING</span>' +
      '<span class="ft-gear ft-gear-r" aria-hidden="true"></span>';
    el.classList.remove("ft-out");
    el.classList.add("visible", "ft-banner");
    // Fade in, hold, fade out
    clearTimeout(showFlightTraceBanner._t1);
    clearTimeout(showFlightTraceBanner._t2);
    showFlightTraceBanner._t1 = setTimeout(function () {
      el.classList.add("ft-out");
      el.classList.remove("visible");
      showFlightTraceBanner._t2 = setTimeout(function () {
        el.classList.remove("ft-banner", "ft-out");
        el.innerHTML = "";
      }, 550);
    }, 2600);
  }

  function showFlightTrace() {
    ensureFlightTraceDom();
    const el = document.getElementById("ruffFlightTrace");
    if (el) {
      el.classList.add("visible");
      el.setAttribute("aria-hidden", "false");
    }
  }

  function hideFlightTrace() {
    const el = document.getElementById("ruffFlightTrace");
    if (el) {
      el.classList.remove("visible");
      el.setAttribute("aria-hidden", "true");
    }
  }

  function updateFlightTrace(stage) {
    showFlightTrace();
    const idx = TRACE_STAGES.indexOf(stage);
    const total = TRACE_STAGES.length;
    // Fill as solid circular bar (0 → full across lessons)
    const progress = idx < 0 ? 0 : Math.min(1, (idx + 1) / total);
    const deg = progress * 360;
    const meter = document.getElementById("ruffFlightTraceMeter");
    const fill = document.getElementById("ruffFlightTraceFill");
    const pct = document.getElementById("ruffFlightTracePct");
    if (meter) {
      meter.style.setProperty("--ft-progress", deg + "deg");
      // Bounce on every lesson change
      meter.classList.remove("ft-bounce");
      void meter.offsetWidth;
      meter.classList.add("ft-bounce");
    }
    if (fill) fill.style.setProperty("--ft-progress", deg + "deg");
    // Center shows run timer (updated each frame from main loop)
    if (pct && typeof elapsedMs === "number") {
      const totalSec = Math.floor(elapsedMs / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      pct.textContent = m + ":" + String(s).padStart(2, "0");
    }
    const lab = document.getElementById("ruffFlightTraceLabel");
    if (lab) { lab.textContent = ""; lab.style.display = "none"; }
  }

  function radioEl() { return document.getElementById("ruffRadio"); }
  function radioText() { return document.getElementById("ruffText"); }
  function titleEl() { return document.getElementById("ruffTitleBanner"); }
  function reportEl() { return document.getElementById("ruffReport"); }

  function ensureSkipHandler() {
    const btn = document.getElementById("ruffSkipBtn");
    if (btn && !btn._ruffBound) {
      btn._ruffBound = true;
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        skipLine();
      });
    }
    const cont = document.getElementById("ruffContinueBtn");
    if (cont && !cont._ruffBound) {
      cont._ruffBound = true;
      cont.addEventListener("click", function () {
        finishToMap();
      });
    }
  }

  // ---------- Voice (Web Speech — radio-ish) ----------
  function speakLine(text) {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.84;  // slower, more natural
      u.pitch = 0.82;
      u.rate = Math.max(0.75, Math.min(0.95, u.rate));
      u.volume = (typeof sfxVolume === "number" ? sfxVolume : 0.7);
      // Prefer a lower male-ish voice if available
      const voices = window.speechSynthesis.getVoices() || [];
      const pick = voices.find(v => /en/i.test(v.lang) && /male|daniel|fred|alex|david/i.test(v.name))
        || voices.find(v => /en/i.test(v.lang))
        || null;
      if (pick) u.voice = pick;
      u.onend = function () { ruffSpeechDone = true; };
      u.onerror = function () { ruffSpeechDone = true; };
      window.speechSynthesis.speak(u);
      // Safety: force done after estimated speak time
      const safe = Math.max(5, text.length * 0.08 + 2.5);
      setTimeout(function () { ruffSpeechDone = true; }, safe * 1000);
    } catch (e) { ruffSpeechDone = true; }
  }

  function stopSpeak() {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
  }

  // ---------- Radio UI ----------
  function showRadio(text, duration) {
    ensureSkipHandler();
    const el = radioEl();
    const tx = radioText();
    if (!el || !tx) return;
    tx.textContent = text;
    el.classList.add("visible", "speaking");
    ruffSpeakClose = 1;
    ruffLineT = 0;
    ruffSpeechDone = false;
    // Hold long enough to finish the full sentence (+ pause after)
    const est = Math.max(4.5, text.length * 0.075 + 2.0);
    ruffLineDuration = duration || est;
    speakLine(text);
  }
  let ruffLineDuration = 5;
  let ruffSpeechDone = true;

  function hideRadio() {
    const el = radioEl();
    if (el) el.classList.remove("visible", "speaking");
    ruffSpeakClose = 0;
    stopSpeak();
  }

  function setLessonPopup(kind) {
    let el = document.getElementById("ruffLessonPopup");
    if (!el) {
      el = document.createElement("div");
      el.id = "ruffLessonPopup";
      el.innerHTML = '<img id="ruffLessonImg" alt=""/><span id="ruffLessonLabel"></span>';
      document.body.appendChild(el);
    }
    const img = document.getElementById("ruffLessonImg");
    const lab = document.getElementById("ruffLessonLabel");
    const map = {
      crystals: { key: "blue_crystal_01", label: "SKY CRYSTAL" },
      obstacles: { key: "bird_01", label: "OBSTACLE" },
      powerup: { key: "cloud", label: "POWER-UP" },
      rings: { key: null, label: "GOLD RING" },
      altitude: { key: null, label: "ALTITUDE" },
      landing: { key: "landing_field", label: "LANDING" },
      shield: { key: "shieldPickup", label: "SHIELD" }
    };
    const info = map[kind];
    if (!info) { el.classList.remove("visible"); return; }
    lab.textContent = info.label;
    // try image keys
    let srcImg = null;
    if (info.key && typeof images !== "undefined" && images[info.key] && images[info.key].naturalWidth) {
      srcImg = images[info.key];
    } else if (kind === "crystals") {
      for (let i = 1; i <= 5; i++) {
        const k = "blue_crystal_" + String(i).padStart(2, "0");
        if (images[k] && images[k].naturalWidth) { srcImg = images[k]; break; }
      }
    } else if (kind === "powerup") {
      for (const k of ["power_icon_blimp5", "cloud", "pirate_bomb"]) {
        if (images[k] && images[k].naturalWidth) { srcImg = images[k]; break; }
      }
    } else if (kind === "obstacles") {
      // any bird frame
      for (const k of Object.keys(images || {})) {
        if (/bird|balloon|mini_blimp/i.test(k) && images[k].naturalWidth) { srcImg = images[k]; break; }
      }
    }
    if (srcImg && srcImg.src) {
      img.src = srcImg.src;
      img.style.display = "";
    } else {
      img.style.display = "none";
    }
    el.classList.add("visible");
  }
  function hideLessonPopup() {
    const el = document.getElementById("ruffLessonPopup");
    if (el) el.classList.remove("visible");
  }

  function showTitle(text, ms) {
    const el = titleEl();
    if (!el) return;
    el.textContent = text;
    el.classList.add("visible");
    setTimeout(function () { el.classList.remove("visible"); }, ms || 2200);
  }

  function skipLine() {
    ruffLineT = ruffLineDuration;
    stopSpeak();
  }

  // ---------- Stage control ----------
  function setStage(name) {
    ruffStage = name;
    ruffStageT = 0;
    ruffLineIdx = 0;
    ruffLines = DIALOGUE[name] ? DIALOGUE[name].slice() : [];
    ruffWaitingInput = false;
    ruffWaitingCollect = 0;
    ruffWaitingAvoid = false;
    ruffWaitingRing = 0;
    window.__airborneRuffStage = name;
    try { updateFlightTrace(name); } catch (e) {}
    window.__airborneAirfieldAllowPowerup = (name === "powerup" || name === "combined");
    if (!window.__airborneAirfieldAllowPowerup && typeof powerup !== "undefined") powerup = null;
    if (name !== "powerup") ruffPowerOrb = null;
    if (typeof powerup !== "undefined" && name !== "powerup" && name !== "combined") powerup = null;
    const smGate = document.getElementById("stormMeter");
    if (smGate) {
      smGate.style.display = "";
      smGate.style.visibility = "";
      if (window.__airborneAirfieldAllowPowerup) {
        smGate.classList.remove("trainingHidden");
      } else {
        smGate.classList.add("trainingHidden");
      }
    }
    syncStageFlags();

    // Clear items ONCE when entering a stage (never every frame mid-flight)
    if (name === "altitude" || name === "crystals" || name === "powerup") {
      if (typeof obstacles !== "undefined") obstacles = [];
      ruffCrystals = [];
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
    } else if (name === "obstacles" || name === "shield") {
      ruffCrystals = [];
      window.__airborneAirfieldObstacles = true;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 1.35;
    } else if (name === "rings") {
      window.__airborneAirfieldRings = true;
      window.__airborneAirfieldObstacles = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 1.5;
    } else if (name === "combined") {
      window.__airborneAirfieldRings = true;
      window.__airborneAirfieldObstacles = true;
      if (typeof spawnInterval !== "undefined") spawnInterval = 1.55;
    }

    if (name === "intro") {
      ruffIntroFly = true;
      ruffIntroFlyT = 0;
      // Start just off right edge so first frames are almost visible
      ruffX = (typeof W !== "undefined" ? W : 400) * 0.92;
      ruffY = (typeof H !== "undefined" ? H : 600) * 0.22;
      ruffLineIdx = 0;
      ruffLineT = 0;
      ruffLineDuration = 3.5;
      ruffSpeechDone = true;
      ruffIntroLineArmed = false;
      ruffScalePulse = 1.15;
    } else if (name === "takeoff") {
      ruffIntroFly = false;
      if (ruffLines.length) showRadio(ruffLines[0], 2.8);
      ruffWaitingInput = true;
      window.__airborneAirfieldPaused = false;
      window.__airborneResetRunway = true;
      // Reset runway drive so intro duration doesn't auto-liftoff
      try {
        if (typeof airfieldDriveDist !== "undefined") airfieldDriveDist = 0;
        if (typeof airfieldPhaseT !== "undefined") airfieldPhaseT = 0;
        if (typeof airfieldTakeoffSpeed !== "undefined") airfieldTakeoffSpeed = 50;
        if (typeof airfieldPhase !== "undefined") airfieldPhase = "taxi";
      } catch (e) {}
      window.__airborneAirfieldPhase = "taxi";
      window.__airborneResetRunway = true;
      try {
        if (typeof sfxAirfieldEngineStart === "function") sfxAirfieldEngineStart();
        if (typeof sfxAirfieldWindStart === "function") sfxAirfieldWindStart();
      } catch (e) {}
    } else if (name === "altitude") {
      if (ruffLines.length) showRadio(ruffLines[0], 3.0);
      spawnAltitudeMarkers();
    } else if (name === "crystals") {
      if (ruffLines.length) showRadio(ruffLines[0], 3.0);
      spawnCrystals(5);
      spawnTrainingCoins(6);
      ruffWaitingCollect = 3;
    } else if (name === "obstacles") {
      if (ruffLines.length) showRadio(ruffLines[0], 2.8);
      window.__airborneAirfieldObstacles = true;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 1.15;
      if (typeof obstacles !== "undefined") obstacles = [];
      ruffWaitingAvoid = true;
    } else if (name === "powerup") {
      if (ruffLines.length) showRadio(ruffLines[0], 2.8);
      window.__airborneAirfieldAllowPowerup = true;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      if (typeof powerup !== "undefined") powerup = null;
      ruffPowerOrb = null;
      if (typeof STORM_MAX === "number") stormCharge = STORM_MAX;
      else if (typeof stormCharge === "number") stormCharge = 100;
      if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay(true);
    } else if (name === "rings") {
      if (ruffLines.length) showRadio(ruffLines[0], 2.8);
      window.__airborneAirfieldRings = true;
      window.__airborneAirfieldObstacles = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 0.95; // denser rings
      ruffWaitingRing = 8;
      window.__airborneRingCollects = 0;
    } else if (name === "combined") {
      if (ruffLines.length) showRadio(ruffLines[0], 2.6);
      window.__airborneAirfieldRings = true;
      window.__airborneAirfieldObstacles = true;
      if (typeof spawnInterval !== "undefined") spawnInterval = 1.2;
    } else if (name === "landing") {
      if (ruffLines.length) showRadio(ruffLines[0], 3.0);
      window.__airborneRuffLandArmed = true;
      window.__airborneRuffRequestLand = true;
    } else if (name === "report") {
      hideRadio();
      showFlightReport();
    }
  }

  function syncStageFlags() {
    // Do NOT force obstacleSpeed or unpause during intro/runway
    if (ruffStage === "intro" || ruffStage === "takeoff") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      if (typeof powerup !== "undefined") powerup = null;
    } else if (ruffStage === "altitude" || ruffStage === "crystals") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
    }
  }

  function advanceLine() {
    ruffLineIdx++;
    if (ruffLineIdx < ruffLines.length) {
      showRadio(ruffLines[ruffLineIdx]); // full natural duration
      return false;
    }
    hideRadio();
    return true; // finished lines
  }

  function nextStage() {
    const i = STAGE_ORDER.indexOf(ruffStage);
    if (i < 0 || i >= STAGE_ORDER.length - 1) {
      setStage("report");
      return;
    }
    setStage(STAGE_ORDER[i + 1]);
  }

  // ---------- Crystals ----------
  function spawnCrystals(n) {
    ruffCrystals = [];
    for (let i = 0; i < n; i++) {
      ruffCrystals.push({
        x: (typeof W !== "undefined" ? W : 400) + 80 + i * 140,
        y: (typeof H !== "undefined" ? H : 600) * (0.28 + Math.random() * 0.35),
        r: 18,
        frame: Math.floor(Math.random() * CRYSTAL_FRAME_COUNT),
        frameT: 0,
        collected: false
      });
    }
  }

  function spawnAltitudeMarkers() {
    ruffMarkers = [];
    const w = typeof W !== "undefined" ? W : 400;
    const h = typeof H !== "undefined" ? H : 600;
    for (let i = 0; i < 4; i++) {
      ruffMarkers.push({
        x: w + 100 + i * 160,
        yTop: h * 0.28,
        yBot: h * 0.55
      });
    }
  }

  function playCrystalCollectSfx() {
    try {
      if (typeof sfxCrystalCollect === "function") sfxCrystalCollect();
      else if (typeof sfxHeart === "function") sfxHeart();
    } catch (e) {}
  }
  function playRingCollectSfx() {
    try {
      if (typeof sfxRingCollect === "function") sfxRingCollect();
      else if (typeof sfxStreak === "function") sfxStreak();
    } catch (e) {}
  }
  function playRankUpSfx() {
    try {
      if (typeof sfxRankUp === "function") sfxRankUp();
      else if (typeof sfxLevelCompleteFanfare === "function") sfxLevelCompleteFanfare();
    } catch (e) {}
  }

  function updateCrystals(dt) {
    if (!ruffCrystals.length) return;
    // Always scroll — never freeze when birds/obstacles appear
    let spd = (typeof obstacleSpeed === "number" && obstacleSpeed > 40) ? obstacleSpeed : 210;
    spd = Math.max(180, spd);
    const px = (typeof player !== "undefined" && player) ? player.x : 0;
    const py = (typeof player !== "undefined" && player) ? player.y : 0;
    const pw = (typeof player !== "undefined" && player) ? player.w * 0.4 : 20;
    const ph = (typeof player !== "undefined" && player) ? player.h * 0.4 : 16;

    ruffCrystals.forEach(function (c) {
      if (c.collected) return;
      c.x -= spd * dt;
      c.frameT += dt;
      const cFps = 24; // smooth crystal loop
      const cFd = 1 / cFps;
      while (c.frameT >= cFd) {
        c.frameT -= cFd;
        c.frame = (c.frame + 1) % CRYSTAL_FRAME_COUNT;
      }
      // collect
      if (Math.abs(c.x - px) < pw + c.r && Math.abs(c.y - py) < ph + c.r) {
        c.collected = true;
        ruffStats.crystals++; playCrystalCollectSfx();
        window.__airborneCollectCrystals = (window.__airborneCollectCrystals || 0) + 1;
        if (typeof updateCollectDock === "function") updateCollectDock();
        if (typeof score === "number") score += CRYSTAL_SCORE;
        if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
        if (ruffWaitingCollect > 0) ruffWaitingCollect--;
        // Sparkle burst
        for (let s = 0; s < 14; s++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 40 + Math.random() * 120;
          ruffSparkles.push({
            x: c.x, y: c.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 30,
            life: 0.45 + Math.random() * 0.35,
            age: 0,
            r: 2 + Math.random() * 3,
            color: Math.random() > 0.4 ? "#7ecbff" : "#fff8e0"
          });
        }
        if (ruffStats.crystals === 1) showRadio("That's one.", 2.2);
        else if (ruffStats.crystals % 5 === 0) showRadio("Now you're getting greedy. I like it.", 2.6);
      }
    });
    ruffCrystals = ruffCrystals.filter(c => !c.collected && c.x > -40);
  }

  function updateSparkles(dt) {
    ruffSparkles.forEach(function (s) {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 80 * dt;
      s.vx *= 0.98;
    });
    ruffSparkles = ruffSparkles.filter(s => s.age < s.life);
  }

  function drawSparkles() {
    if (!ruffSparkles.length || typeof ctx === "undefined") return;
    ruffSparkles.forEach(function (s) {
      const t = 1 - s.age / s.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * t, 0, Math.PI * 2);
      ctx.fill();
      // star glint
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x - s.r * 2, s.y);
      ctx.lineTo(s.x + s.r * 2, s.y);
      ctx.moveTo(s.x, s.y - s.r * 2);
      ctx.lineTo(s.x, s.y + s.r * 2);
      ctx.stroke();
      ctx.restore();
    });
  }



  let ruffAirship = null;

  function spawnTrainingAirship() {
    if (ruffAirship) return;
    const ww = (typeof W !== "undefined" ? W : 400);
    const hh = (typeof H !== "undefined" ? H : 600);
    // 35% of screen width
    const w = ww * 0.35;
    const h = w * (314 / 648); // frame aspect ~5x5 sheet
    ruffAirship = {
      x: ww + 40,
      y: hh * 0.38,
      w: w,
      h: h,
      frame: 0,
      frameT: 0,
      cols: 5,
      rows: 5,
      // slow scroll
      speed: 48
    };
  }

  function updateTrainingAirship(dt) {
    if (!ruffAirship) return;
    const a = ruffAirship;
    a.x -= a.speed * dt;
    a.frameT += dt;
    const fd = 1 / 12;
    while (a.frameT >= fd) {
      a.frameT -= fd;
      a.frame = (a.frame + 1) % (a.cols * a.rows);
    }
    // soft bob
    a.y = (typeof H !== "undefined" ? H : 600) * 0.38 + Math.sin((a.frameT + a.x * 0.01) * 1.2) * 8;
    // Collision — avoid the airship (no shield check for training)
    if (typeof player !== "undefined" && player && typeof takeHit === "function") {
      const px = player.x, py = player.y;
      const pw = player.w * 0.35, ph = player.h * 0.35;
      if (px + pw > a.x + a.w * 0.1 && px - pw < a.x + a.w * 0.9 &&
          py + ph > a.y + a.h * 0.15 && py - ph < a.y + a.h * 0.85) {
        if (!a.hitCooldown || a.hitCooldown <= 0) {
          a.hitCooldown = 1.2;
          try { takeHit(); } catch (e) {}
        }
      }
    }
    if (a.hitCooldown > 0) a.hitCooldown -= dt;
    // off screen left
    if (a.x + a.w < -20) {
      ruffAirship = null;
      window.__airborneAirshipCleared = true;
    }
  }

  function drawTrainingAirship() {
    if (!ruffAirship || typeof ctx === "undefined") return;
    const a = ruffAirship;
    const sheet = (typeof images !== "undefined") ? images.training_airship : null;
    if (!sheet || !sheet.naturalWidth) {
      // fallback silhouette
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#4a3a28";
      ctx.fillRect(a.x, a.y, a.w, a.h);
      ctx.restore();
      return;
    }
    const fw = sheet.naturalWidth / a.cols;
    const fh = sheet.naturalHeight / a.rows;
    const fr = a.frame % (a.cols * a.rows);
    const col = fr % a.cols;
    const row = Math.floor(fr / a.cols);
    ctx.save();
    ctx.drawImage(sheet, col * fw, row * fh, fw, fh, a.x, a.y, a.w, a.h);
    ctx.restore();
  }


  function spawnTrainingCoins(n) {
    n = n || 4;
    const groundY = (typeof groundLevelY === "function") ? groundLevelY() : (typeof H !== "undefined" ? H * 0.78 : 400);
    for (let i = 0; i < n; i++) {
      ruffCoins.push({
        x: (typeof W !== "undefined" ? W : 400) + 40 + i * (90 + Math.random() * 60),
        y: (typeof H !== "undefined" ? H : 600) * (0.18 + Math.random() * 0.48),
        r: 18,
        spin: Math.random() * Math.PI * 2,
        bob: Math.random() * Math.PI * 2,
        collected: false,
        spark: 0
      });
    }
  }

  function updateTrainingCoins(dt) {
    if (!ruffCoins.length) return;
    let spd = (typeof obstacleSpeed === "number" && obstacleSpeed > 40) ? obstacleSpeed : 200;
    spd = Math.max(160, spd);
    const px = (typeof player !== "undefined" && player) ? player.x : 0;
    const py = (typeof player !== "undefined" && player) ? player.y : 0;
    const pw = (typeof player !== "undefined" && player) ? player.w * 0.42 : 20;
    const ph = (typeof player !== "undefined" && player) ? player.h * 0.42 : 16;
    ruffCoins.forEach(function (c) {
      if (c.collected) return;
      c.x -= spd * dt;
      c.spin += dt * 4.5;
      c.bob += dt * 2.8;
      if (Math.abs(c.x - px) < pw + c.r && Math.abs(c.y - py) < ph + c.r) {
        c.collected = true;
        ruffStats.coins = (ruffStats.coins || 0) + 1;
        window.__airborneCollectCoins = (window.__airborneCollectCoins || 0) + 1;
        if (typeof updateCollectDock === "function") updateCollectDock();
        if (typeof score === "number") score += COIN_SCORE;
        if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
        try {
          if (typeof sfxRingCollect === "function") sfxRingCollect();
          else if (typeof sfxPowerup === "function") sfxPowerup();
        } catch (e) {}
        for (let s = 0; s < 12; s++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = 50 + Math.random() * 100;
          ruffSparkles.push({
            x: c.x, y: c.y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp - 40,
            life: 0.4 + Math.random() * 0.3,
            age: 0,
            r: 2 + Math.random() * 2.5,
            color: Math.random() > 0.35 ? "#ffd700" : "#fff3a0"
          });
        }
      }
    });
    ruffCoins = ruffCoins.filter(c => !c.collected && c.x > -50);
  }

  function drawTrainingCoins() {
    if (!ruffCoins.length || typeof ctx === "undefined") return;
    ruffCoins.forEach(function (c) {
      if (c.collected) return;
      const by = c.y + Math.sin(c.bob) * 6;
      const spin = c.spin || 0;
      // thickness from spin — thick face when facing camera
      const face = 0.35 + 0.65 * Math.abs(Math.cos(spin));
      const pulse = 1 + 0.06 * Math.sin(spin * 2);
      const R = c.r * pulse;
      ctx.save();
      ctx.translate(c.x, by);
      // outer gold aura
      ctx.globalAlpha = 0.4 + 0.2 * Math.sin(spin * 3);
      const aura = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, R * 2.1);
      aura.addColorStop(0, "rgba(255, 215, 80, 0.55)");
      aura.addColorStop(0.5, "rgba(255, 180, 40, 0.18)");
      aura.addColorStop(1, "rgba(255, 160, 0, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, R * 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // coin body (ellipse for spin)
      ctx.scale(face, 1);
      const body = ctx.createRadialGradient(-R * 0.3, -R * 0.35, 1, 0, 0, R);
      body.addColorStop(0, "#fff6c0");
      body.addColorStop(0.25, "#ffd700");
      body.addColorStop(0.55, "#e8b923");
      body.addColorStop(0.85, "#b8860b");
      body.addColorStop(1, "#6b4e08");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      // milled edge ring
      ctx.strokeStyle = "rgba(90, 60, 10, 0.75)";
      ctx.lineWidth = Math.max(1.5, R * 0.1);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 230, 140, 0.7)";
      ctx.lineWidth = Math.max(1, R * 0.06);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      // AA emboss
      ctx.fillStyle = "rgba(100, 70, 15, 0.9)";
      ctx.font = "bold " + Math.max(9, R * 0.7) + "px Rockwell, Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("★", 0, 1);
      // specular glint
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath();
      ctx.ellipse(-R * 0.3, -R * 0.32, R * 0.28, R * 0.14, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // orbiting sparkles
      for (let i = 0; i < 3; i++) {
        const a = spin * 1.5 + i * (Math.PI * 2 / 3);
        const sx = Math.cos(a) * R * 1.35;
        const sy = Math.sin(a) * R * 0.9;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(spin * 4 + i);
        ctx.fillStyle = "#fff8d0";
        ctx.beginPath();
        ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawMarkers() {
    if (!ruffMarkers.length || typeof ctx === "undefined") return;
    const spd = (typeof obstacleSpeed === "number" ? obstacleSpeed : 180);
    ruffMarkers.forEach(function (m) {
      // markers are scrolled in update
      ctx.save();
      ctx.strokeStyle = "rgba(212,175,55,0.7)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(m.x - 20, m.yTop);
      ctx.lineTo(m.x + 20, m.yTop);
      ctx.moveTo(m.x - 20, m.yBot);
      ctx.lineTo(m.x + 20, m.yBot);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    });
  }

  function updateMarkers(dt) {
    const spd = (typeof obstacleSpeed === "number" ? obstacleSpeed : 180);
    ruffMarkers.forEach(function (m) { m.x -= spd * dt; });
    ruffMarkers = ruffMarkers.filter(m => m.x > -40);
  }

  // ---------- Companion ----------
  function updateRuffCompanion(dt) {
    if (!ruffActive) return;
    try {
    ruffBob += dt * 2.2;
    ruffFrameT += dt;
    const ruffFps = 18; // smooth companion loop
    const ruffFd = 1 / ruffFps;
    while (ruffFrameT >= ruffFd) {
      ruffFrameT -= ruffFd;
      ruffFrame = (ruffFrame + 1) % RUFF_FRAME_COUNT;
    }
    // Dramatic intro fly-in from upper-right
    if (ruffIntroFly && ruffStage === "intro") {
      ruffIntroFlyT += dt;
      const destX = (typeof W !== "undefined" ? W : 400) * 0.18;
      const destY = (typeof H !== "undefined" ? H : 600) * 0.28;
      const k = Math.min(1, ruffIntroFlyT / 1.0);
      const ease = 1 - Math.pow(1 - k, 3);
      const startX = (typeof W !== "undefined" ? W : 400) * 0.95;
      const startY = (typeof H !== "undefined" ? H : 600) * 0.18;
      ruffX = startX + (destX - startX) * ease;
      ruffY = startY + (destY - startY) * ease + Math.sin(ruffIntroFlyT * 4) * 6 * (1 - ease);
      ruffTilt = -0.25 * (1 - ease) + Math.sin(ruffBob * 1.3) * 0.08;
      ruffScalePulse = 1.05 + (1 - ease) * 0.2 + Math.sin(ruffBob * 2.1) * 0.03;
      // Jetpack during intro fly-in
      if (Math.random() < 0.9) {
        ruffJetParticles.push({
          x: ruffX - 12, y: ruffY + 16,
          vx: -60 - Math.random() * 40, vy: 25 + Math.random() * 30,
          life: 0.3, age: 0, r: 3 + Math.random() * 3, hot: true
        });
      }
      ruffJetParticles.forEach(function (p) {
        p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r *= (1 - dt);
      });
      ruffJetParticles = ruffJetParticles.filter(function (p) { return p.age < p.life; });
      if (!ruffIntroLineArmed && ruffIntroFlyT > 0.35 && ruffLines.length) {
        ruffIntroLineArmed = true;
        ruffLineIdx = 0;
        ruffLineT = 0;
        ruffSpeechDone = true;
        showRadio(ruffLines[0], 3.2);
      }
      return;
    }
    if (typeof player === "undefined" || !player) return;
    // Behind + above with clear gap so sprites never touch
    const gapX = player.w * 0.55 + 36;
    const gapY = player.h * 0.75 + 28;
    const targetX = player.x - gapX;
    const targetY = player.y - gapY + Math.sin(ruffBob) * 10 + Math.sin(ruffBob * 1.7) * 3;
    const close = ruffSpeakClose > 0 ? 8 : 0;
    ruffX += (targetX + close - ruffX) * Math.min(1, dt * 3.2);
    ruffY += (targetY - ruffY) * Math.min(1, dt * 3.2);
    // Motion lean / bank
    ruffTilt = Math.sin(ruffBob * 1.3) * 0.12 + Math.sin(ruffBob * 0.5) * 0.04;
    ruffScalePulse = 1 + Math.sin(ruffBob * 2.1) * 0.03;
    if (ruffSpeakClose > 0) ruffSpeakClose = Math.max(0, ruffSpeakClose - dt * 0.5);

    // Jetpack exhaust (behind / slightly below)
    if (Math.random() < 0.85) {
      for (let j = 0; j < 2; j++) {
        ruffJetParticles.push({
          x: ruffX - 14 + (Math.random() - 0.5) * 8,
          y: ruffY + 18 + (Math.random() - 0.5) * 6,
          vx: -40 - Math.random() * 50,
          vy: 20 + Math.random() * 35,
          life: 0.25 + Math.random() * 0.25,
          age: 0,
          r: 2.5 + Math.random() * 3.5,
          hot: Math.random() < 0.55
        });
      }
    }
    if (ruffJetParticles.length > 40) ruffJetParticles.splice(0, ruffJetParticles.length - 40);
    ruffJetParticles.forEach(function (p) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
      p.r *= (1 - 1.2 * dt);
    });
    ruffJetParticles = ruffJetParticles.filter(function (p) { return p.age < p.life && p.r > 0.4; });

    // Motion ghosts (afterimage)
    if (Math.random() < 0.35) {
      ruffMotionGhosts.push({ x: ruffX, y: ruffY, age: 0, life: 0.22, tilt: ruffTilt });
    }
    ruffMotionGhosts.forEach(function (g) { g.age += dt; });
    ruffMotionGhosts = ruffMotionGhosts.filter(function (g) { return g.age < g.life; });
    if (ruffMotionGhosts.length > 8) ruffMotionGhosts.splice(0, ruffMotionGhosts.length - 8);

    // Speaking: small black lines from mouth area
    const radio = document.getElementById("ruffRadio");
    const speaking = radio && radio.classList.contains("speaking");
    if (speaking && Math.random() < 0.55) {
      ruffSpeakLines.push({
        x: ruffX + 10 + Math.random() * 6,
        y: ruffY + 6 + (Math.random() - 0.5) * 8,
        vx: 25 + Math.random() * 35,
        vy: (Math.random() - 0.5) * 20,
        life: 0.18 + Math.random() * 0.15,
        age: 0,
        len: 4 + Math.random() * 7
      });
    }
    ruffSpeakLines.forEach(function (s) {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    });
    ruffSpeakLines = ruffSpeakLines.filter(function (s) { return s.age < s.life; });
    } catch (e) { console.warn("updateRuffCompanion", e); }
  }

  function drawRuffCompanion() {
    if (!ruffActive || typeof ctx === "undefined") return;
    if (ruffStage === "report") return;
    const maxX = (typeof W !== "undefined" ? W : 400) - 20;
    const maxY = (typeof H !== "undefined" ? H : 600) - 20;
    let dx = ruffX, dy = ruffY;
    if (!(dx > 0) || !isFinite(dx)) dx = (typeof W !== "undefined" ? W : 400) * 0.2;
    if (!(dy > 0) || !isFinite(dy)) dy = (typeof H !== "undefined" ? H : 600) * 0.3;
    dx = Math.max(20, Math.min(maxX, dx));
    dy = Math.max(20, Math.min(maxY, dy));

    const idx = ((ruffFrame | 0) % RUFF_FRAME_COUNT) + 1;
    const key = "ruff_" + String(idx).padStart(2, "0");
    let img = (typeof images !== "undefined") ? images[key] : null;
    if (!img || !img.naturalWidth) {
      for (let i = 1; i <= RUFF_FRAME_COUNT; i++) {
        const k2 = "ruff_" + String(i).padStart(2, "0");
        if (images && images[k2] && images[k2].naturalWidth) { img = images[k2]; break; }
      }
    }
    const size = Math.max(90, (typeof player !== "undefined" && player ? player.h * 1.55 : 98));
    const sc = size * (ruffScalePulse || 1);

    // Jetpack particles (world space, behind body)
    ruffJetParticles.forEach(function (p) {
      const t = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, t * 0.85);
      ctx.fillStyle = p.hot ? "rgba(255,160,40,0.9)" : "rgba(80,70,65,0.7)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.r * t), 0, Math.PI * 2);
      ctx.fill();
      if (p.hot) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255,230,120,0.5)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.4, p.r * 0.45 * t), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Motion ghosts
    ruffMotionGhosts.forEach(function (g) {
      const t = 1 - g.age / g.life;
      ctx.save();
      ctx.globalAlpha = 0.18 * t;
      ctx.translate(g.x, g.y);
      ctx.rotate(g.tilt || 0);
      if (img && img.naturalWidth) {
        ctx.drawImage(img, -sc / 2, -sc / 2, sc, sc);
      } else {
        ctx.fillStyle = "#c4a35a";
        ctx.beginPath();
        ctx.arc(0, 0, sc * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(ruffTilt || 0);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "rgba(212,175,55,0.5)";
    ctx.beginPath();
    ctx.arc(-6, 4, sc * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (img && img.naturalWidth) {
      ctx.drawImage(img, -sc / 2, -sc / 2, sc, sc);
    } else {
      ctx.fillStyle = "#c4a35a";
      ctx.strokeStyle = "#4a3210";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, sc * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // Speak lines from mouth (small black dashes)
    ruffSpeakLines.forEach(function (s) {
      const t = 1 - s.age / s.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, t);
      ctx.strokeStyle = "rgba(15,12,10,0.85)";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.len * t, s.y + (s.vy * 0.02));
      ctx.stroke();
      ctx.restore();
    });
  }

  // ---------- Flight report ----------
  function showFlightReport() {
    const el = reportEl();
    if (!el) return;
    const rows = document.getElementById("ruffReportRows");
    const final = document.getElementById("ruffFinalScore");
    const rankBanner = document.getElementById("ruffRankBanner");
    const rankNameEl = document.getElementById("ruffRankName");
    const rankTitleEl = document.getElementById("ruffRankTitle");
    const medalImg = document.getElementById("ruffMedalImg");

    if (rows) {
      rows.innerHTML =
        row("SKY CRYSTALS", "×" + ruffStats.crystals) +
        row("COINS", "×" + (ruffStats.coins || 0)) +
        row("RINGS", "×" + ruffStats.rings) +
        row("POWER-UPS", "×" + ruffStats.powerups) +
        row("OBSTACLES AVOIDED", "×" + ruffStats.obstaclesAvoided) +
        row("BEST COMBO", "×" + ruffStats.bestCombo) +
        row("LANDING", "★".repeat(Math.max(1, ruffStats.landingStars || 3)));
    }

    const sc = (typeof score === "number") ? score : 0;
    const pilotRank = getPilotRank(sc, ruffStats);

    // Hide rank banner until score finishes counting
    if (rankBanner) {
      rankBanner.classList.remove("visible");
      rankBanner.style.opacity = "0";
    }
    if (rankNameEl) rankNameEl.textContent = (pilotRank.name || "Cadet").toUpperCase();
    if (rankTitleEl) rankTitleEl.textContent = pilotRank.title || "Starting pilot";
    // Rank-up reveal: was Rookie during flight
    try {
      if (typeof updateHudRank === "function") updateHudRank(pilotRank.name || "Cadet");
    } catch (e) {}
    if (medalImg) {
      const src = (typeof images !== "undefined" && images.medal_badge && images.medal_badge.src)
        ? images.medal_badge.src
        : "medal_badge.webp";
      medalImg.src = src;
      medalImg.alt = pilotRank.name || "Cadet";
    }

    if (final) {
      final.textContent = "FINAL SCORE  0";
      final.style.opacity = "1";
      final.style.filter = "none";
      final.style.color = "#f0d878";
      final.classList.remove("fadeOut");
    }
    if (rankBanner) {
      rankBanner.classList.remove("visible", "bounceIn");
      rankBanner.style.opacity = "0";
    }
    el.classList.add("visible");
    ensureSkipHandler();

    // Count-up → fade score → big RANK UP bounce
    const duration = 1600;
    const t0 = performance.now();
    function tick(now) {
      const u = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - u, 3);
      const n = Math.round(sc * eased);
      if (final) final.textContent = "FINAL SCORE  " + n;
      if (u < 1) {
        requestAnimationFrame(tick);
      } else {
        if (final) final.textContent = "FINAL SCORE  " + sc;
        // Fade score away, then bounce rank in
        if (final) final.classList.add("fadeOut");
        setTimeout(function () {
          if (rankBanner) {
            rankBanner.classList.add("visible", "bounceIn");
            rankBanner.style.opacity = "1";
          }
          playRankUpSfx();
          showRadio("Not bad for a first flight, " + (pilotRank.name || "Cadet") + ".", 3.2);
        }, 480);
      }
    }
    requestAnimationFrame(tick);
  }

  function row(label, val) {
    return '<div class="row"><span>' + label + '</span><span>' + val + '</span></div>';
  }

  function finishToMap() {
    try { hideFlightTrace(); } catch (e) {}
    hideRadio();
    stopSpeak();
    const el = reportEl();
    if (el) el.classList.remove("visible");
    ruffActive = false;
    window.__airborneRuffActive = false;
    window.__airborneRuffStage = "idle";
    window.__airborneRuffRequestLand = false;
    window.__airborneRuffLandArmed = false;
    // Always end airfield cleanly — never leave land/score running
    if (typeof endAirfieldTrainingToMap === "function") {
      endAirfieldTrainingToMap();
    } else if (window.endAirfieldTrainingToMap) {
      window.endAirfieldTrainingToMap();
    } else if (window.__airborneShowWorldMap) {
      window.__airborneShowWorldMap({ mode: "start" });
    }
  }
  window.__airborneShowRuffReport = function() {
    ruffActive = true;
    window.__airborneRuffActive = true;
    window.__airborneRuffStage = "report";
    window.__airborneRuffRequestLand = false;
    try { hideRadio(); } catch (e0) {}
    try { setStage("report"); } catch (e) {}
    try { showFlightReport(); } catch (e2) {
      // Fallback if setStage path failed
      try {
        var el = document.getElementById("ruffReport");
        if (el) el.classList.add("visible");
      } catch (e3) {}
    }
  };

  // ---------- Public API ----------
  function beginRuffTraining() {
    ruffActive = true;
    window.__airborneRuffActive = true;
    window.__airborneRuffStage = "intro";
    console.log("[R.U.F.F.] beginRuffTraining active=", ruffActive);
    // Visible start position (right side)
    ruffX = (typeof W !== "undefined" ? W : 400) * 0.85;
    ruffY = (typeof H !== "undefined" ? H : 600) * 0.28;
    ruffIntroFly = true;
    ruffIntroFlyT = 0;
    ruffIntroLineArmed = false;
    ruffScalePulse = 1.2;
    ruffFrame = 0;
    window.__airborneAirfieldAllowPowerup = false;
    if (typeof powerup !== "undefined") powerup = null;
    if (typeof shieldPickup !== "undefined") shieldPickup = null;
    if (typeof stormCharge === "number") stormCharge = 0;
    const sm0 = document.getElementById("stormMeter");
    if (sm0) {
      sm0.style.display = "";
      sm0.style.visibility = "";
      sm0.classList.add("trainingHidden");
    }
    if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay();
    ruffStats = { crystals: 0, coins: 0, rings: 0, powerups: 0, obstaclesAvoided: 0, bestCombo: 0, landingStars: 3 };
    ruffCrystals = [];
    ruffMarkers = [];
    ruffCombo = 0;
    ruffIntroDone = false;
    ensureSkipHandler();
    showFlightTrace();
    showFlightTraceBanner();
    setStage("intro");
    // Re-assert after setStage so he is visible immediately
    ruffActive = true;
    window.__airborneRuffActive = true;
    window.__airborneRuffStage = "intro";
    ruffIntroFly = true;
    ruffIntroFlyT = 0;
    ruffX = (typeof W !== "undefined" ? W : 400) * 0.8;
    ruffY = (typeof H !== "undefined" ? H : 600) * 0.26;
    ruffScalePulse = 1.25;
    console.log("[R.U.F.F.] on screen at", Math.round(ruffX), Math.round(ruffY));
  }

  function updateRuff(dt) {
    if (!ruffActive && window.__airborneRuffActive) {
      ruffActive = true;
      if (!ruffStage || ruffStage === "idle") {
        ruffStage = window.__airborneRuffStage || "intro";
        if (ruffStage === "intro") {
          ruffIntroFly = true;
        }
      }
    }
    if (!ruffActive) return;
    ruffStageT += dt;
    ruffLineT += dt;
    // Keep power icon suppressed until power lesson
    if (!window.__airborneAirfieldAllowPowerup) {
      const smx = document.getElementById("stormMeter");
      if (smx) {
        smx.style.display = "";
        smx.style.visibility = "";
        smx.classList.add("trainingHidden");
      }
    }
    // Do NOT force obstacleSpeed or unpause during intro/runway —
    // airfield owns those. Only ensure cruise speed once airborne lessons run.
    const afPh = window.__airborneAirfieldPhase;
    if (afPh === "lesson") {
      // Slightly higher tempo during training (birds/items)
      if (typeof obstacleSpeed !== "undefined") {
        const target = (ruffStage === "obstacles" || ruffStage === "shield" || ruffStage === "combined")
          ? 255 : 230;
        if (obstacleSpeed < target) obstacleSpeed = target;
      }
    }
    // Only clear pause once intro is done and player is in takeoff+ stages
    if (ruffStage !== "intro" && ruffStage !== "idle") {
      if (afPh === "taxi" || afPh === "accel" || afPh === "climb" || afPh === "lesson") {
        // allow airfield to manage pause; do not force true
      }
    }
    updateRuffCompanion(dt);
    updateSparkles(dt);

    // Auto-advance dialogue lines
    if (ruffLines.length && ruffLineIdx < ruffLines.length &&
        ruffLineT >= ruffLineDuration && ruffSpeechDone) {
      const done = advanceLine();
      if (done) {
        // Stage-specific after dialogue
        if (ruffStage === "intro") {
          ruffIntroFly = false;
          nextStage(); // → takeoff
        } else if (ruffStage === "altitude" && ruffMarkers.length === 0) {
          nextStage();
        } else if (ruffStage === "powerup") {
          nextStage();
        } else if (ruffStage === "combined" && ruffStageT > 22) {
          nextStage(); // → landing
        }
      }
    }

    // Intro: advance lines on a timer, then go to takeoff (must finish before drive)
    if (ruffStage === "intro") {
      if (ruffIntroLineArmed && ruffLineIdx < ruffLines.length &&
          ruffLineT >= Math.max(2.8, ruffLineDuration || 3)) {
        ruffLineIdx++;
        ruffLineT = 0;
        if (ruffLineIdx < ruffLines.length) {
          showRadio(ruffLines[ruffLineIdx], 3.2);
        }
      }
      if ((ruffIntroLineArmed && ruffLineIdx >= ruffLines.length && ruffLineT > 1.2) ||
          ruffStageT > 16) {
        ruffIntroFly = false;
        nextStage(); // → takeoff — runway unlocks only after this
        console.log("[R.U.F.F.] intro done → takeoff");
      }
    }

    // Stage logic — every stage has a hard timeout so training never freezes
    if (ruffStage === "takeoff") {
      const ph = window.__airborneAirfieldPhase;
      // Only advance after actual climb/lesson — never skip runway on a timer
      if (ph === "lesson" || (ph === "climb" && ruffStageT > 3)) {
        nextStage();
      }
    } else if (ruffStage === "altitude") {
      // Do NOT wipe obstacles every frame — causes random item disappear
      if (typeof updateMarkers === "function") updateMarkers(dt);
      if (ruffStageT > 9) nextStage();
    } else if (ruffStage === "crystals") {
      updateCrystals(dt);
      updateTrainingCoins(dt);
      if (ruffStats.crystals < 3 && ruffCrystals.length < 2) spawnCrystals(3);
      if (ruffCoins.length < 2) spawnTrainingCoins(4);
      if ((ruffStats.crystals >= 3 && ruffCrystals.length === 0 && ruffStageT > 3) || ruffStageT > 14) {
        nextStage();
      }
    } else if (ruffStage === "obstacles") {
      window.__airborneAirfieldObstacles = true;
      if (typeof spawnInterval !== "undefined") spawnInterval = 1.35; // slightly faster birds
      // Keep spawning for most of the stage — only stop near the end
      if (ruffStageT > 10) {
        window.__airborneAirfieldObstacles = false;
        if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      }
      const obsCount = (typeof obstacles !== "undefined" && obstacles) ? obstacles.length : 0;
      if ((ruffStageT > 11 && obsCount === 0) || ruffStageT > 15) {
        ruffStats.obstaclesAvoided += 2;
        nextStage();
      }
    } else if (ruffStage === "shield") {
      ruffCrystals = [];
      window.__airborneAirfieldAllowShield = true;
      // Spawn shield early
      if ((typeof shieldPickup === "undefined" || !shieldPickup || shieldPickup.x < -50) && ruffStageT < 8 && !(typeof shieldActive !== "undefined" && shieldActive)) {
        shieldPickup = {
          x: (typeof W !== "undefined" ? W : 400) + 40,
          y: (typeof H !== "undefined" ? H : 600) * 0.4,
          w: 44, h: 44, speed: 150, bobPhase: 0
        };
      }
      // After shield is up (or 5s), send obstacles to demonstrate protection
      if ((typeof shieldActive !== "undefined" && shieldActive) || ruffStageT > 5) {
        window.__airborneAirfieldObstacles = true;
        if (typeof spawnInterval !== "undefined") spawnInterval = 1.3;
      }
      // Stop birds near end so stage can finish cleanly
      if (ruffStageT > 14) {
        window.__airborneAirfieldObstacles = false;
        if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      }
      if (ruffStageT > 16) {
        if (typeof obstacles !== "undefined") obstacles = [];
        nextStage();
      }
    } else if (ruffStage === "powerup") {
      ruffCrystals = [];
      window.__airborneAirfieldAllowPowerup = true;
      const sm = document.getElementById("stormMeter");
      if (sm) {
        sm.style.display = "";
        sm.style.visibility = "";
        sm.classList.remove("trainingHidden");
      }
      // Fill meter so player can activate power
      if (typeof stormCharge === "number" && typeof STORM_MAX === "number" && !stormActive) {
        stormCharge = STORM_MAX;
        if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay();
      }
      // After a beat (or once storm is active), send birds/obstacles to destroy
      if ((typeof stormActive !== "undefined" && stormActive) || ruffStageT > 3.5) {
        window.__airborneAirfieldObstacles = true;
        if (typeof spawnInterval !== "undefined") spawnInterval = 1.15;
      }
      if (ruffStageT > 12) {
        window.__airborneAirfieldObstacles = false;
        if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      }
      if ((typeof stormActive !== "undefined" && stormActive && ruffStageT > 5) || ruffStageT > 18) {
        window.__airborneAirfieldObstacles = false;
        nextStage();
      }
    } else if (ruffStage === "rings") {
      ruffCrystals = [];
      if (typeof powerup !== "undefined") powerup = null;
      if (typeof window.__airborneRingCollects === "number") {
        ruffStats.rings = window.__airborneRingCollects;
        if (ruffStats.rings > ruffStats.bestCombo) ruffStats.bestCombo = ruffStats.rings;
      }
      if (ruffStageT > 10) {
        window.__airborneAirfieldRings = false;
        if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      }
      const ringLeft = (typeof obstacles !== "undefined" && obstacles)
        ? obstacles.filter(function (o) { return o && (o.isRing || o.type === "gold_ring") && !o.collected; }).length
        : 0;
      if ((ruffStats.rings >= 4 && ringLeft === 0 && ruffStageT > 6) || ruffStageT > 18) {
        if (typeof obstacles !== "undefined") obstacles = [];
        nextStage();
      }
    } else if (ruffStage === "combined") {
      updateCrystals(dt);
      updateTrainingCoins(dt);
      updateTrainingAirship(dt);
      if (ruffCrystals.length < 1 && ruffStageT > 2) spawnCrystals(2);
      if (ruffCoins.length < 3 && ruffStageT > 1.0) spawnTrainingCoins(5);
      // Big industrial airship — avoid it; scrolls slowly
      if (!ruffAirship && ruffStageT > 2.5) spawnTrainingAirship();
      // Stay in lesson until airship is fully off-screen (or long failsafe)
      const airshipDone = window.__airborneAirshipCleared || (!ruffAirship && ruffStageT > 8);
      if (airshipDone && ruffStageT > 10) {
        ruffCrystals = [];
        ruffCoins = [];
        ruffAirship = null;
        window.__airborneAirshipCleared = false;
        if (typeof obstacles !== "undefined") obstacles = [];
        nextStage();
      }
    } else if (ruffStage === "landing") {
      // Request land once — do not spam every frame (causes land/score glitches)
      if (!window.__airborneRuffLandArmed) {
        window.__airborneRuffLandArmed = true;
        window.__airborneRuffRequestLand = true;
      }
      const ph = window.__airborneAirfieldPhase;
      // Wait for real touchdown / score — then open report right away
      if (ph === "score" || ph === "done" || window.__airborneAirfieldDidLand) {
        nextStage(); // → report
      } else if (ruffStageT > 35) {
        // Long failsafe only
        nextStage();
      }
    } else if (ruffStage === "report") {
      // report UI handles exit
    } else if (ruffStageT > 16) {
      // Unknown stage safety
      nextStage();
    }
  }

  function drawRuff() {
    if (!ruffActive && window.__airborneRuffActive) {
      ruffActive = true;
      if (!ruffStage || ruffStage === "idle") ruffStage = window.__airborneRuffStage || "intro";
    }
    if (!ruffActive) return;
    if (!window.__ruffDrawLogged) {
      window.__ruffDrawLogged = true;
      console.log("[R.U.F.F.] drawing", ruffStage, Math.round(ruffX), Math.round(ruffY));
    }
    drawMarkers();
    drawCrystals();
    drawTrainingCoins();
    drawTrainingAirship();
    drawSparkles();
    drawRuffCompanion();
  }

  function drawPowerOrb() {
    if (!ruffPowerOrb || ruffPowerOrb.collected || typeof ctx === "undefined") return;
    const o = ruffPowerOrb;
    const y = o.y + Math.sin(o.bob || 0) * 12;
    const pulse = 1 + Math.sin(o.pulse || 0) * 0.12;
    ctx.save();
    // Aura
    const grd = ctx.createRadialGradient(o.x, y, 4, o.x, y, o.r * 2.2 * pulse);
    grd.addColorStop(0, "rgba(160,230,255,0.55)");
    grd.addColorStop(0.5, "rgba(100,180,255,0.2)");
    grd.addColorStop(1, "rgba(100,180,255,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(o.x, y, o.r * 2.2 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Icon image if available
    const img = (typeof images !== "undefined") ? (images.power_icon_blimp1 || images.cloud || images.pirate_bomb) : null;
    const s = o.r * 2 * pulse;
    if (img && img.naturalWidth) {
      ctx.drawImage(img, o.x - s / 2, y - s / 2, s, s);
    } else {
      ctx.fillStyle = "#7ecbff";
      ctx.beginPath();
      ctx.arc(o.x, y, o.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Spark ring
    ctx.strokeStyle = "rgba(255,230,120,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(o.x, y, o.r * 1.35 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Contextual reactions (called from elsewhere)
  window.__airborneRuffReact = function (kind) {
    if (!ruffActive) return;
    if (ruffStage === "intro" || ruffStage === "report") return;
    const lines = DIALOGUE.good;
    if (kind === "crash") {
      showRadio(DIALOGUE.crash[Math.floor(Math.random() * DIALOGUE.crash.length)], 2.2);
    } else if (kind === "ring") {
      ruffStats.rings++;
      ruffCombo++;
      if (ruffCombo > ruffStats.bestCombo) ruffStats.bestCombo = ruffCombo;
      if (ruffCombo >= 3) showRadio("Keep it going!", 1.6);
    } else if (kind === "powerup") {
      ruffStats.powerups++;
      showRadio("You've got a charge! Use it wisely.", 2.2);
    } else if (kind === "nearMiss") {
      showRadio("That was close.", 1.5);
    }
  };

  window.__airborneForceRuffAltitude = function() {
    if (!ruffActive) {
      ruffActive = true;
      window.__airborneRuffActive = true;
    }
    if (ruffStage === "intro" || ruffStage === "takeoff" || ruffStage === "idle") {
      setStage("altitude");
    }
  };
  window.__airborneBeginRuff = beginRuffTraining;
  window.__airborneUpdateRuff = updateRuff;
  window.__airborneDrawRuff = drawRuff;
  window.__airborneRuffActive = false;
  window.__airborneRuffStage = "idle";
  window.__airborneRuffRequestLand = false;
  window.__airborneRingCollects = 0;
})();

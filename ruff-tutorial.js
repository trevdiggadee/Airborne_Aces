"use strict";

// ============================================================
// R.U.F.F. — Radio Utility Flight Friend (Training Instructor)
// ============================================================

(function () {
  const RUFF_FRAME_COUNT = 36;
  const CRYSTAL_FRAME_COUNT = 25;
  const CRYSTAL_SCORE = 15;

  // Pilot rank progression (wire thresholds later; training always Cadet for now)
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
  let ruffY = 0;
  let ruffSpeakClose = 0;
  let ruffTilt = 0;
  let ruffScalePulse = 1;
  let ruffStats = {
    crystals: 0,
    rings: 0,
    powerups: 0,
    obstaclesAvoided: 0,
    bestCombo: 0,
    landingStars: 3
  };
  let ruffCrystals = [];
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
      // hand control to airfield land phase
      if (typeof airfieldPhase !== "undefined") {
        // signal world-buildings via window
      }
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
      if (c.frameT > 0.06) {
        c.frameT = 0;
        c.frame = (c.frame + 1) % CRYSTAL_FRAME_COUNT;
      }
      // collect
      if (Math.abs(c.x - px) < pw + c.r && Math.abs(c.y - py) < ph + c.r) {
        c.collected = true;
        ruffStats.crystals++; playCrystalCollectSfx();
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

  function drawCrystals() {
    if (!ruffCrystals.length || typeof ctx === "undefined") return;
    ruffCrystals.forEach(function (c) {
      if (c.collected) return;
      const key = "blue_crystal_" + String(c.frame + 1).padStart(2, "0");
      const img = (typeof images !== "undefined") ? images[key] : null;
      const s = c.r * 2.2;
      if (img && img.naturalWidth) {
        ctx.drawImage(img, c.x - s / 2, c.y - s / 2, s, s);
      } else {
        ctx.save();
        ctx.fillStyle = "#4fc3f7";
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
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
    if (ruffFrameT > 1 / 12) {
      ruffFrameT = 0;
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
    } catch (e) { console.warn("updateRuffCompanion", e); }
  }

  function drawRuffCompanion() {
    if (!ruffActive || typeof ctx === "undefined") return;
    if (ruffStage === "report") return;
    // Clamp on-screen so he never vanishes off the side
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
      // fallback any loaded ruff frame
      for (let i = 1; i <= RUFF_FRAME_COUNT; i++) {
        const k2 = "ruff_" + String(i).padStart(2, "0");
        if (images && images[k2] && images[k2].naturalWidth) { img = images[k2]; break; }
      }
    }
    const size = Math.max(90, (typeof player !== "undefined" && player ? player.h * 1.55 : 98)); // ~25% smaller
    const sc = size * (ruffScalePulse || 1);
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(ruffTilt || 0);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "rgba(212,175,55,0.55)";
    ctx.beginPath();
    ctx.arc(-6, 4, sc * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (img && img.naturalWidth) {
      ctx.drawImage(img, -sc / 2, -sc / 2, sc, sc);
    } else {
      // Visible brass robot placeholder if assets not loaded yet
      ctx.fillStyle = "#c4a35a";
      ctx.strokeStyle = "#4a3210";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, sc * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a1a08";
      ctx.font = "bold " + Math.floor(sc * 0.18) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("R.U.F.F.", 0, 0);
    }
    ctx.restore();
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
    if (medalImg) {
      const src = (typeof images !== "undefined" && images.medal_badge && images.medal_badge.src)
        ? images.medal_badge.src
        : "medal_badge.webp";
      medalImg.src = src;
      medalImg.alt = pilotRank.name || "Cadet";
    }

    if (final) {
      final.textContent = "FINAL SCORE  0";
      final.style.opacity = "0.75";
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
    hideRadio();
    stopSpeak();
    const el = reportEl();
    if (el) el.classList.remove("visible");
    ruffActive = false;
    window.__airborneRuffActive = false;
    window.__airborneRuffStage = "idle";
    window.__airborneRuffRequestLand = false;
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
    if (!ruffActive) {
      ruffActive = true;
      window.__airborneRuffActive = true;
    }
    setStage("report");
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
    ruffStats = { crystals: 0, rings: 0, powerups: 0, obstaclesAvoided: 0, bestCombo: 0, landingStars: 3 };
    ruffCrystals = [];
    ruffMarkers = [];
    ruffCombo = 0;
    ruffIntroDone = false;
    ensureSkipHandler();
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
        } else if (ruffStage === "combined" && ruffStageT > 40) {
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
      if (ruffStageT > 14) nextStage();
    } else if (ruffStage === "crystals") {
      updateCrystals(dt);
      if (ruffStats.crystals < 3 && ruffCrystals.length < 2) spawnCrystals(3);
      if ((ruffStats.crystals >= 3 && ruffCrystals.length === 0 && ruffStageT > 5) || ruffStageT > 22) {
        nextStage();
      }
    } else if (ruffStage === "obstacles") {
      window.__airborneAirfieldObstacles = true;
      if (typeof spawnInterval !== "undefined") spawnInterval = 1.35; // slightly faster birds
      // Keep spawning for most of the stage — only stop near the end
      if (ruffStageT > 16) {
        window.__airborneAirfieldObstacles = false;
        if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      }
      const obsCount = (typeof obstacles !== "undefined" && obstacles) ? obstacles.length : 0;
      if ((ruffStageT > 18 && obsCount === 0) || ruffStageT > 24) {
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
      if (ruffCrystals.length < 1 && ruffStageT > 3) spawnCrystals(2);
      if (ruffStageT > 16) {
        ruffCrystals = [];
        if (typeof obstacles !== "undefined") obstacles = [];
        nextStage();
      }
    } else if (ruffStage === "landing") {
      window.__airborneRuffRequestLand = true;
      const ph = window.__airborneAirfieldPhase;
      if (ph === "score" || ph === "done") {
        nextStage();
      } else if (ruffStageT > 40) {
        nextStage();
      }
    } else if (ruffStage === "report") {
      // report UI handles exit
    } else if (ruffStageT > 25) {
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

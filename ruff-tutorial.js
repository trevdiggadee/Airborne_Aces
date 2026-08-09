"use strict";

// ============================================================
// R.U.F.F. — Radio Utility Flight Friend (Training Instructor)
// ============================================================

(function () {
  const RUFF_FRAME_COUNT = 36;
  const CRYSTAL_FRAME_COUNT = 25;
  const CRYSTAL_SCORE = 15;

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
    el.classList.add("visible");
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
    if (el) el.classList.remove("visible");
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
    syncStageFlags();

    if (name === "intro") {
      if (ruffLines.length) showRadio(ruffLines[0], 4.5);
    } else if (name === "takeoff") {
      if (ruffLines.length) showRadio(ruffLines[0], 2.8);
      ruffWaitingInput = true;
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
      if (typeof spawnInterval !== "undefined") spawnInterval = 1.15; // more obstacles
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
    // Keep flight speed alive so nothing freezes on screen
    if (typeof obstacleSpeed !== "undefined") {
      obstacleSpeed = Math.max(obstacleSpeed || 0, 200);
    }
    window.__airborneAirfieldPaused = false;

    // Early stages: no obstacles/rings; only hearts (and later crystals via R.U.F.F.)
    if (ruffStage === "intro" || ruffStage === "takeoff" || ruffStage === "altitude") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      // Clear any frozen powerups / bombs sitting on screen
      if (typeof powerup !== "undefined") powerup = null;
      if (typeof obstacles !== "undefined" && obstacles) {
        obstacles = obstacles.filter(function (o) {
          return o && (o.type === "heart" || o.isHeart);
        });
      }
    } else if (ruffStage === "crystals") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      if (typeof powerup !== "undefined") powerup = null;
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
        ruffStats.crystals++;
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
        try { if (typeof sfxCollect === "function") sfxCollect(); } catch (e) {}
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
    ruffBob += dt * 2.2;
    ruffFrameT += dt;
    if (ruffFrameT > 1 / 12) {
      ruffFrameT = 0;
      ruffFrame = (ruffFrame + 1) % RUFF_FRAME_COUNT;
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
  }

  function drawRuffCompanion() {
    if (!ruffActive || typeof ctx === "undefined") return;
    if (ruffStage === "report") return;
    const key = "ruff_" + String(ruffFrame + 1).padStart(2, "0");
    const img = (typeof images !== "undefined") ? images[key] : null;
    const size = Math.max(84, (typeof player !== "undefined" && player ? player.h * 1.65 : 96));
    const sc = size * (ruffScalePulse || 1);
    ctx.save();
    ctx.translate(ruffX, ruffY);
    ctx.rotate(ruffTilt || 0);
    // Soft motion trail / glow
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "rgba(212,175,55,0.5)";
    ctx.beginPath();
    ctx.arc(-6, 4, sc * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (img && img.naturalWidth) {
      ctx.drawImage(img, -sc / 2, -sc / 2, sc, sc);
    } else {
      ctx.fillStyle = "#b08d3a";
      ctx.strokeStyle = "#5a4010";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, sc * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- Flight report ----------
  function showFlightReport() {
    const el = reportEl();
    if (!el) return;
    const rows = document.getElementById("ruffReportRows");
    const final = document.getElementById("ruffFinalScore");
    const rank = document.getElementById("ruffRank");
    if (rows) {
      rows.innerHTML =
        row("SKY CRYSTALS", "×" + ruffStats.crystals) +
        row("RINGS", "×" + ruffStats.rings) +
        row("POWER-UPS", "×" + ruffStats.powerups) +
        row("OBSTACLES AVOIDED", "×" + ruffStats.obstaclesAvoided) +
        row("BEST COMBO", "×" + ruffStats.bestCombo) +
        row("LANDING", "★".repeat(ruffStats.landingStars));
    }
    const sc = (typeof score === "number") ? score : 0;
    if (final) final.textContent = "FINAL SCORE  " + sc;
    let rankName = "CADET";
    let reaction = "Not bad for a first flight.";
    if (sc >= 800) { rankName = "AIR SCOUT"; reaction = "Now THAT is how you fly!"; }
    if (sc >= 1500) { rankName = "SKY RANGER"; reaction = "Rookie? I think we just found an ace."; }
    if (rank) rank.textContent = "PILOT RANK  ·  " + rankName;
    el.classList.add("visible");
    showRadio(reaction, 3.5);
    ensureSkipHandler();
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
    if (typeof endAirfieldTrainingToMap === "function") {
      endAirfieldTrainingToMap();
    } else if (window.__airborneShowWorldMap) {
      window.__airborneShowWorldMap({ mode: "start" });
    }
  }

  // ---------- Public API ----------
  function beginRuffTraining() {
    ruffActive = true;
    window.__airborneRuffActive = true;
    window.__airborneAirfieldAllowPowerup = false;
    if (typeof powerup !== "undefined") powerup = null;
    if (typeof shieldPickup !== "undefined") shieldPickup = null;
    if (typeof stormCharge === "number") stormCharge = 0;
    const sm0 = document.getElementById("stormMeter");
    if (sm0) sm0.style.visibility = ""; // icon always visible
    if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay();
    ruffStats = { crystals: 0, rings: 0, powerups: 0, obstaclesAvoided: 0, bestCombo: 0, landingStars: 3 };
    ruffCrystals = [];
    ruffMarkers = [];
    ruffCombo = 0;
    ruffIntroDone = false;
    ensureSkipHandler();
    if (typeof player !== "undefined" && player) {
      ruffX = player.x - 40;
      ruffY = player.y - 30;
    }
    setStage("intro");
  }

  function updateRuff(dt) {
    if (!ruffActive) return;
    ruffStageT += dt;
    ruffLineT += dt;
    // Never let training world freeze
    if (typeof obstacleSpeed !== "undefined" && !(obstacleSpeed > 50)) {
      obstacleSpeed = 210;
    }
    window.__airborneAirfieldPaused = false;
    updateRuffCompanion(dt);
    updateSparkles(dt);

    // Auto-advance dialogue lines
    if (ruffLines.length && ruffLineIdx < ruffLines.length &&
        ruffLineT >= ruffLineDuration && ruffSpeechDone) {
      const done = advanceLine();
      if (done) {
        // Stage-specific after dialogue
        if (ruffStage === "intro") {
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

    // Stage logic
    if (ruffStage === "takeoff") {
      // Progress when airfield reaches climb or lesson
      const ph = window.__airborneAirfieldPhase;
      if (ph === "climb" && ruffLineIdx === 0) {
        // celebrate lift
      }
      if (ph === "lesson" || ph === "climb") {
        if (ruffStageT > 1.2 && ruffLineIdx >= 1) {
          // after some climb time, move on once lines done or forced
        }
        if (ph === "lesson") {
          showRadio("Easy does it. You're flying now.", 2.4);
          nextStage();
        }
      }
    } else if (ruffStage === "altitude") {
      ruffCrystals = [];
      if (typeof obstacles !== "undefined") obstacles = [];
      updateMarkers(dt);
      if (ruffStageT > 12 && ruffMarkers.length === 0) {
        showRadio("Good control.", 2.4);
        nextStage();
      } else if (ruffStageT > 22) {
        nextStage();
      }
    } else if (ruffStage === "crystals") {
      if (typeof obstacles !== "undefined") obstacles = [];
      if (typeof powerup !== "undefined") powerup = null;
      if (typeof healPickup !== "undefined") healPickup = null;
      if (typeof shieldPickup !== "undefined") shieldPickup = null;
      updateCrystals(dt);
      // Keep spawning until goal met, then wait for remaining to leave screen
      if (ruffStats.crystals < 3 && ruffCrystals.length < 2) spawnCrystals(3);
      const crystalsDone = ruffStats.crystals >= 3 && ruffCrystals.length === 0;
      if (crystalsDone && ruffStageT > 5) {
        showRadio("Crystals increase your score. Keep your eyes open.", 3.0);
        nextStage();
      } else if (ruffStageT > 45 && ruffCrystals.length === 0) {
        nextStage();
      }
    } else if (ruffStage === "obstacles") {
      ruffCrystals = [];
      if (typeof powerup !== "undefined") powerup = null;
      if (typeof shieldPickup !== "undefined") shieldPickup = null;
      // Wait for spawned birds to clear after practice window
      const obsCount = (typeof obstacles !== "undefined" && obstacles) ? obstacles.length : 0;
      if (ruffStageT > 12 && obsCount === 0) {
        showRadio("Excellent. Avoid those and you keep your hearts.", 3.0);
        ruffStats.obstaclesAvoided += 3;
        nextStage();
      } else if (ruffStageT > 30 && obsCount === 0) {
        nextStage();
      }
    } else if (ruffStage === "powerup") {
      ruffCrystals = [];
      if (typeof obstacles !== "undefined") obstacles = [];
      if (typeof powerup !== "undefined") powerup = null;
      // Keep meter full until they tap it (or timeout)
      if (!stormActive && typeof STORM_MAX === "number") {
        stormCharge = STORM_MAX;
      }
      if (stormActive && !ruffStats._powerUsed) {
        ruffStats._powerUsed = true;
        ruffStats.powerups++;
        showRadio("That's your ship power — clear the sky!", 3.0);
      }
      if ((ruffStats._powerUsed && ruffStageT > 6) || ruffStageT > 20) {
        nextStage();
      }
    } else if (ruffStage === "rings") {
      ruffCrystals = [];
      if (typeof powerup !== "undefined") powerup = null;
      if (typeof window.__airborneRingCollects === "number") {
        ruffStats.rings = window.__airborneRingCollects;
        if (ruffStats.rings > ruffStats.bestCombo) ruffStats.bestCombo = ruffStats.rings;
      }
      const ringLeft = (typeof obstacles !== "undefined" && obstacles)
        ? obstacles.filter(function(o){ return o && (o.isRing || o.type === "gold_ring") && !o.collected; }).length
        : 0;
      if (ruffStats.rings >= 6 && ringLeft === 0 && ruffStageT > 8) {
        showRadio("That's a combo. Keep the chain going!", 3.0);
        nextStage();
      } else if (ruffStageT > 35 && ringLeft === 0) {
        nextStage();
      }
    } else if (ruffStage === "combined") {
      updateCrystals(dt);
      if (ruffCrystals.length < 1 && ruffStageT > 5) spawnCrystals(2);
      if (ruffStageT > 20) {
        showRadio("Alright, pilot. Time to bring her home.", 3.2);
        nextStage();
      }
    } else if (ruffStage === "landing") {
      window.__airborneRuffRequestLand = true;
      const ph = window.__airborneAirfieldPhase;
      if (ph === "score" || ph === "done") {
        nextStage();
      }
      // also timeout to report if land finishes
      if (ruffStageT > 20) nextStage();
    }
  }

  function drawRuff() {
    if (!ruffActive) return;
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

  window.__airborneBeginRuff = beginRuffTraining;
  window.__airborneUpdateRuff = updateRuff;
  window.__airborneDrawRuff = drawRuff;
  window.__airborneRuffActive = false;
  window.__airborneRuffStage = "idle";
  window.__airborneRuffRequestLand = false;
  window.__airborneRingCollects = 0;
})();

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
    try { clearTrainingPowerIcon(); } catch (e) {}

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
  window.__airborneRuffMuted = true; // mute Ruff dialog for now
  let ruffLandingCelebrated = false;

  
  // ========== SELF-CONTAINED TRAINING AUDIO (own AudioContext) ==========
  var __trainCtx = null;
  var __trainMaster = null;
  var __trainBed = null;
  var __trainEngine = null;
  var __trainWind = null;

  function trainEnsure() {
    try {
      if (!__trainCtx) {
        __trainCtx = new (window.AudioContext || window.webkitAudioContext)();
        __trainMaster = __trainCtx.createGain();
        __trainMaster.gain.value = 0.55;
        __trainMaster.connect(__trainCtx.destination);
      }
      if (__trainCtx.state === "suspended") __trainCtx.resume();
      return true;
    } catch (e) {
      console.warn("trainEnsure", e);
      return false;
    }
  }

  function trainBeep(freq, dur, vol, type) {
    if (!trainEnsure()) return;
    try {
      var t0 = __trainCtx.currentTime;
      var o = __trainCtx.createOscillator();
      var g = __trainCtx.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(Math.max(0.001, vol || 0.2), t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.15));
      o.connect(g);
      g.connect(__trainMaster);
      o.start(t0);
      o.stop(t0 + (dur || 0.15) + 0.05);
    } catch (e) {}
  }

  function trainChord(freqs, dur, vol) {
    if (!trainEnsure()) return;
    freqs.forEach(function (f, i) {
      setTimeout(function () { trainBeep(f, dur || 0.2, (vol || 0.15), "sine"); }, i * 60);
    });
  }

  function playTrainingMusic() {
    if (!trainEnsure()) return;
    stopTrainingMusic();
    try {
      var t0 = __trainCtx.currentTime;
      var o1 = __trainCtx.createOscillator();
      var o2 = __trainCtx.createOscillator();
      var g1 = __trainCtx.createGain();
      var g2 = __trainCtx.createGain();
      o1.type = "sine";
      o2.type = "triangle";
      o1.frequency.value = 146.8;
      o2.frequency.value = 220;
      g1.gain.value = 0.12;
      g2.gain.value = 0.07;
      o1.connect(g1); g1.connect(__trainMaster);
      o2.connect(g2); g2.connect(__trainMaster);
      o1.start(); o2.start();
      __trainBed = { o1: o1, o2: o2, g1: g1, g2: g2 };
    } catch (e) { console.warn(e); }
  }

  function stopTrainingMusic() {
    try {
      if (!__trainBed) return;
      try { __trainBed.o1.stop(); } catch (e) {}
      try { __trainBed.o2.stop(); } catch (e) {}
      __trainBed = null;
    } catch (e) {}
  }

  function trainEngineStart() {
    if (!trainEnsure()) return;
    trainEngineStop();
    try {
      var o1 = __trainCtx.createOscillator();
      var o2 = __trainCtx.createOscillator();
      var f = __trainCtx.createBiquadFilter();
      var g = __trainCtx.createGain();
      o1.type = "sawtooth";
      o2.type = "triangle";
      o1.frequency.value = 55;
      o2.frequency.value = 98;
      f.type = "lowpass";
      f.frequency.value = 320;
      g.gain.value = 0.08;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(__trainMaster);
      o1.start(); o2.start();
      __trainEngine = { o1: o1, o2: o2, g: g };
    } catch (e) {}
  }

  function trainEngineStop() {
    try {
      if (!__trainEngine) return;
      try { __trainEngine.o1.stop(); } catch (e) {}
      try { __trainEngine.o2.stop(); } catch (e) {}
      __trainEngine = null;
    } catch (e) {}
  }

  function trainWindStart() {
    if (!trainEnsure()) return;
    trainWindStop();
    try {
      var len = __trainCtx.sampleRate * 2;
      var buf = __trainCtx.createBuffer(1, len, __trainCtx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
      var src = __trainCtx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      var f = __trainCtx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 800;
      f.Q.value = 0.5;
      var g = __trainCtx.createGain();
      g.gain.value = 0.045;
      src.connect(f); f.connect(g); g.connect(__trainMaster);
      src.start();
      __trainWind = { src: src, g: g };
    } catch (e) {}
  }

  function trainWindStop() {
    try {
      if (!__trainWind) return;
      try { __trainWind.src.stop(); } catch (e) {}
      __trainWind = null;
    } catch (e) {}
  }

  function sfxTrainingCoin() { trainBeep(988, 0.1, 0.18, "square"); }
  function sfxTrainingStageClear() { trainChord([392, 494, 587, 784], 0.22, 0.16); }
  function sfxTrainingShield() { trainBeep(330, 0.25, 0.15, "triangle"); trainBeep(440, 0.2, 0.1, "sine"); }
  function sfxTrainingBossWarn() { trainBeep(80, 0.45, 0.2, "sawtooth"); }
  function sfxTrainingCrystal() { trainBeep(1200, 0.08, 0.16, "sine"); trainBeep(1600, 0.1, 0.12, "sine"); }
  function sfxTrainingRing() { trainBeep(660, 0.06, 0.14, "triangle"); trainBeep(880, 0.12, 0.12, "sine"); }
  function sfxTrainingLand() {
    trainBeep(200, 0.15, 0.2, "triangle");
    setTimeout(function(){ trainChord([523, 659, 784, 1046], 0.3, 0.18); }, 150);
  }
  function sfxTrainingPower() { trainBeep(180, 0.2, 0.18, "sawtooth"); trainBeep(360, 0.25, 0.14, "square"); }
  
  // Boss lesson exclusive track
  var __trainBossAudio = null;
  function playTrainingBossMusic() {
    try {
      stopTrainingBossMusic();
      var a = new Audio("the_engine_s_decree.mp3?v=ruff181");
      a.loop = true;
      a.volume = 0.275; // 50% boss track track level
      a.play().catch(function (e) { console.warn("boss mp3", e); });
      __trainBossAudio = a;
      // Dip the soft bed while boss track plays
      try {
        if (__trainBed && __trainBed.g1) __trainBed.g1.gain.value = 0.03;
        if (__trainBed && __trainBed.g2) __trainBed.g2.gain.value = 0.02;
      } catch (e) {}
    } catch (e) { console.warn(e); }
  }
  function stopTrainingBossMusic() {
    try {
      if (__trainBossAudio) {
        __trainBossAudio.pause();
        __trainBossAudio.currentTime = 0;
        __trainBossAudio = null;
      }
      try {
        if (__trainBed && __trainBed.g1) __trainBed.g1.gain.value = 0.12;
        if (__trainBed && __trainBed.g2) __trainBed.g2.gain.value = 0.07;
      } catch (e) {}
    } catch (e) {}
  }

  function stopAllTrainingAudio() {
    stopTrainingBossMusic();
    stopTrainingMusic();
    trainEngineStop();
    trainWindStop();
  }



  let ruffCoins = [];

  function placeTrainingPowerIcon() {
    try {
      var dock = document.getElementById("unifiedDock");
      if (dock) {
        dock.classList.add("trainingShow");
        dock.classList.add("gameActive");
        dock.classList.remove("menuHidden");
        dock.style.display = "flex";
        dock.style.opacity = "1";
        dock.style.visibility = "visible";
      }
      var meter = document.getElementById("stormMeter");
      if (!meter) return;
      meter.classList.add("trainingPos");
      meter.classList.remove("trainingHidden");
      meter.style.display = "flex";
      meter.style.visibility = "visible";
      meter.style.opacity = "1";
      meter.style.pointerEvents = "auto";
      window.__airborneAirfieldAllowPowerup = true;
    try {
      if (typeof stormCharge !== "undefined" && typeof STORM_MAX === "number") {
        stormCharge = STORM_MAX;
        if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay(false);
      }
    } catch (e) {}
    } catch (e) {}
  }
  function clearTrainingPowerIcon() {
    try {
      var meter = document.getElementById("stormMeter");
      if (meter) {
        meter.classList.remove("trainingPos");
        meter.classList.remove("trainingHidden");
      }
      var dock = document.getElementById("unifiedDock");
      if (dock) {
        dock.classList.remove("trainingShow");
        dock.classList.remove("gameActive");
        dock.classList.add("menuHidden");
      }
    } catch (e) {}
  }

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
    "obstacles",
    "rings",
    "crystals",
    "shield",
    "powerup",
    "airship",
    "boss1",
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
    airship: [
      "Hold up — heavy traffic ahead.",
      "That's an industrial hauler. Give it a wide berth.",
      "Wait until it clears the sky before we continue."
    ],
    boss1: [
      "Incoming contact — this is the real deal, rookie.",
      "Baron Blackpowder. Bomb bay and all.",
      "The sky will darken. Stay sharp and empty that balloon."
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
    try {
      const el = document.getElementById("ruffFlightTrace");
      if (el) {
        el.classList.remove("visible");
        el.style.display = "none";
        el.style.visibility = "hidden";
        el.setAttribute("aria-hidden", "true");
      }
    } catch (e) {}
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
    if (cont) {
      cont.textContent = "RETURN TO HANGAR ▶";
      cont.onclick = function (e) {
        try { if (e) { e.preventDefault(); e.stopPropagation(); } } catch (err) {}
        try { if (typeof sfxClick === "function") sfxClick(); } catch (err) {}
        if (typeof finishToHangar === "function") finishToHangar();
        else if (window.__airborneFinishToHangar) window.__airborneFinishToHangar();
        else finishToMap();
      };
      cont.style.pointerEvents = "auto";
      cont.style.zIndex = "80";
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
    // Ruff voice/dialog muted for now
    if (window.__airborneRuffMuted !== false) {
      try { hideRadio(); } catch (e) {}
      ruffSpeechDone = true;
      return;
    }
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
    if (name !== "boss1") {
      try { stopTrainingBossMusic(); } catch (e) {}
    }
    // Keep coins/crystals/obstacles/rings on screen between lessons —
    // they only leave when collected, destroyed, or scrolled off.
    // (Only clear on hard training start / report end, not stage changes.)
    try {
      if (name === "report" || name === "intro") {
        // intro: fresh start handled by beginTraining; report: cleanup later
        if (name === "report") {
          /* leave world as-is until hangar */
        }
      }
    } catch (e) {}
    ruffStage = name;
    ruffStageT = 0;
    ruffLessonPendingNext = false;
    ruffLessonClearing = false;
    ruffLessonPauseT = 0;
    ruffLineIdx = 0;
    ruffLines = DIALOGUE[name] ? DIALOGUE[name].slice() : [];
    ruffWaitingInput = false;
    ruffWaitingCollect = 0;
    ruffWaitingAvoid = false;
    ruffWaitingRing = 0;
    window.__airborneRuffStage = name;
    window.__airborneAirfieldAllowShield = (name === "shield" || name === "combined");
    if (!window.__airborneAirfieldAllowShield) { try { shieldPickup = null; } catch (e) {} };
    try { updateFlightTrace(name); } catch (e) {}
    window.__airborneAirfieldAllowPowerup = true;
    try {
      if (typeof stormCharge !== "undefined" && typeof STORM_MAX === "number") {
        stormCharge = STORM_MAX;
        if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay(false);
      }
    } catch (e) {}
    try { placeTrainingPowerIcon(); } catch (e) {}
    try {
      var ft = document.getElementById("ruffFlightTrace");
      if (ft) { ft.style.display = "none"; ft.style.visibility = "hidden"; }
    } catch (e) {}
    try {
      var stages = ["intro","altitude","obstacles","rings","crystals","shield","powerup","airship","boss1","combined","landing"];
      var si = stages.indexOf(name);
      if (si < 0) si = 0;
      if (typeof window.updateUnifiedProgress === "function") window.updateUnifiedProgress(((si + 1) / stages.length) * 100);
    } catch (e) {}
    if (name !== "powerup") ruffPowerOrb = null;
    if (typeof powerup !== "undefined" && name !== "powerup" && name !== "combined") powerup = null;
    try { placeTrainingPowerIcon(); } catch (e) {}
    try {
      var ft = document.getElementById("ruffFlightTrace");
      if (ft) { ft.style.display = "none"; ft.style.visibility = "hidden"; }
    } catch (e) {}
    try {
      var stages = ["intro","altitude","obstacles","rings","crystals","shield","powerup","airship","boss1","combined","landing"];
      var si = stages.indexOf(name);
      if (si < 0) si = 0;
      if (typeof window.updateUnifiedProgress === "function") window.updateUnifiedProgress(((si + 1) / stages.length) * 100);
    } catch (e) {}
    syncStageFlags();
    // Ensure far-sky balloons stay present for the whole training
    try {
      if (name !== "report" && name !== "idle" && (!ruffBgBalloons || !ruffBgBalloons.length)) {
        spawnTrainingBgBalloons();
      }
    } catch (e) {}

    // Always surface first Ruff line for this stage (dialogue visibility fix)
    try {
      if (ruffLines && ruffLines.length && name !== "report") {
        showRadio(ruffLines[0], name === "intro" ? 3.5 : 3.0);
        ruffLineIdx = 0;
        ruffLineT = 0;
      }
    } catch (e) {}

    // Stage flags only — do NOT wipe coins/crystals/obstacles already on screen
    if (name === "altitude" || name === "crystals" || name === "powerup") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
    } else if (name === "obstacles" || name === "shield") {
      window.__airborneAirfieldObstacles = true;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 0.75; // denser obstacles
    } else if (name === "boss1") {
      try { spawnTrainingBgBalloons(); } catch (e) {}
      try { sfxTrainingBossWarn(); } catch (e) {}
      try { playTrainingBossMusic(); } catch (e) {}
      window.__airborneAirfieldRings = false;
      window.__airborneAirfieldObstacles = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      window.__airborneTrainingBoss = true;
      window.__airborneTrainingBossDone = false;
      window.__airborneTrainingBossTried = false;
      ruffBossDark = 0;
      try { bossBanner = null; } catch (e) {}
      try { spawnTrainingBgBalloons(); } catch (e) {}
      // Boss spawned once from stage update only (avoids double spawn)
    } else if (name === "airship") {
      // Keep background balloons during airship lesson

      window.__airborneAirfieldRings = false;
      window.__airborneAirfieldObstacles = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      ruffAirship = null;
      try { spawnTrainingAirship(); } catch (e) {}
    } else if (name === "rings") {
      window.__airborneAirfieldRings = true;
      window.__airborneAirfieldObstacles = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 1.5;
    } else if (name === "combined") {
      window.__airborneTrainingBoss = false;
      window.__airborneTrainingBossTried = false;
      // Keep background balloons for entire training
      ruffBossDark = 0;
      window.__airborneAirfieldRings = true;
      window.__airborneAirfieldObstacles = true;
      if (typeof spawnInterval !== "undefined") spawnInterval = 0.85; // denser combined
      try { spawnTrainingCoins(12); } catch (e) {}
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
      try { trainEngineStart(); trainWindStart(); } catch (e) {}
    } else if (name === "altitude") {
      if (ruffLines.length) showRadio(ruffLines[0], 3.0);
      spawnAltitudeMarkers();
    } else if (name === "crystals") {
      if (ruffLines.length) showRadio(ruffLines[0], 3.0);
      spawnCrystals(10);
      spawnTrainingCoins(18);
      ruffWaitingCollect = 5;
    } else if (name === "obstacles") {
      if (ruffLines.length) showRadio(ruffLines[0], 2.8);
      window.__airborneAirfieldObstacles = true;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 0.7; // denser obstacles
      ruffWaitingAvoid = true;
    } else if (name === "powerup") {
      if (ruffLines.length) showRadio(ruffLines[0], 3.2);
      window.__airborneAirfieldAllowPowerup = true;
    try {
      if (typeof stormCharge !== "undefined" && typeof STORM_MAX === "number") {
        stormCharge = STORM_MAX;
        if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay(false);
      }
    } catch (e) {}
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      if (typeof powerup !== "undefined") powerup = null;
      ruffPowerOrb = null;
      window.__airborneFirePickup = null;
      window.__airborneTrainingPowerUsed = false;
      window.__airborneTrainingPowerWait = 0;
      // Coins charge the meter — start empty, spawn lots of coins
      if (typeof stormCharge === "number") stormCharge = 0;
      try { spawnTrainingCoins(16); } catch (e) {}
      if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay(false);
    } else if (name === "rings") {
      if (ruffLines.length) showRadio(ruffLines[0], 2.8);
      window.__airborneAirfieldRings = true;
      window.__airborneAirfieldObstacles = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 0.95; // denser rings
      ruffWaitingRing = 8;
      window.__airborneRingCollects = 0;
    } else if (name === "combined") {
      window.__airborneTrainingBoss = false;
      window.__airborneTrainingBossTried = false;
      // Keep background balloons for entire training
      ruffBossDark = 0;
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
      try { window.__airborneTrainingReportShown = true; } catch (e) {}
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
    try { sfxTrainingStageClear(); } catch (e) {}
    const i = STAGE_ORDER.indexOf(ruffStage);
    if (i < 0 || i >= STAGE_ORDER.length - 1) {
      setStage("report");
      return;
    }
    setStage(STAGE_ORDER[i + 1]);
  }

  // Gate: wait until lesson items leave/collected, then 2s pause, then nextStage
  var ruffLessonClearing = false;
  var ruffLessonPauseT = 0;
  var ruffLessonPendingNext = false;

  function stopLessonSpawns() {
    window.__airborneAirfieldObstacles = false;
    window.__airborneAirfieldRings = false;
    if (typeof spawnInterval !== "undefined") spawnInterval = 999;
  }

  function lessonItemsPending() {
    var pending = 0;
    try {
      if (ruffCrystals && ruffCrystals.length) {
        pending += ruffCrystals.filter(function (c) { return c && !c.collected && c.x > -60; }).length;
      }
      if (ruffCoins && ruffCoins.length) {
        pending += ruffCoins.filter(function (c) { return c && !c.collected && c.x > -60; }).length;
      }
      if (typeof obstacles !== "undefined" && obstacles && obstacles.length) {
        pending += obstacles.filter(function (o) {
          return o && o.x + (o.w || 0) > -40;
        }).length;
      }
      if (window.__airborneFirePickup && !window.__airborneFirePickup.collected && window.__airborneFirePickup.x > -60) {
        pending += 1;
      }
      if (typeof shieldPickup !== "undefined" && shieldPickup && shieldPickup.x > -50) {
        pending += 1;
      }
      if (typeof powerup !== "undefined" && powerup && powerup.x > -50) {
        pending += 1;
      }
      if (ruffAirship && ruffAirship.x + (ruffAirship.w || 0) > -40) {
        pending += 1;
      }
    } catch (e) {}
    return pending;
  }

  function requestNextStage() {
    // Start clearing current lesson items
    if (!ruffLessonPendingNext) {
      ruffLessonPendingNext = true;
      ruffLessonClearing = true;
      ruffLessonPauseT = 0;
      stopLessonSpawns();
    }
  }

  function tickLessonGate(dt) {
    if (!ruffLessonPendingNext) return;
    if (ruffLessonClearing) {
      stopLessonSpawns();
      ruffLessonPauseT += dt;
      // Force-clear after 6s so we never soft-lock on a stuck item
      if (lessonItemsPending() > 0 && ruffLessonPauseT < 6.0) {
        // keep items scrolling
        try { updateCrystals(dt); } catch (e) {}
        try { updateTrainingCoins(dt); } catch (e) {}
        return;
      }
      // Items gone (or timeout) — begin 2s pause
      ruffLessonClearing = false;
      ruffLessonPauseT = 0;
      // hard-clear leftovers so next lesson is clean
      try {
        ruffCrystals = (ruffCrystals || []).filter(function (c) { return c && !c.collected && c.x > -60; });
        ruffCoins = (ruffCoins || []).filter(function (c) { return c && !c.collected && c.x > -60; });
      } catch (e) {}
    }
    ruffLessonPauseT += dt;
    if (ruffLessonPauseT >= 2.0) {
      ruffLessonPendingNext = false;
      ruffLessonClearing = false;
      ruffLessonPauseT = 0;
      nextStage();
    }
  }

  // ---------- Crystals ----------
  function spawnCrystals(n) {
    // APPEND only — never wipe crystals already on screen (was causing random disappear)
    n = n || 4;
    const existing = (ruffCrystals || []).filter(function (c) { return c && !c.collected; });
    ruffCrystals = existing;
    const W0 = (typeof W !== "undefined" ? W : 400);
    const H0 = (typeof H !== "undefined" ? H : 600);
    let maxX = W0;
    existing.forEach(function (c) { if (c.x > maxX) maxX = c.x; });
    for (let i = 0; i < n; i++) {
      ruffCrystals.push({
        x: Math.max(W0 + 80, maxX + 100) + i * 150,
        y: H0 * (0.28 + Math.random() * 0.35),
        r: 18,
        frame: Math.floor(Math.random() * CRYSTAL_FRAME_COUNT),
        frameT: 0,
        collected: false
      });
    }
  }

  function spawnAltitudeMarkers() {
    // Markers disabled (no dashed lines on screen)
    ruffMarkers = [];
  }

  function playCrystalCollectSfx() {
    try { sfxTrainingCrystal(); } catch (e) {}
  }
  function playRingCollectSfx() {
    try { sfxTrainingRing(); } catch (e) {}
  }
  function playRankUpSfx() {
    try {
      if (typeof sfxRankUp === "function") sfxRankUp();
      else if (typeof sfxLevelCompleteFanfare === "function") sfxLevelCompleteFanfare();
    } catch (e) {}
  }


  // ---------- Training airship obstacle (between rings and combined) ----------
  var ruffAirship = null;

  function spawnTrainingAirship() {
    var H0 = (typeof H !== "undefined") ? H : 600;
    var W0 = (typeof W !== "undefined") ? W : 400;
    // 500% of prior ~25% width → ~125% screen width, centered vertically
    var aw = Math.max(120, W0 * 0.25 * 5);
    var ah = aw * 0.42;
    ruffAirship = {
      x: W0 + aw * 0.08,
      y: H0 * 0.5 - ah * 0.5,
      w: aw,
      h: ah,
      speed: 42,
      frame: 0,
      frameT: 0,
      bob: Math.random() * Math.PI * 2,
      passed: false,
      smoke: [],
      drones: []
    };
  }

  function updateTrainingAirship(dt) {
    if (!ruffAirship) return;
    ruffAirship.x -= (ruffAirship.speed || 55) * dt;
    ruffAirship.bob = (ruffAirship.bob || 0) + dt * 1.2;
    ruffAirship.frameT = (ruffAirship.frameT || 0) + dt;
    var fd = 1 / 12;
    while (ruffAirship.frameT >= fd) {
      ruffAirship.frameT -= fd;
      ruffAirship.frame = ((ruffAirship.frame || 0) + 1) % 25; // 5x5 sheet
    }
    // Realistic steam (white, buoyant) + smoke (grey, drifts back)
    if (!ruffAirship.smoke) ruffAirship.smoke = [];
    if (!ruffAirship.drones) ruffAirship.drones = [];
    var cy0 = ruffAirship.y + Math.sin(ruffAirship.bob || 0) * 6;
    // Stack vents along hull — continuous soft plumes
    if (Math.random() < 0.85) {
      var ventX = ruffAirship.x + ruffAirship.w * (0.12 + Math.random() * 0.55);
      var ventY = cy0 + ruffAirship.h * (0.25 + Math.random() * 0.35);
      var isSteam = Math.random() < 0.55;
      ruffAirship.smoke.push({
        x: ventX,
        y: ventY,
        vx: -8 - Math.random() * 18 - (ruffAirship.speed || 40) * 0.08,
        vy: isSteam ? (-25 - Math.random() * 35) : (-6 - Math.random() * 14),
        life: isSteam ? (0.7 + Math.random() * 0.6) : (0.9 + Math.random() * 0.8),
        age: 0,
        r: isSteam ? (4 + Math.random() * 5) : (5 + Math.random() * 7),
        steam: isSteam,
        turb: Math.random() * Math.PI * 2
      });
    }
    if (Math.random() < 0.5) {
      ruffAirship.smoke.push({
        x: ruffAirship.x + ruffAirship.w * (0.05 + Math.random() * 0.2),
        y: cy0 + ruffAirship.h * (0.4 + Math.random() * 0.3),
        vx: -25 - Math.random() * 30,
        vy: -4 - Math.random() * 12,
        life: 1.0 + Math.random() * 0.7,
        age: 0,
        r: 6 + Math.random() * 8,
        steam: false,
        turb: Math.random() * 6
      });
    }
    for (var si = ruffAirship.smoke.length - 1; si >= 0; si--) {
      var p = ruffAirship.smoke[si];
      p.age += dt;
      p.turb = (p.turb || 0) + dt * 3;
      p.x += p.vx * dt + Math.sin(p.turb) * 6 * dt;
      p.y += p.vy * dt;
      // smoke rises slower, spreads; steam rises fast then softens
      if (p.steam) {
        p.vy *= (1 - 0.35 * dt);
        p.r += 14 * dt;
      } else {
        p.vy -= 4 * dt;
        p.vx *= (1 - 0.15 * dt);
        p.r += 11 * dt;
      }
      if (p.age >= p.life) ruffAirship.smoke.splice(si, 1);
    }
    if (ruffAirship.smoke.length > 48) ruffAirship.smoke.splice(0, ruffAirship.smoke.length - 48);

    // Small drones deploying from the ship with trails
    if (ruffAirship.drones.length < 5 && Math.random() < 0.025) {
      var dx0 = ruffAirship.x + ruffAirship.w * (0.3 + Math.random() * 0.4);
      var dy0 = cy0 + ruffAirship.h * 0.55;
      ruffAirship.drones.push({
        x: dx0, y: dy0,
        vx: -30 - Math.random() * 50,
        vy: (Math.random() - 0.5) * 40,
        life: 2.2 + Math.random() * 1.5,
        age: 0,
        trail: [],
        blink: Math.random() * 6
      });
    }
    for (var di = ruffAirship.drones.length - 1; di >= 0; di--) {
      var d = ruffAirship.drones[di];
      d.age += dt;
      d.blink += dt * 8;
      d.vy += Math.sin(d.age * 3.2) * 20 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.trail.push({ x: d.x, y: d.y, a: 1 });
      if (d.trail.length > 12) d.trail.shift();
      for (var ti = 0; ti < d.trail.length; ti++) d.trail[ti].a *= 0.88;
      if (d.age >= d.life || d.x < -40) ruffAirship.drones.splice(di, 1);
    }
    // Soft collision — costs a heart if hit (unless invuln/shield)
    if (!ruffAirship.passed && typeof player !== "undefined" && player) {
      var cy = ruffAirship.y + Math.sin(ruffAirship.bob) * 6;
      var dx = Math.abs(player.x - (ruffAirship.x + ruffAirship.w * 0.5));
      var dy = Math.abs(player.y - (cy + ruffAirship.h * 0.5));
      if (dx < player.w * 0.35 + ruffAirship.w * 0.35 && dy < player.h * 0.35 + ruffAirship.h * 0.3) {
        ruffAirship.passed = true; // one hit only
        try {
          if (!(typeof shieldActive !== "undefined" && shieldActive) &&
              !(window.__airborneAirfieldInvuln) &&
              typeof takeHit === "function") {
            takeHit();
          }
        } catch (e) {}
      }
    }
    if (ruffAirship.x + ruffAirship.w < -40) {
      ruffAirship = null;
    }
  }

  function drawTrainingAirship() {
    if (!ruffAirship || typeof ctx === "undefined") return;
    var a = ruffAirship;
    var cy = a.y + Math.sin(a.bob || 0) * 6;
    // Soft layered steam/smoke behind hull
    if (a.smoke && a.smoke.length) {
      for (var i = 0; i < a.smoke.length; i++) {
        var p = a.smoke[i];
        var u = 1 - p.age / p.life;
        if (u <= 0) continue;
        var fade = u * u; // softer falloff
        ctx.globalAlpha = Math.max(0, fade * (p.steam ? 0.28 : 0.38));
        if (p.steam) {
          ctx.fillStyle = "rgba(235,242,248," + (0.55 + 0.35 * u) + ")";
        } else {
          ctx.fillStyle = "rgba(48,46,44," + (0.5 + 0.3 * u) + ")";
        }
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r * (1.1 + (1 - u) * 0.4), p.r * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        // soft outer halo
        ctx.globalAlpha = Math.max(0, fade * 0.12);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r * 1.6, p.r * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    var sheet = (typeof images !== "undefined" && images) ? images.training_airship : null;
    ctx.save();
    if (sheet && sheet.naturalWidth) {
      var cols = 5, rows = 5;
      var fw = sheet.naturalWidth / cols;
      var fh = sheet.naturalHeight / rows;
      var fr = (a.frame || 0) % 25;
      var col = fr % cols;
      var row = Math.floor(fr / cols) % rows;
      ctx.drawImage(sheet, col * fw, row * fh, fw, fh, a.x, cy, a.w, a.h);
    } else {
      ctx.fillStyle = "rgba(80,60,40,0.85)";
      ctx.fillRect(a.x, cy, a.w, a.h * 0.7);
    }
    ctx.restore();
    // Drones + trails in front
    if (a.drones && a.drones.length) {
      for (var di = 0; di < a.drones.length; di++) {
        var d = a.drones[di];
        // trail
        if (d.trail) {
          for (var ti = 0; ti < d.trail.length; ti++) {
            var tp = d.trail[ti];
            ctx.globalAlpha = Math.max(0, tp.a * 0.35);
            ctx.fillStyle = "rgba(120,200,255,0.8)";
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, 1.5 + ti * 0.15, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 0.95;
        var blink = 0.5 + 0.5 * Math.sin(d.blink || 0);
        // small drone body
        ctx.fillStyle = "rgba(40,44,52,0.95)";
        ctx.fillRect(d.x - 5, d.y - 2, 10, 4);
        ctx.fillStyle = "rgba(80,90,100,0.9)";
        ctx.fillRect(d.x - 7, d.y - 1, 3, 2);
        ctx.fillRect(d.x + 4, d.y - 1, 3, 2);
        // status light
        ctx.fillStyle = "rgba(80,220,255," + (0.6 + 0.4 * blink) + ")";
        ctx.beginPath();
        ctx.arc(d.x + 2, d.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        // engine glow
        ctx.fillStyle = "rgba(255,160,60,0.55)";
        ctx.beginPath();
        ctx.arc(d.x - 6, d.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }


  // ---------- Training boss atmosphere (far balloons + sky darken) ----------
  var ruffBgBalloons = [];
  var ruffBossDark = 0; // 0..1 overlay strength

  // One-shot special hot-air balloon (mid-training only)
  var ruffSpecialBalloon = null;
  var ruffSpecialBalloonImg = null;
  var ruffSpecialBalloonDone = false;

  function ensureSpecialBalloonImg() {
    if (ruffSpecialBalloonImg) return;
    ruffSpecialBalloonImg = new Image();
    ruffSpecialBalloonImg.src = "bg_hotair_balloon.webp?v=ruff325";
  }

  function maybeSpawnSpecialBalloon() {
    if (ruffSpecialBalloonDone || ruffSpecialBalloon) return;
    // Mid-training stages only (after altitude, before landing)
    var mid = { obstacles:1, rings:1, crystals:1, shield:1, powerup:1, airship:1, combined:1 };
    if (!mid[ruffStage]) return;
    // Appear once when stage timer is past ~3s
    if (ruffStageT < 3) return;
    ensureSpecialBalloonImg();
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 600;
    ruffSpecialBalloon = {
      x: W0 + 30,
      y: H0 * (0.12 + Math.random() * 0.25),
      speed: 18 + Math.random() * 8,
      bob: Math.random() * Math.PI * 2,
      scale: 0.22 + Math.random() * 0.06,
      alpha: 0.85
    };
    ruffSpecialBalloonDone = true;
  }

  function updateSpecialBalloon(dt) {
    maybeSpawnSpecialBalloon();
    if (!ruffSpecialBalloon) return;
    var b = ruffSpecialBalloon;
    b.x -= b.speed * dt;
    b.bob += dt * 0.8;
    if (b.x < -180) ruffSpecialBalloon = null;
  }

  function drawSpecialBalloon() {
    if (!ruffSpecialBalloon || typeof ctx === "undefined") return;
    ensureSpecialBalloonImg();
    var img = ruffSpecialBalloonImg;
    if (!img || !img.complete || !img.naturalWidth) return;
    var b = ruffSpecialBalloon;
    var W0 = (typeof W !== "undefined") ? W : 400;
    var bw = W0 * b.scale;
    var bh = bw * (img.naturalHeight / img.naturalWidth);
    var by = b.y + Math.sin(b.bob) * 6;
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.drawImage(img, b.x, by, bw, bh);
    ctx.restore();
  }


  function spawnTrainingBgBalloons() {
    ruffBgBalloons = [];
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 600;
    var n = 5; // fewer far-sky balloons
    for (var i = 0; i < n; i++) {
      ruffBgBalloons.push({
        x: (i / n) * (W0 + 220) + Math.random() * 50,
        y: H0 * (0.06 + Math.random() * 0.48),
        s: 0.32 + Math.random() * 0.37, // ~15% larger scale range
        speed: 5 + Math.random() * 8, // slower drift
        frame: (Math.random() * 36) | 0,
        frameT: Math.random(),
        bob: Math.random() * Math.PI * 2,
        alpha: 0.22 + Math.random() * 0.22
      });
    }
  }

  function updateTrainingBgBalloons(dt) {
    try { updateSpecialBalloon(dt); } catch (e) {}
    if (!ruffBgBalloons || !ruffBgBalloons.length) return;
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 600;
    for (var i = 0; i < ruffBgBalloons.length; i++) {
      var b = ruffBgBalloons[i];
      b.x -= b.speed * dt;
      b.bob += dt * (0.6 + b.s * 0.4);
      b.frameT += dt;
      if (b.frameT >= 1 / 7) { // slightly slower anim = less sheet thrash
        b.frameT = 0;
        b.frame = ((b.frame || 0) + 1) % 36;
      }
      if (b.x < -80) {
        b.x = W0 + 40 + Math.random() * 80;
        b.y = H0 * (0.08 + Math.random() * 0.55);
      }
    }
  }

  window.__airborneDrawTrainingBgBalloons = drawTrainingBgBalloons;
  window.__airborneUpdateTrainingBgBalloons = updateTrainingBgBalloons;
  function drawTrainingBgBalloons() {
    try { drawSpecialBalloon(); } catch (e) {}
    if (!ruffBgBalloons || !ruffBgBalloons.length || typeof ctx === "undefined") return;
    for (var i = 0; i < ruffBgBalloons.length; i++) {
      var b = ruffBgBalloons[i];
      var key = "balloon_anim_" + String((b.frame % 36) + 1).padStart(2, "0");
      var img = (typeof images !== "undefined" && images) ? images[key] : null;
      var bw = ((typeof W !== "undefined") ? W : 400) * 0.1035 * b.s; // 15% larger
      var bh = bw * 1.35;
      var by = b.y + Math.sin(b.bob) * 5;
      ctx.save();
      ctx.globalAlpha = b.alpha;
      if (img && img.naturalWidth) {
        ctx.drawImage(img, b.x, by, bw, bh);
      } else {
        ctx.fillStyle = "rgba(200,80,80,0.7)";
        ctx.beginPath();
        ctx.ellipse(b.x + bw / 2, by + bh * 0.4, bw * 0.4, bh * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  window.__airborneDrawTrainingBgBalloons = drawTrainingBgBalloons;
  window.__airborneUpdateTrainingBgBalloons = updateTrainingBgBalloons;

  function updateTrainingBossDark(dt, target) {
    ruffBossDark = 0; // never darken training stages
  }

  function drawTrainingBossDark() {
    return; // Disabled — no full-screen darken during training
    if (!ruffBossDark || ruffBossDark < 0.02 || typeof ctx === "undefined") return;
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 600;
    var a = Math.min(0.55, ruffBossDark * 0.55);
    ctx.save();
    // Full-screen dusk (everywhere), stronger at edges like a flocking storm
    var g = ctx.createRadialGradient(W0 * 0.5, H0 * 0.35, W0 * 0.1, W0 * 0.5, H0 * 0.4, W0 * 0.85);
    g.addColorStop(0, "rgba(10,8,20," + (a * 0.45) + ")");
    g.addColorStop(0.55, "rgba(8,6,18," + (a * 0.75) + ")");
    g.addColorStop(1, "rgba(0,0,0," + a + ")");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W0, H0);
    // No hard grey rectangle at top — smooth dusk only
    ctx.restore();
  }


  var ruffScreenDust = [];
  function ensureScreenDust() {
    return; // Disabled — black dust overlay darkened rings/airship
    if (ruffScreenDust.length) return;
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 600;
    for (var i = 0; i < 55; i++) {
      ruffScreenDust.push({
        x: Math.random() * W0,
        y: Math.random() * H0,
        vx: -8 - Math.random() * 18,
        vy: (Math.random() - 0.5) * 6,
        r: 0.6 + Math.random() * 1.2,
        a: 0.15 + Math.random() * 0.35
      });
    }
  }
  function updateScreenDust(dt) {
    ruffScreenDust = [];
    return;
    if (!ruffScreenDust.length) return;
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 600;
    for (var i = 0; i < ruffScreenDust.length; i++) {
      var d = ruffScreenDust[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt + Math.sin((d.x + d.y) * 0.02) * 4 * dt;
      if (d.x < -4) { d.x = W0 + 4; d.y = Math.random() * H0; }
      if (d.y < -4) d.y = H0 + 2;
      if (d.y > H0 + 4) d.y = -2;
    }
  }
  function drawScreenDust() {
    return; // Disabled
    if (!ruffScreenDust.length || typeof ctx === "undefined") return;
    ctx.save();
    for (var i = 0; i < ruffScreenDust.length; i++) {
      var d = ruffScreenDust[i];
      ctx.globalAlpha = d.a;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function updateCrystals(dt) {
    if (!ruffCrystals.length) return;
    // Always scroll — never freeze when birds/obstacles appear
    let spd = (typeof obstacleSpeed === "number" && obstacleSpeed > 40) ? obstacleSpeed : 210;
    spd = Math.max(180, spd);
    // Last lesson (combined): slower crystals
    if (ruffStage === "combined" || window.__airborneRuffStage === "combined") {
      spd = Math.min(spd, 95);
    }
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
        // Crystals counted separately — do not add to main dodge score
        // if (typeof score === "number") score += CRYSTAL_SCORE;
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


  function spawnTrainingCoins(n) {
    n = n || 4;
    const groundY = (typeof groundLevelY === "function") ? groundLevelY() : (typeof H !== "undefined" ? H * 0.78 : 400);
    for (let i = 0; i < n; i++) {
      ruffCoins.push({
        x: (typeof W !== "undefined" ? W : 400) + 40 + i * (70 + Math.random() * 50),
        y: (typeof H !== "undefined" ? H : 600) * (0.22 + Math.random() * 0.42),
        r: 14,
        spin: Math.random() * Math.PI * 2,
        bob: Math.random() * Math.PI * 2,
        collected: false,
        spark: 0
      });
    }
  }

  function updateTrainingCoins(dt) {
    if (!ruffCoins.length) return;
    // Constant coin speed all training stages (never tied to obstacleSpeed)
    const spd = 95;
    const px = (typeof player !== "undefined" && player) ? player.x : 0;
    const py = (typeof player !== "undefined" && player) ? player.y : 0;
    const pw = (typeof player !== "undefined" && player) ? player.w * 0.42 : 20;
    const ph = (typeof player !== "undefined" && player) ? player.h * 0.42 : 16;
    ruffCoins.forEach(function (c) {
      if (c.collected) return;
      c.x -= spd * dt;
      // Smooth continuous spin (not stepped)
      c.spin += dt * 5.2;
      c.bob += dt * 3.2;
      c.glow = (c.glow || 0) + dt * 4;
      c.sparkT = (c.sparkT || 0) - dt;
      if (c.sparkT <= 0) {
        c.sparkT = 0.12 + Math.random() * 0.15;
        if (!c.sparks) c.sparks = [];
        var sa = Math.random() * Math.PI * 2;
        c.sparks.push({
          x: Math.cos(sa) * c.r * 0.85,
          y: Math.sin(sa) * c.r * 0.85,
          vx: Math.cos(sa) * (8 + Math.random() * 12),
          vy: Math.sin(sa) * (8 + Math.random() * 12) - 6,
          life: 0.55 + Math.random() * 0.3, age: 0, r: 0.7 + Math.random() * 1.0
        });
      }
      if (c.sparks) {
        for (var si = c.sparks.length - 1; si >= 0; si--) {
          var sp = c.sparks[si];
          sp.age += dt;
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          if (sp.age >= sp.life) c.sparks.splice(si, 1);
        }
      }
      if (Math.abs(c.x - px) < pw + c.r && Math.abs(c.y - py) < ph + c.r) {
        c.collected = true;
        ruffStats.coins = (ruffStats.coins || 0) + 1;
        try { sfxTrainingCoin(); } catch (e) {}
        window.__airborneCollectCoins = (window.__airborneCollectCoins || 0) + 1;
        try {
          if (typeof window.addStormChargeForScore === "function") window.addStormChargeForScore(typeof score === "number" ? score : 0);
        } catch (e) {}

        try {
          if (typeof updateCollectDock === "function") updateCollectDock();
          else {
            const coinEl = document.getElementById("collectPowerPct");
            if (coinEl) coinEl.textContent = String(window.__airborneCollectCoins);
          }
        } catch (e) {}
        // Coins counted separately — do not add to main dodge score
        // if (typeof score === "number") score += COIN_SCORE;
        if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
        try { sfxTrainingCoin(); } catch (e) {}
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

  // Star-coin sprite sheet (36 frames, horizontal, bg removed)
  window.__airborneCoinSheet = window.__airborneCoinSheet || (function () {
    var im = new Image();
    im.src = "coin_star_sheet.png?v=ruff298";
    return im;
  })();
  window.__airborneCoinFrame = 0;
  window.__airborneCoinFrameT = 0;

  function drawTrainingCoins() {
    if (!ruffCoins.length || typeof ctx === "undefined") return;
    var sheet = window.__airborneCoinSheet;
    var sheetReady = sheet && sheet.complete && sheet.naturalWidth > 0;
    var fw = 128, nFrames = 36;
    ruffCoins.forEach(function (c) {
      if (c.collected) return;
      const by = c.y + Math.sin(c.bob) * 5;
      // Smooth frame from continuous spin
      var spinN = ((c.spin % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      var frameF = (spinN / (Math.PI * 2)) * nFrames;
      var frame = Math.floor(frameF) % nFrames;
      const size = c.r * 2.5;
      var pulse = 0.75 + 0.25 * Math.sin((c.glow || c.bob) * 1.2);
      ctx.save();
      ctx.translate(c.x, by);
      // Soft pulsing gold glow behind + around (no ring stroke)
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.55 * pulse;
      var ag = ctx.createRadialGradient(0, 0, c.r * 0.15, 0, 0, c.r * 2.4);
      ag.addColorStop(0, "rgba(255,250,200,0.85)");
      ag.addColorStop(0.35, "rgba(255,210,80,0.45)");
      ag.addColorStop(0.7, "rgba(255,170,40,0.15)");
      ag.addColorStop(1, "rgba(255,140,0,0)");
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.arc(0, 0, c.r * 2.4, 0, Math.PI * 2);
      ctx.fill();
      // Outer soft halo pulse
      ctx.globalAlpha = 0.22 * pulse;
      var ag2 = ctx.createRadialGradient(0, 0, c.r * 0.8, 0, 0, c.r * 3.0);
      ag2.addColorStop(0, "rgba(255,220,100,0.35)");
      ag2.addColorStop(1, "rgba(255,180,40,0)");
      ctx.fillStyle = ag2;
      ctx.beginPath();
      ctx.arc(0, 0, c.r * 3.0, 0, Math.PI * 2);
      ctx.fill();
      // Gold sparkles
      (c.sparks || []).forEach(function(sp) {
        var t = 1 - sp.age / sp.life;
        ctx.globalAlpha = t * 0.95;
        ctx.fillStyle = Math.random() > 0.5 ? "#fff6c8" : "#ffd700";
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r * t, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      if (sheetReady) {
        ctx.drawImage(sheet, frame * fw, 0, fw, fw, -size / 2, -size / 2, size, size);
      } else {
        // fallback gold disc + star
        const squash = 0.55 + 0.45 * Math.abs(Math.cos(c.spin));
        ctx.scale(squash, 1);
        var g = ctx.createRadialGradient(-c.r * 0.3, -c.r * 0.35, 1, 0, 0, c.r);
        g.addColorStop(0, "#fff6c8");
        g.addColorStop(0.35, "#ffd700");
        g.addColorStop(0.75, "#d4a017");
        g.addColorStop(1, "#8a6a0a");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }


  function drawCrystals() {
    if (!ruffCrystals.length || typeof ctx === "undefined") return;
    var tnow = performance.now() * 0.001;
    ruffCrystals.forEach(function (c) {
      if (c.collected) return;
      const key = "blue_crystal_" + String(c.frame + 1).padStart(2, "0");
      const img = (typeof images !== "undefined") ? images[key] : null;
      const s = c.r * 2.2;
      c.fxT = (c.fxT || 0) + 0.016;
      var pulse = 0.7 + 0.3 * Math.sin(tnow * 2.2 + (c.x || 0) * 0.01);
      ctx.save();
      ctx.translate(c.x, c.y);
      // Splash-style blue aura
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.35 * pulse;
      var aura = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 1.15);
      aura.addColorStop(0, "rgba(120,220,255,0.5)");
      aura.addColorStop(0.45, "rgba(40,140,255,0.2)");
      aura.addColorStop(1, "rgba(40,100,220,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.15, 0, Math.PI * 2);
      ctx.fill();
      // Soft core glow
      ctx.globalAlpha = 0.55 * pulse;
      var core = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.55);
      core.addColorStop(0, "rgba(200,250,255,0.7)");
      core.addColorStop(0.5, "rgba(100,200,255,0.35)");
      core.addColorStop(1, "rgba(40,120,255,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Rising blue sparkles
      if (!c.sparkles) c.sparkles = [];
      if (Math.random() < 0.06) {
        c.sparkles.push({
          x: (Math.random() - 0.5) * s * 0.5,
          y: s * 0.15,
          life: 1.2 + Math.random() * 0.5,
          age: 0,
          r: 0.8 + Math.random() * 1.1
        });
      }
      for (var si = (c.sparkles || []).length - 1; si >= 0; si--) {
        var sp = c.sparkles[si];
        sp.age += 0.016;
        sp.y -= 8 * 0.016;
        var st = 1 - sp.age / sp.life;
        if (st <= 0) { c.sparkles.splice(si, 1); continue; }
        ctx.globalAlpha = st * 0.95;
        ctx.fillStyle = "rgba(220,250,255,1)";
        ctx.shadowColor = "rgba(180,240,255,0.9)";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r * st, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      if (img && img.naturalWidth) {
        ctx.drawImage(img, -s / 2, -s / 2, s, s);
      } else {
        ctx.fillStyle = "#4fc3f7";
        ctx.beginPath();
        ctx.arc(0, 0, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawMarkers() {
    // Disabled — dashed altitude guides removed per design
    return;
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
    const H0 = (typeof H !== "undefined" ? H : 600);
    const W0 = (typeof W !== "undefined" ? W : 400);
    let targetX = player.x - gapX;
    let targetY = player.y - gapY + Math.sin(ruffBob) * 10 + Math.sin(ruffBob * 1.7) * 3;
    // Keep Ruff on-screen — when player is high, stay beside rather than above
    const minY = H0 * 0.08;
    const maxY = H0 * 0.72;
    if (targetY < minY) targetY = Math.max(minY, player.y + player.h * 0.15);
    targetY = Math.max(minY, Math.min(maxY, targetY));
    targetX = Math.max(W0 * 0.04, Math.min(W0 * 0.55, targetX));
    const close = ruffSpeakClose > 0 ? 8 : 0;
    ruffX += (targetX + close - ruffX) * Math.min(1, dt * 3.2);
    ruffY += (targetY - ruffY) * Math.min(1, dt * 3.2);
    ruffX = Math.max(W0 * 0.04, Math.min(W0 * 0.7, ruffX));
    ruffY = Math.max(minY, Math.min(maxY, ruffY));
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
    const size = 85; // fixed size regardless of blimp
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
    try {
      el.style.display = "";
      el.style.pointerEvents = "auto";
      el.style.zIndex = "70";
      const cont = document.getElementById("ruffContinueBtn");
      if (cont) {
        cont.textContent = "RETURN TO HANGAR ▶";
        cont.onclick = function (e) {
          try { if (e) { e.preventDefault(); e.stopPropagation(); } } catch (err) {}
          if (typeof finishToHangar === "function") finishToHangar();
          else finishToMap();
        };
        cont.style.pointerEvents = "auto";
      }
    } catch (e) {}

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

    // Prefer live score; if zero, derive a training score from stats so popup isn't stuck at 0
    var sc = 0;
    try {
      if (typeof score === "number") sc = score;
      else if (typeof window.score === "number") sc = window.score;
      else if (typeof gameplayScore === "number") sc = gameplayScore;
    } catch (e) {}
    try {
      var derived = (ruffStats.crystals || 0) * 25
        + (ruffStats.coins || 0) * 10
        + (ruffStats.rings || 0) * 50
        + (ruffStats.powerups || 0) * 100
        + (ruffStats.obstaclesAvoided || 0) * 15
        + (ruffStats.bestCombo || 0) * 20
        + Math.max(1, ruffStats.landingStars || 3) * 50;
      if (sc < derived) sc = derived;
      if (typeof score === "number" && score < sc) {
        score = sc;
        try {
          if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(sc);
          var sv = document.getElementById("scoreVal");
          if (sv) sv.textContent = String(sc);
        } catch (e) {}
      }
    } catch (e) {}
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
    try {
      el.style.display = "flex";
      el.style.visibility = "visible";
      el.style.opacity = "1";
      el.style.zIndex = "90";
      el.style.pointerEvents = "auto";
    } catch (e) {}
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

  
  
  
  function clearAllGameplayEntities() {
    try {
      window.__udProgressTarget = 0;
      window.__airborneOneShotUsed = {};
      window.__udProgressShown = 0;
      if (window.updateUnifiedProgress) window.updateUnifiedProgress(0);
      if (window.tickUnifiedProgress) window.tickUnifiedProgress(1);
    } catch (e) {}
    try { if (window.__airborneClearCombatFx) window.__airborneClearCombatFx(); } catch (e) {}
    try { if (window.__airborneClearAtmosphereFx) window.__airborneClearAtmosphereFx(); } catch (e) {}
    try { if (window.__airborneClearPowerEntities) window.__airborneClearPowerEntities(); } catch (e) {}
    try { if (window.__airborneClearObstacles) window.__airborneClearObstacles(); } catch (e) {}
    try {
      ruffCrystals = [];
      ruffCoins = [];
      if (typeof ruffRings !== "undefined") ruffRings = [];
      ruffBgBalloons = [];
      ruffAirship = null;
      ruffPowerOrb = null;
      window.__airborneRuffAirship = null;
    } catch (e) {}
    try {
      if (window.__airborneHeatseekers) window.__airborneHeatseekers.length = 0;
      if (window.__airborneWarBullets) window.__airborneWarBullets.length = 0;
      if (window.__airborneOrphanTrails) window.__airborneOrphanTrails.length = 0;
      if (window.__airborneFireballs) window.__airborneFireballs.length = 0;
      window.__airborneHeatseekers = [];
      window.__airborneWarBullets = [];
      window.__airborneOrphanTrails = [];
      window.__airborneFireballs = [];
      window.__airborneActivePowerVisual = null;
      window.__airborneHeatseekUntil = 0;
    } catch (e) {}
    try {
      // Training boss atmosphere
      window.__airborneTrainingBoss = false;
      window.__airborneTrainingBossBalloons = null;
    } catch (e) {}
    try {
      if (typeof score === "number") score = 0;
      if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = "0";
    } catch (e) {}
  }
  window.__airborneClearAllGameplay = clearAllGameplayEntities;

  function hardResetTrainingState(opts) {
    opts = opts || {};
    var keepAirfield = !!opts.keepAirfield;
    try { clearAllGameplayEntities(); } catch (e) {}
    try {
      ruffActive = false;
      ruffStage = "idle";
      ruffStageT = 0;
      ruffLineIdx = 0;
      ruffLineT = 0;
      ruffLines = [];
      ruffWaitingInput = false;
      ruffWaitingCollect = 0;
      ruffWaitingAvoid = false;
      ruffWaitingRing = 0;
      ruffLandingCelebrated = false;
      ruffCrystals = [];
      ruffCoins = [];
      if (typeof ruffRings !== "undefined") ruffRings = [];
      ruffStats = { crystals: 0, coins: 0, rings: 0, powerups: 0, obstaclesAvoided: 0, bestCombo: 0, survivingStars: 3 };
      ruffJetParticles = [];
      ruffMotionGhosts = [];
      ruffSpeakLines = [];
      ruffFrame = 0;
      ruffFrameT = 0;
      ruffX = 0;
      ruffY = 0;
    } catch (e) {}
    window.__airborneRuffActive = false;
    window.__airborneRuffStage = "idle";
    window.__airborneRuffLandArmed = false;
    window.__airborneRuffRequestLand = false;
    window.__airborneTrainingPowerUsed = false;
    window.__airborneTrainingBoss = false;
    window.__airborneTrainingBossDone = false;
    window.__airborneTrainingBossTried = false;
    window.__airborneTrainingReportReady = false;
    window.__airborneTrainingReportShown = false;
    window.__airborneForceTrainRestart = true;
    if (!keepAirfield) {
      window.__airborneAirfield = false;
      window.__airborneTrainingFlight = false;
      window.__airborneAirfieldPhase = "done";
      window.__airborneAirfieldHold = false;
      window.__airborneAirfieldPaused = false;
    }
    window.__airborneResetRunway = true;
    try {
      window.__airborneFireballs = [];
      window.__airborneHeatseekers = [];
      window.__airborneWarBullets = [];
      window.__airborneOrphanTrails = [];
      window.__airborneActivePowerVisual = null;
      window.__airborneActivePowerUntil = 0;
    } catch (e) {}
    try {
      if (typeof obstacles !== "undefined") obstacles = [];
      if (typeof bombs !== "undefined") bombs = [];
      if (typeof powerup !== "undefined") powerup = null;
      if (typeof hearts !== "undefined") hearts = [];
      if (typeof bossActive !== "undefined") bossActive = false;
      if (typeof boss !== "undefined") boss = null;
      if (typeof stormActive !== "undefined") stormActive = false;
      if (typeof stormCharge !== "undefined") stormCharge = 0;
      if (typeof stormTimer !== "undefined") stormTimer = 0;
      if (typeof score === "number") score = 0;
      if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = "0";
    } catch (e) {}
    try {
      var rep = document.getElementById("ruffReport");
      if (rep) { rep.classList.remove("visible"); rep.style.display = "none"; }
      var rad = document.getElementById("ruffRadio");
      if (rad) { rad.classList.remove("visible"); rad.style.display = "none"; }
    } catch (e) {}
    try { stopAllTrainingAudio(); } catch (e) {}
    try { hideFlightTrace(); } catch (e) {}
    try { hideRadio(); } catch (e) {}
    try { clearTrainingPowerIcon(); } catch (e) {}
  }
  window.__airborneHardResetTraining = hardResetTrainingState;

  function finishToHangar_mark(){ try { window.__airborneOneShotUsed = {}; } catch(e) {} }
  function finishToHangar() {
    window.__airborneReturnToHangar = true;
    try { hardResetTrainingState(); } catch (e) {}
    try { stopAllTrainingAudio(); } catch (e) {}
    try { hideFlightTrace(); } catch (e) {}
    try { hideRadio(); } catch (e) {}
    try { stopSpeak(); } catch (e) {}
    try {
      var el = reportEl();
      if (el) { el.classList.remove("visible"); el.style.display = "none"; }
    } catch (e) {}
    ruffActive = false;
    window.__airborneRuffActive = false;
    window.__airborneRuffStage = "idle";
    window.__airborneRuffRequestLand = false;
    window.__airborneRuffLandArmed = false;
    window.__airborneTrainingBoss = false;
    window.__airborneTrainingBossDone = false;
    try { clearTrainingPowerIcon(); } catch (e) {}
    try {
      if (typeof window.endAirfieldTrainingToMap === "function") window.endAirfieldTrainingToMap();
    } catch (e) {}
    // ALWAYS force hangar — never leave map visible
    try { if (typeof state !== "undefined") state = "menu"; } catch (e) {}
    try {
      var map = document.getElementById("worldMapScreen");
      if (map) {
        map.style.display = "none";
        map.style.visibility = "hidden";
        map.classList.add("hidden");
        map.setAttribute("aria-hidden", "true");
      }
    } catch (e) {}
    try {
      var gs = document.getElementById("gameScreen");
      if (gs) { gs.style.display = "none"; }
    } catch (e) {}
    try {
      var so = document.getElementById("startOverlay");
      if (so) { so.classList.add("hidden"); so.style.display = "none"; }
    } catch (e) {}
    try {
      var menu = document.getElementById("menuScreen");
      if (menu) {
        menu.style.display = "flex";
        menu.style.visibility = "visible";
        menu.style.opacity = "1";
        menu.classList.remove("hidden");
      }
    } catch (e) {}
    try { if (window.__airborneShowHangar) window.__airborneShowHangar(); } catch (e) {}
    try { if (window.__airborneShowMenu) window.__airborneShowMenu(); } catch (e) {}
    try { if (typeof startMenuMusic === "function") startMenuMusic(); } catch (e) {}
    // Hide map again after any async map show
    setTimeout(function () {
      try {
        var map2 = document.getElementById("worldMapScreen");
        if (map2) {
          map2.style.display = "none";
          map2.classList.add("hidden");
        }
        var menu2 = document.getElementById("menuScreen");
        if (menu2) {
          menu2.style.display = "flex";
          menu2.classList.remove("hidden");
        }
      } catch (e) {}
      window.__airborneReturnToHangar = false;
    }, 50);
  }
  window.__airborneFinishToHangar = finishToHangar;


function finishToMap() {
    try { stopAllTrainingAudio(); } catch (e) {}

    try { hideFlightTrace(); } catch (e) {}
    try { hideRadio(); } catch (e) {}
    try { stopSpeak(); } catch (e) {}
    try {
      const el = reportEl();
      if (el) {
        el.classList.remove("visible");
        el.style.display = "none";
      }
    } catch (e) {}
    ruffActive = false;
    window.__airborneRuffActive = false;
    window.__airborneRuffStage = "idle";
    window.__airborneRuffRequestLand = false;
    window.__airborneRuffLandArmed = false;
    try { clearTrainingPowerIcon(); } catch (e) {}
    // Prefer window exports (functions are scoped inside other files)
    try {
      if (typeof window.endAirfieldTrainingToMap === "function") {
        window.endAirfieldTrainingToMap();
      } else if (typeof endAirfieldTrainingToMap === "function") {
        endAirfieldTrainingToMap();
      }
    } catch (e) { console.warn("endAirfield", e); }
    // Always force map visible as fallback
    try {
      if (typeof window.__airborneShowWorldMap === "function") {
        window.__airborneShowWorldMap({ mode: "start" });
      }
    } catch (e) { console.warn("showWorldMap", e); }
    try {
      const gs = document.getElementById("gameScreen");
      if (gs) gs.style.display = "none";
      const ms = document.getElementById("worldMapScreen");
      if (ms) {
        ms.style.display = "block";
        ms.style.visibility = "visible";
        ms.style.opacity = "1";
      }
      if (typeof state !== "undefined") state = "start";
    } catch (e) {}
  }
  window.__airborneFinishToMap = finishToMap;

  window.__airborneShowRuffReport = function() {
    ruffActive = true;
    try { if (typeof window.__airborneApplyShipPowerIcon === "function") window.__airborneApplyShipPowerIcon(); } catch (e) {};
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
    // Soft clear without killing airfield flags
    try { hardResetTrainingState({ keepAirfield: true }); } catch (e) {}
    try { if (window.__airborneClearAllGameplay) window.__airborneClearAllGameplay(); } catch (e) {}

    ruffActive = true;
    window.__airborneRuffActive = true;
    window.__airborneRuffStage = "intro";
    ruffStage = "intro";
    ruffStageT = 0;
    ruffLineIdx = 0;
    ruffLineT = 0;
    ruffLandingCelebrated = false;
    ruffIntroFly = true;
    ruffIntroFlyT = 0;
    ruffIntroLineArmed = false;
    ruffSpeechDone = true;
    ruffScalePulse = 1.15;
    ruffWaitingInput = false;
    ruffWaitingCollect = 0;
    ruffWaitingAvoid = false;
    ruffWaitingRing = 0;
    window.__airborneRuffLandArmed = false;
    window.__airborneRuffRequestLand = false;
    window.__airborneTrainingPowerUsed = false;
    window.__airborneTrainingBoss = false;
    window.__airborneTrainingBossDone = false;
    window.__airborneTrainingBossTried = false;

    // Visible from first frame (fly-in starts on-screen)
    var _W = (typeof W !== "undefined" && W > 0) ? W : 390;
    var _H = (typeof H !== "undefined" && H > 0) ? H : 700;
    ruffX = _W * 0.88;
    ruffY = _H * 0.22;
    ruffTilt = -0.2;
    ruffFrame = 0;
    ruffFrameT = 0;

    ruffLines = (DIALOGUE && DIALOGUE.intro) ? DIALOGUE.intro.slice() : [];
    ruffLineDuration = 3.5;

    ruffCrystals = [];
    ruffCoins = [];
    try { if (typeof ruffRings !== "undefined") ruffRings = []; } catch (e) {}
    ruffBgBalloons = [];
    try {
      ruffStats = { crystals: 0, coins: 0, rings: 0, powerups: 0, obstaclesAvoided: 0, bestCombo: 0, survivingStars: 3 };
    } catch (e) {}

    try {
      trainEnsure();
      playTrainingMusic();
      trainEngineStart();
      trainWindStart();
      trainBeep(523, 0.1, 0.22);
      setTimeout(function(){ trainBeep(659, 0.1, 0.2); }, 120);
      setTimeout(function(){ trainBeep(784, 0.12, 0.18); }, 240);
    } catch (e) { console.warn("train audio start", e); }

    try { placeTrainingPowerIcon(); } catch (e) {}
    try {
      var ft = document.getElementById("ruffFlightTrace");
      if (ft) { ft.style.display = "none"; ft.style.visibility = "hidden"; }
    } catch (e) {}

    // Use setStage for full intro wiring (does not clear ruffActive)
    try {
      // Avoid recursive hard clear inside setStage collectible wipe only
      setStage("intro");
    } catch (e) {
      console.warn("setStage intro", e);
    }
    // setStage resets intro fly — re-arm after
    ruffActive = true;
    window.__airborneRuffActive = true;
    ruffIntroFly = true;
    ruffIntroFlyT = 0;
    ruffX = _W * 0.88;
    ruffY = _H * 0.22;
    console.log("[R.U.F.F.] begin", ruffActive, ruffStage, Math.round(ruffX), Math.round(ruffY));
  }


  function updateRuff(dt) {
    // Force Ruff visible whenever training airfield is active
    if (window.__airborneAirfield && !ruffActive) {
      ruffActive = true;
      window.__airborneRuffActive = true;
      if (!ruffStage || ruffStage === "idle") {
        ruffStage = "intro";
        window.__airborneRuffStage = "intro";
        ruffIntroFly = true;
        ruffIntroFlyT = 0;
        var _W = (typeof W !== "undefined" && W > 0) ? W : 390;
        var _H = (typeof H !== "undefined" && H > 0) ? H : 700;
        ruffX = _W * 0.88;
        ruffY = _H * 0.22;
        ruffLines = (typeof DIALOGUE !== "undefined" && DIALOGUE.intro) ? DIALOGUE.intro.slice() : [];
      }
    }

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
    try { tickLessonGate(dt); } catch (e) {}
    // Background balloons drift for the entire training session
    try {
      if (window.__airborneAirfield && ruffStage && ruffStage !== "report" && ruffStage !== "idle") {
        if (!ruffBgBalloons || !ruffBgBalloons.length) spawnTrainingBgBalloons();
        updateTrainingBgBalloons(dt);
      }
    } catch (e) {}
    // Keep training power icon visible (center bottom)
    try {
      var __sm = document.getElementById("stormMeter");
      if (__sm && !__sm.classList.contains("trainingPos")) placeTrainingPowerIcon();
    } catch (e) {}
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
    // Scroll leftover coins/crystals only when the active stage is NOT already updating them
    // (prevents double-dt movement + extra work on busy lessons)
    try {
      var _st = ruffStage || window.__airborneRuffStage || "";
      var _stageOwnsItems = (_st === "crystals" || _st === "combined" || _st === "obstacles");
      if (!_stageOwnsItems) {
        if (ruffCoins && ruffCoins.length) {
          updateTrainingCoins(dt);
          ruffCoins = ruffCoins.filter(function (c) {
            return c && !c.collected && c.x > -80;
          });
        }
        if (ruffCrystals && ruffCrystals.length) {
          updateCrystals(dt);
          ruffCrystals = ruffCrystals.filter(function (c) {
            return c && !c.collected && c.x > -80;
          });
        }
      } else {
        // Still prune collected/off-screen without double-moving
        if (ruffCoins && ruffCoins.length) {
          ruffCoins = ruffCoins.filter(function (c) {
            return c && !c.collected && c.x > -80;
          });
        }
        if (ruffCrystals && ruffCrystals.length) {
          ruffCrystals = ruffCrystals.filter(function (c) {
            return c && !c.collected && c.x > -80;
          });
        }
      }
    } catch (e) {}

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
      ruffMarkers = []; // no dashed guides
      if (!ruffLessonPendingNext && ruffStageT > 9) requestNextStage();
    } else if (ruffStage === "crystals") {
      updateCrystals(dt);
      updateTrainingCoins(dt);
      if (!ruffLessonPendingNext) {
        // Top-up gently — only when almost empty, never wipe mid-screen
        var liveC = (ruffCrystals || []).filter(function (c) { return c && !c.collected && c.x > -20; }).length;
        if (ruffStats.crystals < 8 && liveC < 2) spawnCrystals(4);
        if ((ruffCoins || []).length < 6) spawnTrainingCoins(6);
        // Finish when enough collected and field is clear (or long timeout)
        if ((ruffStats.crystals >= 5 && liveC === 0 && ruffStageT > 4) || ruffStageT > 22) {
          requestNextStage();
        }
      }
    } else if (ruffStage === "obstacles") {
      if (ruffLessonPendingNext) {
        stopLessonSpawns();
      } else {
        window.__airborneAirfieldObstacles = true;
        if (typeof spawnInterval !== "undefined") spawnInterval = 1.35;
        if (ruffStageT > 10) {
          window.__airborneAirfieldObstacles = false;
          if (typeof spawnInterval !== "undefined") spawnInterval = 999;
        }
        const obsCount = (typeof obstacles !== "undefined" && obstacles) ? obstacles.length : 0;
        if ((ruffStageT > 11 && obsCount === 0) || ruffStageT > 15) {
          ruffStats.obstaclesAvoided += 2;
          requestNextStage();
        }
      }
    } else if (ruffStage === "shield") {
      window.__airborneAirfieldAllowShield = true;
      // Spawn shield early
      if ((typeof shieldPickup === "undefined" || !shieldPickup || shieldPickup.x < -50) && ruffStageT < 8 && !(typeof shieldActive !== "undefined" && shieldActive)) {
        shieldPickup = {
          x: (typeof W !== "undefined" ? W : 400) + 40,
          y: (typeof H !== "undefined" ? H : 600) * 0.4,
          w: 42, h: 42, speed: 160, bobPhase: 0,
          frame: 0, frameT: 0, embers: []
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
      if (!ruffLessonPendingNext && ruffStageT > 16) {
        requestNextStage();
      }
    } else if (ruffStage === "powerup") {
      window.__airborneAirfieldAllowPowerup = true;
    try {
      if (typeof stormCharge !== "undefined" && typeof STORM_MAX === "number") {
        stormCharge = STORM_MAX;
        if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay(false);
      }
    } catch (e) {}
      // NO floating fire pickup — meter is charged by coins only
      window.__airborneFirePickup = null;
      try { placeTrainingPowerIcon(); } catch (e) {}
      // Keep coins flowing so player can reach 25
      try {
        if ((ruffCoins || []).length < 8) spawnTrainingCoins(10);
      } catch (e) {}
      // Charge meter from coins (1 coin = full)
      try {
        if (typeof window.addStormChargeForScore === "function") {
          window.addStormChargeForScore(typeof score === "number" ? score : 0);
        }
      } catch (e) {}
      // Once charged (or power already used), spawn obstacles to blast
      var coins = window.__airborneCollectCoins || 0;
      var charged = (typeof stormCharge === "number" && typeof STORM_MAX === "number" && stormCharge >= STORM_MAX);
      if (charged || window.__airborneTrainingPowerUsed) {
        window.__airborneAirfieldObstacles = true;
        if (typeof spawnInterval !== "undefined") spawnInterval = 0.9;
      }
      // Detect activation
      if (typeof stormActive !== "undefined" && stormActive) {
        if (!window.__airborneTrainingPowerUsed) {
          try { sfxTrainingPower(); } catch (e) {}
        }
        window.__airborneTrainingPowerUsed = true;
      }
      // Advance only after power was activated, then wait 5 seconds
      if (window.__airborneTrainingPowerUsed) {
        window.__airborneTrainingPowerWait = (window.__airborneTrainingPowerWait || 0) + dt;
        if (!ruffLessonPendingNext && window.__airborneTrainingPowerWait >= 5.0) {
          window.__airborneAirfieldObstacles = false;
          if (typeof spawnInterval !== "undefined") spawnInterval = 999;
          requestNextStage();
        }
      }
    } else if (ruffStage === "rings") {
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
      if (!ruffLessonPendingNext && ((ruffStats.rings >= 4 && ringLeft === 0 && ruffStageT > 6) || ruffStageT > 18)) {
        requestNextStage();
      }
    } else if (ruffStage === "airship") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      if (!ruffAirship && ruffStageT < 1.5) {
        try { spawnTrainingAirship(); } catch (e) {}
      }
      updateTrainingAirship(dt);
      ensureScreenDust();
      updateScreenDust(dt);
      // Wait until fully off screen, then pause gate → boss1
      if (!ruffLessonPendingNext && ruffStageT > 2 && !ruffAirship) {
        requestNextStage();
      } else if (!ruffLessonPendingNext && ruffStageT > 28) {
        ruffAirship = null;
        requestNextStage();
      }
    } else if (ruffStage === "boss1") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      try { bossBanner = null; } catch (e) {}
      // Balloons drift in first (~4s), sky darkens gradually, then boss
      if (!ruffBgBalloons || !ruffBgBalloons.length) {
        try { spawnTrainingBgBalloons(); } catch (e) {}
        // Start balloons off-screen right so they scroll in
        if (ruffBgBalloons) {
          for (var bi = 0; bi < ruffBgBalloons.length; bi++) {
            ruffBgBalloons[bi].x += (typeof W !== "undefined" ? W : 400) * (0.3 + Math.random() * 0.5);
          }
        }
      }
      updateTrainingBgBalloons(dt);
      ensureScreenDust();
      updateScreenDust(dt);
      // No screen darken when boss appears
      updateTrainingBossDark(dt, 0);
      ruffBossDark = 0;
      // ONE boss only after balloons have been scrolling ~4s
      if (ruffStageT > 4.0 && !window.__airborneTrainingBossTried && !window.__airborneTrainingBossDone &&
          !(typeof bossActive !== "undefined" && bossActive) && !ruffLessonPendingNext) {
        try {
          window.__airborneTrainingBossTried = true;
          window.__airborneTrainingBoss = true;
          try { bossBanner = null; } catch (e0) {}
          if (typeof triggerBoss === "function") {
            triggerBoss(1);
            if (typeof boss !== "undefined" && boss) {
              boss.maxHealth = 30;
              boss.health = 30;
            }
          }
          try { bossBanner = null; } catch (e1) {}
        } catch (e) {}
      }
      if (!ruffLessonPendingNext) {
        if (window.__airborneTrainingBossDone ||
            (ruffStageT > 6 && window.__airborneTrainingBossTried &&
             typeof bossActive !== "undefined" && !bossActive && !bossSinking)) {
          window.__airborneTrainingBoss = false;
          updateTrainingBossDark(dt, 0);
          requestNextStage();
        } else if (ruffStageT > 50) {
          try {
            if (typeof bossActive !== "undefined") bossActive = false;
            boss = null;
            bossSinking = null;
          } catch (e) {}
          window.__airborneTrainingBoss = false;
          window.__airborneTrainingBossDone = true;
          requestNextStage();
        }
      }
    } else if (ruffStage === "combined") {
      // Never run campaign boss during combined practice
      window.__airborneTrainingBoss = false;
      try {
        if (typeof bossActive !== "undefined" && bossActive) {
          bossActive = false;
          boss = null;
        }
      } catch (e) {}
      updateCrystals(dt);
      updateTrainingCoins(dt);
      if (ruffStageT > 4 && !window.__airborneFireSpawned2) {
        window.__airborneFireSpawned2 = true;
        try {
          if (typeof window.__airborneSpawnFirePickup === "function") {
            window.__airborneSpawnFirePickup();
          }
        } catch (e) {}
      }
      if (ruffCrystals.length < 4 && ruffStageT > 2) spawnCrystals(5);
      // Last lesson before landing — coin rain
      if (ruffCoins.length < 10 && ruffStageT > 1.0) spawnTrainingCoins(12);
      if (!ruffLessonPendingNext && ruffStageT > 18) {
        requestNextStage();
      }
    } else if (ruffStage === "landing") {
      // Stay in training airfield — never campaign pad/score
      window.__airborneTrainingFlight = true;
      try {
        if (typeof levelEndActive !== "undefined") levelEndActive = false;
        if (typeof levelEndPhase !== "undefined") levelEndPhase = null;
      } catch (e) {}
      // Request land once — do not spam every frame (causes land/score glitches)
      if (!window.__airborneRuffLandArmed) {
        window.__airborneRuffLandArmed = true;
        window.__airborneRuffRequestLand = true;
        ruffLandingCelebrated = false;
        // Force training landing_field art
        try {
          if (typeof ensureAirfieldStripVisible === "function") ensureAirfieldStripVisible();
          if (typeof airfieldUseLandingArt !== "undefined") airfieldUseLandingArt = true;
        } catch (e2) {}
      }
      const ph = window.__airborneAirfieldPhase;
      // Celebration when touchdown / drive complete
      if (!ruffLandingCelebrated && (ph === "land_drive" || ph === "landed" || ph === "done" || window.__airborneTrainingReportReady)) {
        ruffLandingCelebrated = true;
        try { sfxTrainingLand(); } catch (e) {}
        try { trainChord([523, 659, 784, 1046, 1318], 0.25, 0.2); } catch (e) {}
        try {
          // Burst particles like level complete
          if (typeof particles !== "undefined" && particles && typeof player !== "undefined" && player) {
            for (var fi = 0; fi < 40; fi++) {
              var ang = Math.random() * Math.PI * 2;
              var sp = 60 + Math.random() * 180;
              particles.push({
                x: player.x, y: player.y,
                vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40,
                life: 0.9 + Math.random() * 0.7,
                color: ["#ffd24a", "#ff6b3d", "#7ecbff", "#ffe9a8", "#ff4d6d"][fi % 5],
                size: 2 + Math.random() * 4
              });
            }
          }
        } catch (e) {}
        try {
          // Extra firework bursts via existing level FX if present
          if (typeof spawnFirework === "function") {
            spawnFirework(player.x, player.y - 40);
            spawnFirework(player.x - 50, player.y - 60);
            spawnFirework(player.x + 50, player.y - 55);
          }
        } catch (e) {}
      }
      // Report when world-buildings signals ready, or failsafe
      if (window.__airborneTrainingReportReady || ph === "done" || window.__airborneTrainingReportShown) {
        nextStage(); // → report → showFlightReport
      } else if (ruffStageT > 8) {
        // Failsafe — force report after 8s in landing stage
        try {
          window.__airborneTrainingReportShown = true;
          window.__airborneTrainingReportReady = true;
          if (typeof window.__airborneShowRuffReport === "function") window.__airborneShowRuffReport();
          else if (typeof showFlightReport === "function") showFlightReport();
          var el = document.getElementById("ruffReport");
          if (el) { el.classList.add("visible"); el.style.display = "flex"; el.style.zIndex = "90"; }
        } catch (e) {}
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
    try { drawMarkers(); } catch (e) {}
    try { drawCrystals(); } catch (e) {}
    try { drawTrainingCoins(); } catch (e) {}
    // bg balloons drawn before cloud layer in main-loop
    try { drawTrainingAirship(); } catch (e) {}
    try { drawScreenDust(); } catch (e) {}
    if (ruffStage !== "boss1" && window.__airborneRuffStage !== "boss1") {
      try { drawTrainingBossDark(); } catch (e) {}
    }
    try { drawSparkles(); } catch (e) {}
    try { drawRuffCompanion(); } catch (e) {}
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

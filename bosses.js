"use strict";

  // ---------- Boss encounters — five bosses, one every 50 gameplay points ----------
  // "gameplayScore" only counts normal dodge-scoring, so bonus-round points never
  // shift boss pacing (see the scoring block in updateObstacles).
  const BOSSES = [
    { num: 1, threshold: 50,  maxHealth: 32,  kind: "bomber",  miniType: "balloon_anim",
      label: "BOSS INCOMING!",         defeatLabel: "BOSS DEFEATED!",         powerupKind: "gold",    defeatBonus: 25,  bonusRound: "balloon",
      name: "Baron Blackpowder",
      taunts: [
        "You'll never get past me, flyboy!",
        "Turn back now, while you still can!",
        "Ha! Another blimp for the scrap heap!",
        "This sky belongs to ME now!",
        "I've got a bomb with your name on it!"
      ],
      retorts: [
        "Not on my watch, Baron!",
        "We'll see about that!",
        "Bring it on, powder-keg!",
        "This sky's got room for one more win.",
        "Better duck, old man!"
      ] },
    { num: 2, threshold: 100, maxHealth: 128,  kind: "rocket",  miniType: "mini_blimp",
      label: "SECOND BOSS INCOMING!",  defeatLabel: "SECOND BOSS DEFEATED!",  powerupKind: "blue",    defeatBonus: 60,  bonusRound: "coin",
      name: "Marshal Cinderfuse",
      taunts: [
        "You call that flying? Pathetic!",
        "Prepare to be grounded, permanently!",
        "My rockets never miss twice!",
        "Blackpowder was a warm-up. I'm the real fire!"
      ],
      retorts: [
        "You talk big for a pile of gears.",
        "Let's dance, tin can!",
        "I've flown through worse than you!",
        "Fuse THIS, Marshal!"
      ] },
    { num: 3, threshold: 150, maxHealth: 192,  kind: "tank",    miniType: "mini_tank",
      label: "THIRD BOSS INCOMING!",   defeatLabel: "THIRD BOSS DEFEATED!",   powerupKind: "arcbomb", defeatBonus: 90,  bonusRound: "balloon",
      name: "General Grimtread",
      taunts: [
        "I've crushed better pilots than you!",
        "You can't out-fly a shell, ace.",
        "The ground shakes when I roll!",
        "Grounded and gutted — that's my promise."
      ],
      retorts: [
        "I've got wings, General. You've got wheels.",
        "Big talk for something made of scrap!",
        "Let's see you aim at a moving target!",
        "Enjoy the view from down there!"
      ] },
    { num: 4, threshold: 200, maxHealth: 280, kind: "heli",    miniType: "mini_heli",
      label: "FOURTH BOSS INCOMING!",  defeatLabel: "FOURTH BOSS DEFEATED!",  powerupKind: "gold",    defeatBonus: 130, bonusRound: "coin",
      name: "Captain Rotorbane",
      taunts: [
        "Say goodbye to your propeller!",
        "Nobody outmaneuvers Rotorbane!",
        "I'll cut you out of the sky myself!",
        "Three bosses down and still smiling? Not for long."
      ],
      retorts: [
        "My propeller's just getting started!",
        "You spin, I dodge. Simple as that.",
        "Let's see whose blades are sharper!",
        "Smiling all the way to your defeat!"
      ] },
    { num: 5, threshold: 250, maxHealth: 400, kind: "octopus", miniType: "mini_ebomb",
      label: "FIFTH BOSS INCOMING!",   defeatLabel: "FIFTH BOSS DEFEATED!",   powerupKind: "blue",    defeatBonus: 190, bonusRound: "balloon",
      name: "Admiral Octavius Squall",
      taunts: [
        "I've crushed better pilots than you!",
        "Every arm of mine is a different way to lose.",
        "This is where the sky runs out for you.",
        "Four bosses couldn't stop me. What makes you different?"
      ],
      retorts: [
        "Eight arms, one loss coming your way.",
        "The sky's not yours to run, Admiral.",
        "I've flown through worse than you!",
        "This ends here — for you, not me."
      ] }
  ];
  function bossConfig(num) { return BOSSES.find(b => b.num === num); }
  function nextBossConfig() { return BOSSES.find(b => b.num > lastBossTriggered); }
  function bossImgKey(num) { return num === 1 ? "boss" : "boss" + num; }

  // Called from map level select — must live here so it writes the real lets
  window.__airborneSetRunProgress = function(defeated, gpScore) {
    const d = Math.max(0, Math.min(5, defeated | 0));
    bossesDefeatedCount = d;
    lastBossTriggered = d;
    bossNumber = 0;
    bossActive = false;
    boss = null;
    if (typeof gameplayScore !== "undefined") gameplayScore = gpScore | 0;
  };

  let lastBossTriggered = 0;   // 0 = none yet; highest boss number triggered so far
  let bossNumber = 0;          // 0 = none active, else the boss currently on screen
  let bossActive = false;
  let bossesDefeatedCount = 0; // drives level transitions — only advances once a boss is actually beaten, not just when its score threshold is reached
  let boss = null;

  let powerup = null;
  let hasFirepower = false;
  let hasDualFire = false; // granted by the blue power-up during the second boss fight
  let hasArcBomb = false;  // granted by the green power-up during the third (tank) boss fight
  let playerBombs = [];    // player-dropped arc bombs, used against the ground-based tank boss
  let arcBombTimer = 0;
  const ARC_BOMB_INTERVAL = 0.85;

  function spawnArcBomb(arr, startX, startY, targetX, targetY, gravity, minTime, maxTime, spriteKey) {
    const throwTime = minTime + Math.random() * (maxTime - minTime);
    const dx = targetX - startX;
    const dy = targetY - startY;
    const baseR = Math.min(20, W * 0.05);
    arr.push({
      x: startX,
      y: startY,
      vx: dx / throwTime,
      vy: (dy - 0.5 * gravity * throwTime * throwTime) / throwTime,
      gravity,
      r: spriteKey === "boss3_shell" ? baseR * 1.25 : baseR,
      rotation: 0,
      rotSpeed: 4 + Math.random() * 3,
      orientToVelocity: spriteKey === "boss3_shell",
      spriteKey: spriteKey || "bomb",
      trailTimer: 0
    });
  }

  // ---------- Storm power-up (gas tank meter, fills every 25 points) ----------
  const STORM_MAX = 100;
  const STORM_CHARGE_PER_MILESTONE = 25; // one gas-tank "notch" every 25 score points
  let stormCharge = 0;
  let stormMilestoneCount = 0; // how many 25-point thresholds have been counted toward charge so far
  let stormWasReady = false;   // tracks ready-state transitions so the ready sound only fires once
  let stormActive = false;
  let stormTimer = 0;
  let stormUntil = 0;
  let stormCloud = null; // single descending cloud/bomb while the ability is active
  let stormLightning = null; // { points, life, age } — the current main bolt, if any
  let stormChainBolts = []; // secondary bolts branching from the cloud to each zapped obstacle
  let nextStormLightningAt = 0;
  let stormMode = "storm"; // "storm" | "pirate" | "swarm" | "missile"
  let stormSwarm = [];
  const SHIP_POWER_ICON_KEYS = {
    blimp3: "power_icon_blimp3",
    blimp4: "power_icon_blimp4",
    blimp5: "power_icon_blimp5",
    blimp7: "power_icon_blimp7",
    blimp8: "power_icon_blimp8",
    blimp9: "power_icon_blimp9"
  };
  const SHIP_POWER_MISSILE = { blimp3: true, blimp4: true };

  function makePowerTrailParticle(p) {
    const key = p.iconKey || "";
    // Unique trail colors / behaviors per power icon
    let color, kind, grow, life;
    if (key.indexOf("blimp3") >= 0) {
      color = "100,200,255"; kind = "pulse"; grow = 12; life = 0.35;
    } else if (key.indexOf("blimp4") >= 0) {
      color = "210,170,90"; kind = "gear"; grow = 6; life = 0.4;
    } else if (key.indexOf("blimp5") >= 0) {
      color = "255,140,40"; kind = "flame"; grow = 14; life = 0.45;
    } else if (key.indexOf("blimp7") >= 0) {
      color = "180,220,255"; kind = "spark"; grow = 4; life = 0.3;
    } else if (key.indexOf("blimp8") >= 0) {
      color = "40,35,30"; kind = "oil"; grow = 10; life = 0.55;
    } else if (key.indexOf("blimp9") >= 0) {
      color = "255,80,40"; kind = "ember"; grow = 8; life = 0.4;
    } else {
      color = "200,200,220"; kind = "mist"; grow = 10; life = 0.35;
    }
    return {
      x: p.x - p.vx * 0.02,
      y: p.y - p.vy * 0.02,
      vx: -p.vx * 0.15 + (Math.random() - 0.5) * 40,
      vy: -p.vy * 0.15 + (Math.random() - 0.5) * 40,
      r: 3 + Math.random() * 5,
      grow: grow,
      life: life * (0.7 + Math.random() * 0.5),
      age: 0,
      color: color,
      kind: kind
    };
  }
  let pirateBlastParticles = [];
  let pirateFireBolts = [];
  const stormMeterEl = document.getElementById("stormMeter");
  const stormIconDisplayEl = document.getElementById("stormIcon");

  // 5-stage icon set — mirrors the health meter's fill-state pattern.
  // Stage 0 = empty tank, stage 4 = fully charged/ready (matches storm_icon_1..5.webp)
  const STORM_ICON_URLS = [
    "storm_icon_1.webp?cb=2",
    "storm_icon_2.webp?cb=2",
    "storm_icon_3.webp?cb=2",
    "storm_icon_4.webp?cb=2",
    "storm_icon_5.webp?cb=2"
  ];

  // Counts every 25-point threshold the score has ever crossed and tops the tank up to match.
  // Using a running count (instead of comparing one recomputed "current milestone" value) means
  // a score jump that skips past more than one threshold in a single tick — e.g. a dodge point
  // landing in the same frame as a streak bonus — still credits every notch it passed, so the
  // tank can never stall a few points short of full.
  function addStormChargeForScore(currentScore) {
    try {
      if (typeof window.updateUnifiedProgress === "function" && !window.__airborneAirfield) {
        // Soft progress from score (cap 100)
        window.updateUnifiedProgress(Math.min(100, (currentScore || 0) / 8));
      }
    } catch (e) {}

    // Training: charge power from coins (25 coins = full activation)
    if (window.__airborneAirfield) {
      if (!window.__airborneAirfieldAllowPowerup) return;
      const coins = window.__airborneCollectCoins || 0;
      // Map coins directly: 25 coins => 100% charge
      const target = Math.min(STORM_MAX, Math.floor((coins / 1) * STORM_MAX)); // TEST: 1 coin
      if (target > stormCharge) {
        stormCharge = target;
        updateStormMeterDisplay(true);
      }
  window.addStormChargeForScore = addStormChargeForScore;

      return;
    }
    const crossedTotal = Math.floor(currentScore / STORM_CHARGE_PER_MILESTONE);
    if (crossedTotal <= stormMilestoneCount) return;
    const newNotches = crossedTotal - stormMilestoneCount;
    stormMilestoneCount = crossedTotal;
    if (stormCharge >= STORM_MAX) return;
    stormCharge = Math.min(STORM_MAX, stormCharge + newNotches * STORM_CHARGE_PER_MILESTONE);
    updateStormMeterDisplay(true);
  }

  function updateStormMeterDisplay(justCharged) {
    try { if (typeof updateCollectDock === "function") updateCollectDock(); } catch (e) {}
    const stage = Math.min(STORM_ICON_URLS.length - 1, Math.floor(stormCharge / STORM_CHARGE_PER_MILESTONE));
    if (stormIconDisplayEl && stormIconDisplayEl.dataset.stage !== String(stage)) {
      stormIconDisplayEl.dataset.stage = String(stage);
      stormIconDisplayEl.src = STORM_ICON_URLS[stage];
    }

    const isReady = stormCharge >= STORM_MAX && state === "playing" && !stormActive;
    if (stormMeterEl) {
      stormMeterEl.classList.toggle("ready", isReady);
      // Conic charge ring on unified dock
      const pct = Math.max(0, Math.min(100, (stormCharge / STORM_MAX) * 100));
      stormMeterEl.style.setProperty("--ud-charge", pct + "%");
      const ring = document.getElementById("udPowerRing");
      if (ring) ring.style.setProperty("--ud-charge", pct + "%");
      // also set on circle root
      const circle = document.querySelector("#unifiedDock .udCircle") || stormMeterEl;
      if (circle) circle.style.setProperty("--ud-charge", pct + "%");
    }

    if (justCharged) {
      // brief pop each time a notch fills, same idea as the heart's "hit" pulse
      stormMeterEl.classList.remove("charge");
      void stormMeterEl.offsetWidth; // restart the animation
      stormMeterEl.classList.add("charge");
    }

    if (isReady && !stormWasReady) {
      sfxStormReady();
    }
    stormWasReady = isReady;
  }

  
  window.__airborneMakeMeteor = function () {
    var W0 = (typeof W !== "undefined") ? W : 400;
    var big = Math.random() < 0.14;
    var r = big ? (22 + Math.random() * 14) : (12 + Math.random() * 14);
    // Mostly vertical fall; some dramatic diagonals
    var vertical = Math.random() < 0.55;
    var ang = vertical
      ? (Math.PI / 2 + (Math.random() - 0.5) * 0.2)
      : (0.55 + Math.random() * 1.0);
    if (!vertical && Math.random() < 0.5) ang = Math.PI - ang;
    var speed = (vertical ? 240 : 190) + Math.random() * 180 + (big ? 50 : 0);
    var x = Math.random() * W0 * 1.15 - W0 * 0.075;
    // Preload rock images
    if (!window.__airborneMeteorRocks) {
      window.__airborneMeteorRocks = [];
      for (var ri = 1; ri <= 6; ri++) {
        var im = new Image();
        im.crossOrigin = "anonymous";
        im.src = "meteor_rock_" + ri + ".png?v=ruff217";
        window.__airborneMeteorRocks.push(im);
      }
    }
    var rockIdx = Math.floor(Math.random() * 6);
    return {
      x: x, y: -30 - Math.random() * 100,
      vx: Math.cos(ang) * speed * 0.5,
      vy: Math.sin(ang) * speed,
      r: r, big: big,
      age: 0, life: 4 + Math.random() * 2,
      coreHue: 25 + Math.random() * 25,
      tailLen: 40 + Math.random() * 55 + (big ? 35 : 0),
      sparkRate: 0.5 + Math.random() * 0.45,
      wobble: Math.random() * 5,
      sparks: [],
      rockIdx: rockIdx,
      spin: (Math.random() - 0.5) * 4,
      spinVel: (Math.random() - 0.5) * 3
    };
  };

  function activateStorm() {
    if (window.__airborneAirfield && !window.__airborneAirfieldAllowPowerup) return;
    if (state !== "playing" || stormActive || stormCharge < STORM_MAX) return;
    // one-shot restrictions removed — powers can fire whenever charged


    stormActive = true;
    stormCharge = 0;
    if (window.__airborneAirfield) window.__airborneTrainingPowerUsed = true;
    if (window.__airborneAirfield) {
      // Spend 25 coins for activation
      window.__airborneCollectCoins = Math.max(0, (window.__airborneCollectCoins || 0) - 1); // TEST: 1 coin
      try {
        const coinEl = document.getElementById("collectPowerPct");
        if (coinEl) coinEl.textContent = String(window.__airborneCollectCoins || 0);
      } catch (e) {}
      try {
        if (typeof ruffStats !== "undefined" && ruffStats) {
          ruffStats.coins = Math.max(0, (ruffStats.coins || 0) - 1); // TEST: 1 coin
        }
      } catch (e) {}
    }
    updateStormMeterDisplay();
    pirateBlastParticles = [];
    stormSwarm = [];
    stormLightning = null;
    stormChainBolts = [];

    const sel = (typeof selectedBlimp !== "undefined") ? selectedBlimp : "blimp1";
    // Menu-assigned unique powers drive gameplay
    const SHIP_POWER_MODE = {
      blimp1: "fire",
      blimp2: "shockwave",
      blimp3: "bluefireball",
      blimp4: "steam",
      blimp5: "greenfireball",
      blimp6: "vortex",
      blimp7: "chain",
      blimp8: "fireball",
      blimp9: "jollybomb",
      blimp10: "ivorybolt",
      blimp11: "warshark",
      blimp12: "heatseek",
      blimp13: "swarm",
      blimp14: "barrelbomb",
      blimp15: "meteors"
    };
    const powerMode = SHIP_POWER_MODE[sel] || "storm";
    const swarmKey = SHIP_POWER_ICON_KEYS[sel] || null;
    stormMode = powerMode;
    window.__airborneActivePowerVisual = powerMode;
    window.__airborneActivePowerUntil = performance.now() + 5500;
    try {
      if (window.PowerFX && typeof player !== "undefined" && player) {
        window.PowerFX.activate(powerMode, player.x, player.y);
      }
    } catch (e) {}

    // Fire power (Zeppelin Ace) — use existing fire aura system
    if (powerMode === "fire") {
      try {
        window.__airborneFirePowerActive = true;
        window.__airborneFirePowerUntil = performance.now() + 9000;
        if (typeof sfxExplosion === "function") sfxExplosion(0.5);
      } catch (e) {}
      stormActive = false; // fire system handles itself
      stormCharge = 0;
      updateStormMeterDisplay();
      return;
    }

    
    // Pirate Rocket — nose-gun flamethrower
    if (powerMode === "flamethrower" || powerMode === "blueflame") {
      if (typeof sfxExplosion === "function") sfxExplosion(0.35);
      if (typeof sfxShoot === "function") sfxShoot();
      stormActive = true;
      stormMode = powerMode; // flamethrower | blueflame
      stormTimer = 5.0;
      stormCharge = 0;
      window.__airborneFlamethrowerUntil = performance.now() + 5000;
      window.__airborneActivePowerVisual = powerMode;
      window.__airborneActivePowerUntil = performance.now() + 5000;
      try {
        if (window.PowerFX && typeof player !== "undefined" && player) {
          window.PowerFX.activate(powerMode, player.x + 20, player.y);
        }
      } catch (e) {}
      updateStormMeterDisplay();
      return;
    }

    // Ironworks — lob fireballs with smoke trails that ignite obstacles
    if (powerMode === "fireball" || powerMode === "bluefireball" || powerMode === "greenfireball") {
      if (typeof sfxShoot === "function") sfxShoot();
      if (typeof sfxExplosion === "function") sfxExplosion(0.4);
      stormActive = true;
      stormMode = powerMode; // fireball | bluefireball | greenfireball
      stormTimer = 5.0;
      stormCharge = 0;
      window.__airborneFireballUntil = performance.now() + 5000;
      window.__airborneActivePowerVisual = powerMode;
      window.__airborneActivePowerUntil = performance.now() + 5000;
      window.__airborneFireballs = [];
      window.__airborneFireballKind = powerMode;
      window.__airborneGreenSpiralAng = 0;
      if (powerMode === "greenfireball") {
        // Burst of sunlight from center
        if (!window.__airborneSunBurst) window.__airborneSunBurst = [];
        window.__airborneSunBurst.push({ x: player.x, y: player.y, age: 0, life: 0.85 });
        window.__airborneSunFreezeUntil = performance.now() + 900;
        try { if (typeof triggerScreenShake === "function") triggerScreenShake(4, 200); } catch (e) {}
      }
      if (powerMode === "bluefireball") {
        window.__airborneBlueFlash = { x: player.x, y: player.y, age: 0, life: 0.28 };
        // Initial volley 3-5
        if (!window.__airborneFireballs) window.__airborneFireballs = [];
        var n0 = 3 + Math.floor(Math.random() * 3);
        for (var bi = 0; bi < n0; bi++) {
          var ang0 = -0.4 + (bi / Math.max(1, n0 - 1)) * 0.8;
          var sp0 = 150 + Math.random() * 40;
          window.__airborneFireballs.push({
            x: player.x + (player.w || 40) * 0.3,
            y: player.y + (bi - n0 / 2) * 8,
            vx: Math.cos(ang0) * sp0,
            vy: Math.sin(ang0) * sp0 * 0.5,
            life: 1.8, age: 0, r: 10, kind: "bluefireball",
            colors: ["#e0f2fe", "#7dd3fc", "#38bdf8", "#0284c7"],
            accel: 90, trails: []
          });
        }
      }
      try {
        if (window.PowerFX && player) window.PowerFX.activate(powerMode, player.x, player.y);
      } catch (e) {}
      updateStormMeterDisplay();
      return;
    }

    // Sky Rocket — heat-seeking missiles (image + flame/smoke, explode on contact)
    if (powerMode === "warshark") {
      if (typeof sfxShoot === "function") sfxShoot();
      if (typeof sfxExplosion === "function") sfxExplosion(0.35);
      stormActive = true;
      stormMode = "warshark";
      stormTimer = 5.5;
      stormCharge = 0;
      window.__airborneHeatseekUntil = performance.now() + 5500;
      window.__airborneActivePowerVisual = "warshark";
      window.__airborneActivePowerUntil = performance.now() + 5500;
      window.__airborneHeatseekers = [];
      window.__airborneWarBullets = [];
      window.__airborneWarSharkImg = null;
      var wi = new Image();
      wi.src = "war_shark_missile.png?v=ruff200";
      window.__airborneWarSharkImg = wi;
      try {
        if (window.PowerFX && player) window.PowerFX.activate("warshark", player.x, player.y);
      } catch (e) {}
      updateStormMeterDisplay();
      return;
    }

    if (powerMode === "jollybomb") {
      if (typeof sfxShoot === "function") sfxShoot();
      if (typeof sfxExplosion === "function") sfxExplosion(0.3);
      stormActive = true;
      stormMode = "jollybomb";
      stormTimer = 5.5;
      stormCharge = 0;
      window.__airborneHeatseekUntil = performance.now() + 5500;
      window.__airborneActivePowerVisual = "jollybomb";
      window.__airborneActivePowerUntil = performance.now() + 5500;
      window.__airborneHeatseekers = [];
      // Pre-spawn arcing spinning bombs
      for (var ji = 0; ji < 5; ji++) {
        var ang = -0.85 + ji * 0.35 + (Math.random() - 0.5) * 0.08;
        var sp = 160 + Math.random() * 50;
        window.__airborneHeatseekers.push({
          x: (typeof player !== "undefined" && player) ? player.x + (player.w || 40) * 0.2 : 100,
          y: (typeof player !== "undefined" && player) ? player.y : 200,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 80 - Math.random() * 40, // upward arch
          life: 2.5,
          age: 0,
          rot: Math.random() * Math.PI * 2,
          spin: 8 + Math.random() * 6,
          trails: [],
          target: null,
          kind: "jollybomb",
          gravity: 220
        });
      }
      try {
        if (window.PowerFX && player) window.PowerFX.activate("jollybomb", player.x, player.y);
      } catch (e) {}
      updateStormMeterDisplay();
      return;
    }

    if (powerMode === "barrelbomb") {
      if (typeof sfxShoot === "function") sfxShoot();
      if (typeof sfxExplosion === "function") sfxExplosion(0.35);
      stormActive = true;
      stormMode = "barrelbomb";
      stormTimer = 4.0;
      stormCharge = 0;
      // Short window — all 5 fire at once, no continuous spawn
      window.__airborneHeatseekUntil = performance.now() + 200;
      window.__airborneActivePowerVisual = "barrelbomb";
      window.__airborneActivePowerUntil = performance.now() + 4000;
      window.__airborneHeatseekers = [];
      window.__airborneWarBullets = [];
      var bi = new Image();
      bi.src = "pirate_barrel_bomb.png?v=ruff200";
      window.__airborneBarrelBombImg = bi;
      // Fire 5 barrel bombs at once in a spread
      if (typeof player !== "undefined" && player) {
        for (var bi5 = 0; bi5 < 5; bi5++) {
          var ang5 = -0.55 + (bi5 / 4) * 1.1;
          var sp5 = 160 + Math.random() * 40;
          window.__airborneHeatseekers.push({
            x: player.x + (player.w || 40) * 0.25,
            y: player.y + (bi5 - 2) * 10,
            vx: Math.cos(ang5) * sp5,
            vy: Math.sin(ang5) * sp5 * 0.55 - 40,
            life: 3.2, age: 0, rot: ang5, spin: Math.random() * 6,
            kind: "barrelbomb", fused: false, trail: []
          });
        }
      }
      try {
        if (window.PowerFX && player) window.PowerFX.activate("barrelbomb", player.x, player.y);
      } catch (e) {}
      updateStormMeterDisplay();
      return;
    }

    if (powerMode === "heatseek") {
      if (typeof sfxShoot === "function") sfxShoot();
      if (typeof sfxExplosion === "function") sfxExplosion(0.35);
      stormActive = true;
      stormMode = "heatseek";
      stormTimer = 5.5;
      stormCharge = 0;
      window.__airborneHeatseekUntil = performance.now() + 5500;
      window.__airborneActivePowerVisual = "heatseek";
      window.__airborneActivePowerUntil = performance.now() + 5500;
      window.__airborneHeatseekers = [];
      // Preload image
      if (!window.__airborneRocketImg) {
        var ri = new Image();
        ri.src = "sky_rocket_missile.jpg";
        window.__airborneRocketImg = ri;
      }
      try {
        if (window.PowerFX && player) window.PowerFX.activate("heatseek", player.x, player.y);
      } catch (e) {}
      updateStormMeterDisplay();
      return;
    }

// Shockwave / Steam — clear nearby obstacles in expanding ring
    if (powerMode === "steam") {
      window.__airborneOneShotUsed = window.__airborneOneShotUsed || {};
      
      if (typeof sfxThunder === "function") sfxThunder();
      try { if (typeof triggerScreenShake === "function") triggerScreenShake(5, 280); } catch (e) {}
      stormActive = true;
      stormMode = "steam";
      stormTimer = 1.4;
      window.__airborneActivePowerVisual = "steam";
      window.__airborneActivePowerUntil = performance.now() + 1400;
      window.__airborneSteamCone = { age: 0, life: 1.1, reach: Math.min(W, H) * 0.42 };
      if (!window.__airborneSteamParts) window.__airborneSteamParts = [];
      for (var spi = 0; spi < 40; spi++) {
        var sang = -0.55 + Math.random() * 1.1;
        var ssp = 80 + Math.random() * 160;
        window.__airborneSteamParts.push({
          x: player.x + (player.w || 40) * 0.35, y: player.y,
          vx: Math.cos(sang) * ssp, vy: Math.sin(sang) * ssp * 0.7,
          life: 0.5 + Math.random() * 0.5, age: 0, r: 6 + Math.random() * 12
        });
      }
      if (typeof obstacles !== "undefined") {
        obstacles.forEach(function(o) {
          if (!o || o.isRing || o.type === "ring") return;
          var ox = o.x + o.w * 0.5, oy = o.y + o.h * 0.5;
          var dx = ox - player.x, dy = oy - player.y;
          if (dx < 10) return;
          var dist = Math.hypot(dx, dy);
          if (dist > window.__airborneSteamCone.reach) return;
          if (Math.abs(Math.atan2(dy, dx)) > 0.7) return;
          o.vx = 120 + Math.random() * 60;
          o.vy = (Math.random() - 0.5) * 40;
          o.steamPush = 0.35; o.steamHeat = 0.5; o.scored = true;
          try { score += 3; } catch (e) {}
        });
      }
      try { if (window.PowerFX) window.PowerFX.activate("steam", player.x, player.y); } catch (e) {}
      updateStormMeterDisplay();
      return;
    }

    if (powerMode === "shockwave") {
      window.__airborneOneShotUsed = window.__airborneOneShotUsed || {};
      
      if (typeof sfxThunder === "function") sfxThunder();
      if (typeof sfxExplosion === "function") sfxExplosion(0.45);
      try { if (typeof triggerScreenShake === "function") triggerScreenShake(9, 420); } catch (e) {}
      const radius = Math.min(W, H) * 0.58;
      // Obstacles: shake then fall off screen (no swarm orbs)
      if (typeof obstacles !== "undefined" && obstacles) {
        obstacles.forEach(function (o) {
          if (!o) return;
          if (o.isRing || o.type === "gold_ring" || o.type === "ring") return;
          const dx = (o.x + o.w * 0.5) - player.x;
          const dy = (o.y + o.h * 0.5) - player.y;
          if (Math.hypot(dx, dy) < radius) {
            o.shockShake = 0.55 + Math.random() * 0.25;
            o.shockFall = true;
            o.vy = 90 + Math.random() * 70;
            o.vx = (Math.random() - 0.5) * 80;
            o.scored = true;
            try { score += 3; } catch (e) {}
          }
        });
      }
      // Sonic ring particles (not orbs)
      if (!window.__airborneShockFX) window.__airborneShockFX = [];
      for (var si = 0; si < 3; si++) {
        window.__airborneShockFX.push({
          x: player.x, y: player.y, r: 12 + si * 8, maxR: radius * (0.7 + si * 0.15),
          life: 0.55 + si * 0.12, age: 0, width: 5 - si
        });
      }
      for (var pi = 0; pi < 36; pi++) {
        var a = (pi / 36) * Math.PI * 2;
        var sp = 140 + Math.random() * 100;
        window.__airborneShockFX.push({
          kind: "spark",
          x: player.x, y: player.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.4 + Math.random() * 0.3, age: 0, r: 2 + Math.random() * 2
        });
      }
      stormActive = true;
      stormMode = "shockwave";
      stormTimer = 4.5;
      stormUntil = performance.now() + 4500;
      window.__airborneActivePowerVisual = "shockwave";
      window.__airborneActivePowerUntil = performance.now() + 4500;
      window.__airborneShockPulseT = 0;
      window.__airborneShockPulseCount = 0;
      try {
        if (window.PowerFX && player) window.PowerFX.activate(powerMode === "steam" ? "steam" : "shockwave", player.x, player.y);
      } catch (e) {}
      updateStormMeterDisplay();
      return;
    }

    // Chain lightning — zap several obstacles in sequence
    if (powerMode === "ivorybolt") {
      if (typeof sfxThunder === "function") sfxThunder();
      stormActive = true;
      stormMode = "ivorybolt";
      stormTimer = 5.0;
      window.__airborneActivePowerVisual = "ivorybolt";
      window.__airborneActivePowerUntil = performance.now() + 5000;
      window.__airborneIvoryUntil = performance.now() + 5000;
      window.__airborneIvoryBolts = [];
      window.__airborneIvoryFireballs = [];
      // Initial sky fireballs
      for (var ifb = 0; ifb < 8; ifb++) {
        var ix = (typeof W !== "undefined" ? W : 400) * (0.15 + Math.random() * 0.7);
        window.__airborneIvoryFireballs.push({
          x: ix, y: -30 - Math.random() * 80,
          vx: (Math.random() - 0.5) * 30,
          vy: 180 + Math.random() * 100,
          life: 3.5, age: 0, r: 11 + Math.random() * 5
        });
      }
      try { if (window.PowerFX) window.PowerFX.activate("fireball", player.x, player.y); } catch (e) {}
      updateStormMeterDisplay();
      return;
    }


    if (powerMode === "chain") {
      window.__airborneOneShotUsed = window.__airborneOneShotUsed || {};
      
      if (typeof sfxThunder === "function") sfxThunder();
      try { if (typeof triggerScreenShake === "function") triggerScreenShake(7, 350); } catch (e) {}
      const targets = (typeof obstacles !== "undefined" && obstacles)
        ? obstacles.filter(function(o){ return o && !o.isRing; }).slice().sort(function (a, b) {
            return Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y);
          }).slice(0, 10)
        : [];
      targets.forEach(function (o, idx) {
        setTimeout(function () {
          if (!o) return;
          o.onFire = true;
          o.lightningFire = true;
          o.vy = 55 + Math.random() * 45;
          o.scored = true;
          try {
            if (window.PowerFX) window.PowerFX.burst(o.x + o.w * 0.5, o.y + o.h * 0.5, {
              count: 8, colors: ["#fff", "#7dd3fc", "#ff8a1a", "#ff3b00"], speed: 90, glow: true
            });
          } catch (e) {}
          try { score += 4; } catch (e) {}
          try { if (typeof sfxHit === "function") sfxHit(); } catch (e) {}
        }, idx * 120);
      });
      stormMode = "storm";
      stormActive = true;
      stormUntil = performance.now() + 1000;
      return;
    }

    // Crystal beam — destroy obstacles in a forward corridor
    if (powerMode === "crystalbeam") {
      if (typeof sfxShoot === "function") sfxShoot();
      if (typeof obstacles !== "undefined" && obstacles) {
        obstacles.forEach(function (o) {
          const cy = Math.abs((o.y + o.h * 0.5) - player.y);
          if (o.x > player.x && cy < Math.max(40, player.h * 0.9)) {
            o.onFire = true;
            o.vx = 120;
            o.vy = (Math.random() - 0.5) * 40;
            o.scored = true;
            try { score += 3; } catch (e) {}
          }
        });
      }
      stormMode = "missile";
      stormSwarm.push({
        x: player.x + player.w * 0.3, y: player.y,
        vx: 500, vy: 0, spin: 0, spinVel: 0,
        size: Math.min(60, W * 0.12), life: 0.8, age: 0,
        iconKey: swarmKey, hit: false, style: "missile", delay: 0
      });
      stormActive = true;
      stormUntil = performance.now() + 900;
      return;
    }

    // Rockets / meteors / vortex / sunblade — use swarm projectiles with unique motion
    if (powerMode === "swarm") {
      // Iron Lattice — steampunk torpedo barrage (no rotating orbs)
      if (typeof sfxShoot === "function") sfxShoot();
      stormActive = true;
      stormMode = "lattice";
      stormTimer = 4.0;
      window.__airborneActivePowerVisual = "lattice";
      window.__airborneActivePowerUntil = performance.now() + 4000;
      window.__airborneLatticeUntil = performance.now() + 4000;
      window.__airborneLatticeTorps = [];
      window.__airborneLatticeSpawnT = 0;
      if (!window.__airborneLatticeImg || !window.__airborneLatticeImg.complete) {
        window.__airborneLatticeImg = new Image();
        window.__airborneLatticeImg.crossOrigin = "anonymous";
        window.__airborneLatticeImg.src = "iron_lattice_torpedo.png?v=ruff216";
      }
      for (var li = 0; li < 5; li++) {
        var ang = -0.35 + (li / 4) * 0.7;
        window.__airborneLatticeTorps.push({
          x: player.x + (player.w || 40) * 0.3,
          y: player.y + (li - 2) * 12,
          vx: Math.cos(ang) * (220 + Math.random() * 40),
          vy: Math.sin(ang) * 80,
          life: 2.8, age: 0, rot: ang,
          w: 39, h: 27,
          waveAmp: 18 + Math.random() * 14,
          waveFreq: 4 + Math.random() * 3,
          wavePhase: Math.random() * Math.PI * 2
        });
      }
      try { if (window.PowerFX) window.PowerFX.activate("swarm", player.x, player.y); } catch (e) {}
      updateStormMeterDisplay();
      return;
    }

    if (powerMode === "meteors") {
      if (typeof sfxShoot === "function") sfxShoot();
      if (typeof sfxThunder === "function") sfxThunder();
      try { if (typeof triggerScreenShake === "function") triggerScreenShake(6, 400); } catch (e) {}
      stormActive = true;
      stormMode = "meteors";
      stormTimer = 6.0;
      window.__airborneActivePowerVisual = "meteors";
      window.__airborneActivePowerUntil = performance.now() + 6000;
      window.__airborneMeteorUntil = performance.now() + 6000;
      window.__airborneMeteors = [];
      window.__airborneMeteorMarks = [];
      window.__airborneMeteorSkyDark = { age: 0, life: 6.0, alpha: 0 };
      window.__airborneMeteorSpawnT = 0;
      // Preload rock art
      if (!window.__airborneMeteorRocks) {
        window.__airborneMeteorRocks = [];
        for (var ri = 1; ri <= 6; ri++) {
          var im = new Image();
          im.src = "meteor_rock_" + ri + ".png?v=ruff218";
          window.__airborneMeteorRocks.push(im);
        }
      }
      for (var ms = 0; ms < 22; ms++) {
        if (typeof window.__airborneMakeMeteor === "function")
          window.__airborneMeteors.push(window.__airborneMakeMeteor());
      }
      try { if (window.PowerFX) window.PowerFX.activate("meteors", player.x, player.y); } catch (e) {}
      updateStormMeterDisplay();
      return;
    }


    if (powerMode === "rockets" || powerMode === "sunblade") {
      if (typeof sfxShoot === "function") sfxShoot();
      stormActive = true;
      stormMode = "missile";
      stormTimer = 2.5;
      for (var ri = 0; ri < 8; ri++) {
        var ang = (ri / 8) * Math.PI * 2;
        stormSwarm.push({
          x: player.x, y: player.y,
          vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 180,
          spin: ang, spinVel: 6, size: 28, life: 1.2, age: 0,
          iconKey: null, hit: false, style: "missile", delay: 0
        });
      }
      updateStormMeterDisplay();
      return;
    }
    if (swarmKey) {
      stormCloud = null;
      if (typeof sfxExplosion === "function") sfxExplosion(0.55);
      if (typeof sfxThunder === "function") sfxThunder();
      if (typeof sfxShoot === "function") sfxShoot();

      if (SHIP_POWER_MISSILE[sel]) {
        // Missile volley — forward-fanning projectiles (Aero Slicer / Steampunk)
        stormMode = "missile";
        const volleys = 9;
        for (let i = 0; i < volleys; i++) {
          const spread = (i - (volleys - 1) / 2) * 0.11;
          const speed = 340 + Math.random() * 100;
          stormSwarm.push({
            x: player.x + player.w * 0.28,
            y: player.y + (Math.random() - 0.5) * player.h * 0.3,
            vx: Math.cos(spread) * speed,
            vy: Math.sin(spread) * speed * 0.5 + (Math.random() - 0.5) * 30,
            spin: spread,
            spinVel: 10,
            size: Math.min(48, W * 0.095) * (0.85 + Math.random() * 0.25),
            life: 1.55,
            age: 0,
            iconKey: swarmKey,
            hit: false,
            style: "missile",
            delay: i * 0.045
          });
        }
        obstacles.forEach(function(o, idx) {
          if (idx > 5) return;
          const tx = o.x + o.w * 0.5, ty = o.y + o.h * 0.5;
          const dx = tx - player.x, dy = ty - player.y;
          const dist = Math.hypot(dx, dy) || 1;
          const speed = 400 + Math.random() * 50;
          stormSwarm.push({
            x: player.x + player.w * 0.2,
            y: player.y,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            spin: Math.atan2(dy, dx),
            spinVel: 12,
            size: Math.min(46, W * 0.09),
            life: 1.4,
            age: 0,
            iconKey: swarmKey,
            hit: false,
            style: "missile",
            delay: 0.06 * idx
          });
        });
      } else {
        // Radial spinning swarm (5,7,8,9)
        stormMode = "swarm";
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.2;
          const speed = 180 + Math.random() * 160;
          stormSwarm.push({
            x: player.x, y: player.y,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed * 0.85 - 40,
            spin: Math.random() * Math.PI * 2,
            spinVel: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 8),
            size: Math.min(56, W * 0.11) * (0.75 + Math.random() * 0.45),
            life: 1.4, age: 0, iconKey: swarmKey, hit: false, style: "swarm", delay: 0
          });
        }
        obstacles.forEach(function(o, idx) {
          if (idx > 6) return;
          const tx = o.x + o.w * 0.5, ty = o.y + o.h * 0.5;
          const dx = tx - player.x, dy = ty - player.y;
          const dist = Math.hypot(dx, dy) || 1;
          const speed = 220 + Math.random() * 80;
          stormSwarm.push({
            x: player.x, y: player.y,
            vx: (dx / dist) * speed, vy: (dy / dist) * speed,
            spin: Math.random() * Math.PI * 2, spinVel: 8,
            size: Math.min(52, W * 0.1), life: 1.5, age: 0,
            iconKey: swarmKey, hit: false, style: "swarm", delay: 0
          });
        });
      }
      return;
    }

    // Default storm cloud
    stormMode = "storm";
    if (typeof sfxThunder === "function") sfxThunder();
    stormCloud = {
      phase: "falling", t: 0, x: W / 2,
      startY: -H * 0.35, y: -H * 0.35, targetY: H * 0.42,
      w: Math.min(340, W * 0.55),
      animFrame: Math.floor(Math.random() * STORM_CLOUD_FRAME_COUNT),
      animTimer: 0, glowPhase: 0, ringPhase: 0, spin: 0
    };
  }

  function buildLightningPath(x1, y1, x2, y2, wander) {
    const points = [[x1, y1]];
    let x = x1, y = y1;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const segments = Math.max(3, Math.min(8, Math.round(dist / 70)));
    for (let i = 0; i < segments; i++) {
      const p = (i + 1) / segments;
      x = x1 + (x2 - x1) * p + (Math.random() - 0.5) * (wander || 40);
      y = y1 + (y2 - y1) * p + (Math.random() - 0.5) * (wander || 40);
      points.push([x, y]);
    }
    points.push([x2, y2]); // always land exactly on the target
    return points;
  }

  function spawnPirateBlast(cx, cy, scale) {
    scale = scale || 1;
    const colors = ["#1a1a1a", "#3a2a1a", "#c9a66b", "#ff6b2d", "#ffd27a", "#5a4030", "#8b1a1a", "#ff4500"];
    const n = Math.floor(40 * scale);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (50 + Math.random() * 280) * scale;
      pirateBlastParticles.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 30,
        life: 0.4 + Math.random() * 0.65,
        age: 0,
        r: (2 + Math.random() * 7) * scale,
        color: colors[i % colors.length],
        kind: Math.random() < 0.3 ? "ember" : (Math.random() < 0.35 ? "smoke" : "spark")
      });
    }
    for (let i = 0; i < 3; i++) {
      pirateBlastParticles.push({
        kind: "ring",
        x: cx, y: cy,
        vx: 0, vy: 0,
        life: 0.4 + i * 0.12,
        age: 0,
        r: 8,
        grow: (260 + i * 100) * scale,
        color: i === 0 ? "#ffd27a" : (i === 1 ? "#ff6b2d" : "#ff4500")
      });
    }
  }

  function spawnPirateFireTrail(x, y) {
    for (let i = 0; i < 3; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const spd = 40 + Math.random() * 90;
      pirateBlastParticles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(ang) * spd * 0.4,
        vy: Math.sin(ang) * spd - 20,
        life: 0.35 + Math.random() * 0.35,
        age: 0,
        r: 4 + Math.random() * 8,
        color: Math.random() < 0.5 ? "#ff6b2d" : "#ffd27a",
        kind: "ember"
      });
    }
  }

  function stormImpact() {
    const startX = stormCloud.x;
    const startY = stormCloud.y + stormCloud.w * 0.05;

    if (stormMode === "pirate") {
      if (typeof sfxExplosion === "function") sfxExplosion(1.4);
      if (typeof sfxCrash === "function") sfxCrash();
      triggerScreenFlash(0.32, 260);
      triggerScreenShake(9, 480);
      spawnPirateBlast(startX, startY, 1.15);
      stormLightning = null;
      stormChainBolts = [];
      pirateFireBolts = [];

      obstacles.forEach((o, i) => {
        const drawY = o.y + Math.sin(o.bobPhase) * o.bobAmount;
        pirateFireBolts.push({
          x: startX, y: startY,
          tx: o.x + o.w / 2,
          ty: drawY + o.h / 2,
          progress: 0,
          speed: 2.2 + Math.random() * 0.9,
          delay: i * 0.04,
          age: 0,
          hit: false,
          targetId: o
        });
      });
      if (typeof bombs !== "undefined") {
        bombs.forEach((b, i) => {
          pirateFireBolts.push({
            x: startX, y: startY, tx: b.x, ty: b.y,
            progress: 0, speed: 2.5, delay: 0.05 + i * 0.03,
            age: 0, hit: false, targetBomb: b
          });
        });
      }
      if (bossActive && boss) {
        pirateFireBolts.push({
          x: startX, y: startY,
          tx: boss.x + boss.w / 2, ty: boss.y + boss.h / 2,
          progress: 0, speed: 1.8, delay: 0.08,
          age: 0, hit: false, targetBoss: true
        });
      }
      return;
    }

    if (typeof sfxThunder === "function") sfxThunder();
    triggerScreenFlash(0.22, 220);
    triggerScreenShake(6, 380);
    stormLightning = { points: buildLightningPath(startX, startY, startX + (Math.random() - 0.5) * W * 0.2, H, W * 0.1), age: 0, life: 0.3 };
    stormChainBolts = obstacles.map(o => {
      const drawY = o.y + Math.sin(o.bobPhase) * o.bobAmount;
      const ex = o.x + o.w / 2, ey = drawY + o.h / 2;
      return { points: buildLightningPath(startX, startY, ex, ey, 30), age: 0, life: 0.25 + Math.random() * 0.15 };
    });

    obstacles.forEach(o => {
      const drawY = o.y + Math.sin(o.bobPhase) * o.bobAmount;
      triggerBigExplosion(o.x + o.w / 2, drawY + o.h / 2, o.w, o.h);
      score += 2;
    });
    obstacles = [];
    bombs.forEach(b => triggerBigExplosion(b.x, b.y, 40, 40));
    bombs = [];

    if (bossActive && boss) {
      const dmg = Math.max(3, Math.ceil(boss.maxHealth * 0.3));
      boss.health -= dmg;
      bossHitFlashUntil = performance.now() + 200;
      bossShakeUntil = performance.now() + 300;
      triggerBigExplosion(boss.x + boss.w / 2, boss.y + boss.h / 2, boss.w * 0.6, boss.h * 0.6);
      if (boss.health <= 0) defeatBoss();
    }

    scoreVal.textContent = score;
    bumpScorePop();
  }

  
  
  window.__airborneClearPowerEntities = function () {
    try {
      window.__airborneHeatseekers = [];
      window.__airborneWarBullets = [];
      window.__airborneOrphanTrails = [];
      window.__airborneFireballs = [];
      window.__airborneBombBlasts = [];
      try { if (typeof ruffAirship !== "undefined") ruffAirship = null; } catch (e) {}
      window.__airborneRuffAirship = null;
      window.__airborneActivePowerVisual = null;
      window.__airborneActivePowerUntil = 0;
      window.__airborneHeatseekUntil = 0;
      window.__airborneFireballUntil = 0;
      window.__airborneFlamethrowerUntil = 0;
      if (typeof stormActive !== "undefined") stormActive = false;
      if (typeof stormMode !== "undefined") stormMode = "storm";
      if (typeof stormTimer !== "undefined") stormTimer = 0;
      if (typeof stormCharge !== "undefined") stormCharge = 0;
      if (typeof bombs !== "undefined") bombs = [];
      if (typeof powerup !== "undefined") powerup = null;
      if (typeof bossActive !== "undefined") bossActive = false;
      if (typeof boss !== "undefined") boss = null;
      if (window.PowerFX && window.PowerFX.particles) window.PowerFX.particles = [];
    } catch (e) {}
  };

  function damageBossFromPower(amount, x, y) {
    try {
      if (!(typeof bossActive !== "undefined" && bossActive && boss)) return false;
      var dmg = amount || Math.max(2, Math.ceil((boss.maxHealth || 30) * 0.08));
      boss.health -= dmg;
      bossHitFlashUntil = performance.now() + 180;
      bossShakeUntil = performance.now() + 250;
      try {
        if (typeof triggerBigExplosion === "function")
          triggerBigExplosion(x || (boss.x + boss.w / 2), y || (boss.y + boss.h / 2), boss.w * 0.4, boss.h * 0.4);
      } catch (e) {}
      try {
        if (typeof spawnHitParticles === "function")
          spawnHitParticles(x || (boss.x + boss.w * 0.5), y || (boss.y + boss.h * 0.5));
      } catch (e) {}
      if (boss.health <= 0) {
        try { defeatBoss(); } catch (e) {}
      }
      return true;
    } catch (e) { return false; }
  }

  function updateStorm(dt) {
    try { updateBombBlasts(dt); } catch (e) {}

    // Iron Lattice torpedoes
    if (stormMode === "lattice" || (window.__airborneLatticeTorps && window.__airborneLatticeTorps.length)) {
      var untilL = window.__airborneLatticeUntil || 0;
      if (untilL && performance.now() < untilL && typeof player !== "undefined" && player) {
        window.__airborneLatticeSpawnT = (window.__airborneLatticeSpawnT || 0) - dt;
        if (window.__airborneLatticeSpawnT <= 0) {
          window.__airborneLatticeSpawnT = 0.32;
          var ang = -0.25 + Math.random() * 0.5;
          window.__airborneLatticeTorps = window.__airborneLatticeTorps || [];
          window.__airborneLatticeTorps.push({
            x: player.x + (player.w || 40) * 0.3,
            y: player.y + (Math.random() - 0.5) * (player.h || 30),
            vx: Math.cos(ang) * (230 + Math.random() * 50),
            vy: Math.sin(ang) * 70,
            life: 2.6, age: 0, rot: ang, w: 39, h: 27
          });
        }
      }
      if (!window.__airborneLatticeTorps) window.__airborneLatticeTorps = [];
      for (var lti = window.__airborneLatticeTorps.length - 1; lti >= 0; lti--) {
        var lt = window.__airborneLatticeTorps[lti];
        lt.age += dt;
        var wave = Math.sin(lt.age * (lt.waveFreq || 5) + (lt.wavePhase || 0)) * (lt.waveAmp || 16);
        // perpendicular to velocity for snake/wave path
        var spd = Math.hypot(lt.vx, lt.vy) || 1;
        var px = -lt.vy / spd, py = lt.vx / spd;
        lt.x += lt.vx * dt + px * wave * dt * 8;
        lt.y += lt.vy * dt + py * wave * dt * 8;
        lt.rot = Math.atan2(lt.vy + py * wave * 0.3, lt.vx + px * wave * 0.3);
        // denser brass sparks
        if (Math.random() < 0.55) {
          if (!lt.trail) lt.trail = [];
          lt.trail.push({
            x: lt.x - Math.cos(lt.rot) * 12,
            y: lt.y - Math.sin(lt.rot) * 8,
            life: 0.35, age: 0, r: 2 + Math.random() * 4,
            kind: Math.random() < 0.6 ? "spark" : "smoke"
          });
        }
        // brass exhaust trail
        if (!lt.trail) lt.trail = [];
        if (Math.random() < 0.8) {
          lt.trail.push({
            x: lt.x - Math.cos(lt.rot) * 20,
            y: lt.y - Math.sin(lt.rot) * 10,
            life: 0.4, age: 0, r: 4 + Math.random() * 5,
            kind: Math.random() < 0.5 ? "spark" : "smoke"
          });
        }
        for (var tr = (lt.trail||[]).length - 1; tr >= 0; tr--) {
          lt.trail[tr].age += dt;
          if (lt.trail[tr].age >= lt.trail[tr].life) lt.trail.splice(tr, 1);
        }
        if (typeof obstacles !== "undefined") {
          for (var oi = obstacles.length - 1; oi >= 0; oi--) {
            var o = obstacles[oi];
            if (!o || o.isRing) continue;
            var ox = o.x + o.w * 0.5, oy = o.y + o.h * 0.5;
            if (Math.hypot(lt.x - ox, lt.y - oy) < 36) {
              try { if (typeof spawnHitParticles === "function") spawnHitParticles(ox, oy); } catch (e) {}
              try { if (typeof sfxExplosion === "function") sfxExplosion(0.65); } catch (e) {}
              try { if (typeof triggerScreenShake === "function") triggerScreenShake(7, 280); } catch (e) {}
              try { if (typeof spawnRealisticBombExplosion === "function") spawnRealisticBombExplosion(ox, oy); } catch (e) {}
              try { if (window.PowerFX) {
                window.PowerFX.burst(ox, oy, {
                  count: 28, colors: ["#fbbf24", "#f59e0b", "#d97706", "#78716c", "#fff", "#ff6b3d"],
                  speed: 180, glow: true
                });
              } } catch (e) {}
              // secondary shock ring
              if (!window.__airborneShockFX) window.__airborneShockFX = [];
              window.__airborneShockFX.push({
                x: ox, y: oy, r: 8, maxR: 70, life: 0.4, age: 0, width: 4
              });
              try { score += 40; } catch (e) {}
              obstacles.splice(oi, 1);
              lt.age = lt.life;
              break;
            }
          }
        }
        if (lt.age >= lt.life || lt.x > (typeof W !== "undefined" ? W : 800) + 40)
          window.__airborneLatticeTorps.splice(lti, 1);
      }
      if (untilL && performance.now() > untilL && !window.__airborneLatticeTorps.length) {
        stormActive = false; stormMode = "storm";
      }
    }

    // Deco continuous pulsing shockwave
    if (stormMode === "shockwave" && stormActive) {
      window.__airborneShockPulseT = (window.__airborneShockPulseT || 0) + dt;
      if (window.__airborneShockPulseT >= 0.55) {
        window.__airborneShockPulseT = 0;
        window.__airborneShockPulseCount = (window.__airborneShockPulseCount || 0) + 1;
        var radius = Math.min(W || 400, H || 600) * 0.5;
        if (!window.__airborneShockFX) window.__airborneShockFX = [];
        for (var si = 0; si < 2; si++) {
          window.__airborneShockFX.push({
            x: player.x, y: player.y, r: 10 + si * 6, maxR: radius * (0.65 + si * 0.2),
            life: 0.5, age: 0, width: 4 - si
          });
        }
        if (typeof obstacles !== "undefined" && player) {
          obstacles.forEach(function(o) {
            if (!o || o.isRing) return;
            var ox = o.x + o.w * 0.5, oy = o.y + o.h * 0.5;
            if (Math.hypot(ox - player.x, oy - player.y) < radius) {
              o.shockShake = 0.3;
              o.shockFall = true;
              o.vy = 70 + Math.random() * 50;
              o.vx = (Math.random() - 0.5) * 60;
            }
          });
        }
        try { if (typeof triggerScreenShake === "function") triggerScreenShake(4, 150); } catch (e) {}
      }
      if (stormUntil && performance.now() > stormUntil) {
        stormActive = false; stormMode = "storm";
      }
    }

    if (window.__airborneIvoryFireballs && window.__airborneIvoryFireballs.length) {
      var untilIv2 = window.__airborneIvoryUntil || 0;
      // Spawn more while active
      if (stormMode === "ivorybolt" && untilIv2 && performance.now() < untilIv2 && Math.random() < 0.08) {
        var ix = (typeof W !== "undefined" ? W : 400) * (0.1 + Math.random() * 0.8);
        window.__airborneIvoryFireballs.push({
          x: ix, y: -20, vx: (Math.random()-0.5)*40, vy: 200+Math.random()*80, life: 3, age: 0, r: 10+Math.random()*6
        });
      }
      for (var ifi = window.__airborneIvoryFireballs.length - 1; ifi >= 0; ifi--) {
        var ifb = window.__airborneIvoryFireballs[ifi];
        ifb.age += dt; ifb.x += ifb.vx * dt; ifb.y += ifb.vy * dt; ifb.vy += 80 * dt;
        if (typeof obstacles !== "undefined") {
          for (var oi = obstacles.length - 1; oi >= 0; oi--) {
            var o = obstacles[oi];
            if (!o || o.isRing) continue;
            var ox = o.x + o.w * 0.5, oy = o.y + o.h * 0.5;
            if (Math.hypot(ifb.x - ox, ifb.y - oy) < ifb.r + Math.max(o.w, o.h) * 0.3) {
              try { if (typeof spawnHitParticles === "function") spawnHitParticles(ox, oy); } catch (e) {}
              try { if (window.PowerFX) window.PowerFX.burst(ox, oy, { count: 10, colors: ["#fff","#ffd24a","#ff8a1a"], speed: 100, glow: true }); } catch (e) {}
              try { score += 30; } catch (e) {}
              obstacles.splice(oi, 1);
              ifb.age = ifb.life;
              break;
            }
          }
        }
        if (ifb.age >= ifb.life || ifb.y > (typeof H !== "undefined" ? H : 700) + 40)
          window.__airborneIvoryFireballs.splice(ifi, 1);
      }
      if (untilIv2 && performance.now() > untilIv2 && !window.__airborneIvoryFireballs.length) {
        stormActive = false; stormMode = "storm";
      }
    }
    if (false && (stormMode === "ivorybolt" || (window.__airborneIvoryBolts && window.__airborneIvoryBolts.length))) {
      var untilIv = window.__airborneIvoryUntil || 0;
      if (untilIv && performance.now() > untilIv && !(window.__airborneIvoryBolts && window.__airborneIvoryBolts.length)) {
        stormActive = false; stormMode = "storm";
      }
      if (!window.__airborneIvoryBolts) window.__airborneIvoryBolts = [];
      // Continuous main bolt from blimp to farthest cluster + branches
      if (untilIv && performance.now() < untilIv && typeof player !== "undefined" && player) {
        if (Math.random() < 0.35) {
          var targets = [];
          if (typeof obstacles !== "undefined") {
            obstacles.forEach(function(o) {
              if (!o || o.isRing) return;
              targets.push(o);
            });
          }
          if (targets.length) {
            var main = targets[Math.floor(Math.random() * Math.min(3, targets.length))];
            var mx = main.x + main.w * 0.5, my = main.y + main.h * 0.5;
            var bolt = {
              x0: player.x + player.w * 0.3, y0: player.y,
              x1: mx, y1: my, age: 0, life: 0.18,
              branches: []
            };
            targets.forEach(function(o) {
              if (o === main) return;
              var ox = o.x + o.w * 0.5, oy = o.y + o.h * 0.5;
              if (Math.hypot(ox - mx, oy - my) < 160) {
                bolt.branches.push({ x0: mx, y0: my, x1: ox, y1: oy });
                o.onFire = true; o.vy = 70; o.scored = true;
                try { score += 20; } catch (e) {}
              }
            });
            main.onFire = true; main.vy = 90; main.scored = true;
            try { score += 25; } catch (e) {}
            window.__airborneIvoryBolts.push(bolt);
          }
        }
      }
      for (var ii = window.__airborneIvoryBolts.length - 1; ii >= 0; ii--) {
        window.__airborneIvoryBolts[ii].age += dt;
        if (window.__airborneIvoryBolts[ii].age >= window.__airborneIvoryBolts[ii].life)
          window.__airborneIvoryBolts.splice(ii, 1);
      }
    }


    // Little Spy expanding shield capture
    if (window.__airborneSpyShield && stormMode === "vortex") {
      var sh = window.__airborneSpyShield;
      sh.age += dt;
      var px = (typeof player !== "undefined" && player) ? player.x : W * 0.3;
      var py = (typeof player !== "undefined" && player) ? player.y : H * 0.4;
      sh.x = px; sh.y = py;
      var t = sh.age / sh.life;
      if (t < 0.35) {
        sh.phase = "expand";
        sh.r = 20 + (sh.maxR - 20) * (t / 0.35);
      } else if (t < 0.55) {
        sh.phase = "hold";
        sh.r = sh.maxR;
      } else {
        sh.phase = "retract";
        var rt = (t - 0.55) / 0.45;
        sh.r = sh.maxR * (1 - rt);
      }
      if (typeof obstacles !== "undefined") {
        for (var vi = obstacles.length - 1; vi >= 0; vi--) {
          var vo = obstacles[vi];
          if (!vo || vo.isRing) continue;
          var vox = vo.x + vo.w * 0.5, voy = vo.y + vo.h * 0.5;
          if (Math.hypot(vox - px, voy - py) < sh.r) {
            if (sh.phase === "retract" || sh.phase === "hold") {
              try { if (typeof spawnHitParticles === "function") spawnHitParticles(vox, voy); } catch (e) {}
              try { if (window.PowerFX) window.PowerFX.burst(vox, voy, { count: 10, colors: ["#a78bfa", "#c4b5fd", "#fff"], speed: 90, glow: true }); } catch (e) {}
              try { score += 30; if (scoreVal) scoreVal.textContent = String(score); } catch (e) {}
              obstacles.splice(vi, 1);
            }
          }
        }
      }
      if (sh.age >= sh.life) {
        window.__airborneSpyShield = null;
        stormActive = false; stormMode = "storm";
      }
    }
    // Meteor shower — continuous sky rain of fire
    if (window.__airborneMeteorSkyDark) {
      var sd = window.__airborneMeteorSkyDark;
      sd.age += dt;
      var st = Math.min(1, sd.age / 0.4);
      var fadeOut = sd.age > sd.life - 0.8 ? Math.max(0, (sd.life - sd.age) / 0.8) : 1;
      sd.alpha = 0.55 * st * fadeOut;
      if (sd.age >= sd.life) window.__airborneMeteorSkyDark = null;
    }
    if (stormMode === "meteors" || (window.__airborneMeteors && window.__airborneMeteors.length)) {
      var untilM = window.__airborneMeteorUntil || 0;
      // Continuous spawn from top
      if (untilM && performance.now() < untilM) {
        window.__airborneMeteorSpawnT = (window.__airborneMeteorSpawnT || 0) - dt;
        if (window.__airborneMeteorSpawnT <= 0) {
          window.__airborneMeteorSpawnT = 0.08 + Math.random() * 0.1;
          if (typeof window.__airborneMakeMeteor === "function") {
            window.__airborneMeteors = window.__airborneMeteors || [];
            window.__airborneMeteors.push(window.__airborneMakeMeteor());
            if (Math.random() < 0.5) window.__airborneMeteors.push(window.__airborneMakeMeteor());
          }
        }
      }
      if (!window.__airborneMeteors) window.__airborneMeteors = [];
      for (var mti = window.__airborneMeteors.length - 1; mti >= 0; mti--) {
        var mt = window.__airborneMeteors[mti];
        mt.age += dt;
        mt.x += mt.vx * dt + Math.sin(mt.age * 3 + mt.wobble) * mt.wobble * dt;
        mt.y += mt.vy * dt;
        mt.vy += 40 * dt; // slight accel
        // sparks breaking away
        if (!mt.sparks) mt.sparks = [];
        if (Math.random() < mt.sparkRate) {
          mt.sparks.push({
            x: mt.x, y: mt.y,
            vx: -mt.vx * 0.2 + (Math.random() - 0.5) * 60,
            vy: -mt.vy * 0.1 + (Math.random() - 0.5) * 40,
            life: 0.25 + Math.random() * 0.35, age: 0,
            r: 1.5 + Math.random() * 2.5
          });
        }
        for (var si = mt.sparks.length - 1; si >= 0; si--) {
          var sp = mt.sparks[si];
          sp.age += dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt;
          if (sp.age >= sp.life) mt.sparks.splice(si, 1);
        }
        var hitGround = mt.y > (typeof H !== "undefined" ? H : 700) - 4;
        var hitObs = false;
        if (typeof obstacles !== "undefined") {
          for (var moi = obstacles.length - 1; moi >= 0; moi--) {
            var mo = obstacles[moi];
            if (!mo || mo.isRing) continue;
            var mx = mo.x + mo.w * 0.5, my = mo.y + mo.h * 0.5;
            if (Math.hypot(mx - mt.x, my - mt.y) < mt.r + Math.max(mo.w, mo.h) * 0.35) {
              hitObs = true;
              try { score += mt.big ? 45 : 25; } catch (e) {}
              obstacles.splice(moi, 1);
              break;
            }
          }
        }
        if (hitGround || hitObs || mt.age >= mt.life) {
          var ix = mt.x, iy = Math.min(mt.y, (typeof H !== "undefined" ? H : 700) - 10);
          try { if (typeof triggerScreenShake === "function") triggerScreenShake(mt.big ? 9 : 3, mt.big ? 350 : 120); } catch (e) {}
          try { spawnRealisticBombExplosion(ix, iy); } catch (e) {}
          try {
            if (window.PowerFX) window.PowerFX.burst(ix, iy, {
              count: mt.big ? 22 : 12,
              colors: ["#fff7ed", "#fde68a", "#f97316", "#dc2626", "#78716c"],
              speed: mt.big ? 160 : 100, glow: true
            });
          } catch (e) {}
          window.__airborneMeteorFlash = { age: 0, life: 0.12, big: !!mt.big };
          window.__airborneMeteors.splice(mti, 1);
        }
      }
      if (untilM && performance.now() > untilM && !window.__airborneMeteors.length) {
        stormActive = false; stormMode = "storm";
        window.__airborneMeteorSkyDark = null;
      }
    }

    // Steam cone particles + delayed destroy after push
    if (window.__airborneSteamParts && window.__airborneSteamParts.length) {
      for (var spi = window.__airborneSteamParts.length - 1; spi >= 0; spi--) {
        var sp = window.__airborneSteamParts[spi];
        sp.age += dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt;
        sp.r += 10 * dt; sp.vx *= (1 - 0.8 * dt);
        if (sp.age >= sp.life) window.__airborneSteamParts.splice(spi, 1);
      }
    }
    if (window.__airborneSteamCone) {
      window.__airborneSteamCone.age += dt;
      if (window.__airborneSteamCone.age >= window.__airborneSteamCone.life) window.__airborneSteamCone = null;
    }
    if (typeof obstacles !== "undefined") {
      for (var soi = obstacles.length - 1; soi >= 0; soi--) {
        var so = obstacles[soi];
        if (!so) continue;
        if (so.steamPush != null) {
          so.steamPush -= dt;
          so.x += (so.vx || 0) * dt;
          so.y += (so.vy || 0) * dt;
          if (so.steamHeat) { so.steamHeat -= dt; so.hitFlash = 0.4; }
          if (so.steamPush <= 0) {
            try { if (typeof spawnHitParticles === "function") spawnHitParticles(so.x + so.w * 0.5, so.y + so.h * 0.5); } catch (e) {}
            obstacles.splice(soi, 1);
          }
        }
      }
    }
    if (window.__airborneSunFreezeUntil && performance.now() < window.__airborneSunFreezeUntil && typeof obstacles !== "undefined") {
      obstacles.forEach(function(o) {
        if (!o || o.isRing) return;
        o.x += (obstacleSpeed || 100) * dt * 0.35; // effectively slower scroll relative
        o.sunWeak = true;
      });
    }
    if (window.__airborneBlueFlash) {
      window.__airborneBlueFlash.age += dt;
      if (window.__airborneBlueFlash.age >= window.__airborneBlueFlash.life) window.__airborneBlueFlash = null;
    }
    if (window.__airborneSunBurst && window.__airborneSunBurst.length) {
      for (var sbi = window.__airborneSunBurst.length - 1; sbi >= 0; sbi--) {
        window.__airborneSunBurst[sbi].age += dt;
        if (window.__airborneSunBurst[sbi].age >= window.__airborneSunBurst[sbi].life)
          window.__airborneSunBurst.splice(sbi, 1);
      }
    }
    // Shockwave particle rings + obstacle fall
    if (window.__airborneShockFX && window.__airborneShockFX.length) {
      for (var sxi = window.__airborneShockFX.length - 1; sxi >= 0; sxi--) {
        var sx = window.__airborneShockFX[sxi];
        sx.age += dt;
        if (sx.kind === "spark") {
          sx.x += sx.vx * dt; sx.y += sx.vy * dt;
          sx.vx *= (1 - 1.5 * dt); sx.vy *= (1 - 1.5 * dt);
        } else {
          sx.r += (sx.maxR - 12) * dt * 2.2;
        }
        if (sx.age >= sx.life) window.__airborneShockFX.splice(sxi, 1);
      }
    }
    if (typeof obstacles !== "undefined" && obstacles) {
      for (var oi = obstacles.length - 1; oi >= 0; oi--) {
        var o = obstacles[oi];
        if (!o) continue;
        if (o.shockShake && o.shockShake > 0) {
          o.shockShake -= dt;
          o.x += (Math.random() - 0.5) * 10;
          o.y += (Math.random() - 0.5) * 6;
        }
        if (o.shockFall) {
          o.y += (o.vy || 100) * dt;
          o.x += (o.vx || 0) * dt;
          o.vy = (o.vy || 100) + 220 * dt;
          if (o.y > (typeof H !== "undefined" ? H : 700) + 80) {
            obstacles.splice(oi, 1);
          }
        }
      }
    }
    // Always tick orphan missile trails so marks never stick
    if (window.__airborneOrphanTrails && window.__airborneOrphanTrails.length) {
      for (var oi = window.__airborneOrphanTrails.length - 1; oi >= 0; oi--) {
        var ot = window.__airborneOrphanTrails[oi];
        ot.age += dt;
        ot.x += (ot.vx || 0) * dt;
        ot.y += (ot.vy || 0) * dt;
        ot.r += ((ot.kind === "smoke") ? 10 : 4) * dt;
        if (ot.age >= ot.life) window.__airborneOrphanTrails.splice(oi, 1);
      }
    }
    // Keep updating in-flight missiles after power window ends
    if ((!stormActive || (stormMode !== "heatseek" && stormMode !== "warshark" && stormMode !== "barrelbomb" && stormMode !== "jollybomb")) &&
        window.__airborneHeatseekers && window.__airborneHeatseekers.length) {
      stormMode = window.__airborneHeatseekers[0].kind || "heatseek";
      stormActive = true;
      window.__airborneHeatseekUntil = 0; // no new spawns
    }
    // Always update war bullets (even if stormMode already cleared)
    if (window.__airborneWarBullets && window.__airborneWarBullets.length) {
      var _wbs = window.__airborneWarBullets;
      for (var _wi = _wbs.length - 1; _wi >= 0; _wi--) {
        var _wb = _wbs[_wi];
        _wb.age = (_wb.age || 0) + dt;
        _wb.x += (_wb.vx || 0) * dt;
        _wb.y += (_wb.vy || 0) * dt;
        if (_wb.age >= (_wb.life || 0.9) || _wb.x > (typeof W !== "undefined" ? W : 400) + 40) {
          _wbs.splice(_wi, 1);
        }
      }
    }


    if (!stormActive) return;

    // ---- Pirate Rocket flamethrower cone ----
    if (stormMode === "flamethrower" || stormMode === "blueflame") {
      var nowFt = performance.now();
      var untilFt = window.__airborneFlamethrowerUntil || 0;
      if (!untilFt || nowFt >= untilFt) {
        stormActive = false;
        stormMode = "storm";
        stormTimer = 0;
        window.__airborneActivePowerVisual = null;
        window.__airborneActivePowerUntil = 0;
        window.__airborneFlamethrowerUntil = 0;
        return;
      }
      var remain = (untilFt - nowFt) / 1000;
      stormTimer = remain;
      // Aura only while active
      window.__airborneActivePowerVisual = "flamethrower";
      window.__airborneActivePowerUntil = untilFt;
      if (typeof player !== "undefined" && player) {
        // Lower jet 2% of screen height to line up with front gun
        var drop = (typeof H !== "undefined" ? H : 600) * 0.02;
        var noseX = player.x + (player.w || 40) * 0.38;
        var noseY = player.y + drop;
        // Short flame reach (match visual ~90–110px)
        var flameReach = Math.min(stormMode === "blueflame" ? 126 : 115, (typeof W !== "undefined" ? W : 400) * (stormMode === "blueflame" ? 0.31 : 0.28));
        var coneHalf = (stormMode === "blueflame") ? 0.25 : 0.266;
        // Particles — short range forward
        if (window.PowerFX) {
          try {
            for (var fi = 0; fi < 2; fi++) {
              var flameCols = (stormMode === "blueflame")
              ? ["#e0f2fe", "#7dd3fc", "#38bdf8", "#0284c7", "#1e3a8a"]
              : ["#fff5c0", "#ffd24a", "#ff8a1a", "#ff3b00"];
            window.PowerFX.burst(noseX, noseY, {
                count: 2,
                colors: flameCols,
                speed: (stormMode === "blueflame" ? 105 : 90) + Math.random() * 50,
                angle: 0,
                spread: (stormMode === "blueflame" ? 0.28 : 0.30),
                gravity: -15,
                life: (stormMode === "blueflame" ? 0.32 : 0.28),
                size: (stormMode === "blueflame" ? 3.6 : 3.8),
                glow: true
              });
            }
          } catch (e) {}
        }
        // Burn obstacles in tight cone (Zeppelin Ace style — catch fire, fall)
        if (typeof obstacles !== "undefined") {
          for (var oi = obstacles.length - 1; oi >= 0; oi--) {
            var o = obstacles[oi];
            if (!o || o.onFire) continue;
            if (o.isRing || o.type === "gold_ring" || o.type === "ring") continue;
            var ox = o.x + o.w * 0.5;
            var oy = o.y + o.h * 0.5;
            var dx = ox - noseX;
            var dy = oy - noseY;
            if (dx < 8) continue;
            var dist = Math.hypot(dx, dy);
            if (dist > flameReach) continue;
            var ang = Math.atan2(dy, dx);
            if (Math.abs(ang) > coneHalf) continue;
            o.onFire = true;
            o.vy = 40;
            try {
              if (typeof spawnHitParticles === "function") spawnHitParticles(ox, oy);
            } catch (e) {}
            try {
              if (window.PowerFX) {
                window.PowerFX.burst(ox, oy, {
                  count: 10,
                  colors: ["#ff6b3d", "#ffd24a", "#ff1a00"],
                  speed: 70,
                  gravity: -30,
                  life: 0.45,
                  glow: true
                });
              }
            } catch (e) {}
            try {
              if (typeof score === "number") score += 25;
              if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
            } catch (e) {}
          }
        }
        // Damage boss in cone (training + campaign)
        if (typeof bossActive !== "undefined" && bossActive && boss) {
          var bx = boss.x + boss.w * 0.5;
          var by = boss.y + boss.h * 0.5;
          var dxb = bx - noseX;
          var dyb = by - noseY;
          var distB = Math.hypot(dxb, dyb);
          if (dxb > 8 && distB < flameReach * 1.15) {
            var angB = Math.atan2(dyb, dxb);
            if (Math.abs(angB) <= coneHalf + 0.15) {
              if (!window.__airborneFlameBossTick) window.__airborneFlameBossTick = 0;
              window.__airborneFlameBossTick -= dt;
              if (window.__airborneFlameBossTick <= 0) {
                window.__airborneFlameBossTick = 0.25;
                damageBossFromPower(Math.max(2, Math.ceil((boss.maxHealth || 30) * 0.06)), bx, by);
              }
            }
          }
        }
      }
      return;
    }


    // ---- Ironworks fireballs ----
    if (stormMode === "fireball" || stormMode === "bluefireball" || stormMode === "greenfireball") {
      var nowFb = performance.now();
      var untilFb = window.__airborneFireballUntil || 0;
      if (!untilFb || nowFb >= untilFb) {
        stormActive = false;
        stormMode = "storm";
        stormTimer = 0;
        window.__airborneActivePowerVisual = null;
        window.__airborneActivePowerUntil = 0;
        window.__airborneFireballUntil = 0;
        window.__airborneFireballs = [];
        return;
      }
      window.__airborneActivePowerVisual = "fireball";
      window.__airborneActivePowerUntil = untilFb;
      if (!window.__airborneFireballs) window.__airborneFireballs = [];
      // Spawn fireballs periodically from hull
      if (!window.__airborneFireballSpawnT) window.__airborneFireballSpawnT = 0;
      window.__airborneFireballSpawnT -= dt;
      if (window.__airborneFireballSpawnT <= 0 && typeof player !== "undefined" && player) {
        window.__airborneFireballSpawnT = (stormMode === "greenfireball") ? 0.14 : (stormMode === "bluefireball" ? 0.35 : 0.28);
        var ang = -0.35 + Math.random() * 0.7;
        var sp = 160 + Math.random() * 80;
        var fbColors = ["#ffd24a", "#ff8a1a", "#ff3b00"];
        var smokeCol = "rgba(60,55,50,1)";
        if (stormMode === "bluefireball") {
          fbColors = ["#e0f2fe", "#7dd3fc", "#38bdf8", "#0284c7"];
          smokeCol = "rgba(40,60,90,1)";
        } else if (stormMode === "greenfireball") {
          fbColors = ["#d1fae5", "#6ee7b7", "#10b981", "#047857"];
          smokeCol = "rgba(40,70,50,1)";
          // Spiral release
          if (window.__airborneGreenSpiralAng == null) window.__airborneGreenSpiralAng = 0;
          window.__airborneGreenSpiralAng += 0.65;
          ang = window.__airborneGreenSpiralAng;
          sp = 130 + (window.__airborneGreenSpiralAng % 3) * 25;
        }
        var spawnX = player.x + (player.w || 40) * 0.25;
        var spawnY = player.y + (Math.random() - 0.5) * (player.h || 30) * 0.4;
        if (stormMode === "greenfireball") {
          spawnX = player.x + Math.cos(ang) * 12;
          spawnY = player.y + Math.sin(ang) * 10;
        }
        window.__airborneFireballs.push({
          x: spawnX,
          y: spawnY,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp * (stormMode === "greenfireball" ? 0.45 : 0.6) - (stormMode === "greenfireball" ? 35 : 20),
          life: stormMode === "greenfireball" ? 1.9 : 1.6,
          age: 0,
          r: 10 + Math.random() * 4,
          trails: [],
          colors: fbColors,
          smokeCol: smokeCol,
          kind: stormMode
        });
      }
      // Update fireballs
      var fbs = window.__airborneFireballs;
      for (var fi = fbs.length - 1; fi >= 0; fi--) {
        var fb = fbs[fi];
        fb.age += dt;
        if (fb.accel) {
          var spd = Math.hypot(fb.vx, fb.vy) || 1;
          var ns = spd + fb.accel * dt;
          fb.vx = (fb.vx / spd) * ns;
          fb.vy = (fb.vy / spd) * ns;
        }
        fb.x += fb.vx * dt;
        fb.y += fb.vy * dt;
        fb.vy += 90 * dt; // mild gravity
        // Smoke trail
        if (Math.random() < 0.7) {
          fb.trails.push({
            x: fb.x, y: fb.y,
            vx: -20 + Math.random() * 10,
            vy: -30 - Math.random() * 20,
            life: 0.5 + Math.random() * 0.3,
            age: 0,
            r: 4 + Math.random() * 5
          });
        }
        for (var ti = fb.trails.length - 1; ti >= 0; ti--) {
          var tr = fb.trails[ti];
          tr.age += dt;
          tr.x += tr.vx * dt;
          tr.y += tr.vy * dt;
          tr.r += 8 * dt;
          if (tr.age >= tr.life) fb.trails.splice(ti, 1);
        }
        // Hit obstacles → catch fire
        if (typeof obstacles !== "undefined") {
          for (var oi = obstacles.length - 1; oi >= 0; oi--) {
            var o = obstacles[oi];
            if (!o || o.onFire) continue;
            if (o.isRing || o.type === "gold_ring" || o.type === "ring") continue;
            var ox = o.x + o.w * 0.5;
            var oy = o.y + o.h * 0.5;
            if (Math.hypot(fb.x - ox, fb.y - oy) < fb.r + Math.max(o.w, o.h) * 0.35) {
              o.onFire = true;
              o.vy = 40;
              if (fb.kind === "greenfireball") {
                o.greenFire = true;
                o.vy = 55 + Math.random() * 30;
              }
              if (fb.kind === "bluefireball") {
                o.blueFire = true;
              }
              try { if (typeof spawnHitParticles === "function") spawnHitParticles(ox, oy); } catch (e) {}
              try {
                var cols = fb.colors || ["#ff6b3d", "#ffd24a", "#ff1a00"];
                if (fb.kind === "greenfireball") cols = ["#d1fae5", "#34d399", "#059669", "#fff"];
                if (window.PowerFX) window.PowerFX.burst(ox, oy, {
                  count: 12, colors: cols, speed: 80, gravity: -30, life: 0.5, glow: true
                });
              } catch (e) {}
              try {
                if (typeof score === "number") score += 25;
                if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
              } catch (e) {}
              fb.age = fb.life; // consume fireball
              break;
            }
          }
        }
        // Damage training / campaign boss
        if (typeof bossActive !== "undefined" && bossActive && boss && fb.age < fb.life) {
          var bx = boss.x + boss.w * 0.5;
          var by = boss.y + boss.h * 0.5;
          if (Math.hypot(fb.x - bx, fb.y - by) < fb.r + Math.max(boss.w, boss.h) * 0.35) {
            damageBossFromPower(Math.max(3, Math.ceil((boss.maxHealth || 30) * 0.1)), bx, by);
            fb.age = fb.life;
          }
        }
        if (fb.age >= fb.life || fb.x > (typeof W !== "undefined" ? W : 400) + 40 || fb.y > (typeof H !== "undefined" ? H : 600) + 40) {
          fbs.splice(fi, 1);
        }
      }
      return;
    }


    // ---- Sky Rocket heat-seekers ----
    if (stormMode === "heatseek" || stormMode === "warshark" || stormMode === "barrelbomb" || stormMode === "jollybomb") {
      var nowHs = performance.now();
      var untilHs = window.__airborneHeatseekUntil || 0;
      if (!untilHs || nowHs >= untilHs) {
        // Stop spawning; let in-flight missiles finish (trails fade naturally)
        window.__airborneHeatseekUntil = 0;
        window.__airborneActivePowerVisual = null;
        window.__airborneActivePowerUntil = 0;
        var stillFlying = (window.__airborneHeatseekers && window.__airborneHeatseekers.length) ||
          (window.__airborneWarBullets && window.__airborneWarBullets.length);
        if (!stillFlying) {
          stormActive = false;
          stormMode = "storm";
          stormTimer = 0;
          return;
        }
        // Keep updating existing rockets until gone
      }
      window.__airborneActivePowerVisual = stormMode;
      window.__airborneActivePowerUntil = untilHs;
      if (!window.__airborneHeatseekers) window.__airborneHeatseekers = [];
      if (!window.__airborneHeatseekSpawnT) window.__airborneHeatseekSpawnT = 0;
      window.__airborneHeatseekSpawnT -= dt;
      var canSpawnHs = window.__airborneHeatseekUntil && performance.now() < window.__airborneHeatseekUntil;
      if (canSpawnHs && window.__airborneHeatseekSpawnT <= 0 && typeof player !== "undefined" && player) {
        window.__airborneHeatseekSpawnT = (stormMode === "warshark") ? 0.39 : (stormMode === "barrelbomb") ? 99 : 0.45;
        var ang = -0.25 + Math.random() * 0.5;
        var sp = 200 + Math.random() * 60;
        window.__airborneHeatseekers.push({
          x: player.x + (player.w || 40) * 0.3,
          y: player.y + (Math.random() - 0.5) * (player.h || 30) * 0.35,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp * 0.5,
          life: stormMode === "barrelbomb" ? 3.2 : 2.2,
          age: 0,
          rot: ang,
          trails: [],
          target: null,
          kind: stormMode
        });
        // War Shark: no continuous bullets — barrel bombs only

      }
      var rockets = window.__airborneHeatseekers;
      for (var ri = rockets.length - 1; ri >= 0; ri--) {
        var rk = rockets[ri];
        rk.age += dt;
        // Acquire nearest obstacle as heat target (not for arcing jolly bombs)
        if (rk.kind !== "jollybomb" && typeof obstacles !== "undefined" && obstacles.length) {
          var best = null, bestD = 1e9;
          for (var oi = 0; oi < obstacles.length; oi++) {
            var o = obstacles[oi];
            if (!o || o.onFire) continue;
            var ox = o.x + o.w * 0.5;
            var oy = o.y + o.h * 0.5;
            if (ox < rk.x - 10) continue; // prefer ahead
            var d = Math.hypot(ox - rk.x, oy - rk.y);
            if (d < bestD) { bestD = d; best = o; }
          }
          rk.target = best;
        }
        if (rk.target) {
          var tx = rk.target.x + rk.target.w * 0.5;
          var ty = rk.target.y + rk.target.h * 0.5;
          var desired = Math.atan2(ty - rk.y, tx - rk.x);
          var da = desired - rk.rot;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          rk.rot += Math.max(-3.5 * dt, Math.min(3.5 * dt, da));
          var spd = Math.hypot(rk.vx, rk.vy) || 200;
          spd = Math.min(280, spd + 40 * dt);
          rk.vx = Math.cos(rk.rot) * spd;
          rk.vy = Math.sin(rk.rot) * spd;
        }
        // Arch + spin for Jolly bombs
        if (rk.kind === "jollybomb") {
          rk.vy += (rk.gravity || 220) * dt;
          rk.spin = rk.spin || 10;
          rk.rot = (rk.rot || 0) + rk.spin * dt;
        }
        rk.x += rk.vx * dt;
        rk.y += rk.vy * dt;
        // Exhaust trail at rear (lighter for barrel bombs)
        if (Math.random() < ((rk.kind === "barrelbomb" || rk.kind === "jollybomb") ? 0.35 : 0.85)) {
          var bx = -Math.cos(rk.rot);
          var by = -Math.sin(rk.rot);
          rk.trails.push({
            x: rk.x + bx * 14, y: rk.y + by * 14,
            vx: bx * 40 + (Math.random() - 0.5) * 20,
            vy: by * 40 + (Math.random() - 0.5) * 20,
            life: 0.35 + Math.random() * 0.25,
            age: 0,
            r: 3 + Math.random() * 4,
            kind: (rk.kind === "barrelbomb" || rk.kind === "jollybomb") ? "smoke" : (Math.random() < 0.55 ? "flame" : "smoke")
          });
        }
        for (var ti = rk.trails.length - 1; ti >= 0; ti--) {
          var tr = rk.trails[ti];
          tr.age += dt;
          tr.x += tr.vx * dt;
          tr.y += tr.vy * dt;
          tr.r += (tr.kind === "smoke" ? 10 : 4) * dt;
          if (tr.age >= tr.life) rk.trails.splice(ti, 1);
        }
        // Mid-air fuse for War Shark barrel bombs (~0.55s then AOE)
        var fuseBoom = false;
        if ((rk.kind === "barrelbomb" || rk.kind === "jollybomb") && rk.age >= (rk.kind === "jollybomb" ? 0.85 : 1.05) && !rk.fused) {
          rk.fused = true;
          fuseBoom = true;
        }
        // Contact explode (obstacles only — never rings)
        var hit = false;
        function isRingObs(o) {
          return !!(o && (o.isRing || o.type === "gold_ring" || o.type === "ring"));
        }
        function aoeDestroyAt(cx, cy, radius) {
          if (typeof obstacles === "undefined") return;
          for (var oi = obstacles.length - 1; oi >= 0; oi--) {
            var o = obstacles[oi];
            if (!o || isRingObs(o)) continue;
            var ox = o.x + o.w * 0.5;
            var oy = o.y + o.h * 0.5;
            if (Math.hypot(cx - ox, cy - oy) < radius + Math.max(o.w, o.h) * 0.25) {
              try { if (typeof spawnHitParticles === "function") spawnHitParticles(ox, oy); } catch (e) {}
              // Feathers when birds are destroyed by bomb
              try {
                var isBird = o.isBird || o.type === "bird" || (o.key && /bird/i.test(String(o.key)));
                if (isBird && typeof spawnFeathers === "function") spawnFeathers(ox, oy);
              } catch (e) {}
              try {
                if (typeof score === "number") score += 30;
                if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
              } catch (e) {}
              obstacles.splice(oi, 1);
            }
          }
          if (typeof bossActive !== "undefined" && bossActive && boss) {
            var hbx = boss.x + boss.w * 0.5;
            var hby = boss.y + boss.h * 0.5;
            if (Math.hypot(cx - hbx, cy - hby) < radius + Math.max(boss.w, boss.h) * 0.3) {
              try { damageBossFromPower(Math.max(4, Math.ceil((boss.maxHealth || 30) * 0.12)), hbx, hby); } catch (e) {}
            }
          }
          try { spawnRealisticBombExplosion(cx, cy); } catch (e) {}
          try { if (typeof sfxExplosion === "function") sfxExplosion(0.55); } catch (e) {}
        }
        if (fuseBoom) {
          aoeDestroyAt(rk.x, rk.y, 95);
          hit = true;
        }
        if (typeof bossActive !== "undefined" && bossActive && boss) {
          var hbx = boss.x + boss.w * 0.5;
          var hby = boss.y + boss.h * 0.5;
          if (Math.hypot(rk.x - hbx, rk.y - hby) < 28 + Math.max(boss.w, boss.h) * 0.3) {
            hit = true;
            aoeDestroyAt(rk.x, rk.y, (rk.kind === "barrelbomb" || rk.kind === "jollybomb") ? 95 : 40);
          }
        }
        if (typeof obstacles !== "undefined") {
          for (var oi = obstacles.length - 1; oi >= 0; oi--) {
            var o = obstacles[oi];
            if (!o || isRingObs(o)) continue;
            var ox = o.x + o.w * 0.5;
            var oy = o.y + o.h * 0.5;
            if (Math.hypot(rk.x - ox, rk.y - oy) < 22 + Math.max(o.w, o.h) * 0.3) {
              hit = true;
              if (rk.kind === "barrelbomb" || rk.kind === "jollybomb") {
                aoeDestroyAt(rk.x, rk.y, 95);
              } else {
                try { if (typeof spawnHitParticles === "function") spawnHitParticles(ox, oy); } catch (e) {}
                try { if (typeof triggerBigExplosion === "function") triggerBigExplosion(ox, oy, 0.7); } catch (e) {}
                try {
                  if (window.PowerFX) window.PowerFX.burst(ox, oy, {
                    count: 22, colors: ["#ffd24a", "#ff6b3d", "#fff", "#ff1a00"],
                    speed: 160, gravity: 30, life: 0.55, glow: true, radial: true
                  });
                } catch (e) {}
                try {
                  if (typeof score === "number") score += 40;
                  if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
                } catch (e) {}
                obstacles.splice(oi, 1);
              }
              break;
            }
          }
        }
        if (hit || rk.age >= rk.life || rk.x > (typeof W !== "undefined" ? W : 400) + 60) {
          if (hit && window.PowerFX && rk.kind !== "barrelbomb" && rk.kind !== "jollybomb") {
            try { window.PowerFX.burst(rk.x, rk.y, { count: 14, colors: ["#ff8a1a", "#fff5c0"], speed: 100, glow: true }); } catch (e) {}
          }
          if (!window.__airborneOrphanTrails) window.__airborneOrphanTrails = [];
          if (rk.trails && rk.trails.length) {
            for (var oti = 0; oti < rk.trails.length; oti++) {
              window.__airborneOrphanTrails.push(rk.trails[oti]);
            }
          }
          rockets.splice(ri, 1);
        }
      }

      // War Shark top-gun bullets — MUST update or they freeze on screen
      if (!window.__airborneWarBullets) window.__airborneWarBullets = [];
      var wbs = window.__airborneWarBullets;
      for (var wi = wbs.length - 1; wi >= 0; wi--) {
        var wb = wbs[wi];
        wb.age = (wb.age || 0) + dt;
        wb.x += (wb.vx || 0) * dt;
        wb.y += (wb.vy || 0) * dt;
        var hitB = false;
        if (typeof obstacles !== "undefined") {
          for (var oi = obstacles.length - 1; oi >= 0; oi--) {
            var o = obstacles[oi];
            if (!o) continue;
            var ox = o.x + o.w * 0.5, oy = o.y + o.h * 0.5;
            if (Math.hypot(wb.x - ox, wb.y - oy) < 14 + Math.max(o.w, o.h) * 0.25) {
              hitB = true;
              try { if (typeof spawnHitParticles === "function") spawnHitParticles(ox, oy); } catch (e) {}
              try {
                if (typeof score === "number") {
                  score += 15;
                  if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
                }
              } catch (e) {}
              obstacles.splice(oi, 1);
              break;
            }
          }
        }
        if (typeof bossActive !== "undefined" && bossActive && boss) {
          var bx = boss.x + boss.w * 0.5, by = boss.y + boss.h * 0.5;
          if (Math.hypot(wb.x - bx, wb.y - by) < 20 + Math.max(boss.w, boss.h) * 0.25) {
            hitB = true;
            try { damageBossFromPower(Math.max(1, Math.ceil((boss.maxHealth || 30) * 0.04)), bx, by); } catch (e) {}
          }
        }
        if (hitB || wb.age >= (wb.life || 0.9) || wb.x > (typeof W !== "undefined" ? W : 400) + 40) {
          wbs.splice(wi, 1);
        }
      }

      // Stay in this mode until rockets AND bullets are gone
      var still = (window.__airborneHeatseekers && window.__airborneHeatseekers.length) ||
                  (window.__airborneWarBullets && window.__airborneWarBullets.length) ||
                  (window.__airborneOrphanTrails && window.__airborneOrphanTrails.length);
      if (!still && !(window.__airborneHeatseekUntil && performance.now() < window.__airborneHeatseekUntil)) {
        stormActive = false;
        stormMode = "storm";
        stormTimer = 0;
      }
      return;
    }

    // ---- Spinning power-icon swarm (blimps 5/7/8/9) ----
    if (stormMode === "swarm" || stormMode === "missile") {
      stormSwarm.forEach(function(p) {
        if (p.delay && p.age + dt < p.delay) { p.age += dt; return; }
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.style === "missile") {
          p.vy += 28 * dt;
          p.spin = Math.atan2(p.vy, p.vx);
        } else {
          p.vy += 120 * dt;
          p.spin += p.spinVel * dt;
        }
        // Unique trail particles per power
        if (!p.trails) p.trails = [];
        if (Math.random() < 0.55) {
          p.trails.push(makePowerTrailParticle(p));
        }
        if (p.trails) {
          p.trails.forEach(function(tr) {
            tr.age += dt;
            tr.x += tr.vx * dt;
            tr.y += tr.vy * dt;
            tr.r += tr.grow * dt;
          });
          p.trails = p.trails.filter(function(tr) { return tr.age < tr.life; });
        }
        // Destroy obstacles on contact
        if (!p.hit) {
          for (let i = obstacles.length - 1; i >= 0; i--) {
            const o = obstacles[i];
            if (o.isRing || o.type === "gold_ring" || o.type === "ring") continue;
            const ox = o.x + o.w * 0.5;
            const oy = o.y + o.h * 0.5;
            if (Math.hypot(p.x - ox, p.y - oy) < p.size * 0.55 + Math.max(o.w, o.h) * 0.35) {
              if (typeof spawnHitParticles === "function") spawnHitParticles(ox, oy);
              if (typeof triggerBigExplosion === "function") triggerBigExplosion(ox, oy, o.w, o.h);
              obstacles.splice(i, 1);
              p.hit = true;
              if (typeof score !== "undefined") {
                score += 1;
                if (typeof scoreVal !== "undefined") scoreVal.textContent = score;
              }
              break;
            }
          }
        }
      });
      stormSwarm = stormSwarm.filter(function(p) {
        return p.age < p.life && p.x > -80 && p.x < W + 80 && p.y > -80 && p.y < H + 80;
      });
      // After projectiles finish, clear remaining threats once
      if (stormSwarm.length === 0) {
        // final clear wave
        if (obstacles.length) {
          obstacles.forEach(function(o) {
            const ox = o.x + o.w * 0.5, oy = o.y + o.h * 0.5;
            if (typeof spawnHitParticles === "function") spawnHitParticles(ox, oy);
            if (typeof triggerBigExplosion === "function") triggerBigExplosion(ox, oy, o.w * 0.8, o.h * 0.8);
          });
          obstacles = [];
        }
        bombs = [];
        rockets = [];
        stormActive = false;
        stormSwarm = [];
        if (typeof sfxExplosion === "function") sfxExplosion(0.8);
        if (typeof triggerScreenShake === "function") triggerScreenShake(6, 280);
      }
      return;
    }

    if (!stormCloud) return;
    const frameDur = 1 / STORM_CLOUD_FPS;
    stormCloud.animTimer += dt;
    while (stormCloud.animTimer >= frameDur) {
      stormCloud.animTimer -= frameDur;
      stormCloud.animFrame = (stormCloud.animFrame + 1) % STORM_CLOUD_FRAME_COUNT;
    }
    stormCloud.glowPhase += dt * 3.5;
    stormCloud.ringPhase += dt * 4;
    stormCloud.spin = (stormCloud.spin || 0) + dt * (stormMode === "pirate" ? 2.8 : 0);
    stormCloud.t += dt;

    if (pirateBlastParticles.length) {
      pirateBlastParticles.forEach(pt => {
        pt.age += dt;
        if (pt.kind === "ring") {
          pt.r += pt.grow * dt;
        } else {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.vy += 220 * dt;
          pt.vx *= (1 - 0.8 * dt);
          if (pt.kind === "smoke") pt.r += 18 * dt;
        }
      });
      pirateBlastParticles = pirateBlastParticles.filter(pt => pt.age < pt.life);
    }

    if (pirateFireBolts.length) {
      pirateFireBolts.forEach(b => {
        b.age += dt;
        if (b.age < b.delay || b.hit) return;
        b.progress += b.speed * dt;
        if (Math.random() < 0.75) {
          const px = b.x + (b.tx - b.x) * Math.min(1, b.progress);
          const py = b.y + (b.ty - b.y) * Math.min(1, b.progress);
          pirateBlastParticles.push({
            x: px, y: py,
            vx: (Math.random() - 0.5) * 40,
            vy: (Math.random() - 0.5) * 40 - 20,
            life: 0.2 + Math.random() * 0.2,
            age: 0,
            r: 3 + Math.random() * 5,
            color: Math.random() < 0.5 ? "#ff6b2d" : "#ffd27a",
            kind: "ember"
          });
        }
        if (b.progress >= 1) {
          b.hit = true;
          b.progress = 1;
          if (b.targetId) {
            const o = b.targetId;
            const oi = obstacles.indexOf(o);
            if (oi >= 0) {
              const drawY = o.y + Math.sin(o.bobPhase) * o.bobAmount;
              triggerBigExplosion(o.x + o.w / 2, drawY + o.h / 2, o.w, o.h);
              spawnPirateBlast(o.x + o.w / 2, drawY + o.h / 2, 0.55);
              obstacles.splice(oi, 1);
              score += 2;
              if (typeof scoreVal !== "undefined") scoreVal.textContent = score;
              if (typeof bumpScorePop === "function") bumpScorePop();
            }
          }
          if (b.targetBomb && typeof bombs !== "undefined") {
            const bi = bombs.indexOf(b.targetBomb);
            if (bi >= 0) {
              triggerBigExplosion(b.tx, b.ty, 40, 40);
              spawnPirateBlast(b.tx, b.ty, 0.4);
              bombs.splice(bi, 1);
            }
          }
          if (b.targetBoss && bossActive && boss) {
            const dmg = Math.max(3, Math.ceil(boss.maxHealth * 0.3));
            boss.health -= dmg;
            bossHitFlashUntil = performance.now() + 200;
            bossShakeUntil = performance.now() + 300;
            triggerBigExplosion(boss.x + boss.w / 2, boss.y + boss.h / 2, boss.w * 0.6, boss.h * 0.6);
            spawnPirateBlast(boss.x + boss.w / 2, boss.y + boss.h / 2, 0.8);
            if (boss.health <= 0) defeatBoss();
          }
        }
      });
      pirateFireBolts = pirateFireBolts.filter(b => !(b.hit && b.age > b.delay + 0.4));
    }

    if (stormCloud.phase === "falling") {
      const dur = 0.55;
      const p = Math.min(1, stormCloud.t / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      stormCloud.y = stormCloud.startY + (stormCloud.targetY - stormCloud.startY) * eased;
      if (p >= 1) {
        stormCloud.phase = "impact";
        stormCloud.t = 0;
        stormImpact();
      }
    } else if (stormCloud.phase === "impact") {
      if (stormMode === "pirate") {
        spawnPirateFireTrail(stormCloud.x, stormCloud.y);
        const streamsDone = pirateFireBolts.length === 0 || pirateFireBolts.every(b => b.hit);
        if (stormCloud.t >= 0.9 || (streamsDone && stormCloud.t >= 0.5)) {
          stormCloud.phase = "fading";
          stormCloud.t = 0;
        }
      } else if (stormCloud.t >= 0.35) {
        stormCloud.phase = "fading";
        stormCloud.t = 0;
      }
    } else if (stormCloud.phase === "fading") {
      if (stormMode === "pirate") {
        spawnPirateFireTrail(stormCloud.x, stormCloud.y);
      }
      const fadeDur = stormMode === "pirate" ? 0.75 : 0.4;
      if (stormCloud.t >= fadeDur) {
        if (stormMode === "pirate" && obstacles.length) {
          obstacles.forEach(o => {
            const drawY = o.y + Math.sin(o.bobPhase) * o.bobAmount;
            triggerBigExplosion(o.x + o.w / 2, drawY + o.h / 2, o.w, o.h);
            score += 2;
          });
          obstacles = [];
          if (typeof scoreVal !== "undefined") scoreVal.textContent = score;
        }
        stormActive = false;
        stormCloud = null;
        stormLightning = null;
        stormChainBolts = [];
        pirateBlastParticles = [];
        pirateFireBolts = [];
        updateStormMeterDisplay();
        return;
      }
    }

    if (stormLightning) {
      stormLightning.age += dt;
      if (stormLightning.age >= stormLightning.life) {
        stormLightning = null;
      }
    }
    if (stormChainBolts.length) {
      stormChainBolts.forEach(b => (b.age += dt));
      stormChainBolts = stormChainBolts.filter(b => b.age < b.life);
    }
  }

  
  
  function drawWarSharkExtras() {
    if (typeof ctx === "undefined") return;
    // Headlamp locked to nose of War Shark — follows blimp rotation
    try {
      var sel = (typeof selectedBlimp !== "undefined") ? selectedBlimp : "";
      if (sel === "blimp11" && typeof player !== "undefined" && player) {
        var rot = (typeof player.rotation === "number") ? player.rotation : 0;
        var cosR = Math.cos(rot), sinR = Math.sin(rot);
        // Local offset: front of blimp
        var localX = (player.w || 40) * 0.42;
        var localY = (player.h || 30) * 0.31; // lower another ~2% on War Shark nose
        var hx = player.x + localX * cosR - localY * sinR;
        var hy = player.y + localX * sinR + localY * cosR;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        var pulse = 0.75 + 0.25 * Math.sin(performance.now() * 0.008);
        var g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 28);
        g.addColorStop(0, "rgba(255,250,200," + (0.85 * pulse) + ")");
        g.addColorStop(0.35, "rgba(255,220,120," + (0.35 * pulse) + ")");
        g.addColorStop(1, "rgba(255,200,80,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(hx, hy, 28, 0, Math.PI * 2);
        ctx.fill();
        // Beam in facing direction
        var beamLen = 90;
        var tipX = hx + cosR * beamLen;
        var tipY = hy + sinR * beamLen;
        var perpX = -sinR, perpY = cosR;
        var beam = ctx.createLinearGradient(hx, hy, tipX, tipY);
        beam.addColorStop(0, "rgba(255,245,200," + (0.28 * pulse) + ")");
        beam.addColorStop(1, "rgba(255,245,200,0)");
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(hx + perpX * 4, hy + perpY * 4);
        ctx.lineTo(tipX + perpX * 18, tipY + perpY * 18);
        ctx.lineTo(tipX - perpX * 18, tipY - perpY * 18);
        ctx.lineTo(hx - perpX * 4, hy - perpY * 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } catch (e) {}
// Bullets
    var wbs = window.__airborneWarBullets;
    if (!wbs || !wbs.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < wbs.length; i++) {
      var wb = wbs[i];
      var g2 = ctx.createRadialGradient(wb.x, wb.y, 0, wb.x, wb.y, 5);
      g2.addColorStop(0, "rgba(255,255,200,1)");
      g2.addColorStop(0.5, "rgba(255,200,80,0.8)");
      g2.addColorStop(1, "rgba(255,100,0,0)");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(wb.x, wb.y, 5, 0, Math.PI * 2);
      ctx.fill();
      // streak
      ctx.strokeStyle = "rgba(255,220,120,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wb.x - 10, wb.y);
      ctx.lineTo(wb.x, wb.y);
      ctx.stroke();
    }
    ctx.restore();
  }
  window.__airborneDrawWarSharkExtras = drawWarSharkExtras;


  // Realistic bomb blast: elongated exhaust-like flames (inner) + smoke (outer) — not balls
  window.__airborneBombBlasts = window.__airborneBombBlasts || [];
  function spawnRealisticBombExplosion(cx, cy) {
    if (!window.__airborneBombBlasts) window.__airborneBombBlasts = [];
    var list = window.__airborneBombBlasts;
    // Inner flame tongues (teardrop streaks)
    for (var i = 0; i < 28; i++) {
      var a = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.4;
      var sp = 80 + Math.random() * 160;
      list.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30 - Math.random() * 40,
        life: 0.35 + Math.random() * 0.35,
        age: 0,
        len: 18 + Math.random() * 28,
        w: 3 + Math.random() * 4,
        ang: a,
        kind: "flame",
        heat: 0.7 + Math.random() * 0.3
      });
    }
    // Outer smoke puffs (soft, expanding, rising)
    for (var s = 0; s < 20; s++) {
      var a2 = Math.random() * Math.PI * 2;
      var sp2 = 30 + Math.random() * 70;
      list.push({
        x: cx + Math.cos(a2) * 8,
        y: cy + Math.sin(a2) * 8,
        vx: Math.cos(a2) * sp2 * 0.5,
        vy: Math.sin(a2) * sp2 * 0.3 - 25 - Math.random() * 35,
        life: 0.7 + Math.random() * 0.7,
        age: 0,
        r: 10 + Math.random() * 16,
        kind: "smoke"
      });
    }
    // Embers
    for (var e = 0; e < 14; e++) {
      var a3 = Math.random() * Math.PI * 2;
      var sp3 = 60 + Math.random() * 120;
      list.push({
        x: cx, y: cy,
        vx: Math.cos(a3) * sp3,
        vy: Math.sin(a3) * sp3 - 40,
        life: 0.4 + Math.random() * 0.4,
        age: 0,
        r: 1.5 + Math.random() * 2.5,
        kind: "ember"
      });
    }
    // Debris
    for (var d = 0; d < 12; d++) {
      var a4 = Math.random() * Math.PI * 2;
      var sp4 = 70 + Math.random() * 110;
      list.push({
        x: cx, y: cy,
        vx: Math.cos(a4) * sp4,
        vy: Math.sin(a4) * sp4 - 20,
        life: 0.6 + Math.random() * 0.5,
        age: 0,
        r: 2 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 10,
        kind: "debris"
      });
    }
  }
  function updateBombBlasts(dt) {
    var list = window.__airborneBombBlasts;
    if (!list || !list.length) return;
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "flame") {
        p.vy += 20 * dt;
        p.vx *= (1 - 1.2 * dt);
        p.len *= (1 - 0.8 * dt);
      } else if (p.kind === "smoke") {
        p.vy -= 15 * dt;
        p.r += 18 * dt;
        p.vx *= (1 - 0.5 * dt);
      } else if (p.kind === "ember") {
        p.vy += 90 * dt;
      } else if (p.kind === "debris") {
        p.vy += 180 * dt;
        p.rot += (p.spin || 0) * dt;
      }
      if (p.age >= p.life) list.splice(i, 1);
    }
  }
  function drawBombBlasts() {
    var list = window.__airborneBombBlasts;
    if (!list || !list.length || typeof ctx === "undefined") return;
    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var t = Math.max(0, 1 - p.age / p.life);
      if (p.kind === "smoke") {
        ctx.globalAlpha = t * 0.45;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(40,36,32," + (t * 0.5) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "flame") {
        // Exhaust-style teardrop flame (not a ball)
        ctx.globalAlpha = t * 0.95;
        ctx.globalCompositeOperation = "lighter";
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang);
        var len = Math.max(4, p.len * t);
        var w = Math.max(1.5, p.w * t);
        var grd = ctx.createLinearGradient(-len * 0.2, 0, len, 0);
        grd.addColorStop(0, "rgba(255,250,220," + (t * p.heat) + ")");
        grd.addColorStop(0.35, "rgba(255,160,40," + (t * 0.85) + ")");
        grd.addColorStop(0.7, "rgba(255,60,10," + (t * 0.55) + ")");
        grd.addColorStop(1, "rgba(120,20,0,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(-len * 0.15, 0);
        ctx.quadraticCurveTo(len * 0.2, -w, len, 0);
        ctx.quadraticCurveTo(len * 0.2, w, -len * 0.15, 0);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === "ember") {
        ctx.globalAlpha = t;
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255,140,40," + t + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * t, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "debris") {
        ctx.globalAlpha = t * 0.9;
        ctx.globalCompositeOperation = "source-over";
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = "rgba(139,90,43," + t + ")";
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  window.__airborneUpdateBombBlasts = updateBombBlasts;
  window.__airborneDrawBombBlasts = drawBombBlasts;
  window.__airborneSpawnBombExplosion = spawnRealisticBombExplosion;


  
  
  function drawSunBurst() {
    var list = window.__airborneSunBurst;
    if (!list || !list.length || typeof ctx === "undefined") return;
    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var t = Math.max(0, 1 - s.age / s.life);
      var r = 20 + (1 - t) * 120;
      ctx.globalCompositeOperation = "lighter";
      var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      g.addColorStop(0, "rgba(255,250,200," + (t * 0.95) + ")");
      g.addColorStop(0.35, "rgba(255,220,100," + (t * 0.55) + ")");
      g.addColorStop(0.7, "rgba(255,180,40," + (t * 0.25) + ")");
      g.addColorStop(1, "rgba(255,160,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Rays
      for (var ri = 0; ri < 12; ri++) {
        var a = (ri / 12) * Math.PI * 2 + s.age * 2;
        ctx.strokeStyle = "rgba(255,240,180," + (t * 0.4) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a) * 8, s.y + Math.sin(a) * 8);
        ctx.lineTo(s.x + Math.cos(a) * r * 0.95, s.y + Math.sin(a) * r * 0.95);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawSteamParts() {
    var list = window.__airborneSteamParts;
    if (!list || !list.length || typeof ctx === "undefined") return;
    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var t = Math.max(0, 1 - p.age / p.life);
      ctx.globalAlpha = t * 0.5;
      ctx.fillStyle = "rgba(230,240,250," + (t * 0.55) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  
  
  
  function drawLatticeTorps() {
    var list = window.__airborneLatticeTorps;
    if (!list || !list.length || typeof ctx === "undefined") return;
    if (!window.__airborneLatticeImg) {
      window.__airborneLatticeImg = new Image();
      window.__airborneLatticeImg.crossOrigin = "anonymous";
      window.__airborneLatticeImg.src = "iron_lattice_torpedo.png?v=ruff216";
    }
    var img = window.__airborneLatticeImg;
    list.forEach(function(lt) {
      // trails
      (lt.trail || []).forEach(function(p) {
        var t = Math.max(0, 1 - p.age / p.life);
        ctx.save();
        ctx.globalAlpha = t * 0.65;
        if (p.kind === "spark") {
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = "rgba(255,180,60," + t + ")";
        } else {
          ctx.fillStyle = "rgba(80,70,60," + (t * 0.55) + ")";
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.r * t), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.save();
      ctx.translate(lt.x, lt.y);
      ctx.rotate(lt.rot || 0);
      var dw = lt.w || 40;
      var dh = lt.h || 28;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -dw * 0.5, -dh * 0.5, dw, dh);
      } else {
        // Visible brass fallback so player always sees projectiles
        ctx.fillStyle = "#b45309";
        ctx.beginPath();
        ctx.ellipse(0, 0, dw * 0.45, dh * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(dw * 0.28, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255,200,100,0.4)";
      ctx.beginPath();
      ctx.arc(dw * 0.35, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }


  function drawIvoryFireballs() {
    var list = window.__airborneIvoryFireballs;
    if (!list || !list.length || typeof ctx === "undefined") return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    list.forEach(function(fb) {
      var g = ctx.createRadialGradient(fb.x, fb.y, 0, fb.x, fb.y, fb.r * 2);
      g.addColorStop(0, "rgba(255,250,200,0.95)");
      g.addColorStop(0.4, "rgba(255,160,40,0.8)");
      g.addColorStop(1, "rgba(255,60,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fb.x, fb.y, fb.r * 2, 0, Math.PI * 2); ctx.fill();
      // trail
      ctx.strokeStyle = "rgba(255,120,30,0.5)";
      ctx.lineWidth = fb.r * 0.5;
      ctx.beginPath(); ctx.moveTo(fb.x, fb.y - 25); ctx.lineTo(fb.x, fb.y); ctx.stroke();
    });
    ctx.restore();
  }
  function drawIvoryBolts() {
    var list = window.__airborneIvoryBolts;
    if (!list || !list.length || typeof ctx === "undefined") return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    list.forEach(function(bolt) {
      var t = Math.max(0, 1 - bolt.age / bolt.life);
      // Blue flame glow around bolt
      ctx.strokeStyle = "rgba(100,180,255," + (t * 0.35) + ")";
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(bolt.x0, bolt.y0); ctx.lineTo(bolt.x1, bolt.y1); ctx.stroke();
      ctx.strokeStyle = "rgba(200,230,255," + (t * 0.95) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bolt.x0, bolt.y0); ctx.lineTo(bolt.x1, bolt.y1); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255," + (t * 0.8) + ")";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bolt.x0, bolt.y0); ctx.lineTo(bolt.x1, bolt.y1); ctx.stroke();
      (bolt.branches || []).forEach(function(br) {
        ctx.strokeStyle = "rgba(150,200,255," + (t * 0.7) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(br.x0, br.y0); ctx.lineTo(br.x1, br.y1); ctx.stroke();
      });
    });
    ctx.restore();
  }
  function drawSpyShield() {
    var sh = window.__airborneSpyShield;
    if (!sh || typeof ctx === "undefined") return;
    ctx.save();
    var t = Math.min(1, sh.age / sh.life);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(180,140,255," + (0.55 + 0.3 * Math.sin(sh.age * 8)) + ")";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(sh.x, sh.y, Math.max(8, sh.r), 0, Math.PI * 2); ctx.stroke();
    var g = ctx.createRadialGradient(sh.x, sh.y, sh.r * 0.4, sh.x, sh.y, sh.r);
    g.addColorStop(0, "rgba(160,100,255,0.08)");
    g.addColorStop(0.7, "rgba(120,80,220,0.18)");
    g.addColorStop(1, "rgba(80,40,180,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawVortexField() {
    var v = window.__airborneVortex;
    if (!v || typeof ctx === "undefined") return;
    ctx.save();
    var t = v.age;
    ctx.translate(v.x, v.y);
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < 5; i++) {
      ctx.rotate(t * 2.5 + i);
      ctx.strokeStyle = "rgba(160,100,255," + (0.35 - i * 0.05) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, v.r * (0.4 + i * 0.15), 0, Math.PI * 1.4);
      ctx.stroke();
    }
    ctx.restore();
  }
  
  // drawMeteorMarks defined below
function drawMeteorMarks() {
    if (typeof ctx === "undefined") return;
    var list = window.__airborneMeteors;
    // Sky darken
    if (window.__airborneMeteorSkyDark) {
      var sd = window.__airborneMeteorSkyDark;
      var a = sd.alpha || 0;
      if (a > 0.01) {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = "rgb(8,4,18)";
        ctx.fillRect(0, 0, (typeof W !== "undefined" ? W : 800), (typeof H !== "undefined" ? H : 600));
        ctx.restore();
      }
    }
    // Flash
    if (window.__airborneMeteorFlash) {
      var fl = window.__airborneMeteorFlash;
      fl.age = (fl.age || 0) + 0.016;
      var ft = Math.max(0, 1 - fl.age / (fl.life || 0.15));
      if (ft > 0) {
        ctx.save();
        ctx.globalAlpha = ft * (fl.big ? 0.55 : 0.3);
        ctx.fillStyle = "#fff8e7";
        ctx.fillRect(0, 0, (typeof W !== "undefined" ? W : 800), (typeof H !== "undefined" ? H : 600));
        ctx.restore();
      } else {
        window.__airborneMeteorFlash = null;
      }
    }
    if (!list || !list.length) return;

    // Ensure rock images
    if (!window.__airborneMeteorRocks) {
      window.__airborneMeteorRocks = [];
      for (var ri = 1; ri <= 6; ri++) {
        var im = new Image();
        im.src = "meteor_rock_" + ri + ".png?v=ruff218";
        window.__airborneMeteorRocks.push(im);
      }
    }

    for (var mi = 0; mi < list.length; mi++) {
      var mt = list[mi];
      if (!mt) continue;
      var ang = Math.atan2(mt.vy || 1, mt.vx || 0);
      var tail = mt.tailLen || 50;

      // Tail
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      var g = ctx.createLinearGradient(
        mt.x - Math.cos(ang) * tail, mt.y - Math.sin(ang) * tail,
        mt.x, mt.y
      );
      g.addColorStop(0, "rgba(255,40,0,0)");
      g.addColorStop(0.5, "rgba(255,120,20,0.7)");
      g.addColorStop(1, "rgba(255,240,160,1)");
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(8, (mt.r || 14) * 1.1);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(mt.x - Math.cos(ang) * tail, mt.y - Math.sin(ang) * tail);
      ctx.lineTo(mt.x, mt.y);
      ctx.stroke();

      // Flame halo
      var bodyR = Math.max(16, (mt.r || 14) * 2.6);
      var fg = ctx.createRadialGradient(mt.x, mt.y, 2, mt.x, mt.y, bodyR);
      fg.addColorStop(0, "rgba(255,255,220,1)");
      fg.addColorStop(0.35, "rgba(255,160,40,0.85)");
      fg.addColorStop(1, "rgba(255,40,0,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(mt.x, mt.y, bodyR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Rock image (vertical along velocity)
      var rocks = window.__airborneMeteorRocks;
      var img = rocks[(mt.rockIdx || 0) % 6];
      var rw = Math.max(28, (mt.r || 14) * 2.6);
      var rh = Math.max(32, (mt.r || 14) * 3.0);
      ctx.save();
      ctx.translate(mt.x, mt.y);
      ctx.rotate(ang + Math.PI / 2);
      ctx.rotate(mt.spin || 0);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -rw * 0.5, -rh * 0.5, rw, rh);
      } else {
        // Always-visible rock fallback
        ctx.fillStyle = "#6b7280";
        ctx.beginPath();
        ctx.ellipse(0, 0, rw * 0.42, rh * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#9ca3af";
        ctx.beginPath();
        ctx.ellipse(-rw * 0.1, -rh * 0.1, rw * 0.2, rh * 0.15, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Core glow on top
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255,250,200,0.7)";
      ctx.beginPath();
      ctx.arc(mt.x, mt.y, Math.max(5, (mt.r || 14) * 0.4), 0, Math.PI * 2);
      ctx.fill();
      (mt.sparks || []).forEach(function(sp) {
        var t = 1 - sp.age / sp.life;
        if (t <= 0) return;
        ctx.globalAlpha = t;
        ctx.fillStyle = "rgba(255,200,60,1)";
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r * t, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }
  window.__airborneDrawMeteors = drawMeteorMarks;






  function drawShockFX() {
    var list = window.__airborneShockFX;
    if (!list || !list.length || typeof ctx === "undefined") return;
    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var t = Math.max(0, 1 - p.age / p.life);
      if (p.kind === "spark") {
        ctx.globalAlpha = t;
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(200,240,255," + t + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * t, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = t * 0.85;
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(180,230,255," + (t * 0.9) + ")";
        ctx.lineWidth = Math.max(1, (p.width || 4) * t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255," + (t * 0.5) + ")";
        ctx.lineWidth = Math.max(1, (p.width || 4) * 0.4 * t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.92, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  window.__airborneDrawShockFX = drawShockFX;

  function drawHeatseekers() {
    if (typeof ctx === "undefined") return;
    // Always draw lattice torpedoes + meteor shower when active
    try { drawLatticeTorps(); } catch (e) {}
    try { drawMeteorMarks(); } catch (e) {}
    try { drawIvoryFireballs(); } catch (e) {}
    try { drawSpyShield(); } catch (e) {}
    try { drawSteamParts(); } catch (e) {}
    try { drawShockFX(); } catch (e) {}
    try { drawSunBurst(); } catch (e) {}
    var rockets = window.__airborneHeatseekers;
    if (!rockets || !rockets.length) return;
    ctx.save();
    for (var i = 0; i < rockets.length; i++) {
      var rk = rockets[i];
      var img = (rk.kind === "barrelbomb") ? window.__airborneBarrelBombImg
        : (rk.kind === "warshark") ? window.__airborneWarSharkImg
        : (rk.kind === "jollybomb") ? null
        : window.__airborneRocketImg;
      // trails
      for (var ti = 0; ti < (rk.trails || []).length; ti++) {
        var tr = rk.trails[ti];
        var ta = 1 - tr.age / tr.life;
        ctx.globalAlpha = ta * (tr.kind === "flame" ? 0.85 : 0.4);
        ctx.globalCompositeOperation = tr.kind === "flame" ? "lighter" : "source-over";
        if (tr.kind === "flame") {
          var g = ctx.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, tr.r * 2);
          g.addColorStop(0, "rgba(255,250,200," + ta + ")");
          g.addColorStop(0.4, "rgba(255,140,20," + (ta * 0.7) + ")");
          g.addColorStop(1, "rgba(200,40,0,0)");
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = "rgba(50,45,40," + ta + ")";
        }
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, tr.r * (tr.kind === "smoke" ? 1.4 : 2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      // rocket body image
      ctx.save();
      ctx.translate(rk.x, rk.y);
      ctx.rotate(rk.rot);
      var rw = 48, rh = 22;
      if (img && img.complete && img.naturalWidth) {
        var aspect = img.naturalHeight / img.naturalWidth;
        rw = (rk.kind === "barrelbomb") ? 47 : (rk.kind === "warshark") ? 39 : 52; // warshark -25%
        rh = rw * aspect;
        ctx.drawImage(img, -rw * 0.35, -rh / 2, rw, rh);
      } else if (rk.kind === "jollybomb") {
        // Spinning skull bomb
        var br = 14;
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 2;
        ctx.stroke();
        // skull
        ctx.fillStyle = "#f0e6d0";
        ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath(); ctx.arc(-2.5, -3, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(2.5, -3, 1.5, 0, Math.PI * 2); ctx.fill();
        // fuse spark
        ctx.fillStyle = "#ff8a1a";
        ctx.beginPath(); ctx.arc(0, -br - 2, 2.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = "#3a6a9a";
        ctx.fillRect(-12, -6, 28, 12);
        ctx.fillStyle = "#c9a227";
        ctx.beginPath();
        ctx.moveTo(16, 0); ctx.lineTo(8, -6); ctx.lineTo(8, 6); ctx.fill();
      }
      // rear flame glow on sprite
      ctx.globalCompositeOperation = "lighter";
      var fg = ctx.createRadialGradient(-18, 0, 0, -18, 0, 16);
      fg.addColorStop(0, "rgba(255,240,180,0.9)");
      fg.addColorStop(0.5, "rgba(255,120,20,0.5)");
      fg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(-18, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  window.__airborneDrawHeatseekers = drawHeatseekers;

function drawFireballs() {
    var fbs = window.__airborneFireballs;
    if (!fbs || !fbs.length || typeof ctx === "undefined") return;
    ctx.save();
    for (var i = 0; i < fbs.length; i++) {
      var fb = fbs[i];
      // smoke trails
      for (var ti = 0; ti < (fb.trails || []).length; ti++) {
        var tr = fb.trails[ti];
        var ta = 1 - tr.age / tr.life;
        ctx.globalAlpha = ta * 0.45;
        ctx.fillStyle = fb.smokeCol || "rgba(60,55,50,1)";
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // fireball core
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "lighter";
      var g = ctx.createRadialGradient(fb.x, fb.y, 0, fb.x, fb.y, fb.r * 2.2);
      if (fb.kind === "bluefireball") {
        g.addColorStop(0, "rgba(220,245,255,0.95)");
        g.addColorStop(0.35, "rgba(56,189,248,0.85)");
        g.addColorStop(0.7, "rgba(14,100,200,0.4)");
        g.addColorStop(1, "rgba(0,0,0,0)");
      } else if (fb.kind === "greenfireball") {
        g.addColorStop(0, "rgba(220,255,230,0.95)");
        g.addColorStop(0.35, "rgba(52,211,153,0.85)");
        g.addColorStop(0.7, "rgba(4,120,87,0.4)");
        g.addColorStop(1, "rgba(0,0,0,0)");
      } else {
        g.addColorStop(0, "rgba(255,250,200,0.95)");
        g.addColorStop(0.35, "rgba(255,140,20,0.8)");
        g.addColorStop(0.7, "rgba(200,40,0,0.4)");
        g.addColorStop(1, "rgba(0,0,0,0)");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, fb.r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }
  window.__airborneDrawFireballs = drawFireballs;

  function drawStorm() {
    if (!stormActive) return;
    // Training: no screen-dim atmosphere
    const skipDim = !!(window.__airborneAirfield || window.__airborneRuffActive);

    // ---- Swarm of spinning power icons ----
    if (stormMode === "swarm" || stormMode === "missile") {
      ctx.save();
      // brief warm/electric atmosphere
      const dusk = ctx.createLinearGradient(0, 0, 0, H);
      if (!skipDim) {
        dusk.addColorStop(0, "rgba(40,22,10,0.28)");
        dusk.addColorStop(1, "rgba(20,10,5,0.05)");
        ctx.fillStyle = dusk;
        ctx.fillRect(0, 0, W, H);
      }

      stormSwarm.forEach(function(p) {
        if (p.delay && p.age < p.delay) return;
        // Trail particles behind projectile
        if (p.trails) {
          p.trails.forEach(function(tr) {
            const tt = 1 - tr.age / tr.life;
            ctx.save();
            ctx.globalAlpha = Math.max(0, tt * 0.75);
            if (tr.kind === "flame" || tr.kind === "ember") {
              const g = ctx.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, tr.r);
              g.addColorStop(0, "rgba(255,230,150," + (0.9 * tt) + ")");
              g.addColorStop(0.5, "rgba(" + tr.color + "," + (0.6 * tt) + ")");
              g.addColorStop(1, "rgba(40,10,0,0)");
              ctx.fillStyle = g;
            } else if (tr.kind === "spark") {
              ctx.strokeStyle = "rgba(" + tr.color + "," + tt + ")";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(tr.x, tr.y);
              ctx.lineTo(tr.x - tr.vx * 0.03, tr.y - tr.vy * 0.03);
              ctx.stroke();
              ctx.restore();
              return;
            } else if (tr.kind === "oil") {
              ctx.fillStyle = "rgba(" + tr.color + "," + (0.55 * tt) + ")";
            } else {
              const g = ctx.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, tr.r);
              g.addColorStop(0, "rgba(" + tr.color + "," + (0.55 * tt) + ")");
              g.addColorStop(1, "rgba(" + tr.color + ",0)");
              ctx.fillStyle = g;
            }
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, Math.max(0.5, tr.r), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
        }
        const img = images[p.iconKey];
        const lifeT = 1 - p.age / p.life;
        const fade = Math.min(1, lifeT * 1.4);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.globalAlpha = fade;
        if (p.style === "missile") {
          const trail = ctx.createLinearGradient(-p.size * 1.1, 0, p.size * 0.15, 0);
          trail.addColorStop(0, "rgba(100,200,255,0)");
          trail.addColorStop(0.55, "rgba(100,200,255,0.35)");
          trail.addColorStop(1, "rgba(255,230,140,0.55)");
          ctx.fillStyle = trail;
          ctx.beginPath();
          ctx.ellipse(-p.size * 0.5, 0, p.size * 0.6, p.size * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        const g = ctx.createRadialGradient(0, 0, p.size * 0.1, 0, 0, p.size * 0.75);
        g.addColorStop(0, p.style === "missile" ? "rgba(120,200,255,0.5)" : "rgba(255,200,100,0.45)");
        g.addColorStop(1, "rgba(255,140,40,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.75, 0, Math.PI * 2);
        ctx.fill();
        if (img && img.naturalWidth) {
          ctx.drawImage(img, -p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.fillStyle = "#f5c542";
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      ctx.restore();
      return;
    }

    if (!stormCloud) return;
    ctx.save();

    // atmosphere — cool for storm
    const dusk = ctx.createLinearGradient(0, 0, 0, H);
    dusk.addColorStop(0, "rgba(30,26,40,0.34)");
    dusk.addColorStop(0.6, "rgba(30,26,40,0.16)");
    dusk.addColorStop(1, "rgba(30,26,40,0.04)");
    ctx.fillStyle = dusk;
    ctx.fillRect(0, 0, W, H);

    const img = images[STORM_CLOUD_KEYS[stormCloud.animFrame]];
    const aspect = (img && img.naturalWidth) ? img.naturalHeight / img.naturalWidth : 0.72;
    const w = stormCloud.w;
    const h = w * aspect;

    let cloudAlpha = 1;
    let scale = 1;
    if (stormCloud.phase === "fading") {
      const fadeDur = stormMode === "pirate" ? 0.75 : 0.4;
      const p = Math.min(1, stormCloud.t / fadeDur);
      cloudAlpha = 1 - p;
      // Pirate bomb shrinks away; storm cloud pops outward
      scale = stormMode === "pirate" ? (1 - p * 0.85) : (1 + p * 0.35);
    } else if (stormCloud.phase === "falling") {
      scale = 0.85 + Math.min(1, stormCloud.t / 0.5) * 0.15;
    }

    ctx.save();
    ctx.translate(stormCloud.x, stormCloud.y);
    if (stormMode === "pirate") ctx.rotate(stormCloud.spin || 0);
    ctx.scale(scale, scale);
    ctx.globalAlpha = cloudAlpha;

    // radial glow behind the cloud — same treatment as the checkpoint coin
    const glow = ctx.createRadialGradient(0, 0, w * 0.15, 0, 0, w * 0.75);
    glow.addColorStop(0, "rgba(140,170,255,0.55)");
    glow.addColorStop(0.5, "rgba(90,110,200,0.28)");
    glow.addColorStop(1, "rgba(90,110,200,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // rotating dashed ring (matches the checkpoint pickup's signature look)
    ctx.save();
    ctx.rotate(stormCloud.ringPhase * 0.3);
    ctx.strokeStyle = "rgba(200,215,255,0.5)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // second, counter-rotating dotted ring
    ctx.save();
    ctx.rotate(-stormCloud.ringPhase * 0.5);
    ctx.strokeStyle = "rgba(160,180,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (img && img.naturalWidth) {
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // lightning bolt — a real jagged, glowing bolt instead of a flat screen flash
    if (stormLightning) {
      const t = stormLightning.age / stormLightning.life;
      const alpha = Math.max(0, 1 - t);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(255,250,220,0.95)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(255,250,220,0.9)";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      stormLightning.points.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();

      // soft ambient flash that fades quickly, tinted cool instead of flat yellow
      ctx.fillStyle = `rgba(220,225,255,${alpha * 0.12})`;
      ctx.fillRect(0, 0, W, H);
    }

    // chain-lightning bolts branching out to strike each obstacle
    if (stormChainBolts.length) {
      stormChainBolts.forEach(b => {
        const t = b.age / b.life;
        const alpha = Math.max(0, 1 - t);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "rgba(200,225,255,0.9)";
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(180,210,255,0.85)";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        b.points.forEach(([px, py], i) => {
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
      });
    }

    // Fire streams from bomb to targets
    if (pirateFireBolts.length) {
      pirateFireBolts.forEach(b => {
        if (b.age < b.delay) return;
        const pr = Math.min(1, b.progress);
        const x2 = b.x + (b.tx - b.x) * pr;
        const y2 = b.y + (b.ty - b.y) * pr;
        ctx.save();
        const grd = ctx.createLinearGradient(b.x, b.y, x2, y2);
        grd.addColorStop(0, "rgba(255,210,120,0.12)");
        grd.addColorStop(0.45, "rgba(255,100,30,0.8)");
        grd.addColorStop(1, "rgba(255,230,120,0.95)");
        ctx.strokeStyle = grd;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.shadowColor = "rgba(255,120,20,0.95)";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        const mx = (b.x + x2) / 2 + (b.ty - b.y) * 0.08;
        const my = (b.y + y2) / 2 - (b.tx - b.x) * 0.08;
        ctx.quadraticCurveTo(mx, my, x2, y2);
        ctx.stroke();
        ctx.fillStyle = "#fff3c0";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(x2, y2, 5 + Math.sin(b.age * 22) * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // Pirate bomb unique explosion debris
    if (pirateBlastParticles.length) {
      pirateBlastParticles.forEach(pt => {
        const t = 1 - pt.age / pt.life;
        const a = Math.max(0, t);
        ctx.save();
        ctx.globalAlpha = a * (pt.kind === "smoke" ? 0.45 : 0.9);
        if (pt.kind === "ring") {
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = 3 * t;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const grd = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r);
          grd.addColorStop(0, pt.color);
          grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    }

    ctx.restore();
  }

  stormMeterEl.addEventListener("click", activateStorm);
  stormMeterEl.addEventListener("touchstart", (e) => { e.preventDefault(); activateStorm(); }, { passive: false });

  let bullets = [];
  let bulletTimer = 0;
  const BULLET_INTERVAL = 0.28;

  let bombs = [];
  let bombTimer = 0;

  // Second boss fires straight-line rockets instead of thrown bombs.
  // Each rocket takes 2-3 bullet hits to destroy, or a straight collision hurts the player.
  let rockets = [];
  let rocketTimer = 0;
  const ROCKET_SPEED = 300;
  const ROCKET_FLIGHT_KEYS = Array.from({ length: 25 }, (_, i) => `rocket_flight_${String(i + 1).padStart(2, "0")}`);
  const BOSS4_ROCKET_FLIGHT_KEYS = Array.from({ length: 25 }, (_, i) => `boss4_rocket_flight_${String(i + 1).padStart(2, "0")}`);
  const ROCKET_ANIM_FPS = 20;

  // Bomb-throw animation: 0 = idle pose, 1-25 = mid-throw sequence
  let bossThrowFrame = 0;
  let bossThrowFrameTimer = 0;
  const BOSS_THROW_FPS = 20;
  let bossThrowBombSpawned = false;

  // ---------- Bonus rounds: "Balloon Pop Frenzy" (after boss 1), "Coin Rain" (after boss 2) ----------
  let bonusActive = false;
  let bonusType = null;          // 'balloon' | 'coin'
  let bonusPending = false;      // true while waiting out the "BOSS DEFEATED!" banner
  let bonusPendingAt = 0;
  let bonusPendingType = null;
  let bonusEndsAt = 0;
  const BONUS_DURATION_MS = 9000;
  let bonusItems = [];
  let bonusTotal = 0;
  let bonusCollected = 0;
  let bonusPoints = 0;
  const BONUS_POP_POINTS = 3;    // balloon round: points per pop
  const BONUS_COIN_POINTS = 4;   // coin round: points per coin
  const BONUS_PERFECT_BONUS = 20;


  // ---------- Level-end landing sequence (after boss 1 bonus round) ----------
  // Flow: wind-down city → landing pad approaches → player lands → victory FX → resume
  let levelEndActive = false;
  let levelEndPhase = null; // "windDown" | "approach" | "landing" | "victory" | "stats" | "fadeOut"
  let levelEndTimer = 0;
  let levelEndPad = null; // { x, y, w, h, surfaceY, docked }
  let levelEndParticles = [];
  let levelEndFireworks = [];
  let levelEndBannerUntil = 0;
  let levelEndSavedFlap = true;
  let levelEndFade = 0; // 0..1 black overlay

  function setHudFade(alpha) {
    const a = Math.max(0, Math.min(1, alpha));
    ["hudFrame", "stormMeter", "muteBtn", "collectDock"].forEach(function(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.opacity = String(a);
      el.style.pointerEvents = a < 0.15 ? "none" : "";
      el.style.transition = "opacity 0.12s linear";
    });
    const scoreFrame = document.querySelector("#gameScreen .scoreFrame");
    if (scoreFrame) scoreFrame.style.opacity = String(a);
    const flip = document.getElementById("flipClock");
    if (flip) flip.style.opacity = String(a);
    const health = document.getElementById("healthMeter");
    if (health) health.style.opacity = String(a);
  }
  function resetHudFade() { setHudFade(1); }
  let levelEndStats = null; // { score, timeStr, bonus, landingBonus, health }

  function startLevelEndLanding() {
    // Never hijack R.U.F.F. training with the campaign landing pad / score
    if (window.__airborneAirfield || window.__airborneTrainingFlight || window.__airborneTrainingBoss ||
        (typeof airfieldMode !== "undefined" && airfieldMode) ||
        (window.__airborneRuffActive && window.__airborneRuffStage && window.__airborneRuffStage !== "idle")) {
      return;
    }
    levelEndActive = true;
    levelEndPhase = "windDown";
    // Clear weather leftovers so level-3 rain/clouds don't show on the pad
    if (typeof stormCloudsDecorative !== "undefined") stormCloudsDecorative = [];
    if (typeof rainDrops !== "undefined") rainDrops = [];
    if (typeof healPickup !== "undefined") healPickup = null;
    if (typeof shieldPickup !== "undefined") shieldPickup = null;
    if (typeof powerup !== "undefined") powerup = null;
    window.__airborneWorldFrozen = false;
    levelEndTimer = 0;
    levelEndPad = null;
    levelEndParticles = [];
    levelEndFireworks = [];
    levelEndBannerUntil = 0;
    // Stop enemy spawns & clear remaining obstacles
    if (typeof obstacles !== "undefined") obstacles = [];
    if (typeof bombs !== "undefined") bombs = [];
    if (typeof rockets !== "undefined") rockets = [];
    spawnTimer = 9999;
    startWorldWindDown(2.2);
    showBanner("LEVEL " + bossesDefeatedCount + " CLEAR — APPROACH THE HANGAR!", 2800, "defeat");
    if (typeof sfxCityClear === "function") sfxCityClear();
  }

  function spawnLandingPad() {
    const img = images.landing_pad;
    const aspect = (img && img.naturalWidth && img.naturalHeight)
      ? img.naturalWidth / img.naturalHeight : 0.7;
    // Size so the building sits on the ground; keep most of the pad on-screen
    const h = Math.min(H * 0.70, W * 0.92 / aspect);
    const w = h * aspect;
    const groundY = groundLevelY();
    // Deck with the X is ~42% down from the top of the art (measured from the sprite)
    const deckFromTop = 0.525;
    const surfaceY = (groundY - h) + h * deckFromTop;
    // Horizontal center of the circular X pad within the sprite
    const deckCenterFrac = 0.42;
    levelEndPad = {
      x: W + 20,
      y: groundY - h,
      w: w,
      h: h,
      surfaceY: surfaceY,
      deckFromTop: deckFromTop,
      deckCenterFrac: deckCenterFrac,
      // Stop with the X well onto the screen so the player can reach it
      targetX: W * 0.28,
      docked: false,
      glowPhase: 0
    };
  }

  function spawnVictoryFirework(x, y) {
    const colors = ["#ffd700", "#ff6b35", "#7ec8ff", "#ff4d6d", "#b8f2e6", "#c9a66b"];
    for (let i = 0; i < 18; i++) {
      const ang = (Math.PI * 2 * i) / 18 + Math.random() * 0.3;
      const spd = 80 + Math.random() * 160;
      levelEndFireworks.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 40,
        life: 0.7 + Math.random() * 0.5,
        age: 0,
        color: colors[i % colors.length],
        r: 2 + Math.random() * 3
      });
    }
  }

  // Landing dust burst — puffs outward from under the blimp on touchdown
  function spawnLandingDust(cx, cy) {
    for (let i = 0; i < 28; i++) {
      const ang = -Math.PI * 0.15 + Math.random() * Math.PI * 1.3; // mostly outward/up
      const spd = 40 + Math.random() * 120;
      const side = (i % 2 === 0) ? -1 : 1;
      levelEndParticles.push({
        kind: "dust",
        x: cx + (Math.random() - 0.5) * 30,
        y: cy + Math.random() * 6,
        vx: side * (30 + Math.random() * 90) + Math.cos(ang) * spd * 0.3,
        vy: -20 - Math.random() * 70,
        life: 0.55 + Math.random() * 0.55,
        age: 0,
        r: 3 + Math.random() * 6,
        alpha: 0.45 + Math.random() * 0.35
      });
    }
    // a few bigger soft puffs
    for (let i = 0; i < 8; i++) {
      const side = (i % 2 === 0) ? -1 : 1;
      levelEndParticles.push({
        kind: "dust",
        x: cx + side * (10 + Math.random() * 40),
        y: cy,
        vx: side * (20 + Math.random() * 50),
        vy: -10 - Math.random() * 40,
        life: 0.8 + Math.random() * 0.5,
        age: 0,
        r: 8 + Math.random() * 10,
        alpha: 0.3 + Math.random() * 0.25
      });
    }
  }

  // Continuous steam vents around the pad deck
  function spawnPadSteam(pad, dt) {
    if (!pad || Math.random() > dt * 14) return; // ~14 puffs/sec
    const deckCx = pad.x + pad.w * (pad.deckCenterFrac || 0.42);
    const deckCy = pad.y + pad.h * (pad.deckFromTop || 0.525);
    // Spawn near the rim of the circular pad
    const ang = Math.random() * Math.PI * 2;
    const rad = pad.w * (0.12 + Math.random() * 0.16);
    levelEndParticles.push({
      kind: "steam",
      x: deckCx + Math.cos(ang) * rad,
      y: deckCy + 4 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 18,
      vy: -25 - Math.random() * 40,
      life: 1.1 + Math.random() * 0.9,
      age: 0,
      r: 4 + Math.random() * 7,
      alpha: 0.2 + Math.random() * 0.25
    });
  }

  function completeLevelLanding() {
    if (levelEndPhase === "victory" || levelEndPhase === "stats" || levelEndPhase === "fadeOut") return;
    levelEndPhase = "victory";
    levelEndTimer = 0;
    levelEndFade = 0;
    levelEndPad.docked = true;
    window.__airborneWorldFrozen = true;
    player.vy = 0;
    player.rotation = 0;
    // Snap solidly onto the deck — calm rest pose
    player.y = levelEndPad.surfaceY - player.h * 0.42;
    player.x = levelEndPad.x + levelEndPad.w * (levelEndPad.deckCenterFrac || 0.42);
    if (typeof obstacles !== "undefined") obstacles = [];
    if (typeof blimpPersonality !== "undefined" && blimpPersonality) {
      blimpPersonality.exhaustParticles = [];
      blimpPersonality.speedStreaks = [];
      blimpPersonality.flapKickY = 0;
      blimpPersonality.finLag = 0;
      blimpPersonality.squashX = 1;
      blimpPersonality.squashY = 1;
    }
    spawnLandingDust(
      levelEndPad.x + levelEndPad.w * (levelEndPad.deckCenterFrac || 0.42),
      levelEndPad.surfaceY + 2
    );
    triggerScreenShake(3, 280);

    const landingBonus = 50;
    score += landingBonus;
    if (typeof scoreVal !== "undefined") scoreVal.textContent = score;
    if (typeof bumpScorePop === "function") bumpScorePop();

    // Snapshot stats for the celebration panel
    const totalSec = Math.floor((typeof elapsedMs !== "undefined" ? elapsedMs : 0) / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    levelEndStats = {
      score: score,
      timeStr: mm + ":" + ss,
      landingBonus: landingBonus,
      bonusRound: (typeof bonusPoints !== "undefined" ? bonusPoints : 0),
      health: (typeof health !== "undefined" ? health : 3),
      levelNum: bossesDefeatedCount,
      bossName: (typeof lastBossTriggered === "number"
        ? ((bossConfig(lastBossTriggered) || {}).name || ("BOSS " + lastBossTriggered))
        : "BOSS")
    };

    triggerScreenShake(5, 500);
    triggerScreenFlash(0.35, 400);
    if (typeof sfxTouchdown === "function") sfxTouchdown();
    if (typeof sfxLevelCompleteFanfare === "function") sfxLevelCompleteFanfare();

    // Fireworks around the pad
    const cx = levelEndPad.x + levelEndPad.w * (levelEndPad.deckCenterFrac || 0.42);
    const cy = levelEndPad.surfaceY - 30;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (!levelEndActive) return;
        spawnVictoryFirework(cx + (Math.random() - 0.5) * 140, cy - Math.random() * 90);
        if (typeof sfxFireworkPop === "function") sfxFireworkPop();
      }, i * 250);
    }
  }

  function finishLevelEndAndResume() {
    // Show world map between levels, then resume
    if (window.__airborneShowWorldMap) {
      window.__airborneShowWorldMap({
        mode: "between",
        onContinue: function () {
          resumeAfterMapSelect();
        }
      });
      return;
    }
    resumeAfterMapSelect();
  }

  function resumeAfterMapSelect() {
    window.__airborneWorldFrozen = false;
    resetHudFade();
    levelEndActive = false;
    levelEndPhase = null;
    levelEndPad = null;
    levelEndParticles = [];
    levelEndFireworks = [];
    levelEndFade = 0;
    levelEndStats = null;
    stopWorldWindDown();

    if (typeof player !== "undefined" && player) {
      player.x = W * 0.28;
      player.y = H * 0.4;
      player.vy = 0;
      player.rotation = 0;
    }

    initBuildings();
    spawnTimer = 0;

    const next = nextBossConfig();
    if (next) {
      spawnCheckpointPickup(next.num);
    } else {
      checkpointReached = lastBossTriggered;
      checkpointScore = score;
      checkpointGameplayScore = gameplayScore;
      checkpointBossesDefeated = bossesDefeatedCount;
    }

    const nextLevelNum = bossesDefeatedCount + 1;
    if (next) {
      showBanner("LEVEL " + nextLevelNum + " — KEEP FLYING!", 2400, "level");
    } else {
      showBanner("ALL CLEAR — KEEP FLYING!", 2400, "level");
    }
    if (typeof sfxLevel2Start === "function") sfxLevel2Start();

    // Ensure game screen is visible after map
    const gs = document.getElementById("gameScreen");
    if (gs) gs.style.display = "block";
    const ms = document.getElementById("worldMapScreen");
    if (ms) ms.style.display = "none";
  }

  function updateLevelEnd(dt) {
    if (!levelEndActive) return;
    levelEndTimer += dt;

    // Ambient steam while pad is on-screen
    if (levelEndPad && (levelEndPhase === "approach" || levelEndPhase === "landing" || levelEndPhase === "victory" || levelEndPhase === "stats")) {
      spawnPadSteam(levelEndPad, dt);
    }

    // Dust + steam particles
    if (levelEndParticles.length) {
      levelEndParticles.forEach(p => {
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === "steam") {
          p.vy -= 12 * dt; // keep rising
          p.vx *= (1 - 0.6 * dt);
          p.r += 10 * dt; // expand
        } else {
          // dust
          p.vy += 180 * dt; // gravity
          p.vx *= (1 - 1.2 * dt);
          p.r += 4 * dt;
        }
      });
      levelEndParticles = levelEndParticles.filter(p => p.age < p.life);
    }

    // Fireworks always update during victory
    if (levelEndFireworks.length) {
      levelEndFireworks.forEach(p => {
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 220 * dt;
      });
      levelEndFireworks = levelEndFireworks.filter(p => p.age < p.life);
    }

    if (levelEndPhase === "windDown") {
      // Wait until city has mostly cleared, or timeout
      // City freezes immediately; short beat so "CITY CLEAR" can be read, then pad approaches
      if ((groundLayersCleared() && levelEndTimer > 1.1) || levelEndTimer > 3.5) {
        levelEndPhase = "approach";
        levelEndTimer = 0;
        spawnLandingPad();
        showBanner("LAND ON THE PAD!", 2500, "defeat");
        if (typeof sfxPadApproach === "function") sfxPadApproach();
      }
      return;
    }

    if (levelEndPhase === "approach" || levelEndPhase === "landing") {
      if (!levelEndPad) return;
      levelEndPad.glowPhase += dt * 3;

      // Keep surfaceY in sync if layout changes
      levelEndPad.surfaceY = levelEndPad.y + levelEndPad.h * levelEndPad.deckFromTop;
      const deckCx = levelEndPad.x + levelEndPad.w * levelEndPad.deckCenterFrac;

      // Scroll pad left until it reaches target dock position
      if (levelEndPad.x > levelEndPad.targetX) {
        levelEndPad.x -= 160 * dt;
        if (levelEndPad.x <= levelEndPad.targetX) {
          levelEndPad.x = levelEndPad.targetX;
          if (levelEndPhase === "approach") {
            levelEndPhase = "landing";
            levelEndTimer = 0;
            showBanner("TAP TO SET DOWN ON THE X!", 2500, "defeat");
            if (typeof sfxLandPrompt === "function") sfxLandPrompt();
          }
        }
      }

      // Move the blimp forward toward the landing X (unlock from fixed x)
      // Player still controls altitude with flaps; we ease them horizontally onto the pad.
      const targetPlayerX = deckCx - player.w * 0.1;
      if (player.x < targetPlayerX - 2) {
        // accelerate forward; faster once pad has mostly arrived
        const speed = levelEndPhase === "landing" ? 95 : 55;
        player.x = Math.min(targetPlayerX, player.x + speed * dt);
      }

      // Landing zone around the X on the deck
      const padLeft = deckCx - levelEndPad.w * 0.22;
      const padRight = deckCx + levelEndPad.w * 0.22;
      const overPad = player.x > padLeft && player.x < padRight;
      // Player feet / belly near the deck surface
      const playerBottom = player.y + player.h * 0.45;
      const nearSurface = playerBottom > levelEndPad.surfaceY - player.h * 0.35
                       && playerBottom < levelEndPad.surfaceY + player.h * 0.5;
      const descending = player.vy > -80;

      if (levelEndPhase === "landing" && overPad && nearSurface && descending) {
        completeLevelLanding();
      }

      // Soft floor on the deck — stand on it instead of falling through / dying
      if (overPad && playerBottom > levelEndPad.surfaceY) {
        player.y = levelEndPad.surfaceY - player.h * 0.42;
        if (player.vy > 0) player.vy = 0;
        // If they're resting on the pad, count it as landed
        if (levelEndPhase === "landing" && Math.abs(player.vy) < 30) {
          completeLevelLanding();
        }
      }
      return;
    }

    if (levelEndPhase === "victory") {
      // Hold docked celebration + fireworks, then show stats
      if (levelEndTimer > 2.8) {
        levelEndPhase = "stats";
        levelEndTimer = 0;
        if (typeof sfxStatsReveal === "function") sfxStatsReveal();
      }
      return;
    }

    if (levelEndPhase === "stats") {
      // Show stats ~5s with counting numbers, then fade
      if (levelEndTimer > 5.0) {
        levelEndPhase = "fadeOut";
        levelEndTimer = 0;
        if (typeof sfxLevelFadeOut === "function") sfxLevelFadeOut();
      }
      return;
    }

    if (levelEndPhase === "fadeOut") {
      // Fade to black, then start level 2
      levelEndFade = Math.min(1, levelEndTimer / 1.2);
      // DOM HUD (score, power meter, gear) fades with the canvas
      setHudFade(1 - levelEndFade);
      if (levelEndTimer > 1.5) {
        finishLevelEndAndResume();
      }
    } else if (levelEndPhase === "stats" || levelEndPhase === "victory") {
      // keep HUD visible until fade starts
      setHudFade(1);
    }
  }

  function drawLevelEnd() {
    if (!levelEndActive) return;

    // Landing pad
    if (levelEndPad) {
      const img = images.landing_pad;
      const p = levelEndPad;
      ctx.save();
      // Deck target point (center of the X)
      const deckCx = p.x + p.w * (p.deckCenterFrac || 0.42);
      const deckCy = p.y + p.h * (p.deckFromTop || 0.525);

      if (img && img.naturalWidth) {
        ctx.drawImage(img, p.x, p.y, p.w, p.h);
      } else {
        ctx.fillStyle = "#5a4632";
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }

      // Soft glow on the deck
      const glow = 0.3 + Math.sin(p.glowPhase) * 0.15;
      ctx.fillStyle = `rgba(255, 210, 120, ${glow * 0.45})`;
      ctx.beginPath();
      ctx.ellipse(deckCx, deckCy + 4, p.w * 0.2, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing ring sitting ON the wooden X
      if (levelEndPhase === "landing" || levelEndPhase === "approach") {
        const pulse = 0.5 + Math.sin(p.glowPhase * 2) * 0.5;
        ctx.strokeStyle = `rgba(255, 220, 120, ${0.4 + pulse * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(deckCx, deckCy, 32 + pulse * 10, 12 + pulse * 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // "LAND HERE" just above the deck
      if (levelEndPhase === "landing" || levelEndPhase === "approach") {
        ctx.font = "bold 15px 'Rockwell', 'Rockwell Nova', 'Roboto Slab', Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255,235,180,${0.75 + Math.sin(p.glowPhase * 3) * 0.25})`;
        ctx.fillText("▼ LAND HERE ▼", deckCx, deckCy - 22);
      }
      ctx.restore();
    }

    // Dust + steam particles
    if (levelEndParticles.length) {
      levelEndParticles.forEach(pt => {
        const t = 1 - pt.age / pt.life;
        const a = Math.max(0, t * (pt.alpha || 0.4));
        ctx.save();
        ctx.globalAlpha = a;
        if (pt.kind === "steam") {
          const grd = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r);
          grd.addColorStop(0, "rgba(230,230,235,0.85)");
          grd.addColorStop(1, "rgba(200,200,210,0)");
          ctx.fillStyle = grd;
        } else {
          const grd = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r);
          grd.addColorStop(0, "rgba(180,150,110,0.9)");
          grd.addColorStop(1, "rgba(120,95,60,0)");
          ctx.fillStyle = grd;
        }
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // Fireworks
    levelEndFireworks.forEach(fw => {
      const t = 1 - fw.age / fw.life;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = fw.color;
      ctx.beginPath();
      ctx.arc(fw.x, fw.y, fw.r * t, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Victory flash
    if (levelEndPhase === "victory" && levelEndTimer < 0.6) {
      const a = (1 - levelEndTimer / 0.6) * 0.35;
      ctx.fillStyle = `rgba(255, 220, 140, ${a})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Level complete title during victory
    if (levelEndPhase === "victory") {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "bold " + Math.floor(W * 0.07) + "px 'Rockwell', 'Rockwell Nova', 'Roboto Slab', Georgia, serif";
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      const lvlDone = (levelEndStats && levelEndStats.levelNum) ? levelEndStats.levelNum : bossesDefeatedCount;
      const completeMsg = "LEVEL " + lvlDone + " COMPLETE!";
      ctx.fillText(completeMsg, W / 2 + 2, H * 0.18 + 2);
      ctx.fillStyle = "#ffe9a8";
      ctx.fillText(completeMsg, W / 2, H * 0.18);
      ctx.restore();
    }

    // Stats celebration panel with bronze medal + staged fade-in
    if ((levelEndPhase === "stats" || levelEndPhase === "fadeOut") && levelEndStats) {
      const s = levelEndStats;
      const panelW = Math.min(W * 0.78, 320);
      const panelH = 210;
      const px = (W - panelW) / 2;
      const py = H * 0.28;
      const fadeOutA = levelEndPhase === "fadeOut" ? Math.max(0, 1 - levelEndFade) : 1;

      // Staged reveal: medal first, then panel, then text
      const tMedal = levelEndPhase === "fadeOut" ? 1 : Math.min(1, levelEndTimer / 0.55);
      const tPanel = levelEndPhase === "fadeOut" ? 1 : Math.max(0, Math.min(1, (levelEndTimer - 0.25) / 0.5));
      const tText  = levelEndPhase === "fadeOut" ? 1 : Math.max(0, Math.min(1, (levelEndTimer - 0.55) / 0.45));
      const easeIn = function(u) { return 1 - Math.pow(1 - u, 3); };
      const eMedal = easeIn(tMedal);
      const ePanel = easeIn(tPanel);
      const eText  = easeIn(tText);

      const countT = levelEndPhase === "fadeOut" ? 1 : Math.min(1, Math.max(0, (levelEndTimer - 0.6) / 3.0));
      const ease = 1 - Math.pow(1 - countT, 3);
      function countInt(target) {
        return Math.round((Number(target) || 0) * ease);
      }

      // --- Medal (behind) — scale + fade + glow + sparkles ---
      const medal = images.medal_badge;
      if (medal && medal.naturalWidth && eMedal > 0.01) {
        const medalW = panelW * 1.55;
        const medalH = medalW * (medal.naturalHeight / medal.naturalWidth);
        const scale = 0.72 + 0.28 * eMedal;
        const mw = medalW * scale;
        const mh = medalH * scale;
        const mx = W / 2 - mw / 2;
        const my = py + panelH / 2 - mh / 2 - 8;
        const cx = W / 2;
        const cy = my + mh * 0.42;

        ctx.save();
        ctx.globalAlpha = fadeOutA * eMedal;

        // Soft golden halo
        const pulse = 0.55 + 0.45 * Math.sin(levelEndTimer * 4.2);
        const glowR = mw * (0.42 + 0.06 * pulse);
        const halo = ctx.createRadialGradient(cx, cy, glowR * 0.15, cx, cy, glowR);
        halo.addColorStop(0, "rgba(255, 220, 120, " + (0.45 * eMedal * pulse) + ")");
        halo.addColorStop(0.45, "rgba(212, 160, 60, " + (0.22 * eMedal) + ")");
        halo.addColorStop(1, "rgba(120, 70, 20, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Medal with slight settle rotation
        const rot = (1 - eMedal) * 0.12;
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.drawImage(medal, -mw / 2, -mh / 2, mw, mh);
        ctx.rotate(-rot);
        ctx.translate(-cx, -cy);

        // Sparkle bursts during the first second of the reveal
        if (eMedal > 0.2 && levelEndTimer < 2.2) {
          const n = 10;
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2 + levelEndTimer * 1.8;
            const rad = mw * (0.28 + 0.12 * Math.sin(levelEndTimer * 5 + i));
            const sx = cx + Math.cos(ang) * rad;
            const sy = cy + Math.sin(ang) * rad * 0.85;
            const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(levelEndTimer * 8 + i * 1.3));
            ctx.globalAlpha = fadeOutA * eMedal * twinkle * 0.9;
            ctx.fillStyle = i % 2 === 0 ? "#ffe9a8" : "#fff8e0";
            ctx.beginPath();
            // 4-point star
            const s = 2.2 + twinkle * 2.5;
            ctx.moveTo(sx, sy - s);
            ctx.lineTo(sx + s * 0.35, sy);
            ctx.lineTo(sx, sy + s);
            ctx.lineTo(sx - s * 0.35, sy);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // --- Glass panel (bronze / patina tones) ---
      if (ePanel > 0.01) {
        ctx.save();
        ctx.globalAlpha = fadeOutA * ePanel * 0.95;
        // Slight rise as it appears
        const yOff = (1 - ePanel) * 18;
        const ppx = px;
        const ppy = py + yOff;

        ctx.fillStyle = "rgba(42, 32, 22, 0.48)"; // aged bronze glass
        roundRect(ctx, ppx, ppy, panelW, panelH, 16);
        ctx.fill();
        ctx.strokeStyle = "rgba(180, 140, 75, 0.85)"; // bronze rim
        ctx.lineWidth = 2.5;
        roundRect(ctx, ppx, ppy, panelW, panelH, 16);
        ctx.stroke();
        ctx.strokeStyle = "rgba(120, 55, 40, 0.4)"; // ribbon rust accent
        ctx.lineWidth = 5;
        roundRect(ctx, ppx + 3, ppy + 3, panelW - 6, panelH - 6, 13);
        ctx.stroke();

        if (eText > 0.01) {
          ctx.globalAlpha = fadeOutA * eText;
          ctx.textAlign = "center";
          ctx.fillStyle = "#e8d4a8";
          ctx.font = "bold 22px 'Rockwell', 'Rockwell Nova', 'Roboto Slab', Georgia, serif";
          ctx.shadowColor = "rgba(0,0,0,0.55)";
          ctx.shadowBlur = 6;
          const clearLvl = s.levelNum || bossesDefeatedCount;
          ctx.fillText("LEVEL " + clearLvl + " CLEAR", W / 2, ppy + 34);
          ctx.shadowBlur = 0;

          ctx.font = "14px 'Rockwell', 'Rockwell Nova', 'Roboto Slab', Georgia, serif";
          ctx.fillStyle = "rgba(230, 210, 170, 0.88)";
          ctx.fillText((s.bossName || "Boss") + " defeated", W / 2, ppy + 56);

          const rows = [
            ["SCORE", countInt(s.score).toLocaleString(), false],
            ["TIME", s.timeStr, true],
            ["LANDING BONUS", "+" + countInt(s.landingBonus), false],
            ["HEALTH LEFT", String(countInt(s.health)), false]
          ];
          rows.forEach((row, i) => {
            const ry = ppy + 88 + i * 26;
            const rowA = Math.max(0, Math.min(1, (eText * 1.4) - i * 0.12));
            ctx.globalAlpha = fadeOutA * rowA;
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(230, 210, 170, 0.82)";
            ctx.font = "15px 'Rockwell', 'Rockwell Nova', 'Roboto Slab', Georgia, serif";
            ctx.fillText(row[0], ppx + 26, ry);
            ctx.textAlign = "right";
            ctx.fillStyle = "#f0e0b8";
            ctx.font = "bold 16px 'Rockwell', 'Rockwell Nova', 'Roboto Slab', Georgia, serif";
            ctx.fillText(row[1], ppx + panelW - 26, ry);
          });
        }
        ctx.restore();
      }
    }

    // Fade to black
    if (levelEndPhase === "fadeOut" && levelEndFade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${levelEndFade})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function isLevelEndActive() {
    return levelEndActive;
  }

  function isLevelEndBlockingSpawns() {
    return levelEndActive;
  }


    function queueBonusRound(type, delayMs) {
    bonusPending = true;
    bonusPendingType = type;
    bonusPendingAt = performance.now() + delayMs;
  }

  function spawnBalloonWave() {
    bonusItems = [];
    const count = 12;
    const dispW = Math.min(78, W * 0.16);
    const aspect = images[BALLOON_ANIM_KEYS[0]] ? (images[BALLOON_ANIM_KEYS[0]].naturalHeight / images[BALLOON_ANIM_KEYS[0]].naturalWidth) : 1;
    const dispH = dispW * aspect;
    const topMargin = H * 0.08;
    const bottomMargin = H * 0.62; // keep clear of the ground/buildings
    for (let i = 0; i < count; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      bonusItems.push({
        x: W + 60 + col * 170 + row * 40,
        y: topMargin + (row * (bottomMargin - topMargin)) / 2 + Math.sin(i) * 18,
        w: dispW,
        h: dispH,
        vx: 90 + Math.random() * 30,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 1.4 + Math.random() * 1.0,
        bobAmount: 10 + Math.random() * 8,
        animFrame: Math.floor(Math.random() * OBSTACLE_ANIM_FRAME_COUNT),
        animTimer: Math.random() / OBSTACLE_ANIM_FPS,
        popped: false
      });
    }
    bonusTotal = count;
  }

  function spawnCoinWave() {
    bonusItems = [];
    const count = 14;
    const img = images.heartPickup;
    const aspect = img && img.naturalWidth ? (img.naturalHeight / img.naturalWidth) : 1;
    const dispW = Math.min(46, W * 0.11);
    const dispH = dispW * aspect;
    const topMargin = H * 0.1;
    const bottomMargin = H * 0.6;
    // gentle zig-zag "rain" formation, staggered left to right
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      bonusItems.push({
        x: W + 80 + i * 130,
        y: topMargin + (bottomMargin - topMargin) * (0.5 + 0.42 * Math.sin(t * Math.PI * 2.4)),
        w: dispW,
        h: dispH,
        vx: 130,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 1.6 + Math.random() * 0.8,
        bobAmount: 8 + Math.random() * 6,
        popped: false
      });
    }
    bonusTotal = count;
  }

  function startBonusRound(type) {
    bonusActive = true;
    bonusType = type;
    bonusEndsAt = performance.now() + BONUS_DURATION_MS;
    bonusCollected = 0;
    bonusPoints = 0;
    obstacles = [];
    if (type === "coin") {
      hasFirepower = false;
      hasDualFire = false;
      spawnCoinWave();
      // bonus counter HUD only — no banner
    } else {
      hasFirepower = true;
      hasDualFire = false;
      spawnBalloonWave();
      // bonus counter HUD only — no banner
    }
  }

  function popBonusItem(item) {
    if (item.popped) return;
    item.popped = true;
    bonusCollected++;
    const pts = bonusType === "coin" ? BONUS_COIN_POINTS : BONUS_POP_POINTS;
    bonusPoints += pts;
    score += pts;
    scoreVal.textContent = score;
    bumpScorePop();
    spawnHitParticles(item.x, item.y);
    triggerBigExplosion(item.x, item.y, item.w * 0.7, item.h * 0.7);
  }

  function endBonusRound() {
    const wasCoin = bonusType === "coin";
    bonusActive = false;
    bonusItems = [];
    hasFirepower = false;
    hasDualFire = false;

    let finalMsg = "BONUS COMPLETE! +" + bonusPoints;
    if (bonusCollected >= bonusTotal) {
      score += BONUS_PERFECT_BONUS;
      scoreVal.textContent = score;
      bumpScorePop();
      finalMsg = (wasCoin ? "PERFECT HAUL! +" : "PERFECT BONUS! +") + (bonusPoints + BONUS_PERFECT_BONUS);
    }
    showBanner(finalMsg, 2000, "defeat");

    bonusType = null;
    // resume the normal spawn cadence cleanly
    spawnTimer = 0;

    // After every boss bonus round, run the hangar landing sequence before
    // the next level continues (checkpoint is granted when landing finishes).
    if (bossesDefeatedCount >= 1) {
      startLevelEndLanding();
      return;
    }

    const next = nextBossConfig();
    if (next) {
      spawnCheckpointPickup(next.num);
    } else {
      checkpointReached = lastBossTriggered;
      checkpointScore = score;
      checkpointGameplayScore = gameplayScore;
      checkpointBossesDefeated = bossesDefeatedCount;
    }
  }

  function updateBonusRound(dt) {
    if (bonusPending && performance.now() >= bonusPendingAt) {
      bonusPending = false;
      startBonusRound(bonusPendingType);
    }
    if (!bonusActive) return;

    const frameDuration = 1 / OBSTACLE_ANIM_FPS;
    bonusItems.forEach(b => {
      if (b.popped) return;
      b.x -= b.vx * dt;
      b.bobPhase += b.bobSpeed * dt;
      if (bonusType === "balloon") {
        b.animTimer += dt;
        while (b.animTimer >= frameDuration) {
          b.animTimer -= frameDuration;
          b.animFrame = (b.animFrame + 1) % OBSTACLE_ANIM_FRAME_COUNT;
        }
      }
      // touching an item collects/pops it too — no damage during the bonus round
      const drawY = b.y + Math.sin(b.bobPhase) * b.bobAmount;
      const dx = Math.abs(player.x - (b.x + b.w / 2));
      const dy = Math.abs(player.y - (drawY + b.h / 2));
      if (dx < (player.w / 2) * 0.75 + (b.w / 2) * 0.75 && dy < (player.h / 2) * 0.75 + (b.h / 2) * 0.75) {
        popBonusItem(b);
      }
    });
    bonusItems = bonusItems.filter(b => !b.popped && b.x + b.w > -30);

    const timeUp = performance.now() >= bonusEndsAt;
    const allCollected = bonusCollected >= bonusTotal;
    if (timeUp || allCollected) {
      endBonusRound();
    }
  }

  function drawBonusRound() {
    if (!bonusActive) return;
    bonusItems.forEach(b => {
      if (b.popped) return;
      const drawY = b.y + Math.sin(b.bobPhase) * b.bobAmount;
      let img;
      if (bonusType === "balloon") {
        const frames = OBSTACLE_ANIM_SETS.balloon_anim;
        img = images[frames[b.animFrame]];
      } else {
        img = images.heartPickup;
      }
      if (!img || !img.naturalWidth) return;
      drawMotionBlur(img, b.x + b.w / 2, drawY + b.h / 2, b.w, b.h, 0, b.vx, 0);
      ctx.drawImage(img, b.x, drawY, b.w, b.h);
    });
  }

    function drawBonusHUD() {
    if (!bonusActive) return;
    const secsLeft = Math.max(0, Math.ceil((bonusEndsAt - performance.now()) / 1000));
    const totalSecs = Math.max(1, Math.round((typeof BONUS_DURATION_MS !== "undefined" ? BONUS_DURATION_MS : 15000) / 1000));
    const progress = Math.max(0, Math.min(1, bonusTotal ? bonusCollected / bonusTotal : 0));
    const timeFrac = Math.max(0, Math.min(1, secsLeft / totalSecs));
    const title = bonusType === "coin" ? "COIN RUSH" : "BALLOON BASH";
    const pulse = 0.92 + Math.sin(performance.now() / 220) * 0.08;

    const barW = Math.min(W * 0.78, 360);
    const barH = 54;
    const bx = (W - barW) / 2;
    const by = H * 0.075;

    ctx.save();
    // Outer glow
    ctx.shadowColor = "rgba(255, 190, 80, 0.55)";
    ctx.shadowBlur = 18 * pulse;
    ctx.fillStyle = "rgba(18, 12, 6, 0.82)";
    roundRect(ctx, bx, by, barW, barH, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Gold border
    ctx.strokeStyle = "rgba(255, 210, 120, 0.9)";
    ctx.lineWidth = 2;
    roundRect(ctx, bx, by, barW, barH, 12);
    ctx.stroke();

    // Title
    ctx.textAlign = "center";
    ctx.font = "bold " + Math.max(13, Math.floor(W * 0.038)) + "px 'Rockwell', 'Rockwell Nova', 'Roboto Slab', Georgia, serif";
    ctx.fillStyle = "#ffe7a8";
    ctx.fillText(title, W / 2, by + 18);

    // Counter
    ctx.font = "bold " + Math.max(14, Math.floor(W * 0.042)) + "px 'Rockwell', 'Rockwell Nova', 'Roboto Slab', Georgia, serif";
    ctx.fillStyle = "#fff6e0";
    ctx.fillText(bonusCollected + " / " + bonusTotal + "   ·   " + secsLeft + "s", W / 2, by + 38);

    // Progress track
    const trackX = bx + 14;
    const trackW = barW - 28;
    const trackY = by + barH - 10;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    roundRect(ctx, trackX, trackY, trackW, 5, 3);
    ctx.fill();
    // Collection fill
    if (progress > 0) {
      const grd = ctx.createLinearGradient(trackX, 0, trackX + trackW * progress, 0);
      grd.addColorStop(0, "#c9a66b");
      grd.addColorStop(1, "#ffe29a");
      ctx.fillStyle = grd;
      roundRect(ctx, trackX, trackY, trackW * progress, 5, 3);
      ctx.fill();
    }
    // Time remaining thin glow at right
    ctx.globalAlpha = 0.35 + timeFrac * 0.45;
    ctx.fillStyle = secsLeft <= 3 ? "#ff8866" : "#a8d8ff";
    ctx.fillRect(trackX + trackW * (1 - timeFrac), trackY - 1, 2, 7);
    ctx.globalAlpha = 1;

    ctx.restore();
  }


  let bossBanner = null; // { text, until } — brief on-screen announcement

  function showBanner(text, durationMs, type) {
    // Suppress campaign banners during R.U.F.F. training boss lesson
    if (window.__airborneTrainingBoss || window.__airborneAirfield || window.__airborneTrainingFlight ||
        (window.__airborneRuffActive && (window.__airborneRuffStage === "boss1" || window.__airborneRuffStage === "combined"))) {
      return;
    }
    bossBanner = { text, until: performance.now() + durationMs, startedAt: performance.now(), type: type || "info" };
  }

  
  // ---------- Checkpoint pickup functions — collectible glowing orb ----------
  function spawnCheckpointPickup(targetBossNum) {
    checkpointPickup = {
      x: W + 80,
      y: H * 0.15 + Math.random() * H * 0.25,
      r: Math.min(32, W * 0.075),
      bobPhase: Math.random() * Math.PI * 2,
      targetNum: targetBossNum,
      collected: false,
      vx: 110,
      glowPhase: Math.random() * Math.PI * 2,
      ringPhase: 0
    };
  }

  function updateCheckpointPickup(dt) {
    if (!checkpointPickup || checkpointPickup.collected) return;

    checkpointPickup.bobPhase += dt * 2.8;
    checkpointPickup.glowPhase += dt * 3.5;
    checkpointPickup.ringPhase += dt * 4;
    checkpointPickup.x -= checkpointPickup.vx * dt;

    // bob up and down as it drifts left
    const drawY = checkpointPickup.y + Math.sin(checkpointPickup.bobPhase) * 14;

    // off-screen cleanup
    if (checkpointPickup.x < -checkpointPickup.r * 2) {
      checkpointPickup = null;
      return;
    }

    // collision with player
    const dx = Math.abs(player.x - checkpointPickup.x);
    const dy = Math.abs(player.y - drawY);
    if (dx < player.w * 0.5 + checkpointPickup.r * 0.9 && dy < player.h * 0.5 + checkpointPickup.r * 0.9) {
      checkpointPickup.collected = true;
      checkpointReached = Math.max(checkpointReached, checkpointPickup.targetNum);
      checkpointScore = score; // save score at checkpoint for restart
      checkpointGameplayScore = gameplayScore;
      checkpointBossesDefeated = bossesDefeatedCount;
      sfxPowerup();
      showBanner("CHECKPOINT SAVED!", 2000, "checkpoint");
      // heal 1 pip as a reward for collecting it
      if (health < MAX_HEALTH + MAX_BONUS_HEARTS) {
        health = Math.min(MAX_HEALTH + MAX_BONUS_HEARTS, health + 1);
        updateHealthDisplay();
      }
      // small confetti burst
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 120;
        hitParticles.push({
          type: "spark",
          x: checkpointPickup.x,
          y: drawY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.4 + Math.random() * 0.3,
          age: 0,
          r: 2.5 + Math.random() * 3
        });
      }
      checkpointPickup = null;
    }
  }

  function drawCheckpointPickup() {
    if (!checkpointPickup || checkpointPickup.collected) return;
    const cp = checkpointPickup;
    const drawY = cp.y + Math.sin(cp.bobPhase) * 14;
    const pulse = 1 + Math.sin(cp.glowPhase) * 0.12;
    const r = cp.r * pulse;

    // motion blur trail for the orb
    const blurCount = 3;
    for (let i = 1; i <= blurCount; i++) {
      ctx.save();
      ctx.globalAlpha = 0.08 * (blurCount - i + 1) / blurCount;
      ctx.translate(cp.x + i * 6, drawY);
      const glow = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.8);
      glow.addColorStop(0, "rgba(255,214,120,0.6)");
      glow.addColorStop(1, "rgba(255,180,40,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cp.x, drawY);

    // outer glow ring (rotating)
    ctx.save();
    ctx.rotate(cp.ringPhase * 0.3);
    ctx.strokeStyle = "rgba(255,214,120,0.45)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // second outer ring (counter-rotating, dotted)
    ctx.save();
    ctx.rotate(-cp.ringPhase * 0.5);
    ctx.strokeStyle = "rgba(245,198,66,0.3)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // radial glow behind
    const glow = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.2);
    glow.addColorStop(0, "rgba(255,214,120,0.9)");
    glow.addColorStop(0.4, "rgba(255,198,66,0.5)");
    glow.addColorStop(1, "rgba(255,180,40,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // main orb body
    const orbGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
    orbGrad.addColorStop(0, "#fff8dc");
    orbGrad.addColorStop(0.5, "#f5c542");
    orbGrad.addColorStop(1, "#c98a1a");
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // dark rim
    ctx.strokeStyle = "#3a2410";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // inner highlight (glint)
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.32, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // "CP" text
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = r * 0.62;
    ctx.font = "bold " + fontSize + "px Georgia, serif";
    ctx.fillStyle = "#3a2410";
    ctx.shadowColor = "rgba(255,255,255,0.5)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
    ctx.fillText("CP", 0, fontSize * 0.06);
    ctx.shadowColor = "transparent";

    // tiny "BOSS X" label below
    ctx.font = "bold " + (fontSize * 0.32) + "px Georgia, serif";
    ctx.fillStyle = "#5e1212";
    ctx.fillText(cp.targetNum, 0, r * 0.82);

    ctx.restore();
  }


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
  // Unified power duration for all ships (seconds / ms)
  const POWER_DURATION_SEC = 6.5;
  const POWER_DURATION_MS = 6500;
  const POWER_FADE_SEC = 0.75;
  const POWER_FADE_MS = 750;
  window.__airbornePowerDurationMs = POWER_DURATION_MS;
  window.__airbornePowerFadeMs = POWER_FADE_MS;
  let stormCharge = 0;
  let stormMilestoneCount = 0; // how many 25-point thresholds have been counted toward charge so far
  let stormWasReady = false;   // tracks ready-state transitions so the ready sound only fires once
  let stormActive = false;
  let stormTimer = 0;

  function creditPowerKillScore(pts) {
    pts = (typeof pts === "number" && pts > 0) ? pts : 1;
    try {
      if (typeof score === "number") score += pts;
      if (typeof gameplayScore === "number") gameplayScore += pts;
      if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
      else {
        var el = document.getElementById("scoreVal");
        if (el) el.textContent = String(score);
      }
      if (typeof bumpScorePop === "function") bumpScorePop();
      if (typeof addStormChargeForScore === "function") addStormChargeForScore(score);
    } catch (e) {}
  }
  window.creditPowerKillScore = creditPowerKillScore;

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
  
  // Per-blimp power icon in unified dock center
  window.__airbornePowerIconByShip = window.__airbornePowerIconByShip || {
    blimp1: "01_flame_ring.webp",
    blimp2: "02_spike_burst.webp",
    blimp3: "03_frost_trail.webp",
    blimp4: "04_steam_engine.webp",
    blimp5: "05_solar_flare.webp",
    blimp6: "06_void_vortex.webp",
    blimp7: "07_storm_lightning.webp",
    blimp8: "08_meteor_trail.webp",
    blimp9: "09_bomb_skull.webp",
    blimp10: "10_storm_cloud.webp",
    blimp11: "11_shark_torpedo.webp",
    blimp12: "12_rocket_missile.webp",
    blimp13: "13_bomb_cluster.webp",
    blimp14: "14_powder_keg.webp",
    blimp15: "15_meteor_shower.webp"
  };
  window.__airbornePowerIconGlow = window.__airbornePowerIconGlow || {
    blimp1: "rgba(255,140,40,0.95)",
    blimp2: "rgba(200,220,255,0.95)",
    blimp3: "rgba(100,200,255,0.95)",
    blimp4: "rgba(220,220,230,0.95)",
    blimp5: "rgba(80,255,140,0.95)",
    blimp6: "rgba(180,100,255,0.95)",
    blimp7: "rgba(120,200,255,0.95)",
    blimp8: "rgba(255,160,40,0.95)",
    blimp9: "rgba(255,80,80,0.95)",
    blimp10: "rgba(150,180,255,0.95)",
    blimp11: "rgba(80,220,255,0.95)",
    blimp12: "rgba(255,120,40,0.95)",
    blimp13: "rgba(255,190,60,0.95)",
    blimp14: "rgba(255,100,40,0.95)",
    blimp15: "rgba(255,140,40,0.95)"
  };
  window.__airborneApplyShipPowerIcon = function () {
    try {
      var sel = (typeof selectedBlimp !== "undefined" && selectedBlimp) ? selectedBlimp : "blimp1";
      var icon = (window.__airbornePowerIconByShip && window.__airbornePowerIconByShip[sel]) || "01_flame_ring.webp";
      var glow = (window.__airbornePowerIconGlow && window.__airbornePowerIconGlow[sel]) || "rgba(255,200,80,0.9)";
      var el = document.getElementById("stormIcon");
      if (el) {
        var src = icon + (icon.indexOf("?") >= 0 ? "&" : "?") + "v=ruff225";
        if (el.dataset.shipIcon !== sel) {
          el.dataset.shipIcon = sel;
          el.src = src;
          el.alt = "Power";
        }
      }
      var core = document.querySelector(".udCore");
      if (core) core.style.setProperty("--power-icon-glow", glow);
      var meter = document.getElementById("stormMeter");
      if (meter) meter.style.setProperty("--power-icon-glow", glow);
    } catch (e) {}
  };

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
    if (typeof window.__airborneApplyShipPowerIcon === "function") {
      window.__airborneApplyShipPowerIcon();
    } else if (stormIconDisplayEl && stormIconDisplayEl.dataset.stage !== String(stage)) {
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
    var r = big ? (11 + Math.random() * 7) : (6 + Math.random() * 7); // 50% smaller
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


  function updatePowerFade(untilMs) {
    var fadeMs = (typeof POWER_FADE_MS === "number") ? POWER_FADE_MS : 750;
    // Only fade while a power is actually active
    if (typeof stormActive !== "undefined" && !stormActive) {
      window.__airbornePowerFade = 1;
      return 1;
    }
    if (!untilMs) { window.__airbornePowerFade = 1; return 1; }
    var left = untilMs - performance.now();
    // Power fully ended — full opacity for the world (effects are gone)
    if (left <= 0) { window.__airbornePowerFade = 1; return 1; }
    if (left < fadeMs) {
      window.__airbornePowerFade = Math.max(0.05, left / fadeMs);
    } else {
      window.__airbornePowerFade = 1;
    }
    return window.__airbornePowerFade;
  }
  window.updatePowerFade = updatePowerFade;

  function activateStorm() {
    if (window.__airborneAirfield && !window.__airborneAirfieldAllowPowerup) return;
    if (state !== "playing" || stormActive || stormCharge < STORM_MAX) return;
    // one-shot restrictions removed — powers can fire whenever charged


    stormActive = true;
    stormCharge = 0;
    if (window.__airborneAirfield) {
      window.__airborneTrainingPowerUsed = true;
      // Testing: refill meter after short delay so all blimps can re-test powers
      setTimeout(function() {
        try {
          if (window.__airborneAirfield && typeof stormCharge !== "undefined" && typeof STORM_MAX === "number") {
            stormCharge = STORM_MAX;
            if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay(false);
          }
        } catch (e) {}
      }, (typeof POWER_DURATION_MS === "number" ? POWER_DURATION_MS : 6500) + 400);
    }
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
    window.__airborneActivePowerUntil = performance.now() + POWER_DURATION_MS;
    try {
      if (window.PowerFX && typeof player !== "undefined" && player) {
        window.PowerFX.activate(powerMode, player.x, player.y);
      }
    } catch (e) {}

    // Fire power (Zeppelin Ace) — use existing fire aura system
    if (powerMode === "fire") {
      try {
        window.__airborneFirePowerActive = true;
        window.__airborneFirePowerUntil = performance.now() + POWER_DURATION_MS;
        window.__airborneFireOrbiters = []; // rebuild on next update
        window.__airborneFireActivateT = 0;
        // Initial radial volley — same fireball style from all sides
        window.__airborneFireLaunchBurst = true;
        if (typeof sfxExplosion === "function") sfxExplosion(0.5);
        try { if (typeof triggerScreenShake === "function") triggerScreenShake(6, 280); } catch (e2) {}
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
      stormTimer = POWER_DURATION_SEC;
      stormCharge = 0;
      window.__airborneFlamethrowerUntil = performance.now() + POWER_DURATION_MS;
      window.__airborneActivePowerVisual = powerMode;
      window.__airborneActivePowerUntil = performance.now() + POWER_DURATION_MS;
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
      stormTimer = POWER_DURATION_SEC;
      stormCharge = 0;
      window.__airborneFireballUntil = performance.now() + POWER_DURATION_MS;
      window.__airborneActivePowerVisual = powerMode;
      window.__airborneActivePowerUntil = performance.now() + POWER_DURATION_MS;
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
        // Aero Slicer — Plasma Orbit + Azure Barrage
        window.__airborneBlueFlash = { x: player.x, y: player.y, age: 0, life: 0.85, phase: 1 };
        window.__airborneEngineFlare = { age: 0, life: 1.0 };
        window.__airbornePlasmaIgnite = { age: 0, life: 0.55, shockR: 8 };
        // 5–7 orbiting plasma fireballs (miniature blue solar system)
        var nOrb = 20 + Math.floor(Math.random() * 8); // 20–27 (doubled)
        window.__airbornePlasmaOrbits = [];
        for (var oi = 0; oi < nOrb; oi++) {
          window.__airbornePlasmaOrbits.push({
            ang: (oi / nOrb) * Math.PI * 2,
            // elliptical 3D-style orbit — some pass in front, some behind
            tilt: 0.32 + (oi % 4) * 0.1,
            distX: 34 + (oi % 5) * 8,
            distY: 20 + (oi % 4) * 6,
            spin: 2.6 + (oi % 6) * 0.55 + Math.random() * 0.5,
            r: (8 + (oi % 4) * 2.2) * 0.85, // 15% smaller
            hitIds: {},
            pulse: Math.random() * Math.PI * 2,
            trail: [],
            z: 0, // depth for draw order
            hitIds: {}
          });
        }
        window.__airbornePlasmaArcs = [];
        window.__airbornePlasmaSparks = [];
        // Barrage stream still fires
        var nShots = 3 + Math.floor(Math.random() * 3);
        window.__airborneAzureBarrage = { shotsLeft: nShots, fired: 0, total: nShots };
        window.__airborneFireballSpawnT = 0.22;
        try { if (typeof triggerScreenShake === "function") triggerScreenShake(8, 320); } catch (e) {}
        try { if (typeof sfxShoot === "function") sfxShoot(); } catch (e) {}
        try { if (typeof sfxExplosion === "function") sfxExplosion(0.35); } catch (e) {}
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
      stormTimer = POWER_DURATION_SEC;
      stormCharge = 0;
      window.__airborneHeatseekUntil = performance.now() + POWER_DURATION_MS;
      window.__airborneActivePowerVisual = "warshark";
      window.__airborneActivePowerUntil = performance.now() + POWER_DURATION_MS;
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
      stormTimer = POWER_DURATION_SEC;
      stormCharge = 0;
      window.__airborneHeatseekUntil = performance.now() + POWER_DURATION_MS;
      window.__airborneActivePowerVisual = "jollybomb";
      window.__airborneActivePowerUntil = performance.now() + POWER_DURATION_MS;
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
      stormTimer = POWER_DURATION_SEC;
      stormCharge = 0;
      // Short window — all 5 fire at once, no continuous spawn
      window.__airborneHeatseekUntil = performance.now() + POWER_DURATION_MS;
      window.__airborneActivePowerVisual = "barrelbomb";
      window.__airborneActivePowerUntil = performance.now() + POWER_DURATION_MS;
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
      stormTimer = POWER_DURATION_SEC;
      stormCharge = 0;
      window.__airborneHeatseekUntil = performance.now() + POWER_DURATION_MS;
      window.__airborneActivePowerVisual = "heatseek";
      window.__airborneActivePowerUntil = performance.now() + POWER_DURATION_MS;
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
      // Steampunk — Steam Overdrive (fires every full charge)
      if (typeof sfxThunder === "function") sfxThunder();
      try { if (typeof sfxExplosion === "function") sfxExplosion(0.4); } catch (e) {}
      try { if (typeof triggerScreenShake === "function") triggerScreenShake(6, 300); } catch (e) {}
      stormActive = true;
      stormMode = "steam";
      stormTimer = POWER_DURATION_SEC;
      stormCharge = 0;
      window.__airborneActivePowerVisual = "steam";
      window.__airborneActivePowerUntil = performance.now() + POWER_DURATION_MS;
      window.__airborneSteamUntil = performance.now() + POWER_DURATION_MS;
      window.__airborneSteamOD = {
        age: 0,
        life: POWER_DURATION_SEC,
        phase: "charge",
        phaseT: 0,
        rings: [],
        parts: [],
        gauges: 0,
        finalDone: false,
        blastDone: false
      };
      window.__airborneSteamParts = [];
      window.__airborneSteamCone = null;
      try { if (window.PowerFX) window.PowerFX.activate("steam", player.x, player.y); } catch (e) {}
      updateStormMeterDisplay();
      return;
    }

    if (powerMode === "shockwave") {
      if (typeof sfxThunder === "function") sfxThunder();
      if (typeof sfxExplosion === "function") sfxExplosion(0.55);
      try { if (typeof triggerScreenShake === "function") triggerScreenShake(12, 380); } catch (e) {}
      stormActive = true;
      stormMode = "shockwave";
      // Deco Liner — 2s shorter than shared power duration
      var decoSec = Math.max(2.5, POWER_DURATION_SEC - 2);
      var decoMs = Math.round(decoSec * 1000);
      stormTimer = decoSec;
      stormCloud = null;
      window.__airborneActivePowerVisual = "shockwave";
      window.__airborneActivePowerUntil = performance.now() + decoMs;
      window.__airborneShockPulseT = 0.5; // fire first pulse immediately
      window.__airborneShockPulseCount = 0;
      window.__airborneShockEndAt = performance.now() + decoMs;
      window.__airborneShockFinalDone = false;
      window.__airborneShockFlash = 1.0;
      if (!window.__airborneShockFX) window.__airborneShockFX = [];
      // Initial big rings + sparks
      var radius0 = Math.min(typeof W !== "undefined" ? W : 400, typeof H !== "undefined" ? H : 600) * 0.62;
      for (var si = 0; si < 3; si++) {
        window.__airborneShockFX.push({
          kind: "ring",
          x: player.x, y: player.y,
          r: 14 + si * 10,
          maxR: radius0 * (0.7 + si * 0.18),
          life: 0.5 + si * 0.1, age: 0,
          width: 6 - si,
          gold: si === 0
        });
      }
      for (var sp = 0; sp < 28; sp++) {
        var sa = Math.random() * Math.PI * 2;
        var ss = 120 + Math.random() * 220;
        window.__airborneShockFX.push({
          kind: "spark",
          x: player.x, y: player.y,
          vx: Math.cos(sa) * ss, vy: Math.sin(sa) * ss,
          life: 0.35 + Math.random() * 0.3, age: 0,
          r: 2 + Math.random() * 3.5
        });
      }
      // Immediate knockback + electrify nearby targets
      if (typeof window.__airborneSonicBlast === "function") {
        window.__airborneSonicBlast(player.x, player.y, radius0, 1.0);
      }
      try { if (window.PowerFX) window.PowerFX.activate("shockwave", player.x, player.y); } catch (e) {}
      updateStormMeterDisplay();
      return;
    }

    // Chain lightning — zap several obstacles in sequence
    if (powerMode === "ivorybolt") {
      if (typeof sfxThunder === "function") sfxThunder();
      stormActive = true;
      stormMode = "ivorybolt";
      stormTimer = POWER_DURATION_SEC;
      window.__airborneActivePowerVisual = "ivorybolt";
      window.__airborneActivePowerUntil = performance.now() + POWER_DURATION_MS;
      window.__airborneIvoryUntil = performance.now() + POWER_DURATION_MS;
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
      // Storm Chaser — Thunder Chain
      if (typeof sfxThunder === "function") sfxThunder();
      try { if (typeof triggerScreenShake === "function") triggerScreenShake(8, 400); } catch (e) {}
      stormActive = true;
      stormMode = "chain";
      stormTimer = POWER_DURATION_SEC;
      stormCharge = 0;
      window.__airborneActivePowerVisual = "chain";
      window.__airborneActivePowerUntil = performance.now() + POWER_DURATION_MS;
      window.__airborneThunderUntil = performance.now() + POWER_DURATION_MS;
      // Storm state machine
      window.__airborneThunderChain = {
        age: 0,
        life: POWER_DURATION_SEC,
        phase: "charge", // charge → primary → chain → final → fade
        phaseT: 0,
        bolts: [],       // active lightning segments {points, age, life, thick}
        sparks: [],      // floating aftereffect
        auraArcs: [],    // continuous arcs around blimp
        flash: 0,        // screen flash 0–1
        hitIds: {},
        chainQueue: [],  // targets waiting to branch from
        chainsDone: 0,
        primaryDone: false,
        finalDone: false
      };
      // Dark storm clouds around blimp
      window.__airborneStormClouds = [];
      for (var ci = 0; ci < 6; ci++) {
        var ca = (ci / 6) * Math.PI * 2 + Math.random() * 0.3;
        window.__airborneStormClouds.push({
          ang: ca,
          dist: 28 + Math.random() * 36,
          r: 18 + Math.random() * 22,
          spin: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.8),
          phase: Math.random() * Math.PI * 2
        });
      }
      try { if (window.PowerFX) window.PowerFX.activate("storm", player.x, player.y); } catch (e) {}
      updateStormMeterDisplay();
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
            try { creditPowerKillScore(1); } catch (e) {}
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
      stormTimer = POWER_DURATION_SEC;
      window.__airborneActivePowerVisual = "lattice";
      window.__airborneActivePowerUntil = performance.now() + POWER_DURATION_MS;
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

    if (powerMode === "vortex") {
      if (typeof sfxShoot === "function") sfxShoot();
      if (typeof sfxThunder === "function") sfxThunder();
      try { if (typeof triggerScreenShake === "function") triggerScreenShake(10, 350); } catch (e) {}
      stormActive = true;
      stormMode = "vortex";
      stormTimer = POWER_DURATION_SEC;
      stormCloud = null;
      window.__airborneActivePowerVisual = "vortex";
      window.__airborneActivePowerUntil = performance.now() + 4600;
      var maxR = Math.hypot(
        (typeof W !== "undefined" ? W : 400),
        (typeof H !== "undefined" ? H : 600)
      ) * 0.95;
      window.__airborneSpyShield = {
        age: 0,
        life: 4.2,
        phase: "ignite",
        r: 12,
        maxR: maxR,
        spin: 0,
        spinVel: 2.5,
        flash: 1.0,
        collapseFlash: 0,
        chainBoost: 1,
        particles: [],
        ribbons: [],
        arcs: []
      };
      // Initial burst particles that reverse inward
      var sh0 = window.__airborneSpyShield;
      for (var pi = 0; pi < 60; pi++) {
        var a0 = Math.random() * Math.PI * 2;
        var spd = 180 + Math.random() * 280;
        sh0.particles.push({
          x: player.x, y: player.y,
          vx: Math.cos(a0) * spd, vy: Math.sin(a0) * spd,
          age: 0, life: 1.2 + Math.random() * 0.8,
          r: 2 + Math.random() * 4,
          phase: "out", // then reverse to "in"
          orbitR: 40 + Math.random() * 120,
          orbitA: a0,
          orbitSpd: 1.5 + Math.random() * 3,
          kind: Math.random() < 0.3 ? "fragment" : "spark"
        });
      }
      for (var rb = 0; rb < 6; rb++) {
        sh0.ribbons.push({
          offset: rb * (Math.PI / 3),
          width: 8 + Math.random() * 10,
          speed: 1.2 + Math.random() * 1.5,
          bright: 0.4 + Math.random() * 0.4
        });
      }
      window.__airbornePurpleBursts = [];
      window.__airborneSuctionTrails = [];
      try { if (window.PowerFX) window.PowerFX.activate("vortex", player.x, player.y); } catch (e) {}
      updateStormMeterDisplay();
      return;
    }


    if (powerMode === "meteors") {
      if (typeof sfxShoot === "function") sfxShoot();
      if (typeof sfxThunder === "function") sfxThunder();
      try { if (typeof triggerScreenShake === "function") triggerScreenShake(6, 400); } catch (e) {}
      stormActive = true;
      stormMode = "meteors";
      stormTimer = POWER_DURATION_SEC;
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
      stormTimer = POWER_DURATION_SEC;
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
      try { creditPowerKillScore(1); } catch (e) {}
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
    try {
    try { updateBombBlasts(dt); } catch (e) {}
    if (typeof W === "undefined") var W = 400;
    if (typeof H === "undefined") var H = 700;

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
              try { creditPowerKillScore(1); } catch (e) {}
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
      if (window.__airborneShockFlash > 0) {
        window.__airborneShockFlash = Math.max(0, window.__airborneShockFlash - dt * 2.5);
      }
      // Age shock FX
      if (window.__airborneShockFX) {
        for (var fi = window.__airborneShockFX.length - 1; fi >= 0; fi--) {
          var fx = window.__airborneShockFX[fi];
          fx.age += dt;
          if (fx.kind === "spark" || fx.kind === "debris") {
            fx.x += (fx.vx || 0) * dt;
            fx.y += (fx.vy || 0) * dt;
          } else if (fx.kind === "ring" || !fx.kind) {
            var ft = Math.min(1, fx.age / fx.life);
            fx.r = fx.r + (fx.maxR - (fx.r0 || fx.r)) * dt / Math.max(0.05, fx.life - fx.age + dt);
            // smoother expand
            fx.r = (fx.r0 || 12) + (fx.maxR - (fx.r0 || 12)) * Math.min(1, fx.age / fx.life);
          }
          if (fx.age >= fx.life) window.__airborneShockFX.splice(fi, 1);
        }
      }
      // Obstacle sonic debris / tumble
      if (typeof obstacles !== "undefined") {
        for (var oi = obstacles.length - 1; oi >= 0; oi--) {
          var o = obstacles[oi];
          if (!o) continue;
          if (o.shockShake > 0) {
            o.shockShake -= dt;
            o.x += (Math.random() - 0.5) * 6 * o.shockShake;
            o.y += (Math.random() - 0.5) * 4 * o.shockShake;
          }
          if (o.spinVel) {
            o.rot = (o.rot || 0) + o.spinVel * dt;
            o.spinVel *= (1 - 1.2 * dt);
          }
          if (o.shockFall) {
            o.x += (o.vx || 0) * dt;
            o.y += (o.vy || 0) * dt;
            o.vy = (o.vy || 0) + 120 * dt;
            if (o.sonicDebris && Math.random() < 0.4) {
              if (!window.__airborneShockFX) window.__airborneShockFX = [];
              window.__airborneShockFX.push({
                kind: "debris",
                x: o.x + o.w * 0.5, y: o.y + o.h * 0.5,
                vx: (Math.random() - 0.5) * 80, vy: -20 - Math.random() * 40,
                life: 0.3, age: 0, r: 2 + Math.random() * 3
              });
            }
            var W0 = typeof W !== "undefined" ? W : 800;
            var H0 = typeof H !== "undefined" ? H : 600;
            if (o.x + o.w < -40 || o.x > W0 + 40 || o.y > H0 + 60) {
              obstacles.splice(oi, 1);
            }
          }
        }
      }
      var nowS = performance.now();
      var endAt = window.__airborneShockEndAt || 0;
      var timeLeft = endAt - nowS;
      // Final blast in last 0.6s
      if (!window.__airborneShockFinalDone && timeLeft < 600 && timeLeft > 0) {
        window.__airborneShockFinalDone = true;
        window.__airborneShockFlash = 1.0;
        try { if (typeof triggerScreenShake === "function") triggerScreenShake(16, 500); } catch (e) {}
        try { if (typeof sfxExplosion === "function") sfxExplosion(0.7); } catch (e) {}
        var bigR = Math.hypot(typeof W !== "undefined" ? W : 400, typeof H !== "undefined" ? H : 600) * 1.1;
        if (!window.__airborneShockFX) window.__airborneShockFX = [];
        window.__airborneShockFX.push({
          kind: "ring", x: player.x, y: player.y,
          r: 20, r0: 20, maxR: bigR, life: 0.7, age: 0, width: 8, gold: true, final: true
        });
        window.__airborneShockFX.push({
          kind: "ring", x: player.x, y: player.y,
          r: 30, r0: 30, maxR: bigR * 0.9, life: 0.65, age: 0, width: 5, gold: false, final: true
        });
        for (var sp = 0; sp < 40; sp++) {
          var sa = Math.random() * Math.PI * 2;
          var ss = 160 + Math.random() * 280;
          window.__airborneShockFX.push({
            kind: "spark", x: player.x, y: player.y,
            vx: Math.cos(sa) * ss, vy: Math.sin(sa) * ss,
            life: 0.45 + Math.random() * 0.25, age: 0, r: 2.5 + Math.random() * 4
          });
        }
        if (typeof window.__airborneSonicBlast === "function") {
          window.__airborneSonicBlast(player.x, player.y, bigR * 0.85, 1.6);
        }
      }
      // Repeating pulses
      window.__airborneShockPulseT = (window.__airborneShockPulseT || 0) + dt;
      var pulseEvery = 0.48 + Math.random() * 0.08;
      if (window.__airborneShockPulseT >= pulseEvery && timeLeft > 700) {
        window.__airborneShockPulseT = 0;
        window.__airborneShockPulseCount = (window.__airborneShockPulseCount || 0) + 1;
        var intensity = 0.75 + Math.random() * 0.45;
        var radius = Math.min(typeof W !== "undefined" ? W : 400, typeof H !== "undefined" ? H : 600) * (0.42 + Math.random() * 0.22);
        window.__airborneShockFlash = 0.45 + intensity * 0.25;
        try { if (typeof triggerScreenShake === "function") triggerScreenShake(5 + intensity * 4, 120); } catch (e) {}
        if (!window.__airborneShockFX) window.__airborneShockFX = [];
        var rings = 2 + (Math.random() < 0.4 ? 1 : 0);
        for (var si = 0; si < rings; si++) {
          window.__airborneShockFX.push({
            kind: "ring",
            x: player.x, y: player.y,
            r: 10 + si * 8, r0: 10 + si * 8,
            maxR: radius * (0.7 + si * 0.2) * intensity,
            life: 0.4 + Math.random() * 0.15, age: 0,
            width: 5 - si, gold: si === 0 && Math.random() < 0.5
          });
        }
        for (var sp = 0; sp < 14; sp++) {
          var sa = Math.random() * Math.PI * 2;
          var ss = 90 + Math.random() * 180;
          window.__airborneShockFX.push({
            kind: "spark", x: player.x, y: player.y,
            vx: Math.cos(sa) * ss, vy: Math.sin(sa) * ss,
            life: 0.28 + Math.random() * 0.2, age: 0, r: 1.5 + Math.random() * 3
          });
        }
        if (typeof window.__airborneSonicBlast === "function") {
          window.__airborneSonicBlast(player.x, player.y, radius, intensity);
        }
      }
      if (endAt && nowS >= endAt) {
        stormActive = false;
        stormMode = "storm";
        window.__airborneActivePowerVisual = null;
        window.__airborneActivePowerUntil = 0;
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
              try { creditPowerKillScore(1); } catch (e) {}
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
                try { creditPowerKillScore(1); } catch (e) {}
              }
            });
            main.onFire = true; main.vy = 90; main.scored = true;
            try { creditPowerKillScore(1); } catch (e) {}
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


    if (window.__airborneSpyShield && stormMode === "vortex") {
      var sh = window.__airborneSpyShield;
      sh.age += dt;
      var life = sh.life || 4.2;
      var t = sh.age / life;
      var px = (typeof player !== "undefined" && player) ? player.x : (typeof W !== "undefined" ? W : 400) * 0.3;
      var py = (typeof player !== "undefined" && player) ? player.y : (typeof H !== "undefined" ? H : 600) * 0.4;
      sh.x = px; sh.y = py;
      sh.spin = (sh.spin || 0) + (sh.spinVel || 2.5) * dt * (1 + t * 1.5);
      if (sh.flash > 0) sh.flash = Math.max(0, sh.flash - dt * 2.2);

      // Phases: ignite → expand → hold → retract → collapse
      if (t < 0.08) {
        sh.phase = "ignite";
        sh.r = 12 + (sh.maxR * 0.15 - 12) * (t / 0.08);
        sh.spinVel = 4;
      } else if (t < 0.32) {
        sh.phase = "expand";
        var et = (t - 0.08) / 0.24;
        sh.r = sh.maxR * 0.15 + (sh.maxR - sh.maxR * 0.15) * et;
        sh.spinVel = 2.8;
      } else if (t < 0.55) {
        sh.phase = "hold";
        sh.r = sh.maxR;
        sh.spinVel = 3.2 + (t - 0.32) * 4;
      } else if (t < 0.88) {
        sh.phase = "retract";
        var rt = (t - 0.55) / 0.33;
        sh.r = sh.maxR * Math.max(0.12, 1 - rt * 0.85);
        sh.spinVel = 5 + rt * 8;
      } else {
        sh.phase = "collapse";
        var ct = (t - 0.88) / 0.12;
        sh.r = sh.maxR * 0.12 * Math.max(0.02, 1 - ct);
        sh.spinVel = 14 + ct * 20;
        sh.collapseFlash = Math.min(1, ct * 1.5);
      }

      // Field particles — outward then reverse inward, orbits
      if (!sh.particles) sh.particles = [];
      // Spawn continuous spiral particles
      if (Math.random() < 0.7 && sh.phase !== "collapse") {
        var aS = Math.random() * Math.PI * 2;
        sh.particles.push({
          x: px + Math.cos(aS) * sh.r * (0.3 + Math.random() * 0.7),
          y: py + Math.sin(aS) * sh.r * (0.3 + Math.random() * 0.7),
          vx: 0, vy: 0,
          age: 0, life: 0.8 + Math.random() * 0.9,
          r: 1.5 + Math.random() * 3,
          phase: "in",
          orbitR: 20 + Math.random() * sh.r * 0.8,
          orbitA: aS,
          orbitSpd: (Math.random() < 0.5 ? 1 : -1) * (2 + Math.random() * 4),
          kind: "spark"
        });
      }
      for (var pi = sh.particles.length - 1; pi >= 0; pi--) {
        var p = sh.particles[pi];
        p.age += dt;
        if (p.phase === "out") {
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.vx *= (1 - 1.2 * dt); p.vy *= (1 - 1.2 * dt);
          if (p.age > 0.25) {
            p.phase = "in";
            p.orbitA = Math.atan2(p.y - py, p.x - px);
            p.orbitR = Math.hypot(p.x - px, p.y - py);
          }
        } else {
          p.orbitA += p.orbitSpd * dt;
          p.orbitR = Math.max(4, p.orbitR - 90 * dt * (1 + t));
          p.x = px + Math.cos(p.orbitA) * p.orbitR;
          p.y = py + Math.sin(p.orbitA) * p.orbitR * 0.88;
        }
        if (p.age >= p.life || p.orbitR < 5) sh.particles.splice(pi, 1);
      }

      // Purple energy arcs
      if (!sh.arcs) sh.arcs = [];
      if (Math.random() < 0.12) {
        var a1 = Math.random() * Math.PI * 2;
        var a2 = a1 + (Math.random() - 0.5) * 1.4;
        sh.arcs.push({
          a1: a1, a2: a2, r1: sh.r * (0.2 + Math.random() * 0.3),
          r2: sh.r * (0.5 + Math.random() * 0.4),
          age: 0, life: 0.15 + Math.random() * 0.2
        });
      }
      for (var ai = sh.arcs.length - 1; ai >= 0; ai--) {
        sh.arcs[ai].age += dt;
        if (sh.arcs[ai].age >= sh.arcs[ai].life) sh.arcs.splice(ai, 1);
      }

      // Suck obstacles — orbit then spiral in
      if (typeof obstacles !== "undefined") {
        if (!window.__airborneSuctionTrails) window.__airborneSuctionTrails = [];
        for (var vi = obstacles.length - 1; vi >= 0; vi--) {
          var vo = obstacles[vi];
          if (!vo || vo.isRing || vo.type === "ring" || vo.type === "gold_ring") continue;
          var vox = vo.x + vo.w * 0.5, voy = vo.y + vo.h * 0.5;
          var dx = px - vox, dy = py - voy;
          var dist = Math.hypot(dx, dy) || 1;
          if (dist > sh.r * 1.1 && sh.phase !== "retract" && sh.phase !== "collapse") continue;

          // Assign orbital personality once
          if (vo._vxDir == null) {
            vo._vxDir = Math.random() < 0.5 ? 1 : -1;
            vo._vxOrbit = 0.6 + Math.random() * 1.4;
            vo._vxWide = Math.random() < 0.35;
          }
          // Distance-based intensity
          var prox = 1 - Math.min(1, dist / Math.max(60, sh.r));
          var pull = (80 + prox * 280 + (sh.phase === "retract" || sh.phase === "collapse" ? 350 : 0));
          pull *= (sh.chainBoost || 1);
          // Orbit component
          var ox = -dy / dist, oy = dx / dist;
          var orbitForce = vo._vxOrbit * (vo._vxWide ? 90 : 55) * (0.5 + prox);
          if (sh.phase === "collapse") orbitForce *= 0.3;
          vo.x += (dx / dist) * pull * dt + ox * orbitForce * vo._vxDir * dt;
          vo.y += (dy / dist) * pull * dt + oy * orbitForce * vo._vxDir * dt;
          // Power-up has this target — no player-collision coin pops
          vo.powerAffected = true;
          // Shake + stretch feel
          vo.hitFlash = 0.3 + prox * 0.5;
          vo.vortexSpin = (vo.vortexSpin || 0) + (8 + prox * 20) * vo._vxDir * dt;
          // Suction trail
          if (Math.random() < 0.35) {
            window.__airborneSuctionTrails.push({
              x1: vox, y1: voy, x2: px, y2: py,
              age: 0, life: 0.25 + Math.random() * 0.2
            });
          }
          // Final snap destroy
          var killDist = Math.max(22, (player && player.w ? player.w : 40) * 0.5);
          if (dist < killDist || (sh.phase === "collapse" && dist < 80) || (sh.phase === "retract" && dist < 40 && t > 0.7)) {
            // Implosion burst
            if (!window.__airbornePurpleBursts) window.__airbornePurpleBursts = [];
            window.__airbornePurpleBursts.push({
              kind: "implode", x: vox, y: voy, age: 0, life: 0.35,
              r: 18 + Math.random() * 14, fragments: 12 + Math.floor(Math.random() * 10)
            });
            for (var sp = 0; sp < 18; sp++) {
              var sa = Math.random() * Math.PI * 2;
              var ss = 40 + Math.random() * 160;
              // outward then will be marked for suck in draw age
              window.__airbornePurpleBursts.push({
                kind: "spark", x: vox, y: voy,
                vx: Math.cos(sa) * ss, vy: Math.sin(sa) * ss,
                age: 0, life: 0.4 + Math.random() * 0.3, r: 2 + Math.random() * 3,
                reverseAt: 0.12
              });
            }
            try { if (window.PowerFX) window.PowerFX.burst(vox, voy, {
              count: 20, colors: ["#f5e1ff", "#d8b4fe", "#a855f7", "#6b21a8", "#fff"],
              speed: 170, glow: true
            }); } catch (e) {}
            try { if (typeof triggerScreenShake === "function") triggerScreenShake(5 + (sh.chainBoost || 1), 100); } catch (e) {}
            try { if (typeof sfxExplosion === "function") sfxExplosion(0.45); } catch (e) {}
            try { creditPowerKillScore(1); } catch (e) {}
            // Little Spy — always pop free coins from this target
            try {
              if (typeof window.spawnHitCoinBurst === "function") {
                window.spawnHitCoinBurst({ free: true, force: true, atX: vox, atY: voy });
              }
            } catch (e) {}
            // Chain reaction intensifies pull
            sh.chainBoost = Math.min(2.2, (sh.chainBoost || 1) + 0.15);
            obstacles.splice(vi, 1);
          }
        }
      }

      // Trails age
      if (window.__airborneSuctionTrails) {
        for (var ti = window.__airborneSuctionTrails.length - 1; ti >= 0; ti--) {
          window.__airborneSuctionTrails[ti].age += dt;
          if (window.__airborneSuctionTrails[ti].age >= window.__airborneSuctionTrails[ti].life)
            window.__airborneSuctionTrails.splice(ti, 1);
        }
      }
      // Bursts age + spark reverse toward center
      if (window.__airbornePurpleBursts) {
        for (var bi = window.__airbornePurpleBursts.length - 1; bi >= 0; bi--) {
          var pb = window.__airbornePurpleBursts[bi];
          pb.age += dt;
          if (pb.kind === "spark") {
            if (pb.reverseAt && pb.age > pb.reverseAt) {
              var rdx = px - pb.x, rdy = py - pb.y, rd = Math.hypot(rdx, rdy) || 1;
              pb.vx += (rdx / rd) * 500 * dt;
              pb.vy += (rdy / rd) * 500 * dt;
            }
            pb.x += pb.vx * dt; pb.y += pb.vy * dt;
          }
          if (pb.age >= pb.life) window.__airbornePurpleBursts.splice(bi, 1);
        }
      }

      // Continuous light vibration while active
      if (sh.phase !== "ignite" && Math.random() < 0.25) {
        try { if (typeof triggerScreenShake === "function") triggerScreenShake(2, 40); } catch (e) {}
      }
      if (sh.phase === "collapse") {
        try { if (typeof triggerScreenShake === "function") triggerScreenShake(6, 60); } catch (e) {}
      }

      if (sh.age >= life) {
        // Short final flash then clear everything — no lingering purple circle
        if (!window.__airbornePurpleBursts) window.__airbornePurpleBursts = [];
        window.__airbornePurpleBursts.push({
          kind: "shock", x: px, y: py, age: 0, life: 0.28, r: 16, maxR: Math.min(sh.maxR * 0.55, 160)
        });
        try { if (typeof triggerScreenShake === "function") triggerScreenShake(10, 320); } catch (e) {}
        window.__airborneSpyShield = null;
        window.__airborneActivePowerVisual = null;
        window.__airborneActivePowerUntil = 0;
        window.__airborneSuctionTrails = [];
        // Clear long-lived purple blobs (keep only the short end shock)
        window.__airbornePurpleBursts = (window.__airbornePurpleBursts || []).filter(function(pb) {
          return pb && pb.kind === "shock" && pb.age < 0.05;
        });
        stormActive = false;
        stormMode = "storm";
        stormCloud = null;
        stormTimer = 0;
      }
    }


    // ---- Storm Chaser — Thunder Chain ----
    if (stormMode === "chain" || window.__airborneThunderChain) {
      var tc = window.__airborneThunderChain;
      if (!tc) {
        stormActive = false;
        stormMode = "storm";
      } else {
        var dtC = dt;
        tc.age += dtC;
        tc.phaseT += dtC;
        if (tc.flash > 0) tc.flash = Math.max(0, tc.flash - dtC * 3.5);

        var px = (typeof player !== "undefined" && player) ? player.x : W * 0.3;
        var py = (typeof player !== "undefined" && player) ? player.y : H * 0.4;

        // Update storm clouds orbiting blimp
        if (window.__airborneStormClouds) {
          window.__airborneStormClouds.forEach(function(c) {
            c.ang += c.spin * dtC;
            c.phase += dtC * 3;
            c.x = px + Math.cos(c.ang) * c.dist;
            c.y = py + Math.sin(c.ang) * c.dist * 0.55 - 10;
          });
        }

        // Continuous aura arcs around Storm Chaser
        if (Math.random() < 0.55 && tc.phase !== "fade") {
          var a1 = Math.random() * Math.PI * 2;
          var a2 = a1 + (0.6 + Math.random() * 1.2) * (Math.random() < 0.5 ? 1 : -1);
          var ar = 20 + Math.random() * 30;
          tc.auraArcs.push({
            points: (typeof buildLightningPath === "function")
              ? buildLightningPath(
                  px + Math.cos(a1) * ar * 0.3, py + Math.sin(a1) * ar * 0.25,
                  px + Math.cos(a2) * ar, py + Math.sin(a2) * ar * 0.7,
                  12)
              : [[px, py], [px + 20, py - 10]],
            age: 0, life: 0.12 + Math.random() * 0.12, thick: 1.5
          });
        }

        function zapObstacle(o, fromX, fromY, thick) {
          if (!o || o.isRing || o.type === "gold_ring" || o.type === "ring") return null;
          var oid = o._uid || (o._uid = "z" + Math.random().toString(36).slice(2));
          if (tc.hitIds[oid]) return null;
          tc.hitIds[oid] = true;
          var ox = o.x + o.w * 0.5;
          var oy = o.y + o.h * 0.5;
          var pts = (typeof buildLightningPath === "function")
            ? buildLightningPath(fromX, fromY, ox, oy, 28 + Math.random() * 20)
            : [[fromX, fromY], [ox, oy]];
          tc.bolts.push({ points: pts, age: 0, life: 0.28 + Math.random() * 0.12, thick: thick || 4 });
          // Electrify
          o.electrified = true;
          o.powerAffected = true;
          o.shockFall = true;
          o.lightningFire = true;
          o.hitFlash = 1;
          o.vy = 70 + Math.random() * 60;
          o.vx = (Math.random() - 0.5) * 80;
          o.spinVel = (Math.random() - 0.5) * 10;
          o.scored = true;
          o.onFire = true;
          try {
            if (window.PowerFX) window.PowerFX.burst(ox, oy, {
              count: 16, colors: ["#fff", "#e0f2fe", "#7dd3fc", "#38bdf8", "#1e3a8a"],
              speed: 130, life: 0.55, glow: true
            });
          } catch (e) {}
          try { creditPowerKillScore(1); } catch (e) {}
          try { if (typeof sfxHit === "function") sfxHit(); } catch (e) {}
          // Branch queue
          tc.chainQueue.push({ x: ox, y: oy, depth: 0 });
          return { x: ox, y: oy };
        }

        function nearestTargets(fromX, fromY, limit, maxDist) {
          if (typeof obstacles === "undefined" || !obstacles) return [];
          var list = [];
          for (var i = 0; i < obstacles.length; i++) {
            var o = obstacles[i];
            if (!o || o.isRing || o.type === "gold_ring" || o.type === "ring") continue;
            var oid = o._uid || (o._uid = "z" + Math.random().toString(36).slice(2));
            if (tc.hitIds[oid]) continue;
            if (o.powerAffected && o.electrified) continue;
            var ox = o.x + o.w * 0.5, oy = o.y + o.h * 0.5;
            var d = Math.hypot(ox - fromX, oy - fromY);
            if (d < maxDist) list.push({ o: o, d: d, x: ox, y: oy });
          }
          list.sort(function(a, b) { return a.d - b.d; });
          return list.slice(0, limit);
        }

        // Phases
        if (tc.phase === "charge") {
          // Dark clouds form, hull charges
          if (tc.phaseT > 0.45) {
            tc.phase = "primary";
            tc.phaseT = 0;
            tc.flash = 0.85;
            try { if (typeof sfxThunder === "function") sfxThunder(); } catch (e) {}
            try { if (typeof triggerScreenShake === "function") triggerScreenShake(10, 280); } catch (e) {}
            // Primary strike to nearest
            var near = nearestTargets(px, py, 1, 9999);
            if (near.length) {
              zapObstacle(near[0].o, px, py, 6);
              tc.primaryDone = true;
            } else {
              // Strike forward anyway
              var fx = px + 180, fy = py + (Math.random() - 0.5) * 40;
              var pts0 = (typeof buildLightningPath === "function")
                ? buildLightningPath(px, py, fx, fy, 35) : [[px, py], [fx, fy]];
              tc.bolts.push({ points: pts0, age: 0, life: 0.3, thick: 6 });
            }
          }
        } else if (tc.phase === "primary" || tc.phase === "chain") {
          if (tc.phase === "primary" && tc.phaseT > 0.15) {
            tc.phase = "chain";
            tc.phaseT = 0;
          }
          // Process chain queue — each hit splits into 2–3 branches
          var budget = 8; // more simultaneous chains
          while (tc.chainQueue.length && budget > 0) {
            var src = tc.chainQueue.shift();
            var branches = 3 + Math.floor(Math.random() * 3); // 3–5
            var cands = nearestTargets(src.x, src.y, branches, 220);
            if (!cands.length) continue;
            for (var bi = 0; bi < cands.length; bi++) {
              zapObstacle(cands[bi].o, src.x, src.y, 3.5 + Math.random() * 1.5);
              budget--;
              tc.chainsDone++;
              if (budget <= 0) break;
            }
            if (cands.length) {
              tc.flash = Math.max(tc.flash, 0.45);
              if (Math.random() < 0.4) {
                try { if (typeof sfxThunder === "function") sfxThunder(); } catch (e) {}
                try { if (typeof triggerScreenShake === "function") triggerScreenShake(5, 100); } catch (e) {}
              }
            }
          }
          // Also keep seeking new primaries occasionally
          if (tc.phaseT > 0.35 && Math.random() < 0.08) {
            var n2 = nearestTargets(px, py, 1, 280);
            if (n2.length) {
              zapObstacle(n2[0].o, px, py, 5);
              tc.flash = 0.55;
            }
            tc.phaseT = 0;
          }
          if (tc.age > 3.6 && !tc.finalDone) {
            tc.phase = "final";
            tc.phaseT = 0;
          }
        } else if (tc.phase === "final") {
          if (!tc.finalDone) {
            tc.finalDone = true;
            tc.flash = 1;
            try { if (typeof sfxThunder === "function") sfxThunder(); } catch (e) {}
            try { if (typeof triggerScreenShake === "function") triggerScreenShake(14, 500); } catch (e) {}
            // Gigantic vertical bolt from sky to ground center
            var cx = W * 0.5 + (Math.random() - 0.5) * 40;
            var ptsF = (typeof buildLightningPath === "function")
              ? buildLightningPath(cx, -20, cx + (Math.random() - 0.5) * 30, H + 20, 50)
              : [[cx, -20], [cx, H + 20]];
            tc.bolts.push({ points: ptsF, age: 0, life: 0.55, thick: 10 });
            // Wipe remaining hazards
            if (typeof obstacles !== "undefined" && obstacles) {
              for (var wi = 0; wi < obstacles.length; wi++) {
                var wo = obstacles[wi];
                if (!wo || wo.isRing || wo.type === "gold_ring") continue;
                var woid = wo._uid || (wo._uid = "z" + Math.random().toString(36).slice(2));
                if (tc.hitIds[woid]) continue;
                zapObstacle(wo, cx, H * 0.4, 4);
              }
            }
          }
          if (tc.phaseT > 0.7) {
            tc.phase = "fade";
            tc.phaseT = 0;
          }
        } else if (tc.phase === "fade") {
          // Floating residual sparks
          if (Math.random() < 0.4) {
            tc.sparks.push({
              x: Math.random() * W, y: Math.random() * H * 0.7,
              vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 40,
              age: 0, life: 0.6 + Math.random() * 0.5, r: 1.5 + Math.random() * 2
            });
          }
        }

        // Age bolts / arcs / sparks
        for (var bi2 = tc.bolts.length - 1; bi2 >= 0; bi2--) {
          tc.bolts[bi2].age += dtC;
          if (tc.bolts[bi2].age >= tc.bolts[bi2].life) tc.bolts.splice(bi2, 1);
        }
        for (var ai = tc.auraArcs.length - 1; ai >= 0; ai--) {
          tc.auraArcs[ai].age += dtC;
          if (tc.auraArcs[ai].age >= tc.auraArcs[ai].life) tc.auraArcs.splice(ai, 1);
        }
        for (var si = tc.sparks.length - 1; si >= 0; si--) {
          var sp = tc.sparks[si];
          sp.age += dtC;
          sp.x += sp.vx * dtC;
          sp.y += sp.vy * dtC;
          if (sp.age >= sp.life) tc.sparks.splice(si, 1);
        }

        if (tc.age >= tc.life) {
          window.__airborneThunderChain = null;
          window.__airborneStormClouds = null;
          window.__airborneActivePowerVisual = null;
          window.__airborneActivePowerUntil = 0;
          stormActive = false;
          stormMode = "storm";
          stormTimer = 0;
        }
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
              try { creditPowerKillScore(1); } catch (e) {}
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

    // Safety: if steam mode stuck without OD state, clear so power can re-fire
    if (stormMode === "steam" && stormActive && !window.__airborneSteamOD) {
      if (window.__airborneSteamUntil && performance.now() > window.__airborneSteamUntil) {
        stormActive = false;
        stormMode = "storm";
        stormTimer = 0;
        window.__airborneActivePowerVisual = null;
      } else if (!window.__airborneSteamUntil) {
        // legacy steam cone path — clear after short window
        window.__airborneSteamUntil = performance.now() + 1500;
      }
    }
    // ---- Steampunk Steam Overdrive ----
    if (window.__airborneSteamOD) {
      var sod = window.__airborneSteamOD;
      sod.age += dt;
      sod.phaseT += dt;
      var spx = (typeof player !== "undefined" && player) ? player.x : W * 0.3;
      var spy = (typeof player !== "undefined" && player) ? player.y : H * 0.4;
      var maxR = Math.min(W, H) * 0.72;
      sod.waveR = sod.waveR || 0;

      function emitSteamPart(kind, ang, spd, life, r0) {
        if (!window.__airborneSteamParts) window.__airborneSteamParts = [];
        window.__airborneSteamParts.push({
          x: spx, y: spy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: life, age: 0, r: r0,
          kind: kind || "steam"
        });
      }

      function pushObstaclesInRadius(radius, force) {
        if (typeof obstacles === "undefined" || !obstacles) return;
        var hitCount = 0;
        for (var i = 0; i < obstacles.length; i++) {
          var o = obstacles[i];
          if (!o || o.isRing || o.type === "gold_ring" || o.type === "ring") continue;
          if (o._steamHit) continue; // already launched by this blast
          var ox = o.x + (o.w || 20) * 0.5, oy = o.y + (o.h || 20) * 0.5;
          var dx = ox - spx, dy = oy - spy;
          var dist = Math.hypot(dx, dy) || 1;
          if (dist > radius) continue;
          var nx = dx / dist, ny = dy / dist;
          var prox = 1 - dist / Math.max(radius, 1);
          o._steamHit = true;
          o.vx = nx * (force * (1.0 + prox * 1.6)) + (Math.random() - 0.5) * 50;
          o.vy = ny * (force * (0.7 + prox * 1.1)) + (Math.random() - 0.5) * 60 - 40;
          o.steamPush = 0.85 + prox * 0.4;
          o.steamHeat = 0.9;
          o.powerAffected = true;
          o.onFire = true; // treat as destroyed by power
          o.hitFlash = 0.6;
          o.spinVel = (Math.random() - 0.5) * (10 + prox * 12);
          o.wobble = 0.4 + prox * 0.5;
          o.scored = true;
          hitCount++;
          try { creditPowerKillScore(1); } catch (e) {}
          try {
            if (window.PowerFX) window.PowerFX.burst(ox, oy, {
              count: 10, colors: ["#9ca3af", "#d1d5db", "#6b7280", "#fbbf24"],
              speed: 90, life: 0.4, glow: false
            });
          } catch (e) {}
        }
        return hitCount;
      }

      // Thick rotating steam cloud around blimp + pulsing pressure rings
      if (!sod.orbitClouds) {
        sod.orbitClouds = [];
        for (var oi = 0; oi < 14; oi++) {
          sod.orbitClouds.push({
            ang: (oi / 14) * Math.PI * 2,
            dist: 28 + (oi % 4) * 14,
            r: 20 + (oi % 5) * 8,
            spin: 0.9 + (oi % 3) * 0.55,
            phase: Math.random() * Math.PI * 2
          });
        }
      }
      // Continuous pulsing steam rings around hull
      sod.pulseT = (sod.pulseT || 0) + dt;
      if (sod.pulseT >= 0.45) {
        sod.pulseT = 0;
        if (!sod.rings) sod.rings = [];
        sod.rings.push({
          r: 18,
          maxR: 70 + Math.random() * 30,
          age: 0,
          life: 0.85,
          delay: 0,
          pulse: true
        });
      }
      sod.orbitClouds.forEach(function(c) {
        c.ang += c.spin * dt;
        c.phase += dt * 2.5;
        c.x = spx + Math.cos(c.ang) * c.dist;
        c.y = spy + Math.sin(c.ang) * c.dist * 0.62;
      });

      if (sod.phase === "charge") {
        // Pressure build — rattling particles, gauges spike
        sod.gauges = Math.min(1, sod.phaseT / 0.45);
        if (Math.random() < 0.5) {
          emitSteamPart("vent", Math.random() * Math.PI * 2, 20 + Math.random() * 40, 0.35, 4 + Math.random() * 6);
        }
        if (sod.phaseT > 0.45) {
          sod.phase = "blast";
          sod.phaseT = 0;
          sod.blastDone = true;
          try { if (typeof sfxExplosion === "function") sfxExplosion(0.55); } catch (e) {}
          try { if (typeof triggerScreenShake === "function") triggerScreenShake(12, 420); } catch (e) {}
          // Main white-hot radial blast
          pushObstaclesInRadius(maxR, 280);
          for (var ri = 0; ri < 4; ri++) {
            sod.rings.push({ r: 10, maxR: maxR * (0.55 + ri * 0.15), age: 0, life: 0.7 + ri * 0.08, delay: ri * 0.07 });
          }
          for (var pi = 0; pi < 90; pi++) {
            var a = Math.random() * Math.PI * 2;
            var kind = Math.random() < 0.08 ? "brass" : (Math.random() < 0.15 ? "spark" : "steam");
            emitSteamPart(kind, a, 140 + Math.random() * 280, 0.75 + Math.random() * 0.55, 12 + Math.random() * 22);
          }
        }
      } else if (sod.phase === "blast") {
        // Expanding steam wave — damages as it grows
        sod.waveR = Math.min(maxR, sod.waveR + maxR * 1.8 * dt);
        pushObstaclesInRadius(sod.waveR, 320);
        // Puffy steam clouds along the expanding front
        if (Math.random() < 0.85) {
          for (var bi = 0; bi < 3; bi++) {
            var ba = Math.random() * Math.PI * 2;
            emitSteamPart("steam", ba, sod.waveR * 0.9 + Math.random() * 40, 0.7 + Math.random() * 0.4, 14 + Math.random() * 18);
            // place particle at wave front
            var lp = window.__airborneSteamParts[window.__airborneSteamParts.length - 1];
            if (lp) {
              lp.x = spx + Math.cos(ba) * sod.waveR * 0.95;
              lp.y = spy + Math.sin(ba) * sod.waveR * 0.95;
              lp.vx = Math.cos(ba) * (40 + Math.random() * 50);
              lp.vy = Math.sin(ba) * (40 + Math.random() * 50) - 15;
            }
          }
        }
        if (sod.phaseT > 0.55) {
          sod.phase = "rings";
          sod.phaseT = 0;
        }
      } else if (sod.phase === "rings") {
        sod.waveR = Math.min(maxR * 1.05, sod.waveR + maxR * 0.6 * dt);
        pushObstaclesInRadius(sod.waveR, 200);
        if (Math.random() < 0.5) {
          var ra = Math.random() * Math.PI * 2;
          emitSteamPart("steam", ra, 30 + Math.random() * 40, 0.6, 12 + Math.random() * 14);
          var rp = window.__airborneSteamParts[window.__airborneSteamParts.length - 1];
          if (rp) {
            rp.x = spx + Math.cos(ra) * sod.waveR;
            rp.y = spy + Math.sin(ra) * sod.waveR;
          }
        }
        if (sod.phaseT > 0.65 && !sod.finalDone) {
          sod.phase = "final";
          sod.phaseT = 0;
        }
      } else if (sod.phase === "final") {
        if (!sod.finalDone) {
          sod.finalDone = true;
          // Second smaller exhaust blast — BOOM-HISS finish
          try { if (typeof sfxExplosion === "function") sfxExplosion(0.3); } catch (e) {}
          try { if (typeof triggerScreenShake === "function") triggerScreenShake(7, 220); } catch (e) {}
          sod.rings.push({ r: 8, maxR: maxR * 0.4, age: 0, life: 0.5, delay: 0 });
          sod.rings.push({ r: 8, maxR: maxR * 0.55, age: 0, life: 0.55, delay: 0.06 });
          pushObstaclesInRadius(maxR * 0.5, 200);
          // Exhaust pipes (rear of blimp)
          for (var ei = 0; ei < 20; ei++) {
            var ea = Math.PI + (Math.random() - 0.5) * 0.9;
            emitSteamPart("steam", ea, 80 + Math.random() * 100, 0.5, 6 + Math.random() * 10);
          }
        }
        if (sod.phaseT > 0.45) {
          sod.phase = "fade";
          sod.phaseT = 0;
        }
      }

      // Age rings
      for (var rgi = sod.rings.length - 1; rgi >= 0; rgi--) {
        var rg = sod.rings[rgi];
        if (rg.delay > 0) { rg.delay -= dt; continue; }
        rg.age += dt;
        var rt = Math.min(1, rg.age / rg.life);
        rg.r = rg.maxR * rt;
        if (rg.age >= rg.life) sod.rings.splice(rgi, 1);
      }

      // End — CRITICAL: clear stormActive so power can fire again
      if (sod.age >= sod.life) {
        window.__airborneSteamOD = null;
        window.__airborneActivePowerVisual = null;
        window.__airborneActivePowerUntil = 0;
        window.__airborneSteamUntil = 0;
        stormActive = false;
        stormMode = "storm";
        stormTimer = 0;
      }
    }

    // Steam particles
    if (window.__airborneSteamParts && window.__airborneSteamParts.length) {
      for (var spi = window.__airborneSteamParts.length - 1; spi >= 0; spi--) {
        var sp = window.__airborneSteamParts[spi];
        sp.age += dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt;
        sp.r += 12 * dt; sp.vx *= (1 - 0.6 * dt); sp.vy *= (1 - 0.4 * dt);
        if (sp.age >= sp.life) window.__airborneSteamParts.splice(spi, 1);
      }
    }
    if (window.__airborneSteamCone) {
      window.__airborneSteamCone.age += dt;
      if (window.__airborneSteamCone.age >= window.__airborneSteamCone.life) window.__airborneSteamCone = null;
    }
    // Steam-pushed obstacles
    if (typeof obstacles !== "undefined") {
      for (var soi = obstacles.length - 1; soi >= 0; soi--) {
        var so = obstacles[soi];
        if (!so) continue;
        if (so.steamPush != null) {
          so.steamPush -= dt;
          so.x += (so.vx || 0) * dt;
          so.y += (so.vy || 0) * dt;
          if (so.spinVel) so.rot = (so.rot || 0) + so.spinVel * dt;
          if (so.wobble) {
            so.wobble -= dt;
            so.hitFlash = Math.max(so.hitFlash || 0, 0.5);
            if (so.wobble < 0) so.wobble = 0;
          }
          if (so.steamHeat) { so.steamHeat -= dt; so.hitFlash = Math.max(so.hitFlash || 0, 0.4); }
          if (so.steamPush <= 0 || so.x > W + 120 || so.x < -120 || so.y > H + 100) {
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
              try { creditPowerKillScore(1); } catch (e) {}
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
        window.__airbornePlasmaOrbits = null;
        window.__airbornePlasmaArcs = null;
        window.__airbornePlasmaSparks = null;
        window.__airbornePlasmaIgnite = null;
        return;
      }
      window.__airborneActivePowerVisual = "fireball";
      window.__airborneActivePowerUntil = untilFb;
      if (!window.__airborneFireballs) window.__airborneFireballs = [];
      // Azure Barrage — engine flare + plasma orbit system
      if (stormMode === "bluefireball") {
        if (window.__airborneEngineFlare) {
          window.__airborneEngineFlare.age += dt;
          if (window.__airborneEngineFlare.age >= window.__airborneEngineFlare.life) {
            window.__airborneEngineFlare = null;
          }
        }
        if (window.__airborneBlueFlash) {
          window.__airborneBlueFlash.age += dt;
          if (window.__airborneBlueFlash.age >= window.__airborneBlueFlash.life) {
            window.__airborneBlueFlash = null;
          }
        }
        if (window.__airbornePlasmaIgnite) {
          window.__airbornePlasmaIgnite.age += dt;
          window.__airbornePlasmaIgnite.shockR += 280 * dt;
          if (window.__airbornePlasmaIgnite.age >= window.__airbornePlasmaIgnite.life) {
            window.__airbornePlasmaIgnite = null;
          }
        }
        // Orbit plasma fireballs around blimp
        if (window.__airbornePlasmaOrbits && typeof player !== "undefined" && player) {
          var orbs = window.__airbornePlasmaOrbits;
          for (var oi = 0; oi < orbs.length; oi++) {
            var orb = orbs[oi];
            var accel = window.__airbornePlasmaIgnite ? 1.8 : 1.0;
            orb.ang += orb.spin * accel * dt;
            orb.pulse += dt * 10;
            // 3D ellipse: z from sin for front/back
            orb.z = Math.sin(orb.ang);
            orb.x = player.x + Math.cos(orb.ang) * orb.distX;
            orb.y = player.y + Math.sin(orb.ang) * orb.distY * orb.tilt;
            // curved trail
            if (!orb.trail) orb.trail = [];
            orb.trail.push({ x: orb.x, y: orb.y, age: 0, life: 0.35 });
            if (orb.trail.length > 18) orb.trail.shift();
            for (var ti = orb.trail.length - 1; ti >= 0; ti--) {
              orb.trail[ti].age += dt;
              if (orb.trail[ti].age >= orb.trail[ti].life) orb.trail.splice(ti, 1);
            }
            // thin lightning arc to hull occasionally
            if (Math.random() < 0.08) {
              if (!window.__airbornePlasmaArcs) window.__airbornePlasmaArcs = [];
              var pts = (typeof buildLightningPath === "function")
                ? buildLightningPath(player.x, player.y, orb.x, orb.y, 10)
                : [[player.x, player.y], [orb.x, orb.y]];
              window.__airbornePlasmaArcs.push({ points: pts, age: 0, life: 0.1 });
            }
            // sparks
            if (Math.random() < 0.25) {
              if (!window.__airbornePlasmaSparks) window.__airbornePlasmaSparks = [];
              window.__airbornePlasmaSparks.push({
                x: orb.x, y: orb.y,
                vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60,
                age: 0, life: 0.25 + Math.random() * 0.2, r: 1.5 + Math.random() * 2
              });
            }
            // Pierce/burn obstacles on contact
            if (typeof obstacles !== "undefined") {
              for (var hi = 0; hi < obstacles.length; hi++) {
                var o = obstacles[hi];
                if (!o || o.isRing || o.type === "gold_ring" || o.type === "ring") continue;
                if (o.powerAffected && o.onFire) continue;
                var ox = o.x + o.w * 0.5, oy = o.y + o.h * 0.5;
                if (Math.hypot(orb.x - ox, orb.y - oy) < (orb.r || 8) * 1.8 + Math.max(o.w, o.h) * 0.4) {
                  if (!orb.hitIds) orb.hitIds = {};
                  var oid = o._uid || (o._uid = "p" + Math.random().toString(36).slice(2));
                  if (orb.hitIds[oid]) continue;
                  orb.hitIds[oid] = true;
                  o.onFire = true;
                  o.blueFire = true;
                  o.powerAffected = true;
                  o.hitFlash = 0.8;
                  o.vy = 80 + Math.random() * 50;
                  o.vx = (Math.random() - 0.5) * 70;
                  o.spinVel = (Math.random() - 0.5) * 9;
                  o.scored = true;
                  try { creditPowerKillScore(1); } catch (e) {}
                  try {
                    if (window.PowerFX) window.PowerFX.burst(ox, oy, {
                      count: 20, colors: ["#fff", "#e0f2fe", "#67e8f9", "#38bdf8", "#1d4ed8"],
                      speed: 140, life: 0.55, glow: true
                    });
                  } catch (e) {}
                }
              }
            }
          }
          // age arcs / sparks
          if (window.__airbornePlasmaArcs) {
            for (var ai = window.__airbornePlasmaArcs.length - 1; ai >= 0; ai--) {
              window.__airbornePlasmaArcs[ai].age += dt;
              if (window.__airbornePlasmaArcs[ai].age >= window.__airbornePlasmaArcs[ai].life)
                window.__airbornePlasmaArcs.splice(ai, 1);
            }
          }
          if (window.__airbornePlasmaSparks) {
            for (var si = window.__airbornePlasmaSparks.length - 1; si >= 0; si--) {
              var sp = window.__airbornePlasmaSparks[si];
              sp.age += dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt;
              if (sp.age >= sp.life) window.__airbornePlasmaSparks.splice(si, 1);
            }
          }
        }
      } else {
        window.__airborneEngineFlare = null;
        window.__airbornePlasmaOrbits = null;
        window.__airbornePlasmaArcs = null;
        window.__airbornePlasmaSparks = null;
        window.__airbornePlasmaIgnite = null;
      }

      // Spawn fireballs periodically from hull
      if (!window.__airborneFireballSpawnT) window.__airborneFireballSpawnT = 0;
      window.__airborneFireballSpawnT -= dt;
      if (window.__airborneFireballSpawnT <= 0 && typeof player !== "undefined" && player) {
        var fbColors = ["#ffd24a", "#ff8a1a", "#ff3b00"];
        var smokeCol = "rgba(60,55,50,1)";
        var ang = -0.35 + Math.random() * 0.7;
        var sp = 160 + Math.random() * 80;
        var spawnX = player.x + (player.w || 40) * 0.3;
        var spawnY = player.y;
        var isFinisher = false;
        var pierce = 1;
        var rSize = 10 + Math.random() * 4;
        var lifeT = 1.6;

        if (stormMode === "bluefireball") {
          // Azure Barrage — 3–5 plasma blades, vertical fan, from front
          fbColors = ["#f0f9ff", "#bae6fd", "#38bdf8", "#0ea5e9", "#0284c7"];
          smokeCol = "rgba(30,80,140,0.7)";
          var barrage = window.__airborneAzureBarrage;
          if (!barrage) {
            barrage = { shotsLeft: 4, fired: 0, total: 4 };
            window.__airborneAzureBarrage = barrage;
          }
          if (barrage.shotsLeft <= 0) {
            // volley complete — no more auto-fire
            window.__airborneFireballSpawnT = 999;
          } else {
            window.__airborneFireballSpawnT = 0.10 + Math.random() * 0.04;
            barrage.shotsLeft--;
            barrage.fired++;
          }
          var total = Math.max(1, barrage.total || 4);
          var slot = barrage.fired - 1;
          // slight vertical fan across the stream
          ang = -0.38 + (slot / Math.max(1, total - 1)) * 0.76 + (Math.random() - 0.5) * 0.06;
          sp = 260 + Math.random() * 50;
          // Launch from front of blimp
          spawnX = player.x + (player.w || 40) * 0.55;
          spawnY = player.y + Math.sin(ang) * (player.h || 30) * 0.22;
          pierce = 5; // burn through multiple obstacles
          isFinisher = (barrage.shotsLeft === 0);
          rSize = isFinisher ? 15 + Math.random() * 3 : 9 + Math.random() * 3;
          lifeT = isFinisher ? 2.0 : 1.55;
          try { if (typeof sfxShoot === "function") sfxShoot(); } catch (e) {}
        } else if (stormMode === "greenfireball") {
          window.__airborneFireballSpawnT = 0.10;
          fbColors = ["#ecfdf5", "#6ee7b7", "#10b981", "#059669", "#047857"];
          smokeCol = "rgba(30,80,50,0.85)";
          if (window.__airborneGreenSpiralAng == null) window.__airborneGreenSpiralAng = 0;
          window.__airborneGreenSpiralAng += 0.55;
          ang = window.__airborneGreenSpiralAng;
          sp = 180 + Math.random() * 60;
          spawnX = player.x + (player.w || 40) * 0.4 + Math.cos(ang) * 8;
          spawnY = player.y + Math.sin(ang) * (player.h || 28) * 0.35;
          rSize = 14 + Math.random() * 5;
          lifeT = 2.2;
          pierce = 2;
        } else {
          // Ironworks orange fireballs
          window.__airborneFireballSpawnT = 0.14;
          fbColors = ["#fff7ed", "#ffd24a", "#ff8a1a", "#ff3b00", "#dc2626"];
          smokeCol = "rgba(50,40,30,0.85)";
          ang = -0.4 + Math.random() * 0.8;
          sp = 200 + Math.random() * 90;
          spawnX = player.x + (player.w || 40) * 0.45;
          spawnY = player.y + (Math.random() - 0.5) * (player.h || 30) * 0.4;
          rSize = 13 + Math.random() * 5;
          lifeT = 2.0;
          pierce = 2;
        }

        window.__airborneFireballs.push({
          x: spawnX,
          y: spawnY,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp * (stormMode === "greenfireball" ? 0.45 : (stormMode === "bluefireball" ? 0.85 : 0.6))
            - (stormMode === "greenfireball" ? 35 : (stormMode === "bluefireball" ? 5 : 20)),
          life: lifeT,
          age: 0,
          r: rSize,
          trails: [],
          colors: fbColors,
          smokeCol: smokeCol,
          kind: stormMode,
          pierce: pierce,
          finisher: isFinisher,
          accel: stormMode === "bluefireball" ? 120 : 0,
          hitIds: {}
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
        if (fb.kind === "bluefireball") {
          fb.vy += 18 * dt; // nearly straight plasma shot
        } else {
          fb.vy += 90 * dt; // mild gravity
        }
        // Trails — thin teardrop ribbons in crossing S-motions
        if (fb.kind === "bluefireball") {
          var spd = Math.hypot(fb.vx, fb.vy) || 1;
          var bx = fb.vx / spd, by = fb.vy / spd;
          // perpendicular for S-weave
          var px = -by, py = bx;
          // more ribbon strands crossing each other
          for (var tp = 0; tp < 5; tp++) {
            var side = (tp % 2 === 0) ? 1 : -1;
            var phase0 = tp * 1.1 + Math.random() * 0.4;
            fb.trails.push({
              x: fb.x - bx * (4 + tp * 2) + px * side * 3,
              y: fb.y - by * (4 + tp * 2) + py * side * 3,
              vx: -fb.vx * 0.22 + px * side * (25 + Math.random() * 20),
              vy: -fb.vy * 0.22 + py * side * (25 + Math.random() * 20),
              life: 0.45 + Math.random() * 0.25,
              age: 0,
              r: 2.2 + Math.random() * 1.8, // thinner
              spark: false,
              layer: tp % 2, // alternate cyan / deep blue so they cross visually
              sPhase: phase0,
              sAmp: 18 + Math.random() * 14,
              sFreq: 9 + Math.random() * 5,
              sSide: side,
              px: px, py: py,
              tear: true
            });
          }
          // extra tiny embers at jagged tips
          for (var es = 0; es < 2; es++) {
            fb.trails.push({
              x: fb.x + (Math.random() - 0.5) * 5,
              y: fb.y + (Math.random() - 0.5) * 5,
              vx: -fb.vx * 0.25 + (Math.random() - 0.5) * 60,
              vy: -fb.vy * 0.25 + (Math.random() - 0.5) * 70,
              life: 0.22 + Math.random() * 0.18,
              age: 0,
              r: 1.2 + Math.random() * 1.5,
              spark: true,
              layer: 0
            });
          }
        } else if (Math.random() < 0.7) {
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
          // S-curve weave so ribbons cross each other
          if (tr.sAmp && tr.px != null) {
            tr.sPhase = (tr.sPhase || 0) + (tr.sFreq || 10) * dt;
            var sOff = Math.sin(tr.sPhase) * tr.sAmp * (tr.sSide || 1) * dt;
            tr.x += tr.vx * dt + tr.px * sOff;
            tr.y += tr.vy * dt + tr.py * sOff;
          } else {
            tr.x += tr.vx * dt;
            tr.y += tr.vy * dt;
          }
          // teardrops stay thinner; only slight growth
          if (tr.tear) tr.r += 2.5 * dt;
          else tr.r += 8 * dt;
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
              // Avoid double-hitting same obstacle with one plasma shot
              var oid = o._uid || (o._uid = "o" + Math.random().toString(36).slice(2));
              if (fb.hitIds && fb.hitIds[oid]) continue;
              if (!fb.hitIds) fb.hitIds = {};
              fb.hitIds[oid] = true;

              o.onFire = true;
              o.powerAffected = true;
              o.vy = 40;
              if (fb.kind === "greenfireball") {
                o.greenFire = true;
                o.vy = 55 + Math.random() * 30;
              }
              if (fb.kind === "bluefireball") {
                // Glow blue, crack, burn apart
                o.blueFire = true;
                o.azureGlow = 1;
                o.hitFlash = 1;
                o.vy = 90 + Math.random() * 50;
                o.vx = (Math.random() - 0.5) * 80;
                o.spinVel = (Math.random() - 0.5) * 8;
                if (fb.finisher) {
                  o.vy += 40;
                  try {
                    if (window.PowerFX) window.PowerFX.burst(ox, oy, {
                      count: 22, colors: ["#e0f2fe", "#38bdf8", "#0ea5e9", "#fff"],
                      speed: 140, life: 0.5, glow: true
                    });
                  } catch (e) {}
                  try { if (typeof triggerScreenShake === "function") triggerScreenShake(6, 180); } catch (e) {}
                }
              }
              try { if (typeof spawnHitParticles === "function") spawnHitParticles(ox, oy); } catch (e) {}
              try {
                var cols = fb.colors || ["#ff6b3d", "#ffd24a", "#ff1a00"];
                if (fb.kind === "greenfireball") cols = ["#d1fae5", "#34d399", "#059669", "#fff"];
                if (fb.kind === "bluefireball") cols = ["#ffffff", "#e0f2fe", "#67e8f9", "#38bdf8", "#1d4ed8"];
                else cols = cols;
                if (window.PowerFX) window.PowerFX.burst(ox, oy, {
                  count: fb.kind === "bluefireball" ? 26 : 12,
                  colors: cols,
                  speed: fb.kind === "bluefireball" ? 150 : 80,
                  gravity: -25,
                  life: fb.kind === "bluefireball" ? 0.7 : 0.55,
                  glow: true
                });
                // Quick blue-white flash on azure hit
                if (fb.kind === "bluefireball") {
                  try {
                    if (window.PowerFX) window.PowerFX.burst(ox, oy, {
                      count: 10, colors: ["#fff", "#a5f3fc"], speed: 40, life: 0.25, glow: true, radial: true
                    });
                  } catch (e2) {}
                }
              } catch (e) {}
              try { creditPowerKillScore(1); } catch (e) {}

              if (fb.kind === "bluefireball") {
                // Piercing plasma — keep going through targets
                fb.pierce = (fb.pierce || 1) - 1;
                if (fb.finisher) {
                  // Finisher blue explosion
                  try {
                    if (window.PowerFX) window.PowerFX.burst(ox, oy, {
                      count: 28, colors: ["#fff", "#bae6fd", "#38bdf8", "#0284c7"],
                      speed: 140, gravity: -20, life: 0.65, glow: true, radial: true
                    });
                  } catch (e) {}
                  try { if (typeof triggerScreenShake === "function") triggerScreenShake(7, 200); } catch (e) {}
                  try { if (typeof sfxExplosion === "function") sfxExplosion(0.45); } catch (e) {}
                  fb.age = fb.life;
                  break;
                }
                if (fb.pierce <= 0) {
                  fb.age = fb.life;
                  break;
                }
                // shrink slightly after each pierce
                fb.r = Math.max(6, fb.r * 0.92);
              } else {
                fb.age = fb.life; // consume fireball
                break;
              }
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
              try { creditPowerKillScore(1); } catch (e) {}
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
                  try { creditPowerKillScore(1); } catch (e) {}
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
                try { creditPowerKillScore(1); } catch (e) {}
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
              try { creditPowerKillScore(1); } catch (e) {}
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
              try { creditPowerKillScore(1); } catch (e) {}
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
            try { creditPowerKillScore(1); } catch (e) {}
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
    } catch (errStorm) {
      try { console.warn("updateStorm", errStorm); } catch (e) {}
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
    var sod = window.__airborneSteamOD;
    var list = window.__airborneSteamParts;
    if (typeof ctx === "undefined") return;
    try {
      if (typeof updatePowerFade === "function") updatePowerFade(window.__airborneActivePowerUntil || window.__airborneSteamUntil);
    } catch (e) {}
    var pf = (typeof window.__airbornePowerFade === "number") ? window.__airbornePowerFade : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0.05, pf);
    var spx = (typeof player !== "undefined" && player) ? player.x : 0;
    var spy = (typeof player !== "undefined" && player) ? player.y : 0;

    // Expanding pressure as dark steam CLOUDS (not thin rings)
    if (sod && sod.rings && sod.rings.length) {
      ctx.save();
      sod.rings.forEach(function(rg) {
        if (rg.delay > 0) return;
        var t = Math.max(0, 1 - rg.age / rg.life);
        var baseR = Math.max(8, rg.r);
        // puffy blobs along the ring
        var blobs = 10;
        for (var bi = 0; bi < blobs; bi++) {
          var ang = (bi / blobs) * Math.PI * 2 + (rg.age || 0) * 1.5;
          var bx = spx + Math.cos(ang) * baseR;
          var by = spy + Math.sin(ang) * baseR * 0.9;
          var br = 18 + 12 * t + (bi % 3) * 5;
          ctx.globalAlpha = t * 0.4;
          var bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          bg.addColorStop(0, "rgba(120,125,135," + (t * 0.7) + ")");
          bg.addColorStop(0.45, "rgba(80,85,95," + (t * 0.45) + ")");
          bg.addColorStop(1, "rgba(40,42,50,0)");
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    }

    // Expanding wave soft dark steam disc
    if (sod && sod.waveR > 4 && sod.phase !== "fade" && sod.phase !== "charge") {
      ctx.save();
      var wt = sod.phase === "final" ? 0.25 : 0.35;
      var wg = ctx.createRadialGradient(spx, spy, sod.waveR * 0.55, spx, spy, sod.waveR);
      wg.addColorStop(0, "rgba(90,95,105,0)");
      wg.addColorStop(0.7, "rgba(70,75,85," + (wt * 0.35) + ")");
      wg.addColorStop(1, "rgba(50,55,65,0)");
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.arc(spx, spy, sod.waveR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Rotating dark steam cloud around blimp
    if (sod && sod.orbitClouds) {
      ctx.save();
      sod.orbitClouds.forEach(function(c) {
        if (c.x == null) return;
        var pulse = 0.85 + 0.15 * Math.sin(c.phase || 0);
        ctx.globalAlpha = 0.55 * pulse;
        var cg = ctx.createRadialGradient(c.x, c.y, 1, c.x, c.y, c.r * pulse);
        cg.addColorStop(0, "rgba(70,74,82,0.95)");
        cg.addColorStop(0.4, "rgba(40,42,48,0.75)");
        cg.addColorStop(1, "rgba(15,16,20,0)");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * pulse, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // Charge brass pressure glow
    if (sod && sod.phase === "charge") {
      var g = sod.gauges || 0;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.25 + g * 0.4;
      var gg = ctx.createRadialGradient(spx, spy, 4, spx, spy, 36 + g * 24);
      gg.addColorStop(0, "rgba(255,200,120,0.7)");
      gg.addColorStop(0.5, "rgba(180,130,60,0.3)");
      gg.addColorStop(1, "rgba(100,60,20,0)");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(spx, spy, 36 + g * 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!list || !list.length) return;
    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var t = Math.max(0, 1 - p.age / p.life);
      if (p.kind === "spark") {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = t;
        ctx.fillStyle = "rgba(255,190,90," + t + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.r * 0.35 * t), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === "brass") {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = t * 0.9;
        ctx.fillStyle = "rgba(160,110,40," + t + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, p.r * 0.35), 0, Math.PI * 2); ctx.fill();
      } else {
        // Thick dark industrial steam — highly visible
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = Math.min(1, t * 0.9);
        var sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        sg.addColorStop(0, "rgba(90,95,105," + (t * 0.95) + ")");
        sg.addColorStop(0.35, "rgba(55,58,65," + (t * 0.75) + ")");
        sg.addColorStop(0.7, "rgba(30,32,38," + (t * 0.4) + ")");
        sg.addColorStop(1, "rgba(15,16,20,0)");
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    ctx.restore(); // power fade
    try { ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; } catch (e) {}
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
    if (typeof ctx === "undefined") return;
    var W0 = typeof W !== "undefined" ? W : 800;
    var H0 = typeof H !== "undefined" ? H : 600;

    if (window.__airborneSuctionTrails && window.__airborneSuctionTrails.length) {
      ctx.save();
      window.__airborneSuctionTrails.forEach(function(tr) {
        var t = 1 - tr.age / tr.life;
        ctx.globalAlpha = t * 0.4;
        ctx.strokeStyle = "rgba(170,110,255,1)";
        ctx.lineWidth = 1.5 * t;
        ctx.beginPath();
        ctx.moveTo(tr.x1, tr.y1);
        var mx = (tr.x1 + tr.x2) * 0.5 + (tr.y2 - tr.y1) * 0.15;
        var my = (tr.y1 + tr.y2) * 0.5 - (tr.x2 - tr.x1) * 0.15;
        ctx.quadraticCurveTo(mx, my, tr.x2, tr.y2);
        ctx.stroke();
      });
      ctx.restore();
    }

    if (window.__airbornePurpleBursts && window.__airbornePurpleBursts.length) {
      ctx.save();
      window.__airbornePurpleBursts.forEach(function(pb) {
        var t = Math.max(0, 1 - pb.age / pb.life);
        if (t <= 0) return;
        if (pb.kind === "spark") {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = t;
          ctx.fillStyle = "rgba(210,170,255,1)";
          ctx.beginPath();
          ctx.arc(pb.x, pb.y, Math.max(1, pb.r * t), 0, Math.PI * 2);
          ctx.fill();
        } else if (pb.kind === "shock") {
          var rr = (pb.r || 20) + ((pb.maxR || 280) - (pb.r || 20)) * (1 - t);
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = t * 0.55;
          ctx.strokeStyle = "rgba(180,120,255,1)";
          ctx.lineWidth = Math.max(1, 5 * t);
          ctx.beginPath();
          ctx.arc(pb.x, pb.y, rr, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.globalCompositeOperation = "lighter";
          var radB = (pb.r || 24) * (0.35 + t * 0.65);
          var g = ctx.createRadialGradient(pb.x, pb.y, 0, pb.x, pb.y, radB);
          g.addColorStop(0, "rgba(230,200,255," + (t * 0.75) + ")");
          g.addColorStop(0.35, "rgba(150,70,230," + (t * 0.5) + ")");
          g.addColorStop(1, "rgba(40,0,80,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(pb.x, pb.y, radB, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    }

    var sh = window.__airborneSpyShield;
    if (!sh) return;
    var px = sh.x, py = sh.y;
    var rad = Math.max(8, sh.r);
    var phaseFade = sh.phase === "collapse" ? Math.max(0.15, 1 - (sh.collapseFlash || 0)) : 1;

    // Soft purple flash only — never solid white
    if ((sh.flash || 0) > 0.05) {
      ctx.save();
      ctx.globalAlpha = sh.flash * 0.2;
      ctx.fillStyle = "rgba(120,50,200,1)";
      ctx.fillRect(0, 0, W0, H0);
      ctx.restore();
    }
    if ((sh.collapseFlash || 0) > 0.05) {
      ctx.save();
      ctx.globalAlpha = sh.collapseFlash * 0.18;
      ctx.fillStyle = "rgba(140,60,210,1)";
      ctx.fillRect(0, 0, W0, H0);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(px, py);
    ctx.globalAlpha = phaseFade;
    ctx.globalCompositeOperation = "lighter";

    for (var dr = 3; dr >= 1; dr--) {
      ctx.strokeStyle = "rgba(150,90,255," + (0.1 + 0.06 * dr) + ")";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, rad * (0.22 * dr), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(180,120,255," + (0.4 + 0.2 * Math.sin((sh.age || 0) * 9)) + ")";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (var ei = 0; ei <= 48; ei++) {
      var ea = (ei / 48) * Math.PI * 2;
      var ripple = 1 + 0.035 * Math.sin(ea * 6 + (sh.age || 0) * 10);
      var ex = Math.cos(ea) * rad * ripple;
      var ey = Math.sin(ea) * rad * ripple * 0.92;
      if (ei === 0) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey);
    }
    ctx.closePath();
    ctx.stroke();

    // Spiral arms + purple electricity
    var arms = 5;
    var tAge = sh.age || 0;
    for (var arm = 0; arm < arms; arm++) {
      var armOff = arm * (Math.PI * 2 / arms) + (sh.spin || 0);
      var pulse = 0.3 + 0.25 * Math.sin(tAge * 6 + arm);
      var pts = [];
      for (var s = 0; s < 36; s++) {
        var frac = s / 36;
        var aa = armOff + frac * Math.PI * 2.4;
        var rr = rad * (0.08 + frac * 0.92);
        pts.push({ x: Math.cos(aa) * rr, y: Math.sin(aa) * rr * 0.88, frac: frac });
      }
      ctx.strokeStyle = "rgba(140,60,240," + pulse + ")";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (var s = 0; s < pts.length; s++) {
        if (s === 0) ctx.moveTo(pts[s].x, pts[s].y);
        else ctx.lineTo(pts[s].x, pts[s].y);
      }
      ctx.stroke();

      // Purple electricity along spiral (deterministic from time so it crackles)
      ctx.lineWidth = 1.5;
      for (var bolt = 0; bolt < 5; bolt++) {
        var b0 = (Math.floor(tAge * 17 + arm * 7 + bolt * 11) % Math.max(1, pts.length - 7));
        var flicker = 0.45 + 0.55 * Math.abs(Math.sin(tAge * 20 + bolt * 3 + arm));
        ctx.strokeStyle = "rgba(230,200,255," + (flicker * 0.9) + ")";
        ctx.beginPath();
        for (var bs = 0; bs < 6; bs++) {
          var p = pts[Math.min(pts.length - 1, b0 + bs)];
          var jx = p.x + Math.sin(tAge * 30 + bs * 2 + bolt) * 8 * (1 - p.frac);
          var jy = p.y + Math.cos(tAge * 28 + bs * 2 + bolt) * 8 * (1 - p.frac);
          if (bs === 0) ctx.moveTo(jx, jy);
          else ctx.lineTo(jx, jy);
        }
        ctx.stroke();
      }
      // Arc jump
      var i1 = 5 + (Math.floor(tAge * 9 + arm * 3) % 10);
      var i2 = Math.min(pts.length - 1, i1 + 4 + (arm % 3));
      if (i1 < pts.length && i2 < pts.length) {
        ctx.strokeStyle = "rgba(255,230,255," + (0.5 + 0.4 * Math.sin(tAge * 16 + arm)) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pts[i1].x, pts[i1].y);
        var midX = (pts[i1].x + pts[i2].x) * 0.5 + Math.sin(tAge * 12 + arm) * 14;
        var midY = (pts[i1].y + pts[i2].y) * 0.5 + Math.cos(tAge * 12 + arm) * 14;
        ctx.quadraticCurveTo(midX, midY, pts[i2].x, pts[i2].y);
        ctx.stroke();
      }
    }

    (sh.ribbons || []).forEach(function(rb) {
      ctx.strokeStyle = "rgba(170,100,255," + (rb.bright * 0.4) + ")";
      ctx.lineWidth = rb.width * 0.3;
      ctx.beginPath();
      for (var s = 0; s < 24; s++) {
        var frac = s / 24;
        var aa = rb.offset + (sh.spin || 0) * rb.speed * 0.3 + frac * Math.PI * 1.8;
        var rr = rad * (0.2 + frac * 0.75);
        var x = Math.cos(aa) * rr;
        var y = Math.sin(aa) * rr * 0.9;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    (sh.arcs || []).forEach(function(arc) {
      var at = 1 - arc.age / arc.life;
      ctx.globalAlpha = at * 0.75 * phaseFade;
      ctx.strokeStyle = "rgba(210,170,255,1)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var s = 0; s <= 6; s++) {
        var f = s / 6;
        var aa = arc.a1 + (arc.a2 - arc.a1) * f;
        var rr = arc.r1 + (arc.r2 - arc.r1) * f;
        var x = Math.cos(aa + (sh.spin || 0) * 0.2) * rr;
        var y = Math.sin(aa + (sh.spin || 0) * 0.2) * rr;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = phaseFade;
    });

    // Soft purple core only (no white disk)
    var coreR = Math.min(26, Math.max(8, rad * 0.07));
    var cg = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    cg.addColorStop(0, "rgba(220,190,255,0.5)");
    cg.addColorStop(0.5, "rgba(140,70,220,0.3)");
    cg.addColorStop(1, "rgba(60,10,120,0)");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();

    (sh.particles || []).forEach(function(p) {
      var pt = 1 - p.age / p.life;
      ctx.globalAlpha = pt * 0.8 * phaseFade;
      ctx.fillStyle = "rgba(210,170,255,1)";
      ctx.beginPath();
      ctx.arc(p.x - px, p.y - py, p.r * pt, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
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
    if (window.__airborneMeteorFlash) {
      var fl = window.__airborneMeteorFlash;
      fl.age = (fl.age || 0) + 0.016;
      var ft = Math.max(0, 1 - fl.age / (fl.life || 0.15));
      if (ft > 0) {
        ctx.save();
        ctx.globalAlpha = ft * (fl.big ? 0.5 : 0.28);
        ctx.fillStyle = "#fff8e7";
        ctx.fillRect(0, 0, (typeof W !== "undefined" ? W : 800), (typeof H !== "undefined" ? H : 600));
        ctx.restore();
      } else window.__airborneMeteorFlash = null;
    }
    if (!list || !list.length) return;

    for (var mi = 0; mi < list.length; mi++) {
      var mt = list[mi];
      if (!mt) continue;
      var ang = Math.atan2(mt.vy || 1, mt.vx || 0);
      var r = Math.max(4, (mt.r || 8) * 0.5); // 50% smaller on draw too
      var tail = (mt.tailLen || 50) * 0.55;
      mt.spin = (mt.spin || 0) + (mt.spinVel || 0.5) * 0.016;

      // —— Fiery tail ——
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      var tg = ctx.createLinearGradient(
        mt.x - Math.cos(ang) * tail, mt.y - Math.sin(ang) * tail,
        mt.x, mt.y
      );
      tg.addColorStop(0, "rgba(255,40,0,0)");
      tg.addColorStop(0.45, "rgba(255,100,15,0.55)");
      tg.addColorStop(1, "rgba(255,230,120,0.95)");
      ctx.strokeStyle = tg;
      ctx.lineWidth = Math.max(4, r * 1.4);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(mt.x - Math.cos(ang) * tail, mt.y - Math.sin(ang) * tail);
      ctx.lineTo(mt.x, mt.y);
      ctx.stroke();

      // —— Outer fireball ——
      var fireR = r * 2.8;
      var fg = ctx.createRadialGradient(mt.x, mt.y, r * 0.2, mt.x, mt.y, fireR);
      fg.addColorStop(0, "rgba(255,255,220,0.95)");
      fg.addColorStop(0.25, "rgba(255,200,60,0.9)");
      fg.addColorStop(0.55, "rgba(255,100,20,0.7)");
      fg.addColorStop(1, "rgba(180,20,0,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(mt.x, mt.y, fireR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // —— Procedural rock inside fireball (no image asset) ——
      ctx.save();
      ctx.translate(mt.x, mt.y);
      ctx.rotate(ang + Math.PI / 2 + (mt.spin || 0));
      // seed-ish variation from rockIdx
      var seed = (mt.rockIdx || 0) * 17 + 3;
      var lumps = 6 + (seed % 3);
      ctx.beginPath();
      for (var k = 0; k < lumps; k++) {
        var a = (k / lumps) * Math.PI * 2;
        var jagged = 0.75 + 0.25 * Math.sin(a * 3 + seed) + 0.12 * Math.cos(a * 5 + seed * 0.7);
        var px = Math.cos(a) * r * jagged;
        var py = Math.sin(a) * r * jagged * 0.9;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      // rock fill
      var rg = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r * 1.1);
      rg.addColorStop(0, "#9ca3af");
      rg.addColorStop(0.45, "#6b7280");
      rg.addColorStop(1, "#374151");
      ctx.fillStyle = rg;
      ctx.fill();
      // crater dots
      ctx.fillStyle = "rgba(30,30,35,0.55)";
      for (var c = 0; c < 3; c++) {
        var cx = Math.cos(seed + c * 2.1) * r * 0.35;
        var cy = Math.sin(seed + c * 1.7) * r * 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, r * (0.08 + (c % 2) * 0.06), 0, Math.PI * 2);
        ctx.fill();
      }
      // lit edge
      ctx.strokeStyle = "rgba(200,200,210,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // —— Hot core glow over rock ——
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255,240,180,0.55)";
      ctx.beginPath();
      ctx.arc(mt.x, mt.y, Math.max(2, r * 0.35), 0, Math.PI * 2);
      ctx.fill();
      // sparks
      (mt.sparks || []).forEach(function(sp) {
        var t = 1 - sp.age / sp.life;
        if (t <= 0) return;
        ctx.globalAlpha = t;
        ctx.fillStyle = "rgba(255,200,60,1)";
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, Math.max(1, sp.r * t * 0.7), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }
  window.__airborneDrawMeteors = drawMeteorMarks;

  // Sonic cannon blast: knockback + electrify targets so they fall from the sky
  window.__airborneSonicBlast = function (cx, cy, radius, intensity) {
    intensity = intensity || 1;
    if (typeof obstacles === "undefined" || !obstacles) return;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (!o || o.isRing || o.type === "gold_ring" || o.type === "ring") continue;
      if (o.shockFall || o.onFire) continue;
      var ox = o.x + (o.w || 0) * 0.5;
      var oy = o.y + (o.h || 0) * 0.5;
      var dx = ox - cx;
      var dy = oy - cy;
      var dist = Math.hypot(dx, dy);
      if (dist > radius || dist < 0.1) continue;
      var force = (1 - dist / radius) * intensity;
      o.shockShake = 0.4 + force * 0.45;
      o.shockFall = true; o.powerAffected = true;
      o.electrified = true; o.powerAffected = true;
      o.sonicDebris = true;
      o.scored = true;
      var ang = Math.atan2(dy, dx);
      o.vx = Math.cos(ang) * (80 + force * 140) + (Math.random() - 0.5) * 40;
      o.vy = Math.sin(ang) * (40 + force * 60) + 70 + Math.random() * 50;
      o.spinVel = (Math.random() - 0.5) * 8 * force;
      try { creditPowerKillScore(1); } catch (e) {}
      if (!window.__airborneShockFX) window.__airborneShockFX = [];
      for (var k = 0; k < 6; k++) {
        var ea = Math.random() * Math.PI * 2;
        var es = 60 + Math.random() * 120;
        window.__airborneShockFX.push({
          kind: "spark",
          x: ox, y: oy,
          vx: Math.cos(ea) * es, vy: Math.sin(ea) * es,
          life: 0.25 + Math.random() * 0.2, age: 0,
          r: 1.5 + Math.random() * 2.5
        });
      }
    }
    try {
      if (document.getElementById("scoreVal")) document.getElementById("scoreVal").textContent = score;
    } catch (e) {}
  };







  function drawShockFX() {
    if (typeof ctx === "undefined") return;
    var W0 = typeof W !== "undefined" ? W : 800;
    var H0 = typeof H !== "undefined" ? H : 600;
    // Soft white/gold flash (not a solid leftover circle)
    if (window.__airborneShockFlash > 0.02) {
      ctx.save();
      ctx.globalAlpha = window.__airborneShockFlash * 0.22;
      ctx.fillStyle = "rgba(255, 240, 200, 1)";
      ctx.fillRect(0, 0, W0, H0);
      ctx.restore();
    }
    var list = window.__airborneShockFX;
    if (!list || !list.length) return;
    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var t = Math.max(0, 1 - p.age / p.life);
      if (t <= 0) continue;
      if (p.kind === "spark" || p.kind === "debris") {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = t;
        ctx.fillStyle = p.kind === "debris" ? "rgba(180,180,190,1)" : "rgba(255,240,200,1)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.r * t), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      // Expanding sonic ring + air ripple
      var rr = p.r || 20;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = t * (p.final ? 0.9 : 0.75);
      // Outer glow ring
      ctx.strokeStyle = p.gold ? "rgba(255,220,140,0.9)" : "rgba(200,230,255,0.85)";
      ctx.lineWidth = Math.max(1.5, (p.width || 4) * t);
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.stroke();
      // Inner tight ring
      ctx.strokeStyle = "rgba(255,255,255," + (0.5 * t) + ")";
      ctx.lineWidth = Math.max(1, (p.width || 4) * 0.4 * t);
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr * 0.92, 0, Math.PI * 2);
      ctx.stroke();
      // Soft air-ripple fill just behind the ring edge
      var rg = ctx.createRadialGradient(p.x, p.y, Math.max(0, rr - 14), p.x, p.y, rr + 8);
      rg.addColorStop(0, "rgba(255,255,255,0)");
      rg.addColorStop(0.7, p.gold ? "rgba(255,210,120,0.12)" : "rgba(180,220,255,0.12)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = t * 0.5;
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr + 8, 0, Math.PI * 2);
      ctx.fill();
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
    var fbs = window.__airborneFireballs || [];
    var hasPlasma = window.__airbornePlasmaOrbits && window.__airbornePlasmaOrbits.length;
    if ((!fbs.length) && !hasPlasma && !window.__airborneBlueFlash && !window.__airborneEngineFlare && !window.__airbornePlasmaIgnite) return;
    if (typeof ctx === "undefined") return;
    ctx.save();
    try {
      try {
        if (typeof updatePowerFade === "function") updatePowerFade(window.__airborneActivePowerUntil || window.__airborneFireballUntil);
      } catch (e) {}
      var pf = (typeof window.__airbornePowerFade === "number") ? window.__airbornePowerFade : 1;
      if (typeof stormActive !== "undefined" && !stormActive) pf = 1;
      ctx.globalAlpha = Math.max(0.05, Math.min(1, pf));
      for (var i = 0; i < fbs.length; i++) {
        var fb = fbs[i];
      // smoke trails (skip for azure — uses plasma trail below)
      if (fb.kind !== "bluefireball") {
        for (var ti = 0; ti < (fb.trails || []).length; ti++) {
          var tr = fb.trails[ti];
          var ta = 1 - tr.age / tr.life;
          ctx.globalAlpha = ta * 0.45;
          ctx.fillStyle = fb.smokeCol || "rgba(60,55,50,1)";
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // trails — thin teardrops weaving in S-curves, crossing layers
      if (fb.kind === "bluefireball" && fb.trails) {
        for (var ti = 0; ti < fb.trails.length; ti++) {
          var tr = fb.trails[ti];
          var ta = 1 - tr.age / tr.life;
          if (ta <= 0) continue;
          ctx.globalCompositeOperation = "lighter";
          if (tr.spark) {
            ctx.globalAlpha = ta;
            ctx.fillStyle = "rgba(224,242,254," + (ta * 0.95) + ")";
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, tr.r * 0.85, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }
          // thin teardrop oriented along motion (point toward fireball / opposite velocity)
          var tang = Math.atan2(tr.vy || 0, tr.vx || -1);
          var len = tr.r * (2.8 + ta * 1.2); // elongated tear
          var wid = tr.r * 0.55; // thinner
          ctx.save();
          ctx.translate(tr.x, tr.y);
          ctx.rotate(tang);
          ctx.globalAlpha = ta * (tr.layer === 1 ? 0.55 : 0.8);
          var tg;
          if (tr.layer === 1) {
            tg = ctx.createRadialGradient(len * 0.15, 0, 0, 0, 0, len);
            tg.addColorStop(0, "rgba(59,130,246,0.75)");
            tg.addColorStop(0.45, "rgba(37,99,235,0.45)");
            tg.addColorStop(1, "rgba(30,58,138,0)");
          } else {
            tg = ctx.createRadialGradient(len * 0.2, 0, 0, 0, 0, len);
            tg.addColorStop(0, "rgba(255,255,255,0.9)");
            tg.addColorStop(0.25, "rgba(165,243,252,0.85)");
            tg.addColorStop(0.6, "rgba(34,211,238,0.5)");
            tg.addColorStop(1, "rgba(8,145,178,0)");
          }
          ctx.fillStyle = tg;
          // teardrop path: round head, tapering tail
          ctx.beginPath();
          ctx.moveTo(len * 0.55, 0);
          ctx.quadraticCurveTo(len * 0.2, wid, -len * 0.65, wid * 0.15);
          ctx.quadraticCurveTo(-len * 0.85, 0, -len * 0.65, -wid * 0.15);
          ctx.quadraticCurveTo(len * 0.2, -wid, len * 0.55, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      // fireball / plasma blade core
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "lighter";
      var rr = fb.r * (fb.finisher ? 2.8 : 2.2);
      var g = ctx.createRadialGradient(fb.x, fb.y, 0, fb.x, fb.y, rr);
      if (fb.kind === "bluefireball") {
        // Superheated blue plasma comet — white/cyan core, layered blue flame, long tail
        ctx.save();
        ctx.translate(fb.x, fb.y);
        var bang = Math.atan2(fb.vy || 0, fb.vx || 1);
        ctx.rotate(bang);
        ctx.globalCompositeOperation = "lighter";

        // Strong blue aura
        var auraR = rr * 2.8;
        var aura = ctx.createRadialGradient(0, 0, rr * 0.2, 0, 0, auraR);
        aura.addColorStop(0, "rgba(56,189,248,0.35)");
        aura.addColorStop(0.45, "rgba(37,99,235,0.2)");
        aura.addColorStop(1, "rgba(30,64,175,0)");
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, auraR, 0, Math.PI * 2);
        ctx.fill();

        // Outer deep royal blue wisps / comet body (stretched backward)
        var outer = ctx.createRadialGradient(rr * 0.15, 0, 0, -rr * 0.4, 0, rr * 2.2);
        outer.addColorStop(0, "rgba(59,130,246,0.55)");
        outer.addColorStop(0.4, "rgba(37,99,235,0.45)");
        outer.addColorStop(0.75, "rgba(30,64,175,0.25)");
        outer.addColorStop(1, "rgba(15,23,42,0)");
        ctx.fillStyle = outer;
        ctx.beginPath();
        ctx.ellipse(-rr * 0.35, 0, rr * 2.0, rr * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();

        // Medium blue layer
        var mid = ctx.createRadialGradient(rr * 0.1, 0, 0, 0, 0, rr * 1.35);
        mid.addColorStop(0, "rgba(34,211,238,0.7)");
        mid.addColorStop(0.45, "rgba(14,165,233,0.55)");
        mid.addColorStop(1, "rgba(2,132,199,0)");
        ctx.fillStyle = mid;
        ctx.beginPath();
        ctx.ellipse(-rr * 0.1, 0, rr * 1.35, rr * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Electric cyan-blue tightly around core
        var inner = ctx.createRadialGradient(rr * 0.2, 0, 0, rr * 0.15, 0, rr * 0.85);
        inner.addColorStop(0, "rgba(165,243,252,0.95)");
        inner.addColorStop(0.4, "rgba(34,211,238,0.8)");
        inner.addColorStop(1, "rgba(6,182,212,0)");
        ctx.fillStyle = inner;
        ctx.beginPath();
        ctx.ellipse(rr * 0.15, 0, rr * 0.85, rr * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Defined superheated plasma core — white-hot with cyan rim
        var core = ctx.createRadialGradient(rr * 0.22, -rr * 0.04, 0, rr * 0.2, 0, rr * 0.5);
        core.addColorStop(0, "rgba(255,255,255,1)");
        core.addColorStop(0.2, "rgba(240,249,255,1)");
        core.addColorStop(0.4, "rgba(186,230,253,0.95)");
        core.addColorStop(0.65, "rgba(56,189,248,0.75)");
        core.addColorStop(0.85, "rgba(14,165,233,0.35)");
        core.addColorStop(1, "rgba(2,132,199,0)");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(rr * 0.2, -rr * 0.02, rr * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Specular pin highlight
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.arc(rr * 0.28, -rr * 0.14, rr * 0.14, 0, Math.PI * 2);
        ctx.fill();

        // Sharp flame tongues extending backward (jagged look)
        ctx.globalAlpha = 0.55;
        for (var ft = 0; ft < 3; ft++) {
          var fy = (ft - 1) * rr * 0.28;
          var fl = rr * (1.4 + ft * 0.15);
          var tongue = ctx.createLinearGradient(0, fy, -fl, fy);
          tongue.addColorStop(0, "rgba(125,211,252,0.7)");
          tongue.addColorStop(0.5, "rgba(37,99,235,0.4)");
          tongue.addColorStop(1, "rgba(30,64,175,0)");
          ctx.fillStyle = tongue;
          ctx.beginPath();
          ctx.moveTo(rr * 0.1, fy - rr * 0.12);
          ctx.quadraticCurveTo(-fl * 0.4, fy + (ft - 1) * 4, -fl, fy);
          ctx.quadraticCurveTo(-fl * 0.4, fy - (ft - 1) * 4, rr * 0.1, fy + rr * 0.12);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      } else if (fb.kind === "greenfireball") {
        // Jade Voyager — defined emerald fireball with realistic hot core
        ctx.save();
        ctx.translate(fb.x, fb.y);
        var gang = Math.atan2(fb.vy || 0, fb.vx || 1);
        ctx.rotate(gang);
        ctx.globalCompositeOperation = "lighter";
        // Soft outer glow
        var gAura = ctx.createRadialGradient(0, 0, rr * 0.15, 0, 0, rr * 2.2);
        gAura.addColorStop(0, "rgba(52,211,153,0.25)");
        gAura.addColorStop(0.5, "rgba(16,185,129,0.12)");
        gAura.addColorStop(1, "rgba(6,78,59,0)");
        ctx.fillStyle = gAura;
        ctx.beginPath(); ctx.arc(0, 0, rr * 2.2, 0, Math.PI * 2); ctx.fill();
        // Ember shell (slightly stretched back)
        var gShell = ctx.createRadialGradient(rr * 0.08, 0, 0, -rr * 0.15, 0, rr * 1.35);
        gShell.addColorStop(0, "rgba(110,231,183,0.55)");
        gShell.addColorStop(0.45, "rgba(16,185,129,0.5)");
        gShell.addColorStop(0.8, "rgba(4,120,87,0.28)");
        gShell.addColorStop(1, "rgba(6,78,59,0)");
        ctx.fillStyle = gShell;
        ctx.beginPath();
        ctx.ellipse(-rr * 0.15, 0, rr * 1.25, rr * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();
        // Dense mid body
        var gMid = ctx.createRadialGradient(rr * 0.05, 0, 0, 0, 0, rr * 0.85);
        gMid.addColorStop(0, "rgba(167,243,208,0.95)");
        gMid.addColorStop(0.4, "rgba(52,211,153,0.85)");
        gMid.addColorStop(0.75, "rgba(5,150,105,0.45)");
        gMid.addColorStop(1, "rgba(6,95,70,0)");
        ctx.fillStyle = gMid;
        ctx.beginPath(); ctx.arc(0, 0, rr * 0.85, 0, Math.PI * 2); ctx.fill();
        // Realistic superheated core — white-hot center fading to lime
        var gCore = ctx.createRadialGradient(rr * 0.08, -rr * 0.04, 0, rr * 0.05, 0, rr * 0.42);
        gCore.addColorStop(0, "rgba(255,255,255,1)");
        gCore.addColorStop(0.25, "rgba(236,253,245,0.98)");
        gCore.addColorStop(0.5, "rgba(167,243,208,0.9)");
        gCore.addColorStop(0.78, "rgba(52,211,153,0.55)");
        gCore.addColorStop(1, "rgba(16,185,129,0)");
        ctx.fillStyle = gCore;
        ctx.beginPath(); ctx.arc(rr * 0.06, -rr * 0.02, rr * 0.42, 0, Math.PI * 2); ctx.fill();
        // Specular highlight
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath(); ctx.arc(rr * 0.14, -rr * 0.12, rr * 0.14, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        // Ironworks — defined molten fireball with realistic furnace core
        ctx.save();
        ctx.translate(fb.x, fb.y);
        var oang = Math.atan2(fb.vy || 0, fb.vx || 1);
        ctx.rotate(oang);
        ctx.globalCompositeOperation = "lighter";
        // Heat shimmer / outer glow
        var oAura = ctx.createRadialGradient(0, 0, rr * 0.2, 0, 0, rr * 2.4);
        oAura.addColorStop(0, "rgba(251,146,60,0.3)");
        oAura.addColorStop(0.45, "rgba(234,88,12,0.14)");
        oAura.addColorStop(1, "rgba(120,20,0,0)");
        ctx.fillStyle = oAura;
        ctx.beginPath(); ctx.arc(0, 0, rr * 2.4, 0, Math.PI * 2); ctx.fill();
        // Dark-red outer flame envelope (stretched behind)
        var oShell = ctx.createRadialGradient(rr * 0.1, 0, 0, -rr * 0.25, 0, rr * 1.5);
        oShell.addColorStop(0, "rgba(251,146,60,0.55)");
        oShell.addColorStop(0.4, "rgba(234,88,12,0.55)");
        oShell.addColorStop(0.7, "rgba(185,28,28,0.35)");
        oShell.addColorStop(1, "rgba(80,10,0,0)");
        ctx.fillStyle = oShell;
        ctx.beginPath();
        ctx.ellipse(-rr * 0.2, 0, rr * 1.4, rr * 1.0, 0, 0, Math.PI * 2);
        ctx.fill();
        // Orange mid body
        var oMid = ctx.createRadialGradient(rr * 0.06, 0, 0, 0, 0, rr * 0.9);
        oMid.addColorStop(0, "rgba(254,215,170,0.95)");
        oMid.addColorStop(0.35, "rgba(251,191,36,0.9)");
        oMid.addColorStop(0.65, "rgba(249,115,22,0.65)");
        oMid.addColorStop(1, "rgba(194,65,12,0)");
        ctx.fillStyle = oMid;
        ctx.beginPath(); ctx.arc(0, 0, rr * 0.9, 0, Math.PI * 2); ctx.fill();
        // Realistic molten core — near-white → yellow → orange
        var oCore = ctx.createRadialGradient(rr * 0.1, -rr * 0.05, 0, rr * 0.05, 0, rr * 0.45);
        oCore.addColorStop(0, "rgba(255,255,255,1)");
        oCore.addColorStop(0.2, "rgba(255,251,235,1)");
        oCore.addColorStop(0.4, "rgba(254,240,138,0.95)");
        oCore.addColorStop(0.65, "rgba(251,191,36,0.8)");
        oCore.addColorStop(0.85, "rgba(249,115,22,0.4)");
        oCore.addColorStop(1, "rgba(234,88,12,0)");
        ctx.fillStyle = oCore;
        ctx.beginPath(); ctx.arc(rr * 0.08, -rr * 0.03, rr * 0.45, 0, Math.PI * 2); ctx.fill();
        // Bright specular
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath(); ctx.arc(rr * 0.16, -rr * 0.14, rr * 0.15, 0, Math.PI * 2); ctx.fill();
        // Tiny ember flecks
        ctx.fillStyle = "rgba(254,215,170,0.7)";
        for (var ef = 0; ef < 3; ef++) {
          var ea = (ef / 3) * Math.PI * 2 + (fb.age || 0) * 4;
          ctx.beginPath();
          ctx.arc(Math.cos(ea) * rr * 0.7, Math.sin(ea) * rr * 0.55, rr * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
    }
    // Plasma orbit system around Aero Slicer
    if (window.__airbornePlasmaOrbits && typeof player !== "undefined" && player) {
      var orbs = window.__airbornePlasmaOrbits.slice().sort(function(a, b) { return (a.z || 0) - (b.z || 0); });
      // Ignition shockwave
      if (window.__airbornePlasmaIgnite) {
        var ig = window.__airbornePlasmaIgnite;
        var it = Math.max(0, 1 - ig.age / ig.life);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = it * 0.5;
        ctx.strokeStyle = "rgba(180,230,255,1)";
        ctx.lineWidth = 4 * it;
        ctx.beginPath();
        ctx.arc(player.x, player.y, ig.shockR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = it * 0.35;
        var igg = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, 50 + (1 - it) * 40);
        igg.addColorStop(0, "rgba(255,255,255,0.95)");
        igg.addColorStop(0.4, "rgba(125,211,252,0.6)");
        igg.addColorStop(1, "rgba(14,100,200,0)");
        ctx.fillStyle = igg;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 50 + (1 - it) * 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Trails behind first
      orbs.forEach(function(orb) {
        if (!orb.trail) return;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (var ti = 0; ti < orb.trail.length; ti++) {
          var tr = orb.trail[ti];
          var ta = 1 - tr.age / tr.life;
          if (ta <= 0) continue;
          var trR = orb.r * 0.55 * ta;
          var tg = ctx.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, trR * 2);
          tg.addColorStop(0, "rgba(165,243,252," + (ta * 0.7) + ")");
          tg.addColorStop(0.5, "rgba(56,189,248," + (ta * 0.4) + ")");
          tg.addColorStop(1, "rgba(14,100,200,0)");
          ctx.fillStyle = tg;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, trR * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      // Lightning arcs
      if (window.__airbornePlasmaArcs) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        window.__airbornePlasmaArcs.forEach(function(a) {
          var ta = 1 - a.age / a.life;
          if (ta <= 0 || !a.points) return;
          ctx.globalAlpha = ta * 0.9;
          ctx.strokeStyle = "rgba(186,230,253,1)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          a.points.forEach(function(pt, i) {
            if (i === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]);
          });
          ctx.stroke();
        });
        ctx.restore();
      }
      // Fireballs — back (z<0) then front (z>0) already sorted
      orbs.forEach(function(orb) {
        if (orb.x == null) return;
        var pulse = 0.9 + 0.12 * Math.sin(orb.pulse || 0);
        var rr = orb.r * pulse * (orb.z > 0 ? 1.08 : 0.92);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        // outer cyan flame
        var og = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, rr * 2.4);
        og.addColorStop(0, "rgba(255,255,255,0.95)");
        og.addColorStop(0.2, "rgba(165,243,252,0.9)");
        og.addColorStop(0.45, "rgba(56,189,248,0.7)");
        og.addColorStop(0.75, "rgba(14,120,220,0.35)");
        og.addColorStop(1, "rgba(2,60,140,0)");
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, rr * 2.4, 0, Math.PI * 2);
        ctx.fill();
        // Defined plasma core with depth
        var oc = ctx.createRadialGradient(orb.x - rr * 0.12, orb.y - rr * 0.12, 0, orb.x, orb.y, rr * 0.55);
        oc.addColorStop(0, "rgba(255,255,255,1)");
        oc.addColorStop(0.3, "rgba(224,242,254,0.98)");
        oc.addColorStop(0.55, "rgba(125,211,252,0.85)");
        oc.addColorStop(0.8, "rgba(56,189,248,0.4)");
        oc.addColorStop(1, "rgba(14,165,233,0)");
        ctx.fillStyle = oc;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, rr * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(orb.x - rr * 0.12, orb.y - rr * 0.14, rr * 0.16, 0, Math.PI * 2);
        ctx.fill();
        // jagged energy tongues
        ctx.globalAlpha = 0.7;
        for (var jt = 0; jt < 4; jt++) {
          var ja = orb.ang + jt * Math.PI * 0.5 + (orb.pulse || 0);
          ctx.strokeStyle = "rgba(125,211,252,0.85)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(orb.x, orb.y);
          ctx.lineTo(orb.x + Math.cos(ja) * rr * 1.6, orb.y + Math.sin(ja) * rr * 1.6);
          ctx.stroke();
        }
        ctx.restore();
      });
      // sparks
      if (window.__airbornePlasmaSparks) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        window.__airbornePlasmaSparks.forEach(function(s) {
          var ta = 1 - s.age / s.life;
          ctx.globalAlpha = ta;
          ctx.fillStyle = "rgba(200,240,255,1)";
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * ta, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
    }
    // Azure engine flare (activation) drawn below; muzzle flash while firing
    if (stormMode === "bluefireball" && typeof player !== "undefined" && player
        && window.__airborneAzureBarrage && window.__airborneAzureBarrage.shotsLeft >= 0
        && window.__airborneAzureBarrage.fired > 0) {
      // brief blue muzzle at front while stream is active
      var mx = player.x + (player.w || 40) * 0.52;
      var my = player.y;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      var mg = ctx.createRadialGradient(mx, my, 1, mx, my, 18);
      mg.addColorStop(0, "rgba(255,255,255,0.85)");
      mg.addColorStop(0.4, "rgba(56,189,248,0.55)");
      mg.addColorStop(1, "rgba(14,100,200,0)");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Azure engine flare on activation
    // Azure engine flare on activation — bright blue engines then launch
    if (window.__airborneBlueFlash || window.__airborneEngineFlare) {
      var bf = window.__airborneBlueFlash;
      var ef = window.__airborneEngineFlare;
      var bt = bf ? Math.max(0, 1 - bf.age / bf.life) : 0;
      var et = ef ? Math.max(0, 1 - ef.age / ef.life) : 0;
      var t = Math.max(bt, et);
      if (t > 0 && typeof player !== "undefined" && player) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        // Main body flash
        ctx.globalAlpha = t * 0.7;
        var br = (player.w || 40) * (0.55 + (1 - t) * 0.7);
        var bg = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, br);
        bg.addColorStop(0, "rgba(255,255,255,0.9)");
        bg.addColorStop(0.35, "rgba(125,211,252,0.65)");
        bg.addColorStop(0.7, "rgba(14,165,233,0.25)");
        bg.addColorStop(1, "rgba(0,80,180,0)");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(player.x, player.y, br, 0, Math.PI * 2);
        ctx.fill();
        // Engine flares at rear (left side of blimp)
        var engX = player.x - (player.w || 40) * 0.42;
        var engY = player.y;
        for (var ei = -1; ei <= 1; ei += 2) {
          var ey = engY + ei * (player.h || 30) * 0.28;
          var eg = ctx.createRadialGradient(engX, ey, 1, engX, ey, 22 + t * 10);
          eg.addColorStop(0, "rgba(255,255,255,0.95)");
          eg.addColorStop(0.3, "rgba(56,189,248,0.85)");
          eg.addColorStop(0.7, "rgba(14,120,220,0.4)");
          eg.addColorStop(1, "rgba(0,60,160,0)");
          ctx.globalAlpha = t * 0.95;
          ctx.fillStyle = eg;
          ctx.beginPath();
          ctx.arc(engX, ey, 22 + t * 10, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    } catch (e) { /* keep canvas state safe */ }
    finally {
      try { ctx.restore(); } catch (e2) {}
      try { ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; } catch (e3) {}
    }
  }
  window.__airborneDrawFireballs = drawFireballs;

  function drawStorm() {
    // Thunder Chain draws even mid-fade
    var tcDraw = window.__airborneThunderChain;
    if (!stormActive && !tcDraw) return;
    // Unified fade-out near end of any power
    try {
      var u = window.__airborneActivePowerUntil || 0;
      if (typeof updatePowerFade === "function") updatePowerFade(u);
    } catch (e) {}
    // powerFade available via window.__airbornePowerFade for child draws
    // Training: no screen-dim atmosphere
    const skipDim = !!(window.__airborneAirfield || window.__airborneRuffActive);

    // ---- Storm Chaser Thunder Chain visuals ----
    if (tcDraw) {
      var W0 = typeof W !== "undefined" ? W : 800;
      var H0 = typeof H !== "undefined" ? H : 600;
      var pdx = (typeof player !== "undefined" && player) ? player.x : W0 * 0.3;
      var pdy = (typeof player !== "undefined" && player) ? player.y : H0 * 0.4;
      var pf = (typeof window.__airbornePowerFade === "number") ? window.__airbornePowerFade : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0.05, pf);

      // Screen thunder flash
      if (tcDraw.flash > 0.02) {
        ctx.save();
        ctx.globalAlpha = tcDraw.flash * 0.35;
        ctx.fillStyle = "rgba(220,235,255,1)";
        ctx.fillRect(0, 0, W0, H0);
        ctx.restore();
      }

      // Dark storm clouds around blimp
      if (window.__airborneStormClouds) {
        ctx.save();
        window.__airborneStormClouds.forEach(function(c) {
          if (c.x == null) return;
          var pulse = 0.85 + 0.15 * Math.sin(c.phase || 0);
          ctx.globalAlpha = 0.55 * pulse;
          var cg = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, c.r * pulse);
          cg.addColorStop(0, "rgba(60,70,100,0.85)");
          cg.addColorStop(0.5, "rgba(30,35,55,0.55)");
          cg.addColorStop(1, "rgba(10,12,20,0)");
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.r * pulse, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      function strokeBolt(points, thick, alpha) {
        if (!points || points.length < 2) return;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        // Outer glow
        ctx.globalAlpha = alpha * 0.45;
        ctx.strokeStyle = "rgba(100,160,255,1)";
        ctx.lineWidth = thick * 3.2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        points.forEach(function(pt, i) {
          if (i === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]);
        });
        ctx.stroke();
        // Mid cyan
        ctx.globalAlpha = alpha * 0.75;
        ctx.strokeStyle = "rgba(160,210,255,1)";
        ctx.lineWidth = thick * 1.6;
        ctx.beginPath();
        points.forEach(function(pt, i) {
          if (i === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]);
        });
        ctx.stroke();
        // Hot white core
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "rgba(255,255,255,1)";
        ctx.lineWidth = Math.max(1.2, thick * 0.55);
        ctx.shadowColor = "rgba(180,220,255,0.95)";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        points.forEach(function(pt, i) {
          if (i === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]);
        });
        ctx.stroke();
        ctx.restore();
      }

      // Main bolts
      tcDraw.bolts.forEach(function(b) {
        var t = 1 - b.age / b.life;
        strokeBolt(b.points, b.thick || 4, Math.max(0, t));
      });
      // Aura arcs
      tcDraw.auraArcs.forEach(function(a) {
        var t = 1 - a.age / a.life;
        strokeBolt(a.points, a.thick || 1.5, Math.max(0, t) * 0.85);
      });
      // Aftereffect sparks
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      tcDraw.sparks.forEach(function(s) {
        var t = 1 - s.age / s.life;
        ctx.globalAlpha = t;
        ctx.fillStyle = "rgba(200,230,255,1)";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * t, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      ctx.restore(); // power fade
      if (stormMode === "chain") return; // thunder chain owns the draw while active
    }


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


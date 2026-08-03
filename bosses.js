"use strict";

  // ---------- Boss encounters — five bosses, one every 50 gameplay points ----------
  // "gameplayScore" only counts normal dodge-scoring, so bonus-round points never
  // shift boss pacing (see the scoring block in updateObstacles).
  const BOSSES = [
    { num: 1, threshold: 50,  maxHealth: 16,  kind: "bomber",  miniType: "balloon_anim",
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
    { num: 2, threshold: 100, maxHealth: 64,  kind: "rocket",  miniType: "mini_blimp",
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
    { num: 3, threshold: 150, maxHealth: 96,  kind: "tank",    miniType: "mini_tank",
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
    { num: 4, threshold: 200, maxHealth: 140, kind: "heli",    miniType: "mini_heli",
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
    { num: 5, threshold: 250, maxHealth: 200, kind: "octopus", miniType: "mini_ebomb",
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
  let stormUntil = 0;
  let stormCloud = null; // single descending cloud while the ability is active
  let stormLightning = null; // { points, life, age } — the current main bolt, if any
  let stormChainBolts = []; // secondary bolts branching from the cloud to each zapped obstacle
  let nextStormLightningAt = 0;
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
    const crossedTotal = Math.floor(currentScore / STORM_CHARGE_PER_MILESTONE);
    if (crossedTotal <= stormMilestoneCount) return;
    const newNotches = crossedTotal - stormMilestoneCount;
    stormMilestoneCount = crossedTotal;
    if (stormCharge >= STORM_MAX) return;
    stormCharge = Math.min(STORM_MAX, stormCharge + newNotches * STORM_CHARGE_PER_MILESTONE);
    updateStormMeterDisplay(true);
  }

  function updateStormMeterDisplay(justCharged) {
    const stage = Math.min(STORM_ICON_URLS.length - 1, Math.floor(stormCharge / STORM_CHARGE_PER_MILESTONE));
    if (stormIconDisplayEl && stormIconDisplayEl.dataset.stage !== String(stage)) {
      stormIconDisplayEl.dataset.stage = String(stage);
      stormIconDisplayEl.src = STORM_ICON_URLS[stage];
    }

    const isReady = stormCharge >= STORM_MAX && state === "playing" && !stormActive;
    stormMeterEl.classList.toggle("ready", isReady);

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

  function activateStorm() {
    if (state !== "playing" || stormActive || stormCharge < STORM_MAX) return;

    stormActive = true;
    stormCharge = 0;
    updateStormMeterDisplay();
    sfxThunder();

    // a single cloud drops in from above down to screen-center, then bursts —
    // the actual "zap everything" payoff happens on impact, in stormImpact()
    stormCloud = {
      phase: "falling", // falling -> impact -> fading
      t: 0,
      x: W / 2,
      startY: -H * 0.3,
      y: -H * 0.3,
      targetY: H * 0.4,
      w: Math.min(340, W * 0.55),
      animFrame: Math.floor(Math.random() * STORM_CLOUD_FRAME_COUNT),
      animTimer: 0,
      glowPhase: 0,
      ringPhase: 0
    };
    stormLightning = null;
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

  function stormImpact() {
    // the moment the cloud reaches center — screen-clear + boss damage payoff
    sfxThunder();
    triggerScreenFlash(0.22, 220);
    triggerScreenShake(6, 380);

    // a single decisive lightning bolt striking down from the cloud
    const startX = stormCloud.x;
    const startY = stormCloud.y + stormCloud.w * 0.1;
    stormLightning = { points: buildLightningPath(startX, startY, startX + (Math.random() - 0.5) * W * 0.2, H, W * 0.1), age: 0, life: 0.3 };

    // electricity branches out from the cloud to strike every obstacle on screen
    stormChainBolts = obstacles.map(o => {
      const drawY = o.y + Math.sin(o.bobPhase) * o.bobAmount;
      const ex = o.x + o.w / 2, ey = drawY + o.h / 2;
      return { points: buildLightningPath(startX, startY, ex, ey, 30), age: 0, life: 0.25 + Math.random() * 0.15 };
    });

    // zap every obstacle currently on screen
    obstacles.forEach(o => {
      const drawY = o.y + Math.sin(o.bobPhase) * o.bobAmount;
      triggerBigExplosion(o.x + o.w / 2, drawY + o.h / 2, o.w, o.h);
      score += 2;
    });
    obstacles = [];

    // zap any enemy bombs in flight
    bombs.forEach(b => triggerBigExplosion(b.x, b.y, 40, 40));
    bombs = [];

    // heavy damage to the boss, if the fight is on
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

  function updateStorm(dt) {
    if (!stormActive || !stormCloud) return;
    const frameDur = 1 / STORM_CLOUD_FPS;
    stormCloud.animTimer += dt;
    while (stormCloud.animTimer >= frameDur) {
      stormCloud.animTimer -= frameDur;
      stormCloud.animFrame = (stormCloud.animFrame + 1) % STORM_CLOUD_FRAME_COUNT;
    }
    stormCloud.glowPhase += dt * 3.5;
    stormCloud.ringPhase += dt * 4;
    stormCloud.t += dt;

    if (stormCloud.phase === "falling") {
      const dur = 0.5;
      const p = Math.min(1, stormCloud.t / dur);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out — fast start, gentle settle at center
      stormCloud.y = stormCloud.startY + (stormCloud.targetY - stormCloud.startY) * eased;
      if (p >= 1) {
        stormCloud.phase = "impact";
        stormCloud.t = 0;
        stormImpact();
      }
    } else if (stormCloud.phase === "impact") {
      if (stormCloud.t >= 0.35) {
        stormCloud.phase = "fading";
        stormCloud.t = 0;
      }
    } else if (stormCloud.phase === "fading") {
      if (stormCloud.t >= 0.4) {
        stormActive = false;
        stormCloud = null;
        stormLightning = null;
        stormChainBolts = [];
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

  function drawStorm() {
    if (!stormActive || !stormCloud) return;
    ctx.save();

    // darkening atmosphere overlay while the storm cloud is present
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
      const p = Math.min(1, stormCloud.t / 0.4);
      cloudAlpha = 1 - p;
      scale = 1 + p * 0.35; // slight outward pop as it dissolves
    } else if (stormCloud.phase === "falling") {
      scale = 0.85 + Math.min(1, stormCloud.t / 0.5) * 0.15;
    }

    ctx.save();
    ctx.translate(stormCloud.x, stormCloud.y);
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
  let levelEndPhase = null; // "windDown" | "approach" | "landing" | "victory"
  let levelEndTimer = 0;
  let levelEndPad = null; // { x, y, w, h, surfaceY, docked }
  let levelEndParticles = [];
  let levelEndFireworks = [];
  let levelEndBannerUntil = 0;
  let levelEndSavedFlap = true;

  function startLevelEndLanding() {
    levelEndActive = true;
    levelEndPhase = "windDown";
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
    showBanner("CITY CLEAR — APPROACH THE HANGAR!", 2800, "defeat");
  }

  function spawnLandingPad() {
    const img = images.landing_pad;
    const aspect = (img && img.naturalWidth && img.naturalHeight)
      ? img.naturalWidth / img.naturalHeight : 0.7;
    // Pad building sits on the ground line; landing surface is near the top platform
    const h = Math.min(H * 0.72, W * 0.85 / aspect);
    const w = h * aspect;
    const groundY = groundLevelY();
    // The wooden deck with the X is roughly in the upper third of the art
    const surfaceY = groundY - h * 0.78;
    levelEndPad = {
      x: W + 40,
      y: groundY - h,
      w: w,
      h: h,
      surfaceY: surfaceY,
      targetX: W * 0.42,
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

  function completeLevelLanding() {
    levelEndPhase = "victory";
    levelEndTimer = 0;
    levelEndPad.docked = true;
    player.vy = 0;
    // Snap player onto the pad surface
    player.y = levelEndPad.surfaceY - player.h * 0.35;
    player.rotation = 0;

    triggerScreenShake(5, 500);
    triggerScreenFlash(0.35, 400);
    if (typeof sfxBossDefeat === "function") sfxBossDefeat();
    showBanner("LEVEL 1 COMPLETE!", 3200, "defeat");

    // Fireworks burst
    const cx = levelEndPad.x + levelEndPad.w * 0.45;
    const cy = levelEndPad.surfaceY - 20;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (!levelEndActive) return;
        spawnVictoryFirework(cx + (Math.random() - 0.5) * 120, cy - Math.random() * 80);
      }, i * 280);
    }

    // Score bonus for clean landing
    score += 50;
    if (typeof scoreVal !== "undefined") scoreVal.textContent = score;
    if (typeof bumpScorePop === "function") bumpScorePop();
  }

  function finishLevelEndAndResume() {
    levelEndActive = false;
    levelEndPhase = null;
    levelEndPad = null;
    levelEndParticles = [];
    levelEndFireworks = [];
    stopWorldWindDown();
    // Rebuild level-2 city strip (bossesDefeatedCount already 1+)
    initBuildings();
    spawnTimer = 0;

    // Bank checkpoint for boss 2
    const next = nextBossConfig();
    if (next) {
      spawnCheckpointPickup(next.num);
    } else {
      checkpointReached = lastBossTriggered;
      checkpointScore = score;
      checkpointGameplayScore = gameplayScore;
      checkpointBossesDefeated = bossesDefeatedCount;
    }
    showBanner("LEVEL 2 — KEEP FLYING!", 2200, "level");
  }

  function updateLevelEnd(dt) {
    if (!levelEndActive) return;
    levelEndTimer += dt;

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
      if (groundLayersCleared() || levelEndTimer > 4.5) {
        levelEndPhase = "approach";
        levelEndTimer = 0;
        spawnLandingPad();
        showBanner("LAND ON THE PAD!", 2500, "defeat");
      }
      return;
    }

    if (levelEndPhase === "approach" || levelEndPhase === "landing") {
      if (!levelEndPad) return;
      levelEndPad.glowPhase += dt * 3;

      // Scroll pad left until it reaches target dock position
      if (levelEndPad.x > levelEndPad.targetX) {
        levelEndPad.x -= 140 * dt;
        if (levelEndPad.x <= levelEndPad.targetX) {
          levelEndPad.x = levelEndPad.targetX;
          if (levelEndPhase === "approach") {
            levelEndPhase = "landing";
            levelEndTimer = 0;
          }
        }
      }

      // Landing detection — player near the deck surface and over the pad
      const padLeft = levelEndPad.x + levelEndPad.w * 0.12;
      const padRight = levelEndPad.x + levelEndPad.w * 0.72;
      const overPad = player.x > padLeft && player.x < padRight;
      const nearSurface = Math.abs((player.y + player.h * 0.4) - levelEndPad.surfaceY) < player.h * 0.55;
      const descending = player.vy > -40; // not rocketing upward

      if (levelEndPhase === "landing" && overPad && nearSurface && descending) {
        completeLevelLanding();
      }

      // Soft floor while over pad so they don't die on ground
      if (overPad && player.y + player.h / 2 > levelEndPad.surfaceY + 8) {
        player.y = levelEndPad.surfaceY + 8 - player.h / 2;
        if (player.vy > 0) player.vy *= 0.4;
      }
      return;
    }

    if (levelEndPhase === "victory") {
      // Hold victory for a few seconds then resume
      if (levelEndTimer > 4.0) {
        finishLevelEndAndResume();
      }
    }
  }

  function drawLevelEnd() {
    if (!levelEndActive) return;

    // Landing pad
    if (levelEndPad) {
      const img = images.landing_pad;
      const p = levelEndPad;
      ctx.save();
      // Soft glow under the platform
      const glow = 0.25 + Math.sin(p.glowPhase) * 0.12;
      ctx.fillStyle = `rgba(201, 166, 107, ${glow})`;
      ctx.beginPath();
      ctx.ellipse(p.x + p.w * 0.42, p.surfaceY + 6, p.w * 0.28, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      if (img && img.naturalWidth) {
        ctx.drawImage(img, p.x, p.y, p.w, p.h);
      } else {
        // fallback silhouette
        ctx.fillStyle = "#5a4632";
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }

      // Pulsing X ring on the deck during landing phase
      if (levelEndPhase === "landing" || levelEndPhase === "approach") {
        const pulse = 0.5 + Math.sin(p.glowPhase * 2) * 0.5;
        ctx.strokeStyle = `rgba(255, 220, 120, ${0.35 + pulse * 0.45})`;
        ctx.lineWidth = 3;
        const rx = p.x + p.w * 0.42;
        const ry = p.surfaceY - 4;
        ctx.beginPath();
        ctx.ellipse(rx, ry, 28 + pulse * 8, 10 + pulse * 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // "LAND HERE" hint
      if (levelEndPhase === "landing") {
        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255,235,180,${0.7 + Math.sin(p.glowPhase * 3) * 0.3})`;
        ctx.fillText("▼ LAND HERE ▼", p.x + p.w * 0.42, p.surfaceY - 28);
      }
      ctx.restore();
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

    // Victory vignette flash
    if (levelEndPhase === "victory" && levelEndTimer < 0.6) {
      const a = (1 - levelEndTimer / 0.6) * 0.35;
      ctx.fillStyle = `rgba(255, 220, 140, ${a})`;
      ctx.fillRect(0, 0, W, H);
    }
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
      showBanner("BONUS ROUND! GRAB THE COINS!", 1800, "bonus");
    } else {
      hasFirepower = true;
      hasDualFire = false;
      spawnBalloonWave();
      showBanner("BONUS ROUND! POP THE BALLOONS!", 1800, "bonus");
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

    // After boss 1's bonus round, run the hangar landing sequence before
    // continuing into level 2. Later bosses keep the normal checkpoint flow.
    if (bossesDefeatedCount === 1) {
      startLevelEndLanding();
      return;
    }

    // Checkpoints are now granted after the bonus round, not before the boss —
    // the player has just cleared both the fight and its reward round, so a
    // token drifts by right here; grabbing it is what actually banks the
    // checkpoint (score included) for a later resume.
    const next = nextBossConfig();
    if (next) {
      spawnCheckpointPickup(next.num);
    } else {
      // no more bosses left — nothing to gate behind a pickup, just bank it
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
    const verb = bonusType === "coin" ? " grabbed · " : " popped · ";
    const text = "BONUS: " + bonusCollected + "/" + bonusTotal + verb + secsLeft + "s";
    ctx.save();
    ctx.textAlign = "center";
    const fontSize = Math.max(15, Math.min(22, W * 0.055));
    ctx.font = "bold " + fontSize + "px Georgia, serif";
    ctx.fillStyle = "rgba(20,12,5,0.5)";
    ctx.fillRect(0, H * 0.08, W, fontSize + 16);
    ctx.fillStyle = "#f5e6c8";
    ctx.fillText(text, W / 2, H * 0.08 + fontSize + 2);
    ctx.restore();
  }

  let bossBanner = null; // { text, until } — brief on-screen announcement

  function showBanner(text, durationMs, type) {
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


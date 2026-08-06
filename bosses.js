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
    pirateBlastParticles = [];
    stormSwarm = [];
    stormLightning = null;
    stormChainBolts = [];

    const sel = (typeof selectedBlimp !== "undefined") ? selectedBlimp : "blimp1";
    const swarmKey = SHIP_POWER_ICON_KEYS[sel] || null;

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

  function updateStorm(dt) {
    if (!stormActive) return;

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

  function drawStorm() {
    if (!stormActive) return;

    // ---- Swarm of spinning power icons ----
    if (stormMode === "swarm" || stormMode === "missile") {
      ctx.save();
      // brief warm/electric atmosphere
      const dusk = ctx.createLinearGradient(0, 0, 0, H);
      dusk.addColorStop(0, "rgba(40,22,10,0.28)");
      dusk.addColorStop(1, "rgba(20,10,5,0.05)");
      ctx.fillStyle = dusk;
      ctx.fillRect(0, 0, W, H);

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
    ["hudFrame", "stormMeter", "muteBtn"].forEach(function(id) {
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


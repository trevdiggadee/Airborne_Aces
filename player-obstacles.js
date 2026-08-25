"use strict";

  // ---------- Player ----------
  const GRAVITY = 1500;       // px/s^2
  const FLAP_VELOCITY = -430; // px/s (instant upward speed on tap)
  const MAX_FALL_SPEED = 700;

  const player = {
    x: 0, y: 0,
    vy: 0,
    w: 84, h: 50, // hitbox-ish display size, aspect-corrected below
    rotation: 0
  };

  function applyPlayerBlimpSize() {
    // Normalize on-screen size so every vessel reads about the same scale.
    // Little Spy (blimp6) stays intentionally smaller.
    const sel = (typeof selectedBlimp !== "undefined" && selectedBlimp) ? selectedBlimp : "blimp1";
    let scale = 1.0;
    if (sel === "blimp6") scale = 0.72 * 1.10;       // Little Spy smaller +10%
    else if (sel === "blimp4") scale = 1.20 * 1.05;  // Steampunk
    else if (sel === "blimp8") scale = 1.15;         // Ironworks +15%
    else if (sel === "blimp9") scale = 1.10;         // Jolly Rogers +10%
    else if (sel === "blimp11") scale = 1.05 * 1.05; // War Shark +5% then +5%
    else if (sel === "blimp12") scale = 1.15 * 1.05 * 1.05; // Sky Rocket stack +5%
    else if (sel === "blimp13") scale = 1.05 * 1.05; // Iron Lattice +5% then +5%
    else if (sel === "blimp14") scale = 1.10;        // Pirate Rocket +10%
    else if (sel === "blimp15") scale = 1.10 * 1.10 * 1.10; // Royal Stripe +10% again

    const firstFrame = currentPlayerImage();
    const aspect = (firstFrame && firstFrame.naturalWidth && firstFrame.naturalHeight / firstFrame.naturalWidth) || 0.55;
    // Fit inside a shared bounding box (width-capped) so large/tall sprites don't dominate
    const boxW = Math.min(118, W * 0.24) * scale;
    const boxH = boxW * 0.62;
    if (aspect > (boxH / boxW)) {
      player.h = boxH;
      player.w = boxH / aspect;
    } else {
      player.w = boxW;
      player.h = boxW * aspect;
    }
  }

  function resetPlayer() {
    applyPlayerBlimpSize();
    player.x = W * 0.28;
    player.y = H * 0.4;
    player.vy = 0;
    player.rotation = 0;
    playerBlimpFrame = 0;
    playerBlimpFrameTimer = 0;
  }

  function updatePlayerBlimpAnimation(dt) {
    const sel = typeof selectedBlimp !== "undefined" ? selectedBlimp : "blimp1";
    const anim = BLIMP_ANIM[sel] || BLIMP_ANIM.blimp1;
    playerBlimpFrameTimer += dt;
    const frameDuration = 1 / anim.fps;
    while (playerBlimpFrameTimer >= frameDuration) {
      playerBlimpFrameTimer -= frameDuration;
      playerBlimpFrame = (playerBlimpFrame + 1) % anim.frameCount;
    }
  }

  function flap() {
    // Allow runway hold even during brief intro (tip tells player to HOLD)
    if (state !== "playing") return;
    // Don't flap-react while docked on the pad
    if (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked) return;
    // Airfield runway: every tap/hold accelerates (never flap on runway)
    if (window.__airborneAirfield || window.__airborneAirfieldPhase === "taxi" || window.__airborneAirfieldPhase === "accel") {
      if (window.__airborneAirfieldPhase === "taxi" || window.__airborneAirfieldPhase === "accel" || !window.__airborneAirfieldPhase) {
        window.__airborneAirfield = true;
        window.__airborneAirfieldHold = true;
        window.__airborneAirfieldBoostPending = true;
        return;
      }
    }
    if (window.__airborneAirfield && window.__airborneAirfieldPhase === "climb") {
      return;
    }
    // land: allow flap (vy set here; position integrated in updateAirfield)
    if (window.__airborneAirfieldPaused) {
      return;
    }
    // Stronger flare authority during training landing
    if (window.__airborneAirfield && window.__airborneAirfieldPhase === "land") {
      player.vy = Math.min(player.vy, FLAP_VELOCITY * 1.15);
    } else {
      player.vy = FLAP_VELOCITY;
    }
    sfxFlap();
    // Visual pulse on every ship (squash kick, fin lag, exhaust)
    if (window.__airborneFlapPulse) window.__airborneFlapPulse();
  }

  function updatePlayer(dt) {
    // Calm rest on the landing pad
    if (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked) {
      player.vy = 0;
      player.rotation = 0;
      player.y = levelEndPad.surfaceY - player.h * 0.42;
      player.x = levelEndPad.x + levelEndPad.w * (levelEndPad.deckCenterFrac || 0.42);
      if (typeof blimpPersonality !== "undefined" && blimpPersonality) {
        blimpPersonality.squashX = 1;
        blimpPersonality.squashY = 1;
        blimpPersonality.squashTargetX = 1;
        blimpPersonality.squashTargetY = 1;
        blimpPersonality.flapKickY = 0;
        blimpPersonality.finLag = 0;
        blimpPersonality.exhaustParticles = [];
        blimpPersonality.speedStreaks = [];
      }
      return;
    }

    // Airfield: scripted phases freeze physics; still run exhaust personality
    const afPhase = window.__airborneAirfieldPhase;
    if (window.__airborneAirfield &&
        (afPhase === "taxi" || afPhase === "accel" || afPhase === "climb" ||
         afPhase === "score" || afPhase === "skid" || afPhase === "rollout" ||
         window.__airborneAirfieldPaused)) {
      player.vy = 0;
      updateBlimpPersonality(dt);
      return;
    }
    // land: player-controlled (updateAirfield integrates); keep exhaust alive
    if (window.__airborneAirfield && afPhase === "land") {
      updateBlimpPersonality(dt);
      return;
    }
    // lesson / training flight falls through to gravity


    player.vy += GRAVITY * dt;
    if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
    player.y += player.vy * dt;

    // rotation follows velocity, clamped
    const target = Math.max(-0.4, Math.min(0.55, player.vy / 600));
    player.rotation += (target - player.rotation) * 0.15;

    const groundY = groundLevelY();
    if (player.y + player.h / 2 > groundY) {
      player.y = groundY - player.h / 2;
      // Airfield open sky / training: never damage from bottom
      if (window.__airborneAirfield || window.__airborneAirfieldInvuln ||
          (typeof isLevelEndActive === "function" && isLevelEndActive())) {
        player.vy = Math.min(player.vy, 0);
      } else {
        takeHit();
      }
    }
    if (player.y - player.h / 2 < 0) {
      player.y = player.h / 2;
      player.vy = 0;
    }

    maybeEmitWind(player.x - player.w * 0.32, player.y, player.w * 0.5, player.h, 10, dt, "player");
  
    updateBlimpPersonality(dt);}

  function drawPlayer() {
    try {
    // Hide blimp during the end-of-level black fade (overlay draws after player)
    if (typeof levelEndPhase === "string" && levelEndPhase === "fadeOut") return;
    const img = currentPlayerImage();
    if (!img || !img.naturalWidth) {
      // Never let the player silently vanish — draw a simple visible
      // placeholder and log why, so this is diagnosable if it recurs.
      if (!drawPlayer._warned) {
        drawPlayer._warned = true;
        console.warn("Airborne Aces: currentPlayerImage() returned nothing usable — drawing a fallback shape instead of the blimp.");
      }
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.rotation);
      ctx.fillStyle = "#c9a66b";
      ctx.strokeStyle = "#3a2410";
      ctx.lineWidth = 3;
      ctx.beginPath();
      const rw = Math.max(4, (player.w || 40) / 2);
      const rh = Math.max(4, (player.h || 24) / 2);
      ctx.scale(1, rh / rw);
      ctx.arc(0, 0, rw, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }
    // Motion blur removed — was reading as a shadow on the blimp
    // (kept function available for obstacles)

    // Streaks + prop behind body; flame drawn on top after sprite for seamless blend
    if (typeof drawBlimpPersonality === "function") drawBlimpPersonality(false);
    if (typeof drawBlimpPropBlur === "function") drawBlimpPropBlur();

    ctx.save();
    const docked = (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked);
    const kickY = (!docked && blimpPersonality && blimpPersonality.flapKickY) ? blimpPersonality.flapKickY : 0;
    const fin = (!docked && blimpPersonality) ? (blimpPersonality.finLag || 0) * 0.28 : 0;
    ctx.translate(player.x, player.y + kickY);
    ctx.rotate(player.rotation + fin);
    if (!docked && performance.now() < invulnerableUntil) {
      ctx.globalAlpha = (Math.floor(performance.now() / 90) % 2 === 0) ? 1 : 0.35;
    } else if (window.__airborneInCloud) {
      // Level-3 style: blimp reads through the cloud
      ctx.globalAlpha = 0.78;
    }
    if (docked) {
      ctx.scale(1, 1);
    } else if (blimpPersonality) {
      ctx.scale(blimpPersonality.squashX || 1, blimpPersonality.squashY || 1);
    }
    ctx.drawImage(img, -player.w / 2, -player.h / 2, player.w, player.h);
    ctx.restore();
    // Flame layered on top with additive blend so it merges into the nozzle
    if (typeof drawBlimpPersonality === "function") drawBlimpPersonality(true);
    } catch (e) { console.warn("drawPlayer", e); }
  }

  // ---------- Obstacles ----------
  let obstacles = [];
  window.__airborneClearObstacles = function () {
    try { obstacles.length = 0; obstacles = []; } catch (e) {}
    try { if (typeof hearts !== "undefined") { hearts.length = 0; hearts = []; } } catch (e) {}
    try {
      window.__airborneFirePowerActive = false;
      window.__airborneFirePickup = null;
      window.__airborneFireAura = [];
      window.__airborneFireTrail = [];
    } catch (e) {}
    try { window.__airborneObstacles = obstacles; } catch (e) {}
  };
  window.__airborneGetObstacles = function () { return obstacles; };

  let spawnTimer = 0;
  let spawnInterval = 1.7; // seconds, decreases slightly as score rises
  let obstacleSpeed = 220; // px/s, increases with score

  // ---------- Dodge combo / graze system ----------
  const GRAZE_THRESHOLD = 16;  // px — how close a non-collision counts as a "graze"
  const GRAZE_BONUS = 2;
  const STREAK_MILESTONE = 5;  // award a bonus every N consecutive un-hit dodges
  const STREAK_BONUS = 10;
  const WAKE_RANGE = 48; // px — spawn turbulence when an obstacle nearly grazes the player
  let dodgeStreak = 0;
  let comboPopups = []; // floating "GRAZE!" / "5x STREAK!" text
  function spawnComboPopup(x, y, text, color) {
    comboPopups.push({
      x: W * 0.5,
      y: H * 0.28,
      text: text,
      color: color || "#f0d878",
      born: performance.now(),
      life: 1400
    });
  }

  function updateComboPopups() {
    const now = performance.now();
    comboPopups = comboPopups.filter(p => now - p.born < p.life);
  }

  function drawComboPopups() {
    const now = performance.now();
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    comboPopups.forEach(p => {
      const t = (now - p.born) / p.life;
      let a = 1;
      if (t < 0.14) a = t / 0.14;
      else if (t > 0.7) a = Math.max(0, 1 - (t - 0.7) / 0.3);
      const pop = t < 0.18 ? (0.7 + 0.4 * (t / 0.18)) : 1;
      // Slower spin
      const spin = (now - p.born) / 520;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W * 0.5, H * 0.24);
      ctx.scale(pop, pop);
      const R = Math.max(28, Math.min(42, W * 0.10));
      // Outer soft pulse
      const pulse = 1 + 0.04 * Math.sin(now / 200);
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.35 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(110, 30, 48, 0.22)";
      ctx.fill();
      ctx.rotate(spin);
      // Redesigned gear — thicker rim, fewer cleaner teeth, brass rim highlight
      const teeth = 8;
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a0 = (i / teeth) * Math.PI * 2;
        const a1 = ((i + 0.28) / teeth) * Math.PI * 2;
        const a2 = ((i + 0.42) / teeth) * Math.PI * 2;
        const a3 = ((i + 0.72) / teeth) * Math.PI * 2;
        const rOut = R;
        const rIn = R * 0.78;
        if (i === 0) ctx.moveTo(Math.cos(a0) * rIn, Math.sin(a0) * rIn);
        ctx.lineTo(Math.cos(a0) * rOut, Math.sin(a0) * rOut);
        ctx.lineTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut);
        ctx.lineTo(Math.cos(a2) * rIn, Math.sin(a2) * rIn);
        ctx.lineTo(Math.cos(a3) * rIn, Math.sin(a3) * rIn);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(-R * 0.25, -R * 0.25, 2, 0, 0, R);
      g.addColorStop(0, "#a33d55");
      g.addColorStop(0.45, "#6e2236");
      g.addColorStop(1, "#2e0c16");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(160, 70, 90, 0.95)";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // Inner disc
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.52, 0, Math.PI * 2);
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.52);
      g2.addColorStop(0, "#7a2a3c");
      g2.addColorStop(1, "#3d121e");
      ctx.fillStyle = g2;
      ctx.fill();
      ctx.strokeStyle = "rgba(200, 120, 130, 0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // Hub + bolt
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = "#1e0a10";
      ctx.fill();
      ctx.strokeStyle = "rgba(212, 175, 55, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Number upright
      ctx.rotate(-spin);
      const fs = Math.max(14, Math.min(19, R * 0.58));
      ctx.font = "bold " + fs + "px Rockwell, Georgia, serif";
      ctx.fillStyle = "#f8ecd8";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.fillText(String(p.text), 0, 1);
      ctx.shadowBlur = 0;
      ctx.restore();
    });
    ctx.restore();
  }

  function pickObstacleType() {
    const next = nextBossConfig();
    if (next && !bossActive) {
      const leadInStart = next.threshold - 25;
      if (gameplayScore >= leadInStart && gameplayScore < next.threshold && Math.random() < 0.3) {
        return next.miniType;
      }
    }
    return Math.random() < 0.5 ? "bird_a" : "bird_b";
  }


  // Spend 5 collected coins on hit — they burst out, arc, and fall off-screen
  if (!window.__airborneHitCoins) window.__airborneHitCoins = [];
  const HIT_COIN_COST = 5;

  function refreshCoinCounter() {
    try {
      if (typeof updateCollectDock === "function") updateCollectDock();
      else {
        var coinEl = document.getElementById("collectPowerPct");
        if (coinEl) coinEl.textContent = String(window.__airborneCollectCoins || 0);
      }
    } catch (e) {}
  }

  function spawnHitCoinBurst(opts) {
    try {
      if (typeof player === "undefined" || !player) return;
      var now = performance.now();
      if (window.__airborneLastCoinBurst && now - window.__airborneLastCoinBurst < 180) return;
      opts = opts || {};
      var free = !!opts.free; // shield block: visual only, no spend

      var have = window.__airborneCollectCoins || 0;
      if (!free && have < HIT_COIN_COST) {
        // Not enough coins — nothing comes out
        return;
      }

      // Subtract from collection (skip for free shield-block pop)
      if (!free) {
        window.__airborneCollectCoins = have - HIT_COIN_COST;
        try {
          if (typeof ruffStats !== "undefined" && ruffStats) {
            ruffStats.coins = Math.max(0, (ruffStats.coins || 0) - HIT_COIN_COST);
          }
        } catch (e) {}
        refreshCoinCounter();
      }

      window.__airborneLastCoinBurst = now;
      var cx = player.x;
      var cy = player.y;
      if (!window.__airborneHitCoins) window.__airborneHitCoins = [];
      var list = window.__airborneHitCoins;
      for (var i = 0; i < HIT_COIN_COST; i++) {
        var ang = (i / HIT_COIN_COST) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        // outward burst then gravity arcs them down off-screen
        var spd = 140 + Math.random() * 100;
        var startR = 14 + Math.random() * 8;
        list.push({
          x: cx + Math.cos(ang) * startR,
          y: cy + Math.sin(ang) * startR * 0.7,
          r: 13 + Math.random() * 3,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd * 0.55 - (40 + Math.random() * 50), // initial lift then fall
          spin: Math.random() * Math.PI * 2,
          bob: Math.random() * Math.PI * 2,
          life: 4.0,
          age: 0,
          falling: true,
          collected: false
        });
      }
      try {
        if (typeof sfxTrainingCoin === "function") sfxTrainingCoin();
      } catch (e) {}
    } catch (e) {}
  }
  window.spawnHitCoinBurst = spawnHitCoinBurst;
  window.spawnHitRingBurst = spawnHitCoinBurst;

  function updateHitCoins(dt) {
    var list = window.__airborneHitCoins;
    if (!list || !list.length) return;
    var H0 = typeof H !== "undefined" ? H : 600;
    var W0 = typeof W !== "undefined" ? W : 800;
    for (var i = list.length - 1; i >= 0; i--) {
      var c = list[i];
      c.age += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      // air drag then strong gravity — arch down and fall off screen
      c.vx *= (1 - 0.35 * dt);
      c.vy += 420 * dt; // fall hard
      if (c.vy > 520) c.vy = 520;
      c.spin += dt * 6.5;
      c.bob += dt * 2.5;
      // No player re-collection — spent coins leave the run
      if (c.y > H0 + 40 || c.x < -80 || c.x > W0 + 80 || c.age >= c.life) {
        list.splice(i, 1);
      }
    }
  }

  function drawHitCoins() {
    var list = window.__airborneHitCoins;
    if (!list || !list.length || typeof ctx === "undefined") return;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var by = c.y + Math.sin(c.bob) * 2;
      var squash = 0.55 + 0.45 * Math.abs(Math.cos(c.spin));
      var fade = c.y > (typeof H !== "undefined" ? H : 600) - 40
        ? Math.max(0.15, 1 - (c.y - ((typeof H !== "undefined" ? H : 600) - 40)) / 80)
        : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(c.x, by);
      ctx.scale(squash, 1);
      ctx.globalAlpha = fade * 0.4;
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(0, 0, c.r * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = fade;
      var g = ctx.createRadialGradient(-c.r * 0.3, -c.r * 0.35, 1, 0, 0, c.r);
      g.addColorStop(0, "#fff6c8");
      g.addColorStop(0.35, "#ffd700");
      g.addColorStop(0.75, "#d4a017");
      g.addColorStop(1, "#8a6a0a");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(120, 80, 10, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, c.r * 0.92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(180, 120, 20, 0.55)";
      ctx.beginPath();
      ctx.arc(0, 0, c.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  window.updateHitCoins = updateHitCoins;
  window.drawHitCoins = drawHitCoins;

  function spawnGoldRing() {
    const r = Math.min(42, W * 0.10); // +25% from prior half-size
    const groundY = groundLevelY();
    const minY = H * 0.12;
    const maxY = groundY - H * 0.22;
    const y = minY + Math.random() * Math.max(40, maxY - minY);
    obstacles.push({
      type: "gold_ring",
      x: W + r * 2,
      y: y,
      w: r * 2,
      h: r * 2,
      r: r,
      vx: 0,
      scored: false,
      collected: false,
      spin: Math.random() * Math.PI * 2,
      bobPhase: Math.random() * Math.PI * 2,
      bobAmount: 8,
      speedMult: 1,
      isRing: true
    });
  }

  function spawnObstacle() {
    // Airfield training rings
    if (window.__airborneAirfield && window.__airborneAirfieldRings && !window.__airborneAirfieldObstacles) {
      spawnGoldRing();
      return;
    }
    if (window.__airborneAirfield && window.__airborneAirfieldRings && Math.random() < 0.45) {
      spawnGoldRing();
      return;
    }
    if (window.__airborneAirfield && !window.__airborneAirfieldObstacles && !window.__airborneAirfieldRings) {
      return;
    }
    const type = pickObstacleType();
    const frames = OBSTACLE_ANIM_SETS[type];
    const img = images[frames[0]];
    let aspect = imgAspect(img);
    let dispW;
    if (type === "balloon_anim") {
      dispW = Math.min(90, W * 0.18);
    } else if (type === "mini_blimp") {
      // mini blimps — 2x bigger for dramatic boss lead-in presence
      const playerImg = currentPlayerImage();
      const playerAspect = playerImg && playerImg.naturalWidth ? (playerImg.naturalHeight / playerImg.naturalWidth) : 0.6;
      dispW = Math.min(220, W * 0.44);
      // Force aspect to match player so height matches too
      aspect = playerAspect || aspect;
    } else if (type === "mini_tank") {
      // boss 3's mini — 2x bigger
      dispW = Math.min(220, W * 0.44);
    } else if (type === "mini_heli") {
      // boss 4's mini — 2x bigger
      dispW = Math.min(220, W * 0.44);
    } else if (type === "mini_ebomb") {
      // boss 5's mini — 2x bigger, matching the other bosses' minis
      dispW = Math.min(220, W * 0.44);
    } else {
      dispW = Math.min(70, W * 0.15);
    }
    const dispH = dispW * aspect;

    // Full screen vertical range during airfield training; city levels stay roof-safe
    const groundY = groundLevelY();
    const topMargin = H * 0.04;
    let minY = topMargin;
    let maxY;
    if (window.__airborneAirfield) {
      // Whole sky band — top to near bottom of playable area
      maxY = Math.max(minY + 40, H * 0.82 - dispH);
    } else {
      const tallestRoofY = groundY - H * 0.5;
      const bobBuffer = 20;
      maxY = Math.max(minY + 40, tallestRoofY - dispH - bobBuffer);
    }
    const y = minY + Math.random() * Math.max(20, (maxY - minY));

    obstacles.push({
      type,
      x: W + dispW,
      y,
      w: dispW,
      h: dispH,
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 1.5 + Math.random() * 1.2,
      bobAmount: 8 + Math.random() * 10,
      speedMult: type === "balloon_anim" ? 0.72 : 1,
      animFrame: Math.floor(Math.random() * OBSTACLE_ANIM_FRAME_COUNT),
      animTimer: Math.random() / OBSTACLE_ANIM_FPS,
      scored: false,
      // jet engine flame + smoke trail for mini blimps
      flameTimer: (type === "mini_blimp") ? 0 : null,
      smokeTimer: (type === "mini_blimp") ? 0 : null,
      flameParticles: (type === "mini_blimp") ? [] : null,
      smokeParticles: (type === "mini_blimp") ? [] : null
    });
  }

  
  // ---------- FIRE POWER-UP (window-scoped so it never ReferenceErrors) ----------
  (function initFirePowerSystem() {
    if (window.__airborneFireInited) return;
    window.__airborneFireInited = true;
    window.__airborneFirePowerActive = false;
    window.__airborneFirePowerUntil = 0;
    window.__airborneFirePickup = null;
    window.__airborneFireAura = [];
    window.__airborneFireTrail = [];

    window.__airborneSpawnFirePickup = function (x, y) {
      window.__airborneFirePickup = {
        x: (typeof x === "number") ? x : ((typeof W !== "undefined" ? W : 400) + 60),
        y: (typeof y === "number") ? y : ((typeof H !== "undefined" ? H : 600) * (0.28 + Math.random() * 0.32)),
        r: 35, // +25% floating size
        bob: Math.random() * Math.PI * 2,
        pulse: 0,
        speed: 125,
        frame: 0,
        frameT: 0,
        embers: []
      };
    };

    window.__airborneEmitFireBurst = function (x, y) {
      for (let i = 0; i < 12; i++) {
        window.__airborneFireTrail.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 130,
          vy: -50 - Math.random() * 90,
          life: 0.4 + Math.random() * 0.3,
          age: 0,
          r: 4 + Math.random() * 6,
          smoke: false
        });
      }
    };

    window.__airborneEmitFireTrail = function (x, y, tint) {
      if (Math.random() > 0.65) return;
      window.__airborneFireTrail.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y,
        vx: (Math.random() - 0.5) * 25,
        vy: -15 - Math.random() * 35,
        life: 0.3 + Math.random() * 0.25,
        age: 0,
        r: 3 + Math.random() * 5,
        smoke: Math.random() < 0.4,
        tint: tint || "orange"
      });
    };

    window.__airborneUpdateFirePower = function (dt) {
      const pickup = window.__airborneFirePickup;
      if (pickup && !pickup.collected) {
        pickup.x -= (pickup.speed || 125) * dt;
        pickup.bob += dt * 2.4;
        pickup.pulse = (pickup.pulse || 0) + dt * 5;
        // 6x6 sheet = 36 frames
        pickup.frameT = (pickup.frameT || 0) + dt;
        const fd = 1 / 14;
        while (pickup.frameT >= fd) {
          pickup.frameT -= fd;
          pickup.frame = ((pickup.frame || 0) + 1) % 36;
        }
        // Spawn small embers
        if (!pickup.embers) pickup.embers = [];
        if (Math.random() < 0.7) {
          const ang = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.2;
          pickup.embers.push({
            x: pickup.x + (Math.random() - 0.5) * 16,
            y: pickup.y + Math.sin(pickup.bob) * 10 + 6,
            vx: Math.cos(ang) * (20 + Math.random() * 40),
            vy: Math.sin(ang) * (30 + Math.random() * 50) - 20,
            life: 0.35 + Math.random() * 0.35,
            age: 0,
            r: 1.5 + Math.random() * 2.5
          });
        }
        for (let ei = pickup.embers.length - 1; ei >= 0; ei--) {
          const e = pickup.embers[ei];
          e.age += dt;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.vy += 40 * dt;
          if (e.age >= e.life) pickup.embers.splice(ei, 1);
        }
        if (pickup.embers.length > 40) pickup.embers.splice(0, pickup.embers.length - 40);
        if (typeof player !== "undefined" && player) {
          const dx = Math.abs(player.x - pickup.x);
          const dy = Math.abs(player.y - (pickup.y + Math.sin(pickup.bob) * 10));
          if (dx < player.w * 0.45 + pickup.r && dy < player.h * 0.45 + pickup.r) {
            pickup.collected = true;
            pickup.collectAnim = 0; // 0→1 expand + bounce fade
            pickup.collectX = pickup.x;
            pickup.collectY = pickup.y + Math.sin(pickup.bob) * 10;
            window.__airborneFirePowerActive = true;
            window.__airborneFirePowerUntil = performance.now() + 9000;
            window.__airborneFireOrbiters = [];
            window.__airborneFireActivateT = 0;
            try {
              if (typeof sfxPowerup === "function") sfxPowerup();
            } catch (e) {}
          }
        }
        if (pickup.x < -70 && !pickup.collected) window.__airborneFirePickup = null;
      }
      // Collect expand animation continues after collect
      if (pickup && pickup.collected) {
        pickup.collectAnim = (pickup.collectAnim || 0) + dt / 0.85;
        // keep animating frames during expand
        pickup.frameT = (pickup.frameT || 0) + dt;
        const fd = 1 / 16;
        while (pickup.frameT >= fd) {
          pickup.frameT -= fd;
          pickup.frame = ((pickup.frame || 0) + 1) % 36;
        }
        // burst embers during expand
        if (!pickup.embers) pickup.embers = [];
        if (pickup.collectAnim < 0.7 && Math.random() < 0.85) {
          const ang = Math.random() * Math.PI * 2;
          const sp = 60 + Math.random() * 140;
          pickup.embers.push({
            x: pickup.collectX || pickup.x,
            y: pickup.collectY || pickup.y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp - 30,
            life: 0.4 + Math.random() * 0.4,
            age: 0,
            r: 2 + Math.random() * 4
          });
        }
        for (let ei = (pickup.embers || []).length - 1; ei >= 0; ei--) {
          const e = pickup.embers[ei];
          e.age += dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 50 * dt;
          if (e.age >= e.life) pickup.embers.splice(ei, 1);
        }
        if (pickup.collectAnim >= 1) window.__airborneFirePickup = null;
      }
      if (window.__airborneFirePowerActive && performance.now() > window.__airborneFirePowerUntil) {
        window.__airborneFirePowerActive = false;
      }
      // Dense core + orbiting fireball system (Zeppelin Ace)
      if (window.__airborneFirePowerActive && typeof player !== "undefined" && player) {
        // Ensure orbiters exist
        if (!window.__airborneFireOrbiters || !window.__airborneFireOrbiters.length) {
          window.__airborneFireOrbiters = [];
          var nOrb = 6;
          for (var oi = 0; oi < nOrb; oi++) {
            window.__airborneFireOrbiters.push({
              phase: (oi / nOrb) * Math.PI * 2,
              speed: 2.4 + Math.random() * 0.9,
              radius: 0.52 + Math.random() * 0.18,
              tilt: 0.55 + Math.random() * 0.35,
              wobble: 0.15 + Math.random() * 0.2,
              wobbleSpd: 1.5 + Math.random() * 2,
              size: 9 + Math.random() * 5,
              trail: []
            });
          }
          window.__airborneFireActivateT = 0;
        }
        window.__airborneFireActivateT = (window.__airborneFireActivateT || 0) + dt;
        // Core heat embers
        for (let i = 0; i < 3; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = player.w * (0.15 + Math.random() * 0.28);
          window.__airborneFireAura.push({
            x: player.x + Math.cos(ang) * rad,
            y: player.y + Math.sin(ang) * rad * 0.7,
            vx: (Math.random() - 0.5) * 40,
            vy: -40 - Math.random() * 55,
            life: 0.25 + Math.random() * 0.3,
            age: 0,
            r: 4 + Math.random() * 6
          });
        }
        // Update orbiters + trails
        var orbs = window.__airborneFireOrbiters;
        for (var oi = 0; oi < orbs.length; oi++) {
          var orb = orbs[oi];
          orb.phase += orb.speed * dt;
          var act = Math.min(1, (window.__airborneFireActivateT || 0) / 0.45);
          var radMul = act * (orb.radius + Math.sin(orb.phase * orb.wobbleSpd) * orb.wobble * 0.12);
          var ox = player.x + Math.cos(orb.phase) * player.w * radMul * 1.15;
          var oy = player.y + Math.sin(orb.phase) * player.h * radMul * orb.tilt;
          orb.x = ox; orb.y = oy;
          orb.z = Math.sin(orb.phase); // front/back depth
          // trail samples
          if (!orb.trail) orb.trail = [];
          orb.trail.push({ x: ox, y: oy, age: 0, life: 0.28 });
          if (orb.trail.length > 10) orb.trail.shift();
          for (var ti = orb.trail.length - 1; ti >= 0; ti--) {
            orb.trail[ti].age += dt;
            if (orb.trail[ti].age >= orb.trail[ti].life) orb.trail.splice(ti, 1);
          }
          // sparks off orbiter
          if (Math.random() < 0.35) {
            window.__airborneFireTrail.push({
              x: ox, y: oy,
              vx: (Math.random() - 0.5) * 60,
              vy: -20 - Math.random() * 50,
              life: 0.2 + Math.random() * 0.2,
              age: 0,
              r: 2 + Math.random() * 3,
              smoke: false
            });
          }
        }
      } else {
        window.__airborneFireOrbiters = [];
        window.__airborneFireActivateT = 0;
      }
      const aura = window.__airborneFireAura;
      for (let i = aura.length - 1; i >= 0; i--) {
        const p = aura[i];
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.age >= p.life) aura.splice(i, 1);
      }
      if (aura.length > 80) aura.splice(0, aura.length - 80);
      const trail = window.__airborneFireTrail;
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 35 * dt;
        if (p.smoke) p.r += 16 * dt;
        if (p.age >= p.life) trail.splice(i, 1);
      }
      if (trail.length > 120) trail.splice(0, trail.length - 120);
    };

    window.__airborneDrawFirePower = function () {
      try { if (window.__airborneDrawActivePowerVisual) window.__airborneDrawActivePowerVisual(); } catch (e) {}

      if (typeof ctx === "undefined") return;
      const pickup = window.__airborneFirePickup;
      if (pickup) {
        const collecting = !!pickup.collected;
        const ca = Math.min(1, pickup.collectAnim || 0);
        // Motion: bob + slight orbit sway + spin scale
        const bobY = Math.sin(pickup.bob || 0) * 10;
        const swayX = Math.sin((pickup.pulse || 0) * 0.7) * 6;
        const baseX = collecting ? (pickup.collectX || pickup.x) : (pickup.x + swayX);
        const baseY = collecting ? (pickup.collectY || pickup.y) : (pickup.y + bobY);
        // Expand to ~half screen with bounce, then fade
        let scale = 1;
        let alpha = 1;
        if (collecting) {
          // bounce ease: overshoot then settle while fading
          const bounce = Math.sin(ca * Math.PI) * 0.18;
          scale = 1 + ca * ca * 9 + bounce; // grows toward ~half screen
          alpha = ca < 0.55 ? 1 : Math.max(0, 1 - (ca - 0.55) / 0.45);
        } else {
          scale = 1 + Math.sin(pickup.pulse || 0) * 0.08;
        }
        const R = (pickup.r || 28) * scale;
        // Collected expands to ~full half-screen * 2 (almost fills view), with bounce
        const halfTarget = Math.min(W, H) * 0.95;
        const dw = collecting ? Math.min(halfTarget * (0.12 + ca * 0.88), halfTarget) : R * 2.4;
        const dh = dw;
        ctx.save();
        ctx.globalAlpha = alpha;
        // Glow
        const glowR = dw * 0.7;
        const g = ctx.createRadialGradient(baseX, baseY, 2, baseX, baseY, glowR);
        g.addColorStop(0, "rgba(255,200,60," + (0.55 * alpha) + ")");
        g.addColorStop(0.45, "rgba(255,90,15," + (0.25 * alpha) + ")");
        g.addColorStop(1, "rgba(180,20,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(baseX, baseY, glowR, 0, Math.PI * 2);
        ctx.fill();
        // Sprite
        const sheet = (typeof images !== "undefined" && images) ? images.fireball_sheet : null;
        if (sheet && sheet.naturalWidth) {
          const cols = 6, rows = 6;
          const fw = sheet.naturalWidth / cols;
          const fh = sheet.naturalHeight / rows;
          const fr = (pickup.frame || 0) % 36;
          const col = fr % cols;
          const row = Math.floor(fr / cols) % rows;
          ctx.drawImage(sheet, col * fw, row * fh, fw, fh, baseX - dw / 2, baseY - dh / 2, dw, dh);
        } else {
          const g2 = ctx.createRadialGradient(baseX - 3, baseY - 4, 0, baseX, baseY, dw / 2);
          g2.addColorStop(0, "#fff6c8");
          g2.addColorStop(0.35, "#ffb030");
          g2.addColorStop(0.75, "#ff4a10");
          g2.addColorStop(1, "rgba(120,10,0,0.25)");
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.arc(baseX, baseY, dw / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Embers
        (pickup.embers || []).forEach(function (e) {
          const u = 1 - e.age / e.life;
          if (u <= 0) return;
          ctx.globalAlpha = Math.max(0, u * alpha);
          const eg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r);
          eg.addColorStop(0, "rgba(255,240,160,1)");
          eg.addColorStop(0.5, "rgba(255,120,30,0.8)");
          eg.addColorStop(1, "rgba(200,40,0,0)");
          ctx.fillStyle = eg;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r * (collecting ? 1.4 : 1), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      if (window.__airborneFirePowerActive && typeof player !== "undefined" && player) {
        ctx.save();
        var act = Math.min(1, (window.__airborneFireActivateT || 0) / 0.45);
        var pulse = 0.85 + 0.15 * Math.sin(performance.now() * 0.012);
        // Heat shimmer / dense core aura around blimp
        var coreR = Math.max(player.w, player.h) * (0.55 + 0.25 * act) * pulse;
        var cg = ctx.createRadialGradient(player.x, player.y, coreR * 0.15, player.x, player.y, coreR);
        cg.addColorStop(0, "rgba(255,245,180," + (0.75 * act) + ")");
        cg.addColorStop(0.35, "rgba(255,140,30," + (0.45 * act) + ")");
        cg.addColorStop(0.7, "rgba(255,50,0," + (0.18 * act) + ")");
        cg.addColorStop(1, "rgba(180,20,0,0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(player.x, player.y, coreR, 0, Math.PI * 2);
        ctx.fill();
        // subtle outer heat ring shimmer
        ctx.globalAlpha = 0.25 * act;
        ctx.strokeStyle = "rgba(255,200,80,0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, coreR * (0.92 + 0.04 * Math.sin(performance.now() * 0.02)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Draw orbiters: behind first (z < 0), then front (z >= 0)
        var orbs = window.__airborneFireOrbiters || [];
        function drawOrb(orb, front) {
          if (!orb || orb.x == null) return;
          var isFront = (orb.z || 0) >= 0;
          if (front !== isFront) return;
          var sc = front ? 1.15 : 0.75;
          var alpha = front ? 1 : 0.55;
          // trail
          if (orb.trail && orb.trail.length) {
            for (var ti = 0; ti < orb.trail.length; ti++) {
              var tp = orb.trail[ti];
              var tu = 1 - tp.age / tp.life;
              if (tu <= 0) continue;
              ctx.globalAlpha = tu * 0.55 * alpha * act;
              var tg = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, orb.size * 0.9 * sc);
              tg.addColorStop(0, "rgba(255,220,100,0.9)");
              tg.addColorStop(0.5, "rgba(255,100,20,0.5)");
              tg.addColorStop(1, "rgba(255,40,0,0)");
              ctx.fillStyle = tg;
              ctx.beginPath();
              ctx.arc(tp.x, tp.y, orb.size * 0.7 * sc * tu, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          // fireball body
          ctx.globalAlpha = alpha * act;
          var sz = orb.size * sc * (0.9 + 0.15 * Math.sin(performance.now() * 0.02 + orb.phase));
          var fg = ctx.createRadialGradient(orb.x - sz * 0.25, orb.y - sz * 0.3, 1, orb.x, orb.y, sz);
          fg.addColorStop(0, "rgba(255,250,220,1)");
          fg.addColorStop(0.3, "rgba(255,200,60,0.95)");
          fg.addColorStop(0.65, "rgba(255,90,15,0.85)");
          fg.addColorStop(1, "rgba(180,20,0,0)");
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, sz, 0, Math.PI * 2);
          ctx.fill();
          // bright core
          ctx.globalAlpha = alpha * act * 0.9;
          ctx.fillStyle = "rgba(255,255,230,0.95)";
          ctx.beginPath();
          ctx.arc(orb.x - sz * 0.15, orb.y - sz * 0.15, sz * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
        for (var oi = 0; oi < orbs.length; oi++) drawOrb(orbs[oi], false);
        for (var oi = 0; oi < orbs.length; oi++) drawOrb(orbs[oi], true);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
      }
      (window.__airborneFireAura || []).forEach(function (p) {
        const u = 1 - p.age / p.life;
        if (u <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, u);
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        gr.addColorStop(0, "rgba(255,230,120,0.9)");
        gr.addColorStop(0.5, "rgba(255,100,20,0.5)");
        gr.addColorStop(1, "rgba(200,30,0,0)");
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      (window.__airborneFireTrail || []).forEach(function (p) {
        const u = 1 - p.age / p.life;
        if (u <= 0) return;
        ctx.save();
        if (p.smoke) {
          ctx.globalAlpha = u * 0.4;
          ctx.fillStyle = "rgba(40,35,30,1)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = u * 0.9;
          const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          if (p.tint === "blue") {
            gr.addColorStop(0, "rgba(230,250,255,1)");
            gr.addColorStop(0.4, "rgba(56,189,248,0.9)");
            gr.addColorStop(1, "rgba(2,80,180,0)");
          } else if (p.tint === "green") {
            gr.addColorStop(0, "rgba(230,255,240,1)");
            gr.addColorStop(0.4, "rgba(52,211,153,0.9)");
            gr.addColorStop(1, "rgba(4,100,60,0)");
          } else {
            gr.addColorStop(0, "rgba(255,240,160,1)");
            gr.addColorStop(0.4, "rgba(255,120,30,0.9)");
            gr.addColorStop(1, "rgba(180,30,0,0)");
          }
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    };
  })();

  function updateFirePower(dt) {
    try { if (window.__airborneUpdateFirePower) window.__airborneUpdateFirePower(dt); } catch (e) {}
  }
  function drawFirePower() {
    try { if (window.__airborneDrawFirePower) window.__airborneDrawFirePower(); } catch (e) {}
  }


  function updateObstacles(dt) {
    try { updateFirePower(dt); } catch (e) {}
    try { updateHitCoins(dt); } catch (e) {}
    if (!bossActive && !bonusActive && !bonusPending && !(typeof isLevelEndActive === "function" && isLevelEndActive())) {
      spawnTimer += dt;
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnObstacle();
      }
    }

    const frameDuration = 1 / OBSTACLE_ANIM_FPS;
    obstacles.forEach(o => {
      if (o.shockFall) {
        // handled in bosses.js sonic fall update — skip normal scroll
      } else if (o.onFire) {
        o.vy = (typeof o.vy === "number" ? o.vy : 60) + 480 * dt;
        if (o.vy > 560) o.vy = 560;
        o.y += o.vy * dt;
        o.x -= Math.max(40, obstacleSpeed * 0.3) * dt;
        o.rot = (o.rot || 0) + dt * 3.5;
        try {
          if (typeof window.__airborneEmitFireTrail === "function") {
            window.__airborneEmitFireTrail(o.x + o.w * 0.5, o.y + o.h * 0.3, o.blueFire ? "blue" : (o.greenFire ? "green" : "orange"));
          }
        } catch (e) {}
      } else {
        o.x -= obstacleSpeed * (window.__airborneAirfield && window.__airborneAirfieldObstacles ? 1.18 : 1) * (o.speedMult || 1) * dt;
      }
      if (o.isRing || o.type === "gold_ring") {
        // Hit-burst rings fly outward from the blimp
        if (o.fromHitBurst) {
          o.x += (o.vx || 0) * dt;
          o.y += (o.vy || 0) * dt;
          o.vx = (o.vx || 0) * (1 - 0.35 * dt);
          o.vy = (o.vy || 0) * (1 - 0.35 * dt);
          o.burstLife = (o.burstLife || 2.5) - dt;
          if (o.burstLife <= 0) {
            o.x = -9999; // drop off next filter
          }
        }
        o.spin = (o.spin || 0) + dt * 2.2;
        o.bobPhase = (o.bobPhase || 0) + dt * 1.6;
        // Expand pulse after blimp flies through
        if (o.passed) {
          o.expandT = Math.min(1, (o.expandT || 0) + dt / 0.45);
          // ease out: grow to 1.38 then settle to 1.15
          const t = o.expandT;
          const peak = 1.38;
          const settle = 1.15;
          if (t < 0.55) {
            const u = t / 0.55;
            o.expandScale = 1 + (peak - 1) * (1 - Math.pow(1 - u, 2));
          } else {
            const u = (t - 0.55) / 0.45;
            o.expandScale = peak + (settle - peak) * Math.min(1, u);
          }
          // Ghost trail samples — fading after-images as ring scrolls away
          if (!o.ghosts) o.ghosts = [];
          o.ghostSpawnT = (o.ghostSpawnT || 0) + dt;
          if (o.ghostSpawnT >= 0.05 && o.ghosts.length < 8) {
            o.ghostSpawnT = 0;
            o.ghosts.push({
              x: o.x + o.w / 2,
              y: o.y + o.h / 2 + Math.sin(o.bobPhase || 0) * (o.bobAmount || 8),
              scale: o.expandScale || 1,
              life: 0.55
            });
          }
          for (let gi = o.ghosts.length - 1; gi >= 0; gi--) {
            o.ghosts[gi].life -= dt;
            if (o.ghosts[gi].life <= 0) o.ghosts.splice(gi, 1);
          }
        }
        // Collect ring by flying through center
        if (!o.collected) {
          const cx = o.x + o.w / 2;
          const cy = o.y + o.h / 2 + Math.sin(o.bobPhase) * (o.bobAmount || 8);
          const rx = (o.r || o.w / 2) * 0.45 + player.w * 0.2;
          const ry = (o.r || o.w / 2) * 1.0 + player.h * 0.2;
          const dx = (player.x - cx) / rx;
          const dy = (player.y - cy) / ry;
          if (dx * dx + dy * dy < 1) {
            o.collected = true;
            o.passed = true;
            o.expandT = 0;       // expand anim 0→1
            o.expandScale = 1;
            o.ghosts = [];
            o.ghostSpawnT = 0;
            o.scored = true;
            // Rings are counted separately — do not add to main dodge score
            window.__airborneCollectRings = (window.__airborneCollectRings || 0) + 1;
            if (typeof updateCollectDock === "function") updateCollectDock();
            if (typeof sfxRingCollect === "function") sfxRingCollect();
            else if (typeof sfxPowerup === "function") sfxPowerup();
            if (typeof notifyRingCollect === "function") notifyRingCollect();
            // Gold dust puffs on ring collect
            o.burstT = 0.35;
            o.burstX = cx;
            o.burstY = cy;
            if (typeof hitParticles !== "undefined" && hitParticles && Array.isArray(hitParticles)) {
              for (let i = 0; i < 16; i++) {
                const ang = Math.random() * Math.PI * 2;
                const spd = 28 + Math.random() * 60;
                const golds = ["#d4af37", "#c9a227", "#e6c35c", "#b8860b", "#f0d878"];
                hitParticles.push({
                  type: "dust",
                  x: cx + (Math.random() - 0.5) * 8,
                  y: cy + (Math.random() - 0.5) * 8,
                  vx: Math.cos(ang) * spd,
                  vy: Math.sin(ang) * spd - 18,
                  life: 0.4 + Math.random() * 0.35,
                  age: 0,
                  r: 1.4 + Math.random() * 2.6,
                  color: golds[i % golds.length]
                });
              }
            }
          }
        }
        return; // rings skip bird damage / anim
      }
      o.bobPhase += o.bobSpeed * dt;
      o.animTimer += dt;
      while (o.animTimer >= frameDuration) {
        o.animTimer -= frameDuration;
        o.animFrame = (o.animFrame + 1) % OBSTACLE_ANIM_FRAME_COUNT;
      }
      // Wind streaks on ALL obstacles (birds, balloons, mini-blimps, etc.)
      maybeEmitWind(o.x + o.w * 0.55, o.y + o.h / 2, o.w * 0.35, o.h, 12, dt, "obstacle");
      maybeEmitWind(o.x + o.w * 0.4, o.y + o.h * 0.35, o.w * 0.25, o.h * 0.5, 6, dt, "obstacle");
      // Wake turbulence when the player slices close past this flyer
      const wakeDx = Math.abs(player.x - (o.x + o.w * 0.5));
      const wakeDy = Math.abs(player.y - (o.y + o.h * 0.5));
      if (wakeDx < player.w * 0.55 + WAKE_RANGE && wakeDy < player.h * 0.55 + WAKE_RANGE) {
        maybeEmitWind(o.x + o.w * 0.2, o.y + o.h * 0.5, o.w * 0.5, o.h * 0.8, 28, dt, "obstacle");
        maybeEmitWind(player.x - player.w * 0.4, player.y, player.w * 0.3, player.h, 12, dt, "player");
      }
      // Hit-flash decay
      if (o.hitFlash) o.hitFlash = Math.max(0, o.hitFlash - dt * 4);

      // birds bounce off with a little upward/downward kick when hit, instead of no reaction at all
      if (o.deflectVx || o.deflectVy) {
        o.x += (o.deflectVx || 0) * dt;
        o.y += (o.deflectVy || 0) * dt;
        if (o.spinVel) {
          o.rot = (o.rot || 0) + o.spinVel * dt;
          o.spinVel *= Math.max(0, 1 - 2.5 * dt);
        }
        o.deflectVx = (o.deflectVx || 0) * Math.max(0, 1 - 2.2 * dt);
        o.deflectVy = (o.deflectVy || 0) * Math.max(0, 1 - 2.2 * dt);
        if (Math.abs(o.deflectVx || 0) < 4) o.deflectVx = 0;
        if (Math.abs(o.deflectVy || 0) < 4) o.deflectVy = 0;
      }

      // mini blimp jet engine flame + smoke trails
      if (o.type === "mini_blimp") {
        const speed = obstacleSpeed * (o.speedMult || 1);
        // engine sits at the REAR of the sprite — it flies nose-first, right
        // to left, so the trailing/rear edge is the right side of its box
        const engineX = o.x + o.w * 0.85;
        const engineY = o.y + o.h * 0.55;

        // flame particles (hot, bright, short-lived) — denser + bigger for more presence
        o.flameTimer -= dt;
        if (o.flameTimer <= 0) {
          o.flameTimer = 0.008 + Math.random() * 0.012;
          const angle = Math.PI + (Math.random() - 0.5) * 0.6;
          const flameSpeed = 60 + Math.random() * 80;
          o.flameParticles.push({
            x: engineX + (Math.random() - 0.5) * o.w * 0.12,
            y: engineY + (Math.random() - 0.5) * o.h * 0.08,
            vx: Math.cos(angle) * flameSpeed + speed * 0.3,
            vy: Math.sin(angle) * flameSpeed * 0.3 + (Math.random() - 0.5) * 20,
            size: 5 + Math.random() * 9,
            life: 0.1 + Math.random() * 0.12,
            age: 0,
            r: 255,
            g: 120 + Math.random() * 80,
            b: 20 + Math.random() * 40
          });
        }

        // smoke particles (cool, dark, longer-lived) — bigger + longer-lived
        // so a full trailing "smoke screen" builds up behind it before fading
        o.smokeTimer -= dt;
        if (o.smokeTimer <= 0) {
          o.smokeTimer = 0.02 + Math.random() * 0.02;
          const angle = Math.PI + (Math.random() - 0.5) * 0.5;
          const smokeSpeed = 40 + Math.random() * 50;
          o.smokeParticles.push({
            x: engineX + (Math.random() - 0.5) * o.w * 0.1,
            y: engineY + (Math.random() - 0.5) * o.h * 0.06,
            vx: Math.cos(angle) * smokeSpeed + speed * 0.2,
            vy: Math.sin(angle) * smokeSpeed * 0.2 + (Math.random() - 0.5) * 15,
            size: 7 + Math.random() * 13,
            life: 0.5 + Math.random() * 0.35,
            age: 0,
            r: 80 + Math.random() * 40,
            g: 75 + Math.random() * 35,
            b: 70 + Math.random() * 30
          });
        }

        // update flame particles
        o.flameParticles.forEach(p => {
          p.age += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size += dt * 15;
        });
        o.flameParticles = o.flameParticles.filter(p => p.age < p.life);

        // update smoke particles
        o.smokeParticles.forEach(p => {
          p.age += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size += dt * 13;
        });
        o.smokeParticles = o.smokeParticles.filter(p => p.age < p.life);
      }

      // boss 4's mini crackles with a little electrical charge — refresh the
      // arcs on a timer so they flicker rather than staying static
      if (o.type === "mini_heli") {
        o.chargeTimer = (o.chargeTimer == null ? 0 : o.chargeTimer) - dt;
        if (o.chargeTimer <= 0) {
          o.chargeTimer = 0.08 + Math.random() * 0.07;
          const cx = o.w / 2, cy = o.h / 2;
          const arcCount = 2 + Math.floor(Math.random() * 2);
          o.chargeArcs = [];
          for (let i = 0; i < arcCount; i++) {
            const a1 = Math.random() * Math.PI * 2;
            const a2 = a1 + Math.PI * (0.6 + Math.random() * 0.8);
            const r = Math.max(o.w, o.h) * 0.58;
            o.chargeArcs.push(buildLightningPath(
              cx + Math.cos(a1) * r, cy + Math.sin(a1) * r * 0.7,
              cx + Math.cos(a2) * r, cy + Math.sin(a2) * r * 0.7,
              12
            ));
          }
        }
      }
    });

    obstacles = obstacles.filter(o => {
      if (o.fromHitBurst) {
        return o.burstLife > 0 && o.x > -120 && o.x < W + 120 && o.y > -120 && o.y < H + 120;
      }
      if (o.shockFall || o.electrified) {
        return o.y < H + 100 && o.x > -80 && o.x < W + 80;
      }
      return o.x + o.w > -20 && (!o.onFire || o.y < H + 80);
    });

    // scoring + collision
    obstacles.forEach(o => {
      const drawY = o.y + Math.sin(o.bobPhase) * o.bobAmount;

      const dx = Math.abs(player.x - (o.x + o.w / 2));
      const dy = Math.abs(player.y - (drawY + o.h / 2));
      let collideX = (player.w / 2) * 0.75 + (o.w / 2) * 0.75;
      let collideY = (player.h / 2) * 0.75 + (o.h / 2) * 0.75;
      // Zeppelin fire aura +5% reach
      if (window.__airborneFirePowerActive) {
        collideX *= 1.05;
        collideY *= 1.05;
      }

      // track the closest non-colliding vertical gap while horizontally
      // in range, so a dodge can be recognized as a "close call" (graze)
      if (dx < collideX * 1.4) {
        const gap = dy - collideY;
        if (gap >= 0 && gap < GRAZE_THRESHOLD && (o.minGap === undefined || gap < o.minGap)) {
          o.minGap = gap;
        }
      }

      if (!o.scored && o.x + o.w < player.x - player.w / 2) {
        o.scored = true;
        // Main score + streak: only clean obstacle passes (not rings, power-kills, collectibles)
        const isObstaclePass = !o.isRing && o.type !== "gold_ring" && o.type !== "ring"
          && !o.shockFall && !o.onFire && !o.electrified && !o.fromHitBurst;
        if (isObstaclePass) {
          score++;
          gameplayScore++; // boss pacing uses dodge-only score
          document.getElementById("scoreVal").textContent = score;
          bumpScorePop();
          // ramp difficulty gently
          obstacleSpeed = 220 + Math.min(160, score * 6);
          spawnInterval = Math.max(0.95, 1.7 - score * 0.03);
          if (!bossActive) {
            const next = nextBossConfig();
            if (window.__airborneAirfieldBlockBoss) {
              // Airfield training — never start a boss or bonus chain
            } else if (next && gameplayScore >= next.threshold) {
              triggerBossWarning(next.num);
              setTimeout(function() { if (state === 'playing' && !bossActive) startBossDialogue(next.num); }, BOSS_WARNING_DURATION);
            }
          }
          // storm meter: one gas-tank notch every 25 points, until it's full
          addStormChargeForScore(score);

          dodgeStreak++;
          if (o.minGap !== undefined) {
            score += GRAZE_BONUS;
            document.getElementById("scoreVal").textContent = score;
            bumpScorePop();
            sfxStreak();
          }
          if (dodgeStreak > 0 && dodgeStreak % STREAK_MILESTONE === 0) {
            score += STREAK_BONUS;
            document.getElementById("scoreVal").textContent = score;
            bumpScorePop();
            spawnComboPopup(player.x, player.y - player.h * 0.9, String(dodgeStreak), "#6b1c2a");
            sfxStreak();
          }
        }
      }

      if ((o.shockFall || o.electrified) && !o.onFire) {
        // already knocked out by sonic blast — no player damage
        return;
      }
      if (dx < collideX && dy < collideY) {
        const isBird = (o.type === "bird_a" || o.type === "bird_b");
        if ((isBird || shieldActive) && !o.hitDeflected) {
          o.hitDeflected = true;
          if (shieldActive) {
            // Strong shield reflection — knock obstacle hard away (coins flying out)
            var awayX = (o.x + o.w * 0.5) - player.x;
            var awayY = (drawY + o.h * 0.5) - player.y;
            var alen = Math.hypot(awayX, awayY) || 1;
            var knock = 320 + Math.random() * 180;
            o.deflectVx = (awayX / alen) * knock + (Math.random() - 0.5) * 80;
            o.deflectVy = (awayY / alen) * knock * 0.85 + (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 100);
            o.spinVel = (Math.random() - 0.5) * 10;
            o.hitFlash = 1.2;
            try { if (typeof triggerScreenShake === "function") triggerScreenShake(5, 140); } catch (e) {}
            try {
              if (window.PowerFX) window.PowerFX.burst(o.x + o.w * 0.5, drawY + o.h * 0.5, {
                count: 14, colors: ["#e0f2fe", "#fff", "#7dd3fc"], speed: 120, life: 0.4, glow: true
              });
            } catch (e) {}
          } else {
            o.deflectVy = (Math.random() < 0.5 ? -1 : 1) * (150 + Math.random() * 90);
            o.hitFlash = 1;
          }
          spawnHitParticles(o.x + o.w / 2, drawY + o.h / 2);
          if (isBird && typeof spawnFeathers === "function") {
            spawnFeathers(o.x + o.w / 2, drawY + o.h / 2);
          }
          // Shield block — coins pop out (free), but NOT if already hit by a power-up
          if (shieldActive && !o._hitCoinBursted && !o.powerAffected && !o.onFire && !o.electrified && !o.shockFall && !o.blueFire && !o.greenFire) {
            o._hitCoinBursted = true;
            try {
              if (typeof window.spawnHitCoinBurst === "function") {
                window.spawnHitCoinBurst({ free: true });
              }
            } catch (e) {}
          }
        }
        if (o.isRing || o.type === "gold_ring") {
          // never damage from rings
        } else if (o.onFire) {
          // already burning — no damage
        } else if (window.__airborneFirePowerActive) {
          // Ignite obstacle — catches fire, falls off screen
          o.onFire = true;
          o.powerAffected = true;
          o.vy = 80 + Math.random() * 40;
          o.scored = true;
          // Power kills count toward main dodge score
          try {
            score += 1;
            if (typeof gameplayScore === "number") gameplayScore += 1;
            var el = document.getElementById("scoreVal");
            if (el) el.textContent = String(score);
            if (typeof bumpScorePop === "function") bumpScorePop();
            if (typeof addStormChargeForScore === "function") addStormChargeForScore(score);
          } catch (e) {}
          try {
            if (typeof sfxExplosion === "function") sfxExplosion();
            else if (typeof sfxCrash === "function") sfxCrash();
            else if (typeof sfxHit === "function") sfxHit();
          } catch (e) {}
          try {
            if (typeof window.__airborneEmitFireBurst === "function") {
              window.__airborneEmitFireBurst(o.x + o.w * 0.5, o.y + o.h * 0.4);
            }
          } catch (e) {}
        } else {
          // Coins on contact — skip if this obstacle was already hit by a power-up
          if (!o._hitCoinBursted && !o.powerAffected && !o.onFire && !o.electrified && !o.shockFall && !o.blueFire && !o.greenFire) {
            o._hitCoinBursted = true;
            try {
              if (typeof window.spawnHitCoinBurst === "function") window.spawnHitCoinBurst();
              else if (typeof window.spawnHitRingBurst === "function") window.spawnHitRingBurst();
            } catch (e) {}
          }
          takeHit();
        }
      }
    });
  }

  function drawObstacles() {
    try { drawFirePower(); } catch (e) {}
    try { drawHitCoins(); } catch (e) {}
    obstacles.forEach(o => {
      if (o.isRing || o.type === "gold_ring") {
        // BACK half only — front half drawn later (drawRingFronts) so blimp flies THROUGH
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2 + Math.sin(o.bobPhase || 0) * (o.bobAmount || 8);
        // Larger hoop so the blimp clearly fits through
        const baseR = (o.r || o.w / 2) * 1.0;
        const esc = o.expandScale || 1;
        const rad = baseR * esc;
        const passed = !!o.passed;
        const rx = rad * 0.32;
        const ry = rad * 1.12;
        const cOuter = passed ? "#2ecc71" : "#d4a84b";
        const cMain  = passed ? "#3dde8a" : "#e8c060";
        const cRim   = passed ? "#1a9e55" : "#b8860b";
        const glow   = passed ? "rgba(46, 204, 113, 0.75)" : "rgba(212, 175, 55, 0.7)";
        // Ghost trails
        if (o.ghosts && o.ghosts.length) {
          for (let gi = 0; gi < o.ghosts.length; gi++) {
            const g = o.ghosts[gi];
            const ga = Math.max(0, g.life / 0.55) * 0.4;
            const gr = baseR * (g.scale || 1);
            ctx.save();
            ctx.translate(g.x, g.y);
            ctx.globalAlpha = ga;
            ctx.strokeStyle = "#3dde8a";
            ctx.lineWidth = Math.max(3, gr * 0.12);
            ctx.beginPath();
            ctx.scale((gr * 0.32) / (gr * 1.12), 1);
            ctx.arc(0, 0, gr * 1.12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
        // BACK half of hoop (left side — far edge, behind blimp)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.shadowColor = glow;
        ctx.shadowBlur = 12;
        function strokeBack(lw, color, a) {
          ctx.save();
          ctx.globalAlpha = a != null ? a : 1;
          ctx.strokeStyle = color;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.scale(rx / ry, 1);
          // π/2 → 3π/2 = left/back half
          ctx.arc(0, 0, ry, Math.PI * 0.5, Math.PI * 1.5, false);
          ctx.stroke();
          ctx.restore();
        }
        strokeBack(Math.max(7, rad * 0.2), cOuter, 0.55);
        strokeBack(Math.max(5, rad * 0.14), cMain, 1);
        strokeBack(Math.max(3, rad * 0.08), cRim, 0.7);
        ctx.shadowBlur = 0;
        ctx.restore();
        // Stash for front-half pass after player
        o._ringFront = { cx: cx, cy: cy, rx: rx, ry: ry, rad: rad, passed: passed };
        return;
      }
      const frames = OBSTACLE_ANIM_SETS[o.type];
      const img = images[frames[o.animFrame]];
      if (!img || !img.naturalWidth) return;
      const drawY = o.y + Math.sin(o.bobPhase) * o.bobAmount;
      const speed = obstacleSpeed * (o.speedMult || 1);
      drawMotionBlur(img, o.x + o.w / 2, drawY + o.h / 2, o.w, o.h, 0, speed, 0);
      if (o.electrified || o.shockFall) {
        ctx.save();
        ctx.translate(o.x + o.w / 2, drawY + o.h / 2);
        ctx.rotate(o.rot || 0);
        ctx.drawImage(img, -o.w / 2, -o.h / 2, o.w, o.h);
        // Electric arcs / cyan-white crackle
        ctx.globalCompositeOperation = "lighter";
        var t = performance.now() * 0.012;
        for (var ei = 0; ei < 5; ei++) {
          var a0 = t + ei * 1.3;
          var r0 = o.w * (0.15 + 0.2 * Math.sin(t * 2 + ei));
          ctx.strokeStyle = ei % 2 === 0 ? "rgba(180,230,255,0.85)" : "rgba(120,180,255,0.7)";
          ctx.lineWidth = 1.5 + (ei % 2);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a0) * r0 * 0.3, Math.sin(a0) * r0 * 0.3);
          for (var es = 1; es <= 4; es++) {
            var aa = a0 + es * 0.45 + Math.sin(t * 3 + es) * 0.4;
            var rr = r0 * (0.4 + es * 0.18);
            ctx.lineTo(Math.cos(aa) * rr + (Math.random() - 0.5) * 3, Math.sin(aa) * rr + (Math.random() - 0.5) * 3);
          }
          ctx.stroke();
        }
        var eg = ctx.createRadialGradient(0, 0, 2, 0, 0, o.w * 0.55);
        eg.addColorStop(0, "rgba(220,245,255,0.35)");
        eg.addColorStop(0.5, "rgba(80,160,255,0.2)");
        eg.addColorStop(1, "rgba(40,80,200,0)");
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(0, 0, o.w * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (o.onFire) {
        ctx.save();
        ctx.translate(o.x + o.w / 2, drawY + o.h / 2);
        ctx.rotate(o.rot || 0);
        ctx.drawImage(img, -o.w / 2, -o.h / 2, o.w, o.h);
        ctx.globalCompositeOperation = "lighter";
        const fg = ctx.createRadialGradient(0, -o.h * 0.15, 2, 0, 0, o.w * 0.7);
        if (o.blueFire) {
          // Aero Slicer — blue flames
          fg.addColorStop(0, "rgba(220,245,255,0.65)");
          fg.addColorStop(0.4, "rgba(56,189,248,0.4)");
          fg.addColorStop(1, "rgba(2,100,200,0)");
        } else if (o.greenFire) {
          fg.addColorStop(0, "rgba(220,255,230,0.6)");
          fg.addColorStop(0.45, "rgba(16,185,129,0.35)");
          fg.addColorStop(1, "rgba(4,120,80,0)");
        } else {
          fg.addColorStop(0, "rgba(255,230,100,0.55)");
          fg.addColorStop(0.45, "rgba(255,90,15,0.3)");
          fg.addColorStop(1, "rgba(255,40,0,0)");
        }
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(0, -o.h * 0.1, o.w * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // Blue flame tongues for Aero Slicer burns
        if (o.blueFire) {
          for (var fi = 0; fi < 5; fi++) {
            var fang = -Math.PI / 2 + (fi - 2) * 0.35 + Math.sin(performance.now() * 0.01 + fi) * 0.15;
            var fl = o.h * (0.25 + 0.15 * Math.sin(performance.now() * 0.012 + fi));
            ctx.strokeStyle = "rgba(120,210,255,0.7)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo((fi - 2) * 4, -o.h * 0.15);
            ctx.lineTo((fi - 2) * 4 + Math.cos(fang) * fl * 0.3, -o.h * 0.15 + Math.sin(fang) * fl);
            ctx.stroke();
          }
        }
        ctx.restore();
      } else {
        ctx.drawImage(img, o.x, drawY, o.w, o.h);
      }
      // Soft white impact flash — skip balloons (red sprites look "red flash" with additive blend)
      if (o.hitFlash && o.hitFlash > 0 && img && img.naturalWidth && o.type !== "balloon_anim") {
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, o.hitFlash * 0.65);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        // subtle bright rim rather than full-sprite tint
        ctx.beginPath();
        ctx.ellipse(o.x + o.w * 0.5, drawY + o.h * 0.45, o.w * 0.42, o.h * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // draw jet engine flame + smoke trails behind mini blimps
      if (o.type === "mini_blimp") {
        // smoke first (behind flame)
        if (o.smokeParticles) {
          o.smokeParticles.forEach(p => {
            const t = p.age / p.life;
            const alpha = (1 - t) * 0.58;
            ctx.save();
            ctx.globalAlpha = alpha;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},0.8)`);
            grad.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
        }
        // flame on top
        if (o.flameParticles) {
          o.flameParticles.forEach(p => {
            const t = p.age / p.life;
            const alpha = (1 - t) * 0.9;
            ctx.save();
            ctx.globalAlpha = alpha;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            grad.addColorStop(0, `rgba(255,${p.g},${p.b},1)`);
            grad.addColorStop(0.4, `rgba(255,${Math.floor(p.g * 0.6)},20,0.8)`);
            grad.addColorStop(1, `rgba(255,60,10,0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            // bright core
            ctx.fillStyle = `rgba(255,255,220,${alpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
        }
      }

      if (o.type === "mini_heli" && o.chargeArcs) {
        ctx.save();
        ctx.translate(o.x, drawY);
        o.chargeArcs.forEach(points => {
          ctx.save();
          ctx.globalAlpha = 0.5 + Math.random() * 0.4;
          ctx.strokeStyle = "rgba(150,210,255,0.95)";
          ctx.lineWidth = 1.6;
          ctx.shadowColor = "rgba(130,190,255,0.9)";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          points.forEach(([px, py], i) => {
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.restore();
        });
        ctx.restore();
      }
    });
  }

  // ---------- Floating heal pickup — sporadic, restores 25% (1 heart) ----------
  let healPickup = null;
  let healSpawnTimer = 6 + Math.random() * 5; // first one arrives a little sooner

  
  function drawRingFronts() {
    if (typeof obstacles === "undefined" || !obstacles || !obstacles.length) return;
    if (typeof ctx === "undefined") return;
    obstacles.forEach(function (o) {
      if (!(o.isRing || o.type === "gold_ring")) return;
      const f = o._ringFront;
      if (!f) return;
      const cOuter = f.passed ? "#2ecc71" : "#d4a84b";
      const cMain  = f.passed ? "#4aee9a" : "#f0d070";
      const cRim   = f.passed ? "#1a9e55" : "#b8860b";
      const glow   = f.passed ? "rgba(46, 204, 113, 0.85)" : "rgba(255, 210, 80, 0.75)";
      ctx.save();
      ctx.translate(f.cx, f.cy);
      ctx.shadowColor = glow;
      ctx.shadowBlur = 14;
      function strokeFront(lw, color, a) {
        ctx.save();
        ctx.globalAlpha = a != null ? a : 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.scale(f.rx / f.ry, 1);
        // -π/2 → π/2 = right/front half (drawn ON TOP of blimp)
        ctx.arc(0, 0, f.ry, -Math.PI * 0.5, Math.PI * 0.5, false);
        ctx.stroke();
        ctx.restore();
      }
      strokeFront(Math.max(8, f.rad * 0.22), cOuter, 0.65);
      strokeFront(Math.max(6, f.rad * 0.16), cMain, 1);
      strokeFront(Math.max(3, f.rad * 0.09), cRim, 0.85);
      // Bright highlight on the near rim
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = f.passed ? "#d8ffe8" : "#fff4c8";
      ctx.lineWidth = Math.max(2, f.rad * 0.05);
      ctx.beginPath();
      ctx.scale(f.rx / f.ry, 1);
      ctx.arc(0, 0, f.ry, -0.35, 0.35, false);
      ctx.stroke();
      ctx.restore();
    });
  }
  window.__airborneDrawRingFronts = drawRingFronts;

function spawnHealPickup() {
    if (window.__airborneAirfield) return; // no hearts during training
    const img = images.heartPickup;
    let aspect = imgAspect(img);
    const dispW = Math.min(50, W * 0.12);
    const dispH = dispW * aspect;

    const groundY = groundLevelY();
    const tallestRoofY = groundY - H * 0.5;
    const minY = H * 0.08;
    const maxY = Math.max(minY + 40, tallestRoofY - dispH - 20);

    healPickup = {
      x: W + dispW,
      y: minY + Math.random() * (maxY - minY),
      w: dispW,
      h: dispH,
      bobPhase: Math.random() * Math.PI * 2,
      speed: 150
    };
  }

  function updateHealPickup(dt) {
    if (!healPickup) {
      healSpawnTimer -= dt;
      if (healSpawnTimer <= 0) {
        spawnHealPickup();
        healSpawnTimer = 11 + Math.random() * 9; // next sporadic appearance
      }
      return;
    }

    healPickup.x -= healPickup.speed * dt;
    healPickup.bobPhase += dt * 2.2;

    if (healPickup.x < -healPickup.w - 20) {
      healPickup = null;
      return;
    }

    const drawY = healPickup.y + Math.sin(healPickup.bobPhase) * 8;
    const dx = Math.abs(player.x - (healPickup.x + healPickup.w / 2));
    const dy = Math.abs(player.y - (drawY + healPickup.h / 2));
    if (dx < player.w * 0.5 + healPickup.w * 0.45 && dy < player.h * 0.5 + healPickup.h * 0.45) {
      sfxHeart();
      if (health < MAX_HEALTH) {
        health = Math.min(MAX_HEALTH, health + 1);
        if (typeof pulseHealthMeter === "function") pulseHealthMeter();
        updateHealthDisplay();
        if (typeof pulseHealthMeter === "function") pulseHealthMeter();
        else if (healthMeter) {
          healthMeter.classList.remove("hit");
          void healthMeter.offsetWidth;
          healthMeter.classList.add("hit");
        }
      } else if (health < MAX_HEALTH + MAX_BONUS_HEARTS) {
        health++;
        updateHealthDisplay();
        if (typeof pulseHealthMeter === "function") pulseHealthMeter();
        else if (healthMeter) {
          healthMeter.classList.remove("hit");
          void healthMeter.offsetWidth;
          healthMeter.classList.add("hit");
        }
      }
      healPickup = null;
    }
  }

  function drawHealPickup() {
    if (typeof levelEndPhase === "string" && levelEndPhase === "fadeOut") return;
    if (!healPickup) return;
    const img = images.heartPickup;
    if (!img.naturalWidth) return;
    const drawY = healPickup.y + Math.sin(healPickup.bobPhase) * 8;
    const t = performance.now() / 1000;

    ctx.save();
    ctx.translate(healPickup.x + healPickup.w / 2, drawY + healPickup.h / 2);
    const pulse = 1 + Math.sin(performance.now() / 160) * 0.06;
    ctx.scale(pulse, pulse);
    const glow = ctx.createRadialGradient(0, 0, healPickup.w * 0.15, 0, 0, healPickup.w * 0.9);
    glow.addColorStop(0, "rgba(255,120,120,0.5)");
    glow.addColorStop(1, "rgba(255,120,120,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, healPickup.w * 0.9, 0, Math.PI * 2);
    ctx.fill();
    drawMotionBlur(img, 0, 0, healPickup.w, healPickup.h, 0, 150, 0);
    ctx.drawImage(img, -healPickup.w / 2, -healPickup.h / 2, healPickup.w, healPickup.h);

    // orbiting sparkle motes for a little extra magic while it floats
    const orbitR = healPickup.w * 0.62;
    for (let i = 0; i < 5; i++) {
      const a = t * 1.6 + (i / 5) * Math.PI * 2;
      const sx = Math.cos(a) * orbitR;
      const sy = Math.sin(a) * orbitR * 0.6; // slightly flattened orbit for a nicer perspective feel
      const twinkle = Math.max(0, 0.55 + Math.sin(t * 6 + i * 1.9) * 0.45);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a);
      ctx.fillStyle = `rgba(255,235,240,${twinkle})`;
      ctx.beginPath();
      // simple 4-point sparkle/diamond shape
      const s = 3.2 + twinkle * 2.2;
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.35, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.35, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- Shield pickup — rare mid-flight invincibility, boss fights excluded ----------
  let shieldPickup = null;
  let shieldSpawnTimer = 25 + Math.random() * 15;
  let shieldActive = false;
  let shieldImpactTime = -9999; // performance.now() timestamp of the last shield block, drives the impact flash
  let shieldUntil = 0;
  const SHIELD_DURATION_MS = 6000;

  function spawnShieldPickup() {
    if (window.__airborneAirfield && !window.__airborneAirfieldAllowShield) return;
    const img = images.shieldPickup;
    const aspect = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
    const dispW = Math.min(42, W * 0.0975); // 25% smaller
    const dispH = dispW * aspect;

    const groundY = groundLevelY();
    const tallestRoofY = groundY - H * 0.5;
    const minY = H * 0.08;
    const maxY = Math.max(minY + 40, tallestRoofY - dispH - 20);

    shieldPickup = {
      x: W + dispW,
      y: minY + Math.random() * (maxY - minY),
      w: dispW,
      h: dispH,
      bobPhase: Math.random() * Math.PI * 2,
      speed: 160
    };
  }

  function updateShieldPickup(dt) {
    if (shieldActive && performance.now() > shieldUntil) {
      shieldActive = false;
    }

    if ((bossActive || bonusActive) && !window.__airborneAirfield) return;

    // Training: shield pickup ONLY during shield + combined lessons
    if (window.__airborneAirfield || window.__airborneTrainingFlight) {
      const st = window.__airborneRuffStage || "";
      const allow = (st === "shield" || st === "combined");
      window.__airborneAirfieldAllowShield = allow;
      if (!allow) {
        shieldPickup = null;
        return;
      }
    }
    if (!shieldPickup) {
      // No random world spawns during training except allowed stages (handled above)
      if (window.__airborneAirfield || window.__airborneTrainingFlight) {
        return;
      }
      shieldSpawnTimer -= dt;
      if (shieldSpawnTimer <= 0) {
        spawnShieldPickup();
        shieldSpawnTimer = 55 + Math.random() * 35;
      }
      return;
    }

    // Animate 6x6 sheet
    shieldPickup.frameT = (shieldPickup.frameT || 0) + dt;
    const sfd = 1 / 14;
    while (shieldPickup.frameT >= sfd) {
      shieldPickup.frameT -= sfd;
      shieldPickup.frame = ((shieldPickup.frame || 0) + 1) % 36;
    }
    // Blue spark embers
    if (!shieldPickup.embers) shieldPickup.embers = [];
    if (!shieldPickup.collectAnim && Math.random() < 0.55) {
      const ang = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.4;
      shieldPickup.embers.push({
        x: shieldPickup.x + shieldPickup.w / 2 + (Math.random() - 0.5) * 14,
        y: shieldPickup.y + shieldPickup.h / 2 + 4,
        vx: Math.cos(ang) * (15 + Math.random() * 35),
        vy: Math.sin(ang) * (25 + Math.random() * 40) - 15,
        life: 0.3 + Math.random() * 0.3,
        age: 0,
        r: 1.5 + Math.random() * 2.2
      });
    }
    for (let ei = shieldPickup.embers.length - 1; ei >= 0; ei--) {
      const e = shieldPickup.embers[ei];
      e.age += dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 35 * dt;
      if (e.age >= e.life) shieldPickup.embers.splice(ei, 1);
    }
    if (shieldPickup.embers.length > 24) shieldPickup.embers.splice(0, shieldPickup.embers.length - 24);

    // Collect expand animation
    if (shieldPickup.collectAnim != null && shieldPickup.collectAnim >= 0) {
      shieldPickup.collectAnim += dt / 0.85;
      if (Math.random() < 0.8 && shieldPickup.collectAnim < 0.7) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 50 + Math.random() * 120;
        shieldPickup.embers.push({
          x: shieldPickup.collectX, y: shieldPickup.collectY,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 20,
          life: 0.35 + Math.random() * 0.35, age: 0, r: 2 + Math.random() * 3.5
        });
      }
      if (shieldPickup.collectAnim >= 1) {
        shieldPickup = null;
      }
      return;
    }

    // Always scroll — never freeze mid-air
    const shSpd = Math.max(120, shieldPickup.speed || 150);
    shieldPickup.speed = shSpd;
    shieldPickup.x -= shSpd * dt;
    shieldPickup.bobPhase = (shieldPickup.bobPhase || 0) + dt * 2.4;

    if (shieldPickup.x < -shieldPickup.w - 20) {
      shieldPickup = null;
      return;
    }

    const drawY = shieldPickup.y + Math.sin(shieldPickup.bobPhase) * 8;
    const dx = Math.abs(player.x - (shieldPickup.x + shieldPickup.w / 2));
    const dy = Math.abs(player.y - (drawY + shieldPickup.h / 2));
    if (dx < player.w * 0.5 + shieldPickup.w * 0.45 && dy < player.h * 0.5 + shieldPickup.h * 0.45) {
      shieldActive = true;
      shieldUntil = performance.now() + SHIELD_DURATION_MS;
      shieldPickup.collectAnim = 0.001;
      shieldPickup.collectX = shieldPickup.x + shieldPickup.w / 2;
      shieldPickup.collectY = drawY + shieldPickup.h / 2;
      try { sfxPowerup(); } catch (e) {}
    }
  }

  function drawShieldPickup() {
    if (typeof levelEndPhase === "string" && levelEndPhase === "fadeOut") return;
    if (!shieldPickup) return;
    const sp = shieldPickup;
    const bob = Math.sin(sp.bobPhase || 0) * 10;
    const sway = Math.sin((sp.bobPhase || 0) * 0.65) * 5;
    const collecting = (sp.collectAnim != null && sp.collectAnim > 0);
    const ca = Math.min(1, sp.collectAnim || 0);
    let cx = sp.x + (sp.w || 48) / 2 + (collecting ? 0 : sway);
    let cy = sp.y + (sp.h || 48) / 2 + (collecting ? 0 : bob);
    if (collecting && sp.collectX != null) { cx = sp.collectX; cy = sp.collectY; }
    let scale = 1 + Math.sin((sp.bobPhase || 0) * 2.2) * 0.1;
    let alpha = 1;
    if (collecting) {
      const bounce = Math.sin(ca * Math.PI) * 0.15;
      scale = 1 + ca * ca * 8 + bounce;
      alpha = ca < 0.55 ? 1 : Math.max(0, 1 - (ca - 0.55) / 0.45);
    }
    const base = Math.max(sp.w || 48, sp.h || 48) * 0.94; // 25% smaller overall
    const halfTarget = Math.min(W, H) * 0.9;
    const dw = collecting ? Math.min(halfTarget * (0.12 + ca * 0.88), halfTarget) : base * scale;
    const dh = dw;
    ctx.save();
    ctx.globalAlpha = alpha;
    const glowR = dw * 0.65;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowR);
    g.addColorStop(0, "rgba(120,220,255," + (0.55 * alpha) + ")");
    g.addColorStop(0.45, "rgba(40,140,255," + (0.25 * alpha) + ")");
    g.addColorStop(1, "rgba(20,60,180,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();
    // Prefer animated sheet; fallback to static
    const sheet = (typeof images !== "undefined" && images)
      ? (images.shield_sheet || images.shieldPickup || null) : null;
    if (sheet && sheet.naturalWidth && images.shield_sheet && sheet === images.shield_sheet) {
      const cols = 6, rows = 6;
      const fw = sheet.naturalWidth / cols;
      const fh = sheet.naturalHeight / rows;
      const fr = (sp.frame || 0) % 36;
      const col = fr % cols;
      const row = Math.floor(fr / cols) % rows;
      ctx.drawImage(sheet, col * fw, row * fh, fw, fh, cx - dw / 2, cy - dh / 2, dw, dh);
    } else if (sheet && sheet.naturalWidth) {
      ctx.drawImage(sheet, cx - dw / 2, cy - dh / 2, dw, dh);
    } else {
      // procedural fallback so it is never invisible
      ctx.fillStyle = "rgba(100,200,255,0.85)";
      ctx.beginPath();
      ctx.arc(cx, cy, dw * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(200,240,255,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, dw * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    (sp.embers || []).forEach(function (e) {
      const u = 1 - e.age / e.life;
      if (u <= 0) return;
      ctx.globalAlpha = Math.max(0, u * alpha);
      const eg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r);
      eg.addColorStop(0, "rgba(220,250,255,1)");
      eg.addColorStop(0.5, "rgba(80,180,255,0.8)");
      eg.addColorStop(1, "rgba(30,80,200,0)");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawShieldEffect() {
    if (!shieldActive) return;
    const t = performance.now() / 1000;
    const FADE_WINDOW_MS = 600;
    const msLeft = shieldUntil - performance.now();
    const fadeOutAlpha = Math.max(0, Math.min(1, msLeft / FADE_WINDOW_MS));
    if (fadeOutAlpha <= 0.02) return;
    const pulse = 1 + Math.sin(t * 3.2) * 0.05;
    const radius = player.w * 0.72 * pulse;
    const sinceImpact = performance.now() - shieldImpactTime;
    const impactActive = sinceImpact < 450;
    const impactT = impactActive ? sinceImpact / 450 : 1; // 0 (just hit) -> 1 (faded out)

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalAlpha = fadeOutAlpha;

    // soft outer glow halo
    const glow = ctx.createRadialGradient(0, 0, radius * 0.55, 0, 0, radius * 1.2);
    glow.addColorStop(0, "rgba(140,215,255,0)");
    glow.addColorStop(0.75, "rgba(140,215,255,0.16)");
    glow.addColorStop(1, "rgba(140,215,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // faceted forcefield bubble — radial gradient instead of a flat tint
    const bubble = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
    bubble.addColorStop(0, "rgba(170,230,255,0.04)");
    bubble.addColorStop(0.78, "rgba(120,200,255,0.12)");
    bubble.addColorStop(1, "rgba(120,200,255,0.26)");
    ctx.fillStyle = bubble;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // slowly rotating hex-facet lines, for a sci-fi/steampunk forcefield look
    ctx.save();
    ctx.rotate(t * 0.5);
    ctx.strokeStyle = "rgba(205,240,255,0.32)";
    ctx.lineWidth = 1;
    const facetCount = 8;
    for (let i = 0; i < facetCount; i++) {
      const a = (i / facetCount) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * 0.32, Math.sin(a) * radius * 0.32);
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // crisp double-ring outline
    ctx.strokeStyle = "rgba(185,235,255,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.93, 0, Math.PI * 2);
    ctx.stroke();

    // small orbiting sparkle motes drifting around the bubble
    for (let i = 0; i < 4; i++) {
      const a = t * 1.3 + (i / 4) * Math.PI * 2;
      const sx = Math.cos(a) * radius * 0.97;
      const sy = Math.sin(a) * radius * 0.97;
      const sparkAlpha = Math.max(0, 0.5 + Math.sin(t * 5 + i * 1.7) * 0.35);
      ctx.fillStyle = `rgba(255,255,255,${sparkAlpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // impact flash — a bright ring that expands outward and fades when something bounces off the shield
    if (impactActive) {
      const flashAlpha = 1 - impactT;
      ctx.fillStyle = `rgba(220,245,255,${flashAlpha * 0.35})`;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      const ringR = radius * (0.75 + impactT * 0.6);
      ctx.strokeStyle = `rgba(255,255,255,${flashAlpha * 0.9})`;
      ctx.lineWidth = 3 * (1 - impactT) + 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }


  // R.U.F.F. ring tally
  function notifyRingCollect() {
    window.__airborneRingCollects = (window.__airborneRingCollects || 0) + 1;
    try {
      if (typeof sfxRingCollect === "function") sfxRingCollect();
      else if (typeof sfxStreak === "function") sfxStreak();
    } catch (e) {}
    if (typeof window.__airborneRuffReact === "function") window.__airborneRuffReact("ring");
  }


// Match menu power previews with a short in-game aura around the player
window.__airborneDrawActivePowerVisual = function () {
  try {
    if (typeof ctx === "undefined" || typeof player === "undefined" || !player) return;
    const kind = window.__airborneActivePowerVisual;
    const until = window.__airborneActivePowerUntil || 0;
    const now = performance.now();
    if (!kind || now > until) return;
    const fade = Math.max(0, Math.min(1, (until - now) / 5500));
    const t = now * 0.001;
    if (window.PowerFX) {
      window.PowerFX.drawAura(ctx, kind, player.x, player.y, t, fade);
    }
  } catch (e) {}
};

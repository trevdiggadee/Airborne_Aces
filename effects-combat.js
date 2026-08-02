"use strict";

  // ---------- Player bomb falling trail — curling wind wisps + metallic
  // sparkle glints, spun off from the bomb's rotation as it tumbles down.
  // Deliberately different from boss 3's flame trail: cool-toned, curved
  // "whoosh" streaks rather than a hot exhaust plume. ----------
  let playerBombTrailParticles = [];

  function spawnPlayerBombTrailParticle(x, y, vx, vy) {
    const speed = Math.hypot(vx, vy) || 1;
    const backX = x - (vx / speed) * 10;
    const backY = y - (vy / speed) * 10;
    const perpAngle = Math.atan2(vy, vx) + Math.PI / 2;
    const side = Math.random() < 0.5 ? 1 : -1;
    const offset = 8 + Math.random() * 8;
    const isSparkle = Math.random() < 0.3;
    playerBombTrailParticles.push({
      x: backX + Math.cos(perpAngle) * offset * side,
      y: backY + Math.sin(perpAngle) * offset * side,
      vx: -(vx / speed) * 30 + (Math.random() - 0.5) * 20,
      vy: -(vy / speed) * 30 + (Math.random() - 0.5) * 20,
      curl: (Math.random() - 0.5) * 5,
      angle: Math.random() * Math.PI * 2,
      life: isSparkle ? 0.25 + Math.random() * 0.15 : 0.4 + Math.random() * 0.25,
      age: 0,
      size: isSparkle ? 2 + Math.random() * 1.5 : 3 + Math.random() * 3,
      isSparkle
    });
  }

  function updatePlayerBombTrailParticles(dt) {
    playerBombTrailParticles.forEach(p => {
      p.age += dt;
      p.angle += p.curl * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    });
    playerBombTrailParticles = playerBombTrailParticles.filter(p => p.age < p.life);
  }

  function drawPlayerBombTrailParticles() {
    playerBombTrailParticles.forEach(p => {
      const t = p.age / p.life;
      const alpha = 1 - t;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      if (p.isSparkle) {
        // small twinkling glint, like light catching polished metal
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "rgba(255,250,235,0.95)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0);
        ctx.moveTo(0, -p.size); ctx.lineTo(0, p.size);
        ctx.stroke();
      } else {
        // curved wind wisp — a short fading arc, not a blob, to read as "air rushing past"
        ctx.globalAlpha = alpha * 0.55;
        ctx.strokeStyle = "rgba(210,225,240,0.8)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 2, 0, Math.PI * 1.1);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function updatePlayerBombs(dt) {
    // the tank boss floats above the street, out of straight-bullet range for the
    // player's usual guns — instead this fight grants an arcing bomb-drop attack
    if (hasArcBomb && bossActive && boss && boss.kind === "tank" && state === "playing") {
      arcBombTimer -= dt;
      if (arcBombTimer <= 0) {
        arcBombTimer = ARC_BOMB_INTERVAL;
        const startX = player.x + player.w * 0.25;
        const startY = player.y + player.h * 0.3;
        const targetX = boss.x + boss.w * 0.5;
        const targetY = boss.y + boss.h * 0.25;
        spawnArcBomb(playerBombs, startX, startY, targetX, targetY, 480, 0.7, 0.85);
      }
    }

    playerBombs.forEach(b => {
      b.y += b.vy * dt;
      b.vy += (b.gravity || 400) * dt;
      b.x += b.vx * dt;
      b.rotation = Math.atan2(b.vy, b.vx);

      b.trailTimer = (b.trailTimer || 0) - dt;
      if (b.trailTimer <= 0) {
        b.trailTimer = 0.03;
        spawnPlayerBombTrailParticle(b.x, b.y, b.vx, b.vy);
      }
    });
    updatePlayerBombTrailParticles(dt);
    playerBombs = playerBombs.filter(b => b.y < H + 30 && b.x > -30 && b.x < W + 30);

    if (boss && bossActive) {
      playerBombs = playerBombs.filter(b => {
        if (!boss) return true; // boss was just defeated by an earlier bomb this same pass
        const dx = Math.abs(b.x - (boss.x + boss.w / 2));
        const dy = Math.abs(b.y - (boss.y + boss.h / 2));
        if (dx < boss.w * 0.38 && dy < boss.h * 0.42) {
          boss.health--;
          bossHitFlashUntil = performance.now() + 130;
          bossShakeUntil = performance.now() + 220;
          spawnHitParticles(b.x, b.y);
          triggerBigExplosion(b.x, b.y, 26, 26);
          if (boss.health <= 0) defeatBoss();
          return false;
        }
        return true;
      });
    }
  }

  const PLAYER_BOMB_KEYS = { blimp1: "bomb_blimp1", blimp2: "bomb_blimp2", blimp3: "bomb_blimp3", blimp4: "bomb_blimp4" };
  function currentPlayerBombImage() {
    const key = (typeof selectedBlimp !== "undefined" && PLAYER_BOMB_KEYS[selectedBlimp]) || null;
    return (key && images[key] && images[key].naturalWidth) ? images[key] : images.bomb;
  }

  function drawPlayerBombs() {
    drawPlayerBombTrailParticles();
    const img = currentPlayerBombImage();
    playerBombs.forEach(b => {
      if (!img || !img.naturalWidth) return;
      let aspect = imgAspect(img);
      const w = b.r * 2.1 * 1.25; // 2x the previous size
      const h = w * aspect;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation || 0);
      drawMotionBlur(img, 0, 0, w, h, b.rotation || 0, b.vx, b.vy);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    });
  }

  function updateRockets(dt) {
    rockets.forEach(r => {
      r.x += r.vx * dt;
      r.y += r.vy * dt;

      r.animTimer += dt;
      const frameDur = 1 / ROCKET_ANIM_FPS;
      const frames = r.frameKeys || ROCKET_FLIGHT_KEYS;
      while (r.animTimer >= frameDur) {
        r.animTimer -= frameDur;
        r.animFrame = (r.animFrame + 1) % frames.length;
      }
    });
    rockets = rockets.filter(r => r.x > -40 && r.x < W + 40 && r.y > -40 && r.y < H + 40);

    rockets = rockets.filter(r => {
      const dx = Math.abs(player.x - r.x);
      const dy = Math.abs(player.y - r.y);
      if (dx < player.w * 0.4 + r.r && dy < player.h * 0.4 + r.r) {
        takeHit();
        triggerBigExplosion(r.x, r.y, 30, 30);
        return false;
      }
      return true;
    });
  }

  function drawRockets() {
    rockets.forEach(r => {
      const frames = r.frameKeys || ROCKET_FLIGHT_KEYS;
      const img = images[frames[r.animFrame]] || images.rocket;
      if (!img || !img.naturalWidth) return;
      let aspect = imgAspect(img);
      const w = r.r * 3.6;
      const h = w * aspect;
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.angle || 0);
      drawMotionBlur(img, 0, 0, w, h, 0, ROCKET_SPEED * 0.5, 0);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    });
  }

  function updateBossThrowAnimation(dt) {
    if (bossThrowFrame === 0) return;

    bossThrowFrameTimer += dt;
    const frameDuration = 1 / BOSS_THROW_FPS;
    while (bossThrowFrameTimer >= frameDuration) {
      bossThrowFrameTimer -= frameDuration;
      bossThrowFrame++;

      // release point: the bomb leaves his hand and starts its own arc
      if (bossThrowFrame === BOSS_THROW_RELEASE_FRAME && !bossThrowBombSpawned) {
        bossThrowBombSpawned = true;
        // hand position approximated from how far the throw pose reaches
        // to the left of the boss's bounding box at the release frame
        const startX = boss.x + boss.w * 0.06;
        const startY = boss.y + boss.h * 0.5;
        const BOMB_GRAVITY = 300;
        const throwTime = 1.1 + Math.random() * 0.3;
        const dx = player.x - startX;
        const dy = player.y - startY;
        bombs.push({
          x: startX,
          y: startY,
          vx: dx / throwTime,
          vy: (dy - 0.5 * BOMB_GRAVITY * throwTime * throwTime) / throwTime,
          gravity: BOMB_GRAVITY,
          r: Math.min(20, W * 0.05),
          rotation: 0,
          rotSpeed: 4 + Math.random() * 3
        });
      }

      if (bossThrowFrame > BOSS_THROW_FRAME_COUNT) {
        bossThrowFrame = 0;
        bossThrowFrameTimer = 0;
        bombTimer = 2.2 + Math.random() * 1.1;
        break;
      }
    }
  }

  function drawBoss() {
    if (!boss) return;
    const img = (boss.kind === "bomber" && bossThrowFrame > 0)
      ? images[`boss_throw_${String(bossThrowFrame).padStart(2, "0")}`]
      : (boss.variant === 2
        ? images[BOSS2_FRAME_KEYS[boss.animFrame]]
        : boss.variant === 3
          ? images[BOSS3_FRAME_KEYS[boss.animFrame]]
          : boss.variant === 4
            ? images[BOSS4_FRAME_KEYS[boss.animFrame]]
            : images[bossImgKey(boss.variant)]);
    if (!img || !img.naturalWidth) return;

    // brief shake offset while recently hit
    let shakeX = 0;
    if (performance.now() < bossShakeUntil) {
      const remaining = bossShakeUntil - performance.now();
      shakeX = Math.sin(remaining * 0.9) * 5 * (remaining / 220);
    }

    drawMotionBlur(img, boss.x + boss.w / 2 + shakeX, boss.y + boss.h / 2, boss.w, boss.h, 0, 80, 0);
    ctx.drawImage(img, boss.x + shakeX, boss.y, boss.w, boss.h);

    // white flash overlay, clipped to the sprite's own opaque pixels
    if (performance.now() < bossHitFlashUntil) {
      drawSpriteFlash(img, boss.x + shakeX, boss.y, boss.w, boss.h, 0.7);
    }

    // health bar above the boss
    const barW = boss.w * 0.9;
    const barH = 10;
    const barX = boss.x + (boss.w - barW) / 2;
    const barY = boss.y - 20;
    ctx.fillStyle = "rgba(20,12,5,0.6)";
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.fillStyle = "#3a1f14";
    ctx.fillRect(barX, barY, barW, barH);
    const pct = Math.max(0, boss.health / boss.maxHealth);
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    fillGrad.addColorStop(0, "#c0392b");
    fillGrad.addColorStop(1, "#e74c3c");
    ctx.fillStyle = fillGrad;
    ctx.fillRect(barX, barY, barW * pct, barH);
    if (pct > 0 && pct < 0.25) {
      // low-health warning pulse
      const pulse = 0.4 + 0.5 * Math.abs(Math.sin(performance.now() / 130));
      ctx.fillStyle = "rgba(255,255,255," + pulse.toFixed(2) + ")";
      ctx.fillRect(barX, barY, barW * pct, barH);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  function defeatBoss() {
    if (boss) {
      const cx = boss.x + boss.w / 2;
      const cy = boss.y + boss.h / 2;
      // cascading, multi-point explosion across the boss's body instead of
      // one single blast — reads as the whole thing coming apart
      triggerBigExplosion(cx, cy, boss.w * 0.8, boss.h * 0.8);
      triggerBigExplosion(boss.x + boss.w * 0.22, boss.y + boss.h * 0.3, boss.w * 0.32, boss.h * 0.32);
      triggerBigExplosion(boss.x + boss.w * 0.78, boss.y + boss.h * 0.65, boss.w * 0.32, boss.h * 0.32);
      triggerBigExplosion(boss.x + boss.w * 0.5, boss.y + boss.h * 0.15, boss.w * 0.28, boss.h * 0.28);
      triggerShockwave(cx, cy, Math.max(boss.w, boss.h) * 0.85);
    defeatSlowMo = true;
    defeatSlowMoUntil = performance.now() + DEFEAT_SLOWMO_DURATION;
    spawnDefeatDebris(boss.x + boss.w / 2, boss.y + boss.h / 2, boss.w, boss.h);
    }
    sfxBossDefeat();
    triggerScreenShake(6, 400);
    triggerScreenFlash(0.2, 300);
    setMusicTheme(THEME_NORMAL);
    const cfg = bossConfig(bossNumber);
    bossesDefeatedCount++;
    bossActive = false;
    boss = null;
    bossNumber = 0;
    bombs = [];
    rockets = [];
    playerBombs = [];
    playerBombTrailParticles = [];
    powerup = null;
    hasFirepower = false;
    hasDualFire = false;
    hasArcBomb = false;
    const bonus = cfg.defeatBonus;
    score += bonus;
    document.getElementById("scoreVal").textContent = score;
    bumpScorePop();

    // instant heal — top up to a full bar (any bonus hearts already earned stay intact)
    if (health < MAX_HEALTH) {
      health = MAX_HEALTH;
      updateHealthDisplay();
      healthMeter.classList.remove("hit");
      void healthMeter.offsetWidth;
      healthMeter.classList.add("hit");
    }

    showBanner(cfg.defeatLabel + " +" + bonus + " · FULL HEALTH!", 2200, "defeat");

    // each boss is followed by its own bonus round — give the banner above
    // a moment to be read before it kicks off
    queueBonusRound(cfg.bonusRound, 2200);
  }

  // ---------- Firepower power-up ----------
  let powerupRespawnTimer = 0;

  function spawnPowerup() {
    const cfg = bossConfig(bossNumber);
    powerup = {
      x: W + 60,
      y: H * 0.1 + Math.random() * H * 0.14,
      r: Math.min(26, W * 0.065),
      bobPhase: Math.random() * Math.PI * 2,
      collected: false,
      vx: 130,
      kind: cfg ? cfg.powerupKind : "gold"
    };
  }

  function updatePowerup(dt) {
    if (!bossActive) return;

    const cfg = bossConfig(bossNumber);
    const alreadyHasThisBoss = cfg && cfg.powerupKind === "blue" ? hasDualFire
      : cfg && cfg.powerupKind === "arcbomb" ? hasArcBomb
      : hasFirepower;
    if (!powerup && !alreadyHasThisBoss) {
      powerupRespawnTimer -= dt;
      if (powerupRespawnTimer <= 0) {
        spawnPowerup();
      }
      return;
    }
    if (!powerup || powerup.collected) return;

    powerup.bobPhase += dt * 3;
    powerup.x -= powerup.vx * dt;

    if (powerup.x < -40) {
      // missed it — give the player another chance shortly
      powerup = null;
      powerupRespawnTimer = 1.4;
      return;
    }

    const drawY = powerup.y + Math.sin(powerup.bobPhase) * 6;
    const dx = Math.abs(player.x - powerup.x);
    const dy = Math.abs(player.y - drawY);
    if (dx < player.w * 0.55 + powerup.r && dy < player.h * 0.55 + powerup.r) {
      powerup.collected = true;
      sfxPowerup();
      if (powerup.kind === "blue") {
        hasFirepower = true;
        hasDualFire = true;
        showBanner("DUAL CANNONS ACTIVATED!", 1600, "power");
      } else if (powerup.kind === "arcbomb") {
        hasArcBomb = true;
        showBanner("BOMBARDIER ACTIVATED!", 1600, "power");
      } else {
        hasFirepower = true;
        showBanner("FIREPOWER ACTIVATED!", 1600, "power");
      }
    }
  }

  function drawPowerup() {
    if (!powerup || powerup.collected) return;
    const drawY = powerup.y + Math.sin(powerup.bobPhase) * 6;
    const pulse = 1 + Math.sin(performance.now() / 140) * 0.08;
    const r = powerup.r * pulse;
    // motion blur trail
    for (let i = 1; i <= 3; i++) {
      ctx.save();
      ctx.globalAlpha = 0.06 * (4 - i) / 3;
      ctx.translate(powerup.x + i * 5, drawY);
      const blurGlow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.6);
      blurGlow.addColorStop(0, "rgba(255,214,120,0.4)");
      blurGlow.addColorStop(1, "rgba(255,180,40,0)");
      ctx.fillStyle = blurGlow;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const isBlue = powerup.kind === "blue";
    const isArc = powerup.kind === "arcbomb";
    const coreFill = isArc ? "#5aa85e" : (isBlue ? "#3fa0e0" : "#f5c542");
    const strokeCol = isArc ? "#1f4a21" : (isBlue ? "#123a5e" : "#7a4a12");
    const glowStart = isArc ? "rgba(110,200,120,0.9)" : (isBlue ? "rgba(90,180,240,0.9)" : "rgba(255,221,120,0.9)");
    const glowEnd = isArc ? "rgba(110,200,120,0)" : (isBlue ? "rgba(90,180,240,0)" : "rgba(255,221,120,0)");

    ctx.save();
    ctx.translate(powerup.x, drawY);
    const glow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.8);
    glow.addColorStop(0, glowStart);
    glow.addColorStop(1, glowEnd);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = coreFill;
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (isArc) {
      // small bomb-drop glyph — a dark bomb with a dashed arc trail
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.3);
      ctx.quadraticCurveTo(0, -r * 0.75, r * 0.4, -r * 0.1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = strokeCol;
      ctx.beginPath();
      ctx.arc(r * 0.4, r * 0.2, r * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // lightning bolt glyph (doubled for the dual-cannon blue variant)
    ctx.fillStyle = strokeCol;
    const drawBolt = (offsetX) => {
      ctx.save();
      ctx.translate(offsetX, 0);
      ctx.beginPath();
      ctx.moveTo(-r * 0.12, -r * 0.55);
      ctx.lineTo(r * 0.32, -r * 0.1);
      ctx.lineTo(r * 0.02, -r * 0.05);
      ctx.lineTo(r * 0.22, r * 0.55);
      ctx.lineTo(-r * 0.32, r * 0.02);
      ctx.lineTo(-r * 0.02, -r * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    if (isBlue) {
      drawBolt(-r * 0.28);
      drawBolt(r * 0.28);
    } else {
      drawBolt(0);
    }
    ctx.restore();
  }

  // ---------- Wind streaks — trailing motion lines for flying entities ----------
  let windParticles = [];

  function maybeEmitWind(x, y, w, h, rate, dt, source) {
    if (Math.random() < rate * dt) {
      windParticles.push({
        x: x + (Math.random() - 0.5) * w * 0.4,
        y: y + (Math.random() - 0.5) * h * 0.6,
        vx: -140 - Math.random() * 90,
        len: 8 + Math.random() * 12,
        life: 0.22 + Math.random() * 0.16,
        age: 0,
        alpha: 0.25 + Math.random() * 0.25,
        source: source || "obstacle"
      });
    }
  }

  function updateWindParticles(dt) {
    windParticles.forEach(p => {
      p.age += dt;
      p.x += p.vx * dt;
    });
    windParticles = windParticles.filter(p => p.age < p.life);
  }

  function drawWindParticle(p) {
    const t = 1 - p.age / p.life;
    ctx.save();
    ctx.globalAlpha = p.alpha * t;
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x + p.len * 0.3, p.y);
    ctx.lineTo(p.x - p.len * 0.7, p.y);
    ctx.stroke();
    ctx.restore();
  }

  // obstacle-trail streaks — drawn behind obstacle sprites
  function drawWindParticlesBack() {
    windParticles.forEach(p => {
      if (p.source === "obstacle") drawWindParticle(p);
    });
  }

  // the player's own trail — drawn after the player so its trailing streaks
  // (which spawn right behind the blimp's own body) aren't painted over by it
  function drawWindParticlesFront() {
    windParticles.forEach(p => {
      if (p.source === "player") drawWindParticle(p);
    });
  }

  // ---------- Ambient dust motes — soft floating particles for atmospheric depth ----------
  // Each mote has a "depth" (0 = far/faint/slow/small, 1 = near/bright/fast/large) so the
  // field reads as real drifting dust in open air rather than a uniform particle grid:
  // closer motes drift faster and glow brighter, matching the parallax speed of the scene,
  // while every mote also bobs and sways slightly on its own independent sine cycle so the
  // motion never looks mechanically synced across particles.
  const DUST_PARTICLE_COUNT = 42;
  let dustParticles = [];
  let dustInitialized = false;

  function makeDustParticle(spawnAnywhereX) {
    const depth = Math.random();
    const size = 0.7 + depth * 2.2; // core radius in px
    return {
      x: spawnAnywhereX ? Math.random() * W : W + size * 8 + Math.random() * 40,
      y: Math.random() * H,
      depth,
      size,
      baseAlpha: 0.05 + depth * 0.14,
      driftSpeed: 9 + depth * 24, // px/s leftward at baseline scroll speed
      bobAmp: 3 + Math.random() * 9,
      bobFreq: 0.35 + Math.random() * 0.55,
      bobPhase: Math.random() * Math.PI * 2,
      swayAmp: 1.5 + Math.random() * 3.5,
      swayFreq: 0.12 + Math.random() * 0.22,
      flickerPhase: Math.random() * Math.PI * 2,
      flickerFreq: 0.6 + Math.random() * 1.1
    };
  }

  function initDustParticles() {
    dustParticles = [];
    for (let i = 0; i < DUST_PARTICLE_COUNT; i++) {
      dustParticles.push(makeDustParticle(true));
    }
    dustInitialized = true;
  }

  function updateDustParticles(dt) {
    if (!dustInitialized) initDustParticles();
    const scrollSpeed = obstacleSpeedScale();
    dustParticles.forEach(p => {
      p.x -= p.driftSpeed * scrollSpeed * dt;
      if (p.x < -p.size * 10) {
        Object.assign(p, makeDustParticle(false));
      }
    });
  }

  function drawDustParticles() {
    const now = performance.now() / 1000;
    ctx.save();
    dustParticles.forEach(p => {
      const y = p.y + Math.sin(now * p.bobFreq + p.bobPhase) * p.bobAmp;
      const x = p.x + Math.sin(now * p.swayFreq + p.bobPhase * 1.7) * p.swayAmp;
      // a gentle per-particle flicker keeps the brightness from feeling static
      const flicker = 0.85 + 0.15 * Math.sin(now * p.flickerFreq + p.flickerPhase);
      const alpha = p.baseAlpha * flicker;
      if (alpha <= 0.004) return;
      const r = p.size * 3.4; // soft glow radius, well past the opaque core
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(235, 219, 188, ${alpha})`);
      grad.addColorStop(0.45, `rgba(214, 196, 162, ${alpha * 0.5})`);
      grad.addColorStop(1, "rgba(200,182,148,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // ---------- Rain level — plays while approaching and fighting the tank (boss 3) ----------
  let rainDrops = [];
  let rainSpawnAccum = 0;
  let lightningState = null; // { phase: "warn"|"strike", bandY, bandH, t }
  let lightningTimer = 3 + Math.random() * 3;
  let thunderFlashUntil = 0;
  // Storm cloud - floating decorative animated cloud during rain levels (no damage)
  let stormCloudsDecorative = [];
  let cloudWisps = []; // mist particles kicked up when something flies through a decorative storm cloud

  function maybeEmitCloudWisp(x, y, dt, rate) {
    if (Math.random() < rate * dt) {
      cloudWisps.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: -50 - Math.random() * 50,
        vy: (Math.random() - 0.5) * 40,
        life: 0.5 + Math.random() * 0.45,
        age: 0,
        size: 7 + Math.random() * 12,
        alpha: 0.22 + Math.random() * 0.22
      });
    }
  }

  function updateCloudWisps(dt) {
    cloudWisps.forEach(p => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += dt * 14; // mist puffs slowly expand as they dissipate
    });
    cloudWisps = cloudWisps.filter(p => p.age < p.life);
  }

  function drawCloudWisps() {
    cloudWisps.forEach(p => {
      const t = 1 - p.age / p.life;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, `rgba(225,230,238,${p.alpha * t})`);
      grad.addColorStop(1, "rgba(225,230,238,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // returns true if a rect (cx,cy,cw,ch top-left form) overlaps a decorative storm cloud's oval-ish bounds
  function overlapsCloud(cloud, cx, cy, cw, ch) {
    const dx = Math.abs((cx + cw / 2) - (cloud.x + cloud.w / 2));
    const dy = Math.abs((cy + ch / 2) - (cloud.y + cloud.h / 2));
    return dx < (cloud.w / 2 + cw / 2) * 0.78 && dy < (cloud.h / 2 + ch / 2) * 0.78;
  }

  function isRainLevel() {
    if (state !== "playing") return false;
    if (bossActive) return !!(boss && boss.kind === "tank");
    const next = nextBossConfig();
    return !!(next && next.num === 3);
  }

  // Storm cloud animation - 36 frames for floating decorative cloud during rain
  const STORM_CLOUD_FRAME_COUNT = 36;
  const STORM_CLOUD_FPS = 12;
  const STORM_CLOUD_KEYS = Array.from({ length: STORM_CLOUD_FRAME_COUNT }, (_, i) => `storm_cloud_${String(i + 1).padStart(2, "0")}`);

  function updateRain(dt) {
    const raining = isRainLevel();
    if (raining) {
        rainSpawnAccum += dt;
        while (rainSpawnAccum > 1 / 60) {
            rainSpawnAccum -= 1 / 60;
            for (let i = 0; i < 3; i++) {
                rainDrops.push({
                    x: Math.random() * (W + 120) - 60,
                    y: -10,
                    len: 14 + Math.random() * 10,
                    speed: 480 + Math.random() * 160
                });
            }
        }

        // Spawn floating storm clouds instead of lightning bands
        lightningTimer -= dt;
        if (lightningTimer <= 0) {
            lightningTimer = 8 + Math.random() * 6; // more spread out: 8-14 seconds between clouds
            // Spawn a decorative storm cloud that floats across the screen
            const img = images[STORM_CLOUD_KEYS[0]];
            const aspect = (img && img.naturalWidth) ? (img.naturalHeight / img.naturalWidth) : 0.72;
            // Bigger clouds: 50-70% of screen width (doubled)
            const dispW = Math.min(560, W * (0.5 + Math.random() * 0.2));
            const dispH = dispW * aspect;
            stormCloudsDecorative.push({
                x: W + dispW,
                y: H * 0.05 + Math.random() * (H * 0.55), // spread across more vertical area
                w: dispW,
                h: dispH,
                speed: 25 + Math.random() * 20, // slower drift for dramatic effect
                animFrame: Math.floor(Math.random() * STORM_CLOUD_FRAME_COUNT),
                animTimer: Math.random() / STORM_CLOUD_FPS,
                alpha: 0.28 // more transparent — the blimp/obstacles should read clearly through it
            });
            sfxThunder();
            thunderFlashUntil = performance.now() + 80;
        }
    }

    // Update storm cloud animation
    const frameDuration = 1 / STORM_CLOUD_FPS;
    stormCloudsDecorative.forEach(c => {
        c.x -= c.speed * dt;
        c.animTimer += dt;
        while (c.animTimer >= frameDuration) {
            c.animTimer -= frameDuration;
            c.animFrame = (c.animFrame + 1) % STORM_CLOUD_FRAME_COUNT;
        }

        // mist wisps kick up when the player or an obstacle flies through this cloud
        if (overlapsCloud(c, player.x - player.w / 2, player.y - player.h / 2, player.w, player.h)) {
          maybeEmitCloudWisp(player.x, player.y, dt, 22);
        }
        obstacles.forEach(o => {
          if (overlapsCloud(c, o.x, o.y, o.w, o.h)) {
            maybeEmitCloudWisp(o.x + o.w / 2, o.y + o.h / 2, dt, 10);
          }
        });
    });
    stormCloudsDecorative = stormCloudsDecorative.filter(c => c.x + c.w > -50);

    rainDrops.forEach(d => {
        d.y += d.speed * dt;
        d.x -= d.speed * 0.18 * dt;
    });
    rainDrops = rainDrops.filter(d => d.y < H + 20);

  }

  function drawRain() {
    const raining = isRainLevel();
    if (!raining && rainDrops.length === 0 && stormCloudsDecorative.length === 0) return;
    if (raining) {
        ctx.fillStyle = "rgba(20,26,38,0.14)";
        ctx.fillRect(0, 0, W, H);
    }

    ctx.strokeStyle = "rgba(210,225,240,0.5)";
    ctx.lineWidth = 2;
    rainDrops.forEach(d => {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * 0.18, d.y - d.len);
        ctx.stroke();
    });

    // Draw floating decorative storm clouds (animated, no damage), semi-transparent
    stormCloudsDecorative.forEach(c => {
        const img = images[STORM_CLOUD_KEYS[c.animFrame]];
        if (!img || !img.naturalWidth) return;
        ctx.save();
        ctx.globalAlpha = c.alpha;
        // Use lighter composite operation so the cloud blends nicely with the background
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(img, c.x, c.y, c.w, c.h);
        ctx.restore();
    });

    // Occasional thunder flash across the whole screen
    if (performance.now() < thunderFlashUntil) {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(0, 0, W, H);
    }

  }

  // ---------- Boss hit-feedback (flash + spark particles) ----------
  let bossHitFlashUntil = 0;
  let bossShakeUntil = 0;
  let hitParticles = [];
  let explosionBursts = [];
  let shockwaves = []; // expanding glow rings — used for the boss-defeat spectacle

  function triggerShockwave(cx, cy, maxR, color) {
    shockwaves.push({ x: cx, y: cy, age: 0, life: 0.65, maxR, color: color || "255,220,140" });
  }

  function updateShockwaves(dt) {
    shockwaves.forEach(s => (s.age += dt));
    shockwaves = shockwaves.filter(s => s.age < s.life);
  }

  function drawShockwaves() {
    shockwaves.forEach(s => {
      const t = s.age / s.life;
      const eased = 1 - Math.pow(1 - t, 2); // ease-out — fast expand, gentle finish
      const r = s.maxR * eased;
      const alpha = Math.max(0, 1 - t);
      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = `rgba(${s.color},1)`;
      ctx.lineWidth = 7 * (1 - t) + 2;
      ctx.shadowColor = `rgba(${s.color},0.9)`;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(0, r), 0, Math.PI * 2);
      ctx.stroke();
      // a second, tighter inner ring for extra depth
      ctx.globalAlpha = alpha * 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(0, r * 0.7), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  function spawnHitParticles(x, y) {
    // sparks — quick, bright, scatter in all directions
    const sparkCount = 8;
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 170;
      hitParticles.push({
        type: "spark",
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.15,
        age: 0,
        r: 2 + Math.random() * 2.5
      });
    }

    // smoke — slower, larger, drifts up and fades out over a longer life
    const smokeCount = 5;
    for (let i = 0; i < smokeCount; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 25 + Math.random() * 45;
      hitParticles.push({
        type: "smoke",
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.55 + Math.random() * 0.35,
        age: 0,
        r: 6 + Math.random() * 6,
        growth: 1.4 + Math.random() * 0.8
      });
    }

    // one quick explosion flash burst (expanding ring)
    explosionBursts.push({ x, y, age: 0, delay: 0, life: 0.28, maxR: 26 + Math.random() * 10 });
  }

  function updateHitParticles(dt) {
    hitParticles.forEach(p => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === "smoke") {
        p.vy -= 20 * dt; // smoke drifts upward, slowing its own rise
        p.vx *= 0.96;
      } else {
        p.vy += 260 * dt; // sparks fall with gravity
      }
    });
    hitParticles = hitParticles.filter(p => p.age < p.life);

    explosionBursts.forEach(b => {
      if (b.delay > 0) {
        b.delay -= dt;
      } else {
        b.age += dt;
      }
    });
    explosionBursts = explosionBursts.filter(b => b.age < b.life);
  }

  // Big multi-stage explosion for the boss's defeat — bursts staggered over
  // ~0.5s, plus a much larger particle count than a normal hit.
  function triggerBigExplosion(cx, cy, spreadW, spreadH) {
    sfxExplosion(Math.min(1.5, spreadW / 60));
    if (spreadW > 50) triggerScreenShake(Math.min(8, spreadW / 20), 250);
    const burstCount = 6;
    for (let i = 0; i < burstCount; i++) {
      explosionBursts.push({
        x: cx + (Math.random() - 0.5) * spreadW,
        y: cy + (Math.random() - 0.5) * spreadH,
        age: 0,
        delay: i === 0 ? 0 : Math.random() * 0.5,
        life: 0.32 + Math.random() * 0.16,
        maxR: 40 + Math.random() * 34
      });
    }

    const sparkCount = 36;
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 260;
      hitParticles.push({
        type: "spark",
        x: cx + (Math.random() - 0.5) * spreadW * 0.5,
        y: cy + (Math.random() - 0.5) * spreadH * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.35,
        age: 0,
        r: 2.5 + Math.random() * 3.5
      });
    }

    const smokeCount = 16;
    for (let i = 0; i < smokeCount; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const speed = 30 + Math.random() * 70;
      hitParticles.push({
        type: "smoke",
        x: cx + (Math.random() - 0.5) * spreadW * 0.7,
        y: cy + (Math.random() - 0.5) * spreadH * 0.7,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.9 + Math.random() * 0.6,
        age: 0,
        r: 10 + Math.random() * 10,
        growth: 1.8 + Math.random() * 1.2
      });
    }
  }

  function drawHitParticles() {
    // explosion flash bursts first (underneath the sparks/smoke)
    explosionBursts.forEach(b => {
      const t = b.age / b.life;
      const r = b.maxR * t;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t) * 0.8;
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
      grad.addColorStop(0, "rgba(255,255,255,0.95)");
      grad.addColorStop(0.4, "rgba(255,200,80,0.75)");
      grad.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    hitParticles.forEach(p => {
      const t = 1 - p.age / p.life;
      ctx.save();
      if (p.type === "smoke") {
        ctx.globalAlpha = Math.max(0, t) * 0.55;
        const r = p.r * (1 + (1 - t) * p.growth);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grad.addColorStop(0, "rgba(90,85,80,0.8)");
        grad.addColorStop(1, "rgba(90,85,80,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = Math.max(0, t);
        ctx.fillStyle = "#ffdd66";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * t, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  // ---------- Bullets (player fire, once firepower is active) ----------
  function updateBullets(dt) {
    if (hasFirepower && (bossActive || bonusActive) && state === "playing") {
      bulletTimer -= dt;
      if (bulletTimer <= 0) {
        bulletTimer = BULLET_INTERVAL;
        sfxShoot();
        if (hasDualFire) {
          bullets.push({ x: player.x + player.w * 0.4, y: player.y - 9, vx: 640 });
          bullets.push({ x: player.x + player.w * 0.4, y: player.y + 9, vx: 640 });
        } else {
          bullets.push({ x: player.x + player.w * 0.4, y: player.y, vx: 640 });
        }
      }
    }

    bullets.forEach(b => (b.x += b.vx * dt));
    bullets = bullets.filter(b => b.x < W + 20);

    if (boss && bossActive) {
      bullets = bullets.filter(b => {
        if (!boss) return true; // boss was just defeated by an earlier bullet this same pass
        const dx = Math.abs(b.x - (boss.x + boss.w / 2));
        const dy = Math.abs(b.y - (boss.y + boss.h / 2));
        if (dx < boss.w * 0.38 && dy < boss.h * 0.42) {
          boss.health--;
          bossHitFlashUntil = performance.now() + 130;
          bossShakeUntil = performance.now() + 220;
          spawnHitParticles(b.x, b.y);
          if (boss.health <= 0) defeatBoss();
          return false;
        }
        return true;
      });
    }

    // bullets can shoot down the boss's bombs — one hit is enough
    if (bombs.length) {
      bullets = bullets.filter(b => {
        let hit = false;
        bombs = bombs.filter(bomb => {
          if (hit) return true;
          const dx = Math.abs(b.x - bomb.x);
          const dy = Math.abs(b.y - bomb.y);
          if (dx < bomb.r + 8 && dy < bomb.r + 8) {
            hit = true;
            spawnHitParticles(bomb.x, bomb.y);
            triggerBigExplosion(bomb.x, bomb.y, 26, 26);
            return false;
          }
          return true;
        });
        return !hit;
      });
    }

    // bullets can shoot down the second boss's rockets — takes 2-3 hits
    if (rockets.length) {
      bullets = bullets.filter(b => {
        let hit = false;
        rockets = rockets.filter(r => {
          if (hit) return true;
          const dx = Math.abs(b.x - r.x);
          const dy = Math.abs(b.y - r.y);
          if (dx < r.r + 10 && dy < r.r + 10) {
            hit = true;
            r.health--;
            spawnHitParticles(r.x, r.y);
            if (r.health <= 0) {
              triggerBigExplosion(r.x, r.y, 30, 30);
              return false;
            }
            return true;
          }
          return true;
        });
        return !hit;
      });
    }

    // bullets pop bonus-round balloons (only during the balloon variant)
    if (bonusActive && bonusType === "balloon" && bonusItems.length) {
      bullets = bullets.filter(b => {
        let hit = false;
        bonusItems.forEach(bal => {
          if (hit || bal.popped) return;
          const drawY = bal.y + Math.sin(bal.bobPhase) * bal.bobAmount;
          const dx = Math.abs(b.x - (bal.x + bal.w / 2));
          const dy = Math.abs(b.y - (drawY + bal.h / 2));
          if (dx < bal.w * 0.45 && dy < bal.h * 0.45) {
            hit = true;
            popBonusItem(bal);
          }
        });
        return !hit;
      });
    }

    updateHitParticles(dt);
  }

  function drawBullets() {
    bullets.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);
      // motion blur trail for bullets
      const blurCount = 3;
      for (let i = 1; i <= blurCount; i++) {
        ctx.globalAlpha = 0.15 * (blurCount - i + 1) / blurCount;
        ctx.fillStyle = "#ffdd66";
        ctx.beginPath();
        ctx.ellipse(-i * 5, 0, 8 - i, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const grad = ctx.createLinearGradient(-14, 0, 6, 0);
      grad.addColorStop(0, "rgba(255,200,80,0)");
      grad.addColorStop(1, "#fff3c4");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffdd66";
      ctx.beginPath();
      ctx.arc(4, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // ---------- Boss bombs (dodge or take a hit) ----------
  let shellTrailParticles = [];

  function spawnShellTrailParticle(x, y, vx, vy) {
    const speed = Math.hypot(vx, vy) || 1;
    // spawn just behind the shell's tail (opposite its direction of travel)
    const backX = x - (vx / speed) * 16;
    const backY = y - (vy / speed) * 16;
    const isFlame = Math.random() < 0.55;
    shellTrailParticles.push({
      x: backX + (Math.random() - 0.5) * 8,
      y: backY + (Math.random() - 0.5) * 8,
      vx: -(vx / speed) * 55 + (Math.random() - 0.5) * 40, // wind drift sideways
      vy: -(vy / speed) * 55 + (Math.random() - 0.5) * 30 - (isFlame ? 0 : 25), // smoke drifts up a bit more than flame
      size: isFlame ? 4 + Math.random() * 6 : 8 + Math.random() * 10,
      life: isFlame ? 0.22 + Math.random() * 0.12 : 0.5 + Math.random() * 0.35,
      age: 0,
      isFlame
    });
  }

  function updateShellTrailParticles(dt) {
    shellTrailParticles.forEach(p => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94; // wind resistance
      p.vy *= 0.94;
    });
    shellTrailParticles = shellTrailParticles.filter(p => p.age < p.life);
  }

  function drawShellTrailParticles() {
    shellTrailParticles.forEach(p => {
      const t = p.age / p.life;
      const alpha = 1 - t;
      const size = p.size * (1 + t * 0.8); // particles expand as they age/dissipate
      ctx.save();
      if (p.isFlame) {
        ctx.globalAlpha = alpha * 0.9;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
        grad.addColorStop(0, "rgba(255,240,180,0.95)");
        grad.addColorStop(0.5, "rgba(255,140,40,0.75)");
        grad.addColorStop(1, "rgba(200,50,20,0)");
        ctx.fillStyle = grad;
      } else {
        ctx.globalAlpha = alpha * 0.5;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
        grad.addColorStop(0, "rgba(120,115,110,0.6)");
        grad.addColorStop(1, "rgba(120,115,110,0)");
        ctx.fillStyle = grad;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function updateBombs(dt) {
    bombs.forEach(b => {
      b.y += b.vy * dt;
      b.vy += (b.gravity || 260) * dt;
      b.x += b.vx * dt;
      if (b.orientToVelocity) {
        b.rotation = Math.atan2(b.vy, b.vx);
      } else {
        b.rotation = (b.rotation || 0) + (b.rotSpeed || 5) * dt;
      }

      if (b.spriteKey === "boss3_shell") {
        b.trailTimer = (b.trailTimer || 0) - dt;
        if (b.trailTimer <= 0) {
          b.trailTimer = 0.018; // dense enough for a solid flame trail
          spawnShellTrailParticle(b.x, b.y, b.vx, b.vy);
        }
      }
    });
    bombs = bombs.filter(b => b.y < H + 30 && b.x > -30 && b.x < W + 30);

    bombs = bombs.filter(b => {
      const dx = Math.abs(player.x - b.x);
      const dy = Math.abs(player.y - b.y);
      if (dx < player.w * 0.4 + b.r && dy < player.h * 0.4 + b.r) {
        takeHit();
        return false;
      }
      return true;
    });
  }

  function drawBombs() {
    drawShellTrailParticles();
    bombs.forEach(b => {
      const img = images[b.spriteKey] || images.bomb;
      if (!img || !img.naturalWidth) return;
      let aspect = imgAspect(img);
      const w = b.r * 2.1;
      const h = w * aspect;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation || 0);
      drawMotionBlur(img, 0, 0, w, h, b.rotation || 0, b.vx, b.vy);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    });
  }

  const BANNER_THEMES = {
    boss:       { top: "92,32,22",   bottom: "46,15,10",  text: "245,228,205", glow: "205,100,60",  accent: "chevron" },
    defeat:     { top: "150,115,48", bottom: "92,66,26",  text: "252,240,210", glow: "222,178,105", accent: "burst" },
    power:      { top: "48,78,86",   bottom: "22,40,46",  text: "228,240,238", glow: "145,195,182", accent: "spark" },
    bonus:      { top: "108,56,74",  bottom: "58,26,40",  text: "245,228,232", glow: "198,140,150", accent: "confetti" },
    level:      { top: "120,86,45",  bottom: "70,48,22",  text: "245,230,200", glow: "220,180,110", accent: "gear" },
    checkpoint: { top: "150,116,30", bottom: "94,68,14",  text: "255,246,220", glow: "230,190,90",  accent: "sparkle" },
    health:     { top: "122,46,54",  bottom: "70,23,30",  text: "248,226,222", glow: "208,120,120", accent: "heart" },
    info:       { top: "60,45,25",   bottom: "35,25,12",  text: "245,230,200", glow: "200,170,120", accent: "none" }
  };

  function drawBannerAccent(kind, x, y, size, color, phase) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = `rgba(${color},0.9)`;
    ctx.strokeStyle = `rgba(${color},0.9)`;
    if (kind === "chevron") {
      ctx.beginPath();
      ctx.moveTo(-size * 0.5, -size * 0.5); ctx.lineTo(size * 0.15, 0); ctx.lineTo(-size * 0.5, size * 0.5);
      ctx.lineWidth = size * 0.22; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.stroke();
    } else if (kind === "burst") {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + phase;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * size * 0.25, Math.sin(a) * size * 0.25);
        ctx.lineTo(Math.cos(a) * size * 0.55, Math.sin(a) * size * 0.55);
        ctx.lineWidth = 1.6; ctx.stroke();
      }
    } else if (kind === "spark") {
      ctx.beginPath();
      ctx.moveTo(-size * 0.15, -size * 0.55); ctx.lineTo(size * 0.12, -size * 0.05);
      ctx.lineTo(-size * 0.08, -size * 0.05); ctx.lineTo(size * 0.15, size * 0.55);
      ctx.lineTo(-size * 0.02, size * 0.05); ctx.lineTo(size * 0.1, size * 0.05);
      ctx.closePath(); ctx.fill();
    } else if (kind === "confetti") {
      for (let i = 0; i < 4; i++) {
        const a = phase + i * 1.6;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * size * 0.35, Math.sin(a) * size * 0.35, size * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === "gear") {
      const teeth = 8;
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a1 = (i / teeth) * Math.PI * 2 + phase * 0.3;
        const a2 = a1 + Math.PI / teeth;
        ctx.lineTo(Math.cos(a1) * size * 0.5, Math.sin(a1) * size * 0.5);
        ctx.lineTo(Math.cos(a2) * size * 0.32, Math.sin(a2) * size * 0.32);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(${BANNER_THEMES.level.top},1)`;
      ctx.beginPath(); ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2); ctx.fill();
    } else if (kind === "sparkle") {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.55); ctx.lineTo(size * 0.14, -size * 0.14);
      ctx.lineTo(size * 0.55, 0); ctx.lineTo(size * 0.14, size * 0.14);
      ctx.lineTo(0, size * 0.55); ctx.lineTo(-size * 0.14, size * 0.14);
      ctx.lineTo(-size * 0.55, 0); ctx.lineTo(-size * 0.14, -size * 0.14);
      ctx.closePath(); ctx.fill();
    } else if (kind === "heart") {
      const s = size * 0.32;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.6);
      ctx.bezierCurveTo(-s * 1.3, -s * 0.4, -s * 0.5, -s * 1.3, 0, -s * 0.35);
      ctx.bezierCurveTo(s * 0.5, -s * 1.3, s * 1.3, -s * 0.4, 0, s * 0.6);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawBossBanner() {
    if (!bossBanner) return;
    const now = performance.now();
    if (now > bossBanner.until) {
      bossBanner = null;
      return;
    }

    const theme = BANNER_THEMES[bossBanner.type] || BANNER_THEMES.info;
    const introDur = 220, outroDur = 260;
    const age = now - bossBanner.startedAt;
    const totalLife = bossBanner.until - bossBanner.startedAt;
    const timeLeft = bossBanner.until - now;

    let scale = 1, alpha = 1, dropY = 0;
    if (age < introDur) {
      const p = age / introDur;
      const eased = 1 - Math.pow(1 - p, 3);
      scale = 0.75 + eased * 0.25;
      alpha = eased;
      dropY = (1 - eased) * -14;
    } else if (timeLeft < outroDur && totalLife > introDur + outroDur) {
      const p = 1 - Math.max(0, timeLeft) / outroDur;
      alpha = 1 - p;
      scale = 1 - p * 0.08;
      dropY = p * -10;
    }

    // auto-fit text so it always stays within the screen, regardless of length
    let fontSize = Math.max(15, Math.min(24, W * 0.062));
    ctx.font = "bold " + fontSize + "px Georgia, serif";
    const maxTextWidth = W * 0.78;
    while (ctx.measureText(bossBanner.text).width > maxTextWidth && fontSize > 11) {
      fontSize -= 1;
      ctx.font = "bold " + fontSize + "px Georgia, serif";
    }
    const textWidth = ctx.measureText(bossBanner.text).width;
    const accentSize = fontSize * 1.1;
    const paddingX = fontSize * 1.4;
    const boxW = Math.min(W * 0.94, textWidth + paddingX * 2 + (theme.accent !== "none" ? accentSize * 2.4 : 0));
    const boxH = fontSize + 22;
    const boxY = H * 0.14 + dropY;
    const cx = W / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, boxY + boxH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -(boxY + boxH / 2));

    // glow halo behind the banner
    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    const glow = ctx.createRadialGradient(cx, boxY + boxH / 2, 0, cx, boxY + boxH / 2, boxW * 0.6);
    glow.addColorStop(0, `rgba(${theme.glow},0.35)`);
    glow.addColorStop(1, `rgba(${theme.glow},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(cx - boxW * 0.7, boxY - boxH * 0.6, boxW * 1.4, boxH * 2.2);
    ctx.restore();

    // banner body — gradient fill with a bright top edge and dark border, sized to fit the text
    const bodyGrad = ctx.createLinearGradient(0, boxY, 0, boxY + boxH);
    bodyGrad.addColorStop(0, `rgba(${theme.top},0.95)`);
    bodyGrad.addColorStop(1, `rgba(${theme.bottom},0.95)`);
    const bx = cx - boxW / 2;
    const r = Math.min(10, boxH * 0.3);
    ctx.beginPath();
    ctx.moveTo(bx + r, boxY);
    ctx.arcTo(bx + boxW, boxY, bx + boxW, boxY + boxH, r);
    ctx.arcTo(bx + boxW, boxY + boxH, bx, boxY + boxH, r);
    ctx.arcTo(bx, boxY + boxH, bx, boxY, r);
    ctx.arcTo(bx, boxY, bx + boxW, boxY, r);
    ctx.closePath();
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = `rgba(${theme.glow},0.55)`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // bright top highlight edge
    ctx.strokeStyle = `rgba(255,255,255,0.22)`;
    ctx.beginPath();
    ctx.moveTo(bx + r, boxY + 1.5);
    ctx.lineTo(bx + boxW - r, boxY + 1.5);
    ctx.stroke();

    // decorative accent icons flanking the text, unique per banner type
    const phase = age / 260;
    if (theme.accent !== "none") {
      drawBannerAccent(theme.accent, bx + accentSize * 0.9, boxY + boxH / 2, accentSize, theme.glow, phase);
      drawBannerAccent(theme.accent, bx + boxW - accentSize * 0.9, boxY + boxH / 2, accentSize, theme.glow, phase + 3.1);
    }

    // text with a soft glow + drop shadow for legibility over any background
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + fontSize + "px Georgia, serif";
    ctx.shadowColor = `rgba(${theme.glow},0.8)`;
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(${theme.text},1)`;
    ctx.fillText(bossBanner.text, cx, boxY + boxH / 2 + 1);
    ctx.shadowBlur = 0;

    ctx.restore();
  }


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
          bossHitFlashUntil = performance.now() + 220;
          bossShakeUntil = performance.now() + 420;
          try { spawnBossDamageNum(1, b.x, b.y); } catch (e) {}
          spawnHitParticles(b.x, b.y);
          triggerBigExplosion(b.x, b.y, 42, 42);
          try { if (typeof triggerShockwave === "function") triggerShockwave(b.x, b.y, 55, "255,170,50"); } catch (e) {}
          try { if (typeof spawnPirateBlast === "function") spawnPirateBlast(b.x, b.y, 0.45); } catch (e) {}
          try { if (typeof triggerScreenShake === "function") triggerScreenShake(4, 140); } catch (e) {}
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

  // Exhaust / ember trail behind every rocket
  let rocketTrailParticles = [];

  function spawnRocketTrail(r) {
    const speed = Math.hypot(r.vx, r.vy) || 1;
    const backX = r.x - (r.vx / speed) * (r.r * 1.2);
    const backY = r.y - (r.vy / speed) * (r.r * 1.2);
    const count = 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const isSmoke = Math.random() < 0.35;
      rocketTrailParticles.push({
        x: backX + (Math.random() - 0.5) * r.r * 0.6,
        y: backY + (Math.random() - 0.5) * r.r * 0.6,
        vx: -(r.vx / speed) * (20 + Math.random() * 40) + (Math.random() - 0.5) * 30,
        vy: -(r.vy / speed) * (20 + Math.random() * 40) + (Math.random() - 0.5) * 30,
        life: isSmoke ? 0.35 + Math.random() * 0.25 : 0.18 + Math.random() * 0.18,
        age: 0,
        size: isSmoke ? 4 + Math.random() * 5 : 2 + Math.random() * 3,
        isSmoke: isSmoke
      });
    }
    // Cap trail particles for performance
    if (rocketTrailParticles.length > 120) {
      rocketTrailParticles.splice(0, rocketTrailParticles.length - 120);
    }
  }

  function updateRocketTrail(dt) {
    rocketTrailParticles.forEach(function(p) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.isSmoke) p.size += 18 * dt;
      else p.size *= 0.97;
    });
    rocketTrailParticles = rocketTrailParticles.filter(function(p) {
      return p.age < p.life;
    });
  }

  function drawRocketTrail() {
    rocketTrailParticles.forEach(function(p) {
      const t = 1 - p.age / p.life;
      ctx.save();
      if (p.isSmoke) {
        ctx.globalAlpha = t * 0.35;
        ctx.fillStyle = "rgba(90, 85, 80, 1)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // hot ember
        ctx.globalAlpha = t * 0.9;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g.addColorStop(0, "rgba(255, 250, 200, 1)");
        g.addColorStop(0.4, "rgba(255, 160, 40, 0.95)");
        g.addColorStop(1, "rgba(220, 40, 10, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function updateRockets(dt) {
    rockets.forEach(r => {
      r.x += r.vx * dt;
      r.y += r.vy * dt;

      r.trailTimer = (r.trailTimer || 0) - dt;
      if (r.trailTimer <= 0) {
        r.trailTimer = 0.028;
        spawnRocketTrail(r);
      }

      r.animTimer += dt;
      const frameDur = 1 / ROCKET_ANIM_FPS;
      const frames = r.frameKeys || ROCKET_FLIGHT_KEYS;
      while (r.animTimer >= frameDur) {
        r.animTimer -= frameDur;
        r.animFrame = (r.animFrame + 1) % frames.length;
      }
    });
    updateRocketTrail(dt);
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
    drawRocketTrail();
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

    // Hit feedback without white flash (shake + particles + damage nums only)

    // Premium boss health bar
    const barW = boss.w * 0.95;
    const barH = 14;
    const barX = boss.x + (boss.w - barW) / 2;
    const barY = boss.y - 28;
    const pct = Math.max(0, Math.min(1, boss.health / boss.maxHealth));
    // Outer frame
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    var rr=5,rx=barX-3,ry=barY-3,rw=barW+6,rh=barH+6;
    ctx.moveTo(rx+rr,ry); ctx.arcTo(rx+rw,ry,rx+rw,ry+rh,rr); ctx.arcTo(rx+rw,ry+rh,rx,ry+rh,rr);
    ctx.arcTo(rx,ry+rh,rx,ry,rr); ctx.arcTo(rx,ry,rx+rw,ry,rr); ctx.closePath();
    ctx.fill();
    // Brass border
    const frameG = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    frameG.addColorStop(0, "rgba(255,210,120,0.95)");
    frameG.addColorStop(0.5, "rgba(180,120,40,0.9)");
    frameG.addColorStop(1, "rgba(120,70,20,0.95)");
    ctx.strokeStyle = frameG;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    var rr2=4,rx2=barX-1.5,ry2=barY-1.5,rw2=barW+3,rh2=barH+3;
    ctx.moveTo(rx2+rr2,ry2); ctx.arcTo(rx2+rw2,ry2,rx2+rw2,ry2+rh2,rr2);
    ctx.arcTo(rx2+rw2,ry2+rh2,rx2,ry2+rh2,rr2); ctx.arcTo(rx2,ry2+rh2,rx2,ry2,rr2);
    ctx.arcTo(rx2,ry2,rx2+rw2,ry2,rr2); ctx.closePath();
    ctx.stroke();
    // Track
    ctx.fillStyle = "rgba(25,12,8,0.92)";
    ctx.fillRect(barX, barY, barW, barH);
    // Fill
    if (pct > 0) {
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      if (pct > 0.5) {
        fillGrad.addColorStop(0, "#2ecc71");
        fillGrad.addColorStop(0.5, "#27ae60");
        fillGrad.addColorStop(1, "#1e8449");
      } else if (pct > 0.25) {
        fillGrad.addColorStop(0, "#f39c12");
        fillGrad.addColorStop(1, "#e67e22");
      } else {
        fillGrad.addColorStop(0, "#e74c3c");
        fillGrad.addColorStop(1, "#c0392b");
      }
      ctx.fillStyle = fillGrad;
      ctx.fillRect(barX, barY, barW * pct, barH);
      // Shine
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(barX, barY, barW * pct, barH * 0.35);
      if (pct < 0.25) {
        const pulse = 0.25 + 0.35 * Math.abs(Math.sin(performance.now() / 120));
        ctx.fillStyle = "rgba(255,80,40," + pulse.toFixed(2) + ")";
        ctx.fillRect(barX, barY, barW * pct, barH);
      }
    }
    // HP numbers
    ctx.font = "900 13px Rockwell, Georgia, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.fillStyle = "#fff6d0";
    const hpLabel = Math.max(0, Math.ceil(boss.health)) + " / " + Math.ceil(boss.maxHealth);
    ctx.strokeText(hpLabel, barX + barW / 2, barY + barH / 2 + 0.5);
    ctx.fillText(hpLabel, barX + barW / 2, barY + barH / 2 + 0.5);
    ctx.restore();
    try { drawBossDamageNums(); } catch (e) {}
  }

  // Dramatic sinking death for boss 1 (balloon) — slo-mo fall with fire/smoke
  let bossSinking = null; // visual-only corpse while rewards still process

  // Training boss defeat sprite (36 frames)
  var __defeatSpriteImgs = null;
  var __defeatSpriteReady = false;
  function ensureDefeatSprites() {
    if (__defeatSpriteImgs) return __defeatSpriteImgs;
    __defeatSpriteImgs = [];
    var loaded = 0;
    for (var i = 0; i < 36; i++) {
      var im = new Image();
      im.onload = function() { loaded++; if (loaded >= 36) __defeatSpriteReady = true; };
      im.onerror = function() { loaded++; };
      im.src = "boss_defeat_" + String(i).padStart(2, "0") + ".webp?v=ruff343";
      __defeatSpriteImgs.push(im);
    }
    return __defeatSpriteImgs;
  }
  window.__airbornePreloadDefeatSprites = ensureDefeatSprites;

  function spawnTrainHoleSmoke(s, burst) {
    // Big puffs from the two balloon holes (relative to sprite center)
    var dw = s._dw || s.w || 120;
    var dh = s._dh || s.h || dw * 1.7;
    var cx = s.x + s.w * 0.5;
    var cy = s.y + s.h * 0.5;
    // Hole anchors in balloon envelope (upper half of sprite)
    var holes = [
      { ox: -0.20 * dw, oy: -0.34 * dh }, // left tear
      { ox:  0.16 * dw, oy: -0.30 * dh }  // right tear
    ];
    var n = burst ? 10 : 3;
    for (var h = 0; h < holes.length; h++) {
      for (var i = 0; i < n; i++) {
        var ang = Math.random() * Math.PI * 2;
        var spd = 18 + Math.random() * 55;
        s.fx.push({
          kind: "smoke",
          x: cx + holes[h].ox + (Math.random() - 0.5) * 14,
          y: cy + holes[h].oy + (Math.random() - 0.5) * 10,
          vx: Math.cos(ang) * spd * 0.5 - 15 - Math.random() * 40,
          vy: -30 - Math.random() * 70,
          life: 1.2 + Math.random() * 1.1,
          age: 0,
          r: 16 + Math.random() * 28 // big puffs
        });
      }
    }
  }

  function spawnBossBalloonFireSmoke(sink, burst) {
    const n = burst ? 28 : 7;
    for (let i = 0; i < n; i++) {
      // Bias heavily onto the balloon envelope
      const onBalloon = Math.random() < 0.88;
      const lx = onBalloon ? (0.08 + Math.random() * 0.84) : (0.3 + Math.random() * 0.4);
      const ly = onBalloon ? (0.02 + Math.random() * 0.62) : (0.55 + Math.random() * 0.35);
      const roll = Math.random();
      const kind = roll < 0.38 ? "smoke" : (roll < 0.55 ? "ember" : "fire");
      sink.fx.push({
        x: sink.x + sink.w * lx,
        y: sink.y + sink.h * ly,
        vx: (Math.random() - 0.5) * (kind === "smoke" ? 50 : 90),
        vy: kind === "smoke" ? (-40 - Math.random() * 70)
          : (kind === "ember" ? (20 + Math.random() * 60) : (-30 - Math.random() * 100)),
        life: kind === "smoke" ? (1.1 + Math.random() * 1.0)
          : (kind === "ember" ? (0.7 + Math.random() * 0.6) : (0.4 + Math.random() * 0.5)),
        age: 0,
        r: kind === "smoke" ? (10 + Math.random() * 18)
          : (kind === "ember" ? (2 + Math.random() * 3.5) : (5 + Math.random() * 11)),
        kind: kind
      });
    }
  }

  function finishBossRewards(cfg) {
    if (!cfg) return;
    sfxBossDefeat();
    setMusicTheme(THEME_NORMAL);
    bossesDefeatedCount++;
    // Clear all air threats after the boss falls
    if (typeof obstacles !== "undefined") obstacles = [];
    bombs = [];
    rockets = [];
if (typeof rocketTrailParticles !== "undefined") rocketTrailParticles = [];
    playerBombs = [];
    playerBombTrailParticles = [];
    powerup = null;
    if (typeof healPickup !== "undefined") healPickup = null;
    if (typeof shieldPickup !== "undefined") shieldPickup = null;
    hasFirepower = false;
    hasDualFire = false;
    hasArcBomb = false;
    const bonus = cfg.defeatBonus;
    score += bonus;
    document.getElementById("scoreVal").textContent = score;
    bumpScorePop();
    if (health < MAX_HEALTH) {
      health = MAX_HEALTH;
      updateHealthDisplay();
      healthMeter.classList.remove("hit");
      void healthMeter.offsetWidth;
      healthMeter.classList.add("hit");
    }
    showBanner(cfg.defeatLabel + " +" + bonus + " · FULL HEALTH!", 2200, "defeat");
    // Training lesson: no campaign progress, no bonus round, no level-end pad
    if (window.__airborneTrainingBoss || window.__airborneAirfield || window.__airborneTrainingFlight) {
      window.__airborneTrainingBossDone = true;
      window.__airborneTrainingBoss = false;
      // Roll back campaign counters so map/levels stay clean
      try {
        if (typeof bossesDefeatedCount === "number" && bossesDefeatedCount > 0) bossesDefeatedCount -= 1;
        if (typeof lastBossTriggered === "number") lastBossTriggered = Math.max(0, lastBossTriggered - 1);
      } catch (e) {}
      try { setMusicTheme(THEME_NORMAL); } catch (e) {}
      return;
    }
    queueBonusRound(cfg.bonusRound, 2200);
  }

  function spawnBossDeathFx(s, burst) {
    const mode = s.mode || "fire_sink";
    const n = burst ? 24 : 6;
    for (let i = 0; i < n; i++) {
      const lx = 0.1 + Math.random() * 0.8;
      const ly = 0.05 + Math.random() * 0.7;
      const x = s.x + s.w * lx;
      const y = s.y + s.h * ly;
      if (mode === "fire_sink") {
        spawnBossBalloonFireSmoke(s, false);
        continue;
      }
      if (mode === "rocket_blast") {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        s.fx.push({
          x: x, y: y,
          vx: Math.cos(ang) * (80 + Math.random() * 160),
          vy: Math.sin(ang) * (80 + Math.random() * 160),
          life: 0.5 + Math.random() * 0.5, age: 0,
          r: 3 + Math.random() * 6,
          kind: Math.random() < 0.4 ? "spark" : "fire"
        });
      } else if (mode === "tank_crumble") {
        s.fx.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 180,
          vy: -40 - Math.random() * 120,
          life: 0.6 + Math.random() * 0.7, age: 0,
          r: 2 + Math.random() * 5,
          kind: Math.random() < 0.5 ? "spark" : "dust"
        });
      } else if (mode === "heli_spin") {
        s.fx.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 220,
          vy: (Math.random() - 0.5) * 160,
          life: 0.4 + Math.random() * 0.5, age: 0,
          r: 2 + Math.random() * 4,
          kind: "spark"
        });
      } else if (mode === "ink_dissolve") {
        s.fx.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 90,
          vy: 30 + Math.random() * 80,
          life: 0.8 + Math.random() * 0.9, age: 0,
          r: 6 + Math.random() * 14,
          kind: Math.random() < 0.35 ? "ink" : "smoke"
        });
      }
    }
  }

  function updateBossSinking(dt) {
    if (!bossSinking) return;
    const s = bossSinking;
    s.age += dt;
    const t = Math.min(1, s.age / s.duration);
    const mode = s.mode || "fire_sink";

    if (mode === "train_sprite") {
      // Frame from age; only advance when target frame image is ready (reduces glitch)
      var prog = Math.min(1, s.age / Math.max(0.01, s.duration));
      var targetF = Math.min(35, Math.floor(prog * 36));
      try { ensureDefeatSprites(); } catch (e) {}
      var imgs = __defeatSpriteImgs;
      if (imgs && imgs[targetF] && imgs[targetF].complete && imgs[targetF].naturalWidth > 0) {
        s.frame = targetF;
        s._lastGoodFrame = targetF;
      } else if (s._lastGoodFrame != null) {
        s.frame = s._lastGoodFrame;
      } else {
        s.frame = targetF;
      }
      // Fall off screen — accelerate downward, never fade
      s.alpha = 1;
      s.vy = 30 + prog * prog * 140;
      s.y += s.vy * dt;
      s.x += (s.vx || -5) * dt;
      s.tilt = Math.sin(s.age * 0.5) * 0.04;
      s.fxTimer = (s.fxTimer || 0) + dt;
      while (s.fxTimer > 0.08) {
        s.fxTimer -= 0.08;
        spawnTrainHoleSmoke(s, false);
      }
    } else if (mode === "fire_sink") {
      s.vy = 55 + t * t * 280; // 25% faster sink
      s.y += s.vy * dt;
      s.x += Math.sin(s.age * 1.35) * 20 * dt;
      s.tilt = Math.sin(s.age * 1.05) * 0.16 - t * 0.12;
    } else if (mode === "rocket_blast") {
      s.vy = 40 + t * 280;
      s.vx = (s.vx || 0) + (Math.random() - 0.5) * 40 * dt;
      s.x += (s.vx || 0) * dt;
      s.y += s.vy * dt;
      s.tilt = (s.tilt || 0) + dt * 2.2;
    } else if (mode === "tank_crumble") {
      s.vy = 60 + t * 240;
      s.y += s.vy * dt;
      s.x += Math.sin(s.age * 2.2) * 8 * dt;
      s.tilt = Math.sin(s.age * 3) * 0.05 * (1 - t);
      s.squash = 1 + t * 0.25;
    } else if (mode === "heli_spin") {
      s.spin = (s.spin || 0) + dt * (10 + t * 16);
      s.vx = (s.vx || 80) + 30 * dt;
      s.vy = 70 + t * 260;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.tilt = s.spin;
    } else if (mode === "ink_dissolve") {
      s.vy = 55 + t * 140;
      s.y += s.vy * dt;
      s.x += Math.sin(s.age * 2) * 22 * dt;
      s.alpha = Math.max(0, 1 - t * 1.25);
      s.tilt = Math.sin(s.age * 1.5) * 0.2;
    }

    if (mode !== "train_sprite") {
      s.fxTimer += dt;
      const fxRate = mode === "heli_spin" ? 0.035 : 0.045;
      while (s.fxTimer > fxRate) {
        s.fxTimer -= fxRate;
        if (mode === "fire_sink") spawnBossBalloonFireSmoke(s, false);
        else spawnBossDeathFx(s, false);
      }
    }

    s.fx.forEach(function(p) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "smoke" || p.kind === "ink") {
        p.r += (p.r > 20 ? 32 : 20) * dt; // big hole puffs expand faster
        p.vy -= (p.kind === "ink" ? -10 : 12) * dt;
        p.vx *= 0.97;
      } else if (p.kind === "ember" || p.kind === "dust") {
        p.vy += 50 * dt;
        p.vx *= 0.98;
      } else if (p.kind === "spark") {
        p.vy += 30 * dt;
        p.r = Math.max(0.5, p.r - 3 * dt);
      } else {
        p.r += 8 * dt;
        p.vy -= 25 * dt;
      }
    });
    s.fx = s.fx.filter(function(p) { return p.age < p.life; });

    var trainOff = (s.mode === "train_sprite") && (s.y > H + (s._dh || s.h || 80) * 0.5);
    var done = trainOff || s.y > H + s.h * 0.4 || (s.mode !== "train_sprite" && s.age >= s.duration) || (s.alpha != null && s.alpha <= 0.02);
    // Train: allow full fall even past duration clock
    if (s.mode === "train_sprite" && !trainOff && s.age < s.duration * 1.8) done = false;
    if (done) {
      var wasTrain = s.mode === "train_sprite";
      bossSinking = null;
      defeatSlowMo = false;
      if (s.pendingCfg) {
        finishBossRewards(s.pendingCfg);
        s.pendingCfg = null;
      }
      if (wasTrain) {
        try { window.__airborneTrainingBossDone = true; } catch (e) {}
      }
    }
  }

  function drawBossSinking() {
    if (!bossSinking) return;
    const s = bossSinking;
    const img = s.img;
    const mode = s.mode || "fire_sink";
    const progress = Math.min(1, s.age / s.duration);

    ctx.save();
    let veil = Math.min(0.32, s.age * 0.1);
    if (mode === "train_sprite") {
      veil = Math.min(0.1, s.age * 0.04);
      ctx.fillStyle = "rgba(18,12,10," + veil + ")";
    } else if (mode === "ink_dissolve") {
      ctx.fillStyle = "rgba(12,8,28," + Math.min(0.4, s.age * 0.14) + ")";
    } else if (mode === "rocket_blast") {
      ctx.fillStyle = "rgba(40,12,4," + veil + ")";
    } else if (mode === "heli_spin") {
      ctx.fillStyle = "rgba(20,24,30," + veil + ")";
    } else {
      ctx.fillStyle = "rgba(20,8,4," + veil + ")";
    }
    ctx.fillRect(0, 0, W, H);

    ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
    ctx.rotate(s.tilt || 0);
    const sq = s.squash || 1;
    ctx.scale(1 / Math.sqrt(sq), sq);
    let alpha = s.alpha != null ? s.alpha : Math.max(0.2, 1 - progress * 0.4);
    ctx.globalAlpha = alpha;
    if (s.mode === "train_sprite") {
      try { ensureDefeatSprites(); } catch (e) {}
      var fi = Math.min(35, Math.max(0, s.frame | 0));
      var simg = __defeatSpriteImgs && __defeatSpriteImgs[fi];
      // Exact same size as live boss (no shrink)
      if (!s._fitW) {
        s._fitW = Math.max(s.w || 100, 60);
        s._fitH = Math.max(s.h || (s._fitW * 864 / 480), s._fitW * 864 / 480);
      }
      if (simg && simg.complete && simg.naturalWidth > 0) {
        ctx.globalAlpha = 1;
        // Full sheet rect every frame (fixed size source) → no squeeze between frames
        ctx.drawImage(simg, 0, 0, simg.naturalWidth, simg.naturalHeight,
          -s._fitW / 2, -s._fitH / 2, s._fitW, s._fitH);
      } else if (img && img.naturalWidth) {
        ctx.drawImage(img, -s._fitW / 2, -s._fitH / 2, s._fitW, s._fitH);
      }
    } else if (img && img.naturalWidth) {
      ctx.drawImage(img, -s.w / 2, -s.h / 2, s.w, s.h);
    }
    ctx.restore();

    s.fx.forEach(function(p) {
      const pt = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt * (p.kind === "smoke" || p.kind === "ink" ? (p.r > 18 ? 0.72 : 0.55) : 0.92));
      if (p.kind === "fire") {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, "rgba(255,245,200," + (0.95 * pt) + ")");
        g.addColorStop(0.35, "rgba(255,140,30," + (0.85 * pt) + ")");
        g.addColorStop(0.7, "rgba(220,40,10," + (0.45 * pt) + ")");
        g.addColorStop(1, "rgba(40,10,0,0)");
        ctx.fillStyle = g;
      } else if (p.kind === "ember" || p.kind === "spark") {
        ctx.fillStyle = "rgba(255," + Math.floor(140 + 90 * pt) + ",40," + (0.95 * pt) + ")";
      } else if (p.kind === "dust") {
        ctx.fillStyle = "rgba(140,120,90," + (0.5 * pt) + ")";
      } else if (p.kind === "ink") {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, "rgba(60,20,90," + (0.7 * pt) + ")");
        g.addColorStop(1, "rgba(20,5,40,0)");
        ctx.fillStyle = g;
      } else {
        const g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g2.addColorStop(0, "rgba(55,48,40," + (0.55 * pt) + ")");
        g2.addColorStop(1, "rgba(25,22,20,0)");
        ctx.fillStyle = g2;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.r), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function defeatBoss() {
    const cfg = bossConfig(bossNumber);
    const kind = boss ? boss.kind : null;
    const img = boss ? (
      (kind === "bomber" && bossThrowFrame > 0)
        ? images[`boss_throw_${String(bossThrowFrame).padStart(2, "0")}`]
        : images[bossImgKey(boss.variant)]
    ) : null;

    // Map each boss to a unique dramatic death
    let mode = "rocket_blast";
    if (kind === "bomber" || bossNumber === 1) mode = "fire_sink";
    else if (kind === "rocket") mode = "rocket_blast";
    else if (kind === "tank") mode = "tank_crumble";
    else if (kind === "heli") mode = "heli_spin";
    else if (kind === "octopus") mode = "ink_dissolve";

    if (boss) {
      var isTrain = !!(window.__airborneTrainingBoss || window.__airborneAirfield || window.__airborneRuffActive);
      if (isTrain) {
        try { ensureDefeatSprites(); } catch (e) {}
        mode = "train_sprite";
      }
      var bx = boss.x, by = boss.y, bw = boss.w, bh = boss.h;
      // Keep original boss size — do not expand
      bossSinking = {
        mode: mode,
        x: bx,
        y: by,
        w: bw,
        h: bh,
        _dw: bw,
        _dh: bh,
        _fitW: bw,
        _fitH: Math.max(bh, bw * (864 / 480)),
        img: img,
        age: 0,
        duration: isTrain ? 2.25 : ((mode === "heli_spin" ? 2.2 : (mode === "ink_dissolve" ? 2.5 : 2.6)) * 0.75),
        vy: isTrain ? 28 : 40,
        vx: mode === "heli_spin" ? 70 : (isTrain ? -5 : 0),
        tilt: 0,
        spin: 0,
        squash: 1,
        alpha: 1,
        frame: 0,
        frameT: 0,
        fx: [],
        fxTimer: 0,
        pendingCfg: cfg
      };
      if (isTrain) {
        try { ensureDefeatSprites(); } catch (e) {}
      }
      for (let i = 0; i < 3; i++) {
        if (mode === "train_sprite") spawnTrainHoleSmoke(bossSinking, true);
        else if (mode === "fire_sink") spawnBossBalloonFireSmoke(bossSinking, true);
        else spawnBossDeathFx(bossSinking, true);
      }
      defeatSlowMo = true;
      defeatSlowMoUntil = performance.now() + bossSinking.duration * 1000;
      triggerScreenShake(mode === "tank_crumble" ? 7 : 4, 550);
      triggerScreenFlash(mode === "ink_dissolve" ? 0.18 : 0.1, 200);
      if (typeof sfxExplosion === "function") sfxExplosion(mode === "rocket_blast" ? 0.9 : 0.4);
    }

    bossActive = false;
    boss = null;
    bossNumber = 0;
    bossThrowFrame = 0;
    if (typeof obstacles !== "undefined") obstacles = [];
    bombs = [];
    rockets = [];
    // Rewards fire when the death sequence finishes
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
      } else if (powerup.kind === "arcbomb") {
        hasArcBomb = true;
      } else {
        hasFirepower = true;
      }
      // No weapon banner — pickup SFX is enough feedback
    }
  }

  function drawPowerup() {
    if (typeof levelEndPhase === "string" && levelEndPhase === "fadeOut") return;
    if (!powerup || powerup.collected) return;
    const tnow = performance.now() * 0.001;
    const drawY = powerup.y + Math.sin(powerup.bobPhase) * 8;
    const pulse = 1 + Math.sin(tnow * 5.5) * 0.1;
    const r = powerup.r * pulse * 1.15;
    const isBlue = powerup.kind === "blue";
    const isArc = powerup.kind === "arcbomb";
    // Palette
    const c0 = isArc ? [100, 220, 120] : (isBlue ? [100, 190, 255] : [255, 210, 80]);
    const c1 = isArc ? [40, 120, 60] : (isBlue ? [30, 90, 180] : [180, 120, 20]);

    ctx.save();
    ctx.translate(powerup.x, drawY);

    // Soft outer aura
    ctx.globalCompositeOperation = "lighter";
    for (let i = 3; i >= 1; i--) {
      const ar = r * (1.6 + i * 0.45);
      const ag = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, ar);
      ag.addColorStop(0, "rgba(" + c0[0] + "," + c0[1] + "," + c0[2] + "," + (0.35 / i) + ")");
      ag.addColorStop(1, "rgba(" + c0[0] + "," + c0[1] + "," + c0[2] + ",0)");
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.arc(0, 0, ar, 0, Math.PI * 2);
      ctx.fill();
    }

    // Orbiting energy motes
    for (let i = 0; i < 5; i++) {
      const ang = tnow * 2.2 + (i / 5) * Math.PI * 2;
      const or = r * 1.55;
      const ox = Math.cos(ang) * or;
      const oy = Math.sin(ang) * or * 0.55;
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(tnow * 6 + i);
      ctx.fillStyle = "rgba(255,255,240,0.95)";
      ctx.beginPath();
      ctx.arc(ox, oy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crystal / gem body
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    // Faceted gem shape
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.1);
    ctx.lineTo(r * 0.75, -r * 0.25);
    ctx.lineTo(r * 0.55, r * 0.85);
    ctx.lineTo(-r * 0.55, r * 0.85);
    ctx.lineTo(-r * 0.75, -r * 0.25);
    ctx.closePath();
    const gem = ctx.createLinearGradient(-r, -r, r, r);
    gem.addColorStop(0, "rgb(255,255,245)");
    gem.addColorStop(0.35, "rgb(" + c0[0] + "," + c0[1] + "," + c0[2] + ")");
    gem.addColorStop(1, "rgb(" + c1[0] + "," + c1[1] + "," + c1[2] + ")");
    ctx.fillStyle = gem;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Highlight facet
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.95);
    ctx.lineTo(r * 0.35, -r * 0.15);
    ctx.lineTo(0, r * 0.2);
    ctx.lineTo(-r * 0.2, -r * 0.2);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fill();

    // Inner icon (bolt / bomb)
    ctx.fillStyle = "rgba(20,15,10,0.75)";
    if (isArc) {
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-r * 0.12, -r * 0.4);
      ctx.lineTo(r * 0.28, 0);
      ctx.lineTo(r * 0.02, 0.05 * r);
      ctx.lineTo(r * 0.18, r * 0.45);
      ctx.lineTo(-r * 0.28, r * 0.05);
      ctx.lineTo(-r * 0.02, -0.02 * r);
      ctx.closePath();
      ctx.fill();
    }

    // Ground shadow / float indicator
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, r * 1.35, r * 0.7, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- Wind streaks — trailing motion lines for flying entities ----------
  let windParticles = [];

  function maybeEmitWind(x, y, w, h, rate, dt, source) {
    if (Math.random() < rate * dt) {
      windParticles.push({
        x: x + (Math.random() - 0.5) * w * 0.4,
        y: y + (Math.random() - 0.5) * h * 0.6,
        vx: -140 - Math.random() * 110,
        len: 10 + Math.random() * 16,
        life: 0.24 + Math.random() * 0.18,
        age: 0,
        alpha: 0.28 + Math.random() * 0.28,
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
    // Darker animated streaks for propeller wash / player trail
    if (p.source === "player") {
      // White + dark dual wind streak
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 2.0;
      ctx.lineCap = "round";
      ctx.beginPath();
      const wobble = Math.sin((p.age + p.len) * 18) * 1.8;
      ctx.moveTo(p.x + p.len * 0.25, p.y + wobble * 0.3);
      ctx.quadraticCurveTo(p.x - p.len * 0.15, p.y + wobble, p.x - p.len * 0.85, p.y - wobble * 0.4);
      ctx.stroke();
      ctx.globalAlpha = p.alpha * t * 0.7;
      ctx.strokeStyle = "rgba(40, 36, 32, 0.75)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(p.x + p.len * 0.1, p.y + 1.2);
      ctx.lineTo(p.x - p.len * 0.6, p.y + 1.2);
      ctx.stroke();
      ctx.globalAlpha = p.alpha * t * 0.5;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(p.x + p.len * 0.15, p.y - 1.2);
      ctx.lineTo(p.x - p.len * 0.55, p.y - 1.2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x + p.len * 0.3, p.y);
      ctx.lineTo(p.x - p.len * 0.7, p.y);
      ctx.stroke();
    }
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
  const DUST_PARTICLE_COUNT = 64;
  let dustParticles = [];
  let dustInitialized = false;

  function makeDustParticle(spawnAnywhereX) {
    const depth = Math.random();
    const size = 0.35 + depth * 1.1; // ~50% smaller cores
    return {
      x: spawnAnywhereX ? Math.random() * W : W + size * 8 + Math.random() * 40,
      y: Math.random() * H,
      depth,
      size,
      baseAlpha: 0.04 + depth * 0.09, // darker / more subtle
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
      const r = p.size * 2.6; // tighter glow
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(90, 82, 70, ${alpha})`);
      grad.addColorStop(0.45, `rgba(60, 54, 46, ${alpha * 0.45})`);
      grad.addColorStop(1, "rgba(40,36,30,0)");
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
        life: 0.65 + Math.random() * 0.55,
        age: 0,
        size: 8 + Math.random() * 14,
        alpha: 0.28 + Math.random() * 0.25
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
    // Never during landing, bonus, or black fade
    if (typeof levelEndActive !== "undefined" && levelEndActive) return false;
    if (typeof bonusActive !== "undefined" && bonusActive) return false;
    if (typeof levelEndPhase === "string" && levelEndPhase === "fadeOut") return false;
    if (bossActive) return !!(boss && boss.kind === "tank");
    // Only between boss 2 clear and boss 3 start (not earlier landings)
    const next = window.__airborneAirfieldBlockBoss ? null : nextBossConfig();
    return !!(next && next.num === 3 && typeof bossesDefeatedCount !== "undefined" && bossesDefeatedCount === 2);
  }

  // Storm cloud animation - 36 frames for floating decorative cloud during rain
  const STORM_CLOUD_FRAME_COUNT = 36;
  const STORM_CLOUD_FPS = 12;
  const STORM_CLOUD_KEYS = Array.from({ length: STORM_CLOUD_FRAME_COUNT }, (_, i) => `storm_cloud_${String(i + 1).padStart(2, "0")}`);

  function updateRain(dt) {
    const raining = isRainLevel();
    if (!raining && stormCloudsDecorative.length) {
      // Sweep leftover level-3 clouds off during landing / other levels
      stormCloudsDecorative.forEach(c => { c.x -= 220 * dt; c.alpha = Math.max(0, (c.alpha || 0.28) - dt * 0.6); });
      stormCloudsDecorative = stormCloudsDecorative.filter(c => c.x + c.w > -80 && (c.alpha == null || c.alpha > 0.02));
      rainDrops = [];
    }
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
          maybeEmitCloudWisp(player.x, player.y, dt, 36);
        }
        obstacles.forEach(o => {
          if (overlapsCloud(c, o.x, o.y, o.w, o.h)) {
            maybeEmitCloudWisp(o.x + o.w / 2, o.y + o.h / 2, dt, 16);
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
    if (typeof levelEndPhase === "string" && levelEndPhase === "fadeOut") return;
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
  let bossDamageNums = [];
  function spawnBossDamageNum(amount, x, y) {
    bossDamageNums.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y - 10,
      vy: -55 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 40,
      life: 0.9,
      age: 0,
      amount: amount || 1,
      scale: 1 + Math.random() * 0.25
    });
  }
  function updateBossDamageNums(dt) {
    for (var i = bossDamageNums.length - 1; i >= 0; i--) {
      var n = bossDamageNums[i];
      n.age += dt;
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.vy += 90 * dt;
      if (n.age >= n.life) bossDamageNums.splice(i, 1);
    }
  }
  function drawBossDamageNums() {
    if (!bossDamageNums.length || typeof ctx === "undefined") return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (var i = 0; i < bossDamageNums.length; i++) {
      var n = bossDamageNums[i];
      var u = n.age / n.life;
      var a = u < 0.15 ? (u / 0.15) : Math.max(0, 1 - (u - 0.15) / 0.85);
      var sc = n.scale * (1.15 - u * 0.35);
      ctx.globalAlpha = a;
      ctx.font = "900 " + Math.round(22 * sc) + "px Rockwell, Georgia, sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(40,10,0,0.85)";
      ctx.fillStyle = u < 0.3 ? "#fff5c8" : "#ff6b3d";
      var label = "-" + String(n.amount);
      ctx.strokeText(label, n.x, n.y);
      ctx.fillText(label, n.x, n.y);
      // sparkle
      ctx.globalAlpha = a * 0.6;
      ctx.fillStyle = "#ffe566";
      ctx.beginPath();
      ctx.arc(n.x + 12, n.y - 8, 2.2 * (1 - u), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  let bossShakeUntil = 0;
  let hitParticles = [];
  let explosionBursts = [];

  window.__airborneClearCombatFx = function () {
    try { hitParticles.length = 0; hitParticles = []; } catch (e) {}
    try { explosionBursts.length = 0; explosionBursts = []; } catch (e) {}
    try { playerBombTrailParticles.length = 0; playerBombTrailParticles = []; } catch (e) {}
    try { rocketTrailParticles.length = 0; rocketTrailParticles = []; } catch (e) {}
    try { windParticles.length = 0; windParticles = []; } catch (e) {}
    try { dustParticles.length = 0; dustParticles = []; } catch (e) {}
    try { shellTrailParticles.length = 0; shellTrailParticles = []; } catch (e) {}
  };

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
    // Dual impact flashes
    explosionBursts.push({ x: x, y: y, age: 0, delay: 0, life: 0.22, maxR: 34 + Math.random() * 14 });
    explosionBursts.push({ x: x, y: y, age: 0, delay: 0.04, life: 0.32, maxR: 48 + Math.random() * 16 });

    // Hot radial sparks
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const speed = 140 + Math.random() * 260;
      hitParticles.push({
        type: "spark",
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.28 + Math.random() * 0.22,
        age: 0,
        r: 2.2 + Math.random() * 3.2,
        color: Math.random() > 0.4 ? "#ffe566" : "#ff9944"
      });
    }
    // Ember glows
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      hitParticles.push({
        type: "ember",
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.45 + Math.random() * 0.3,
        age: 0,
        r: 3 + Math.random() * 4
      });
    }
    // Smoke puffs
    for (let i = 0; i < 7; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const speed = 30 + Math.random() * 50;
      hitParticles.push({
        type: "smoke",
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        age: 0,
        r: 7 + Math.random() * 8,
        growth: 1.5 + Math.random() * 1.0
      });
    }
    // Debris chips
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 140;
      hitParticles.push({
        type: "dust",
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.25,
        age: 0,
        r: 1.5 + Math.random() * 2.5,
        color: Math.random() > 0.5 ? "#c4a574" : "#8a6a40"
      });
    }
  }

  function spawnFeathers(x, y) {
    // Small feathers that puff off birds on collision
    const colors = ["#f5f0e6", "#e8dcc8", "#d4c4a8", "#c4b89a", "#fff8ee", "#b8a888"];
    const count = 10 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 140;
      hitParticles.push({
        type: "feather",
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 30 - Math.random() * 40,
        life: 0.55 + Math.random() * 0.55,
        age: 0,
        r: 3 + Math.random() * 4, // length scale
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 10,
        color: colors[i % colors.length],
        flutter: 4 + Math.random() * 6
      });
    }
  }

  function updateHitParticles(dt) {
    try { if (window.PowerFX) window.PowerFX.update(dt); } catch (e) {}

    hitParticles.forEach(p => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === "dust") {
        p.vy += 30 * dt;
        p.vx *= (1 - 1.5 * dt);
        if (p.r) p.r *= (1 - 0.8 * dt);
      } else if (p.type === "smoke") {
        p.vy -= 20 * dt; // smoke drifts upward, slowing its own rise
        p.vx *= 0.96;
      } else if (p.type === "dust") {
        ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
        ctx.fillStyle = p.color || "#1a1512";
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.r || 2), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "feather") {
        // light flutter: side-to-side drift + slow fall + spin
        p.vx += Math.sin(p.age * p.flutter + p.rot) * 90 * dt;
        p.vx *= (1 - 1.5 * dt);
        p.vy += 70 * dt; // gentle gravity
        p.vy *= (1 - 0.4 * dt);
        p.rot += p.rotSpd * dt;
      } else if (p.type === "ember") {
        p.vy += 180 * dt;
        p.vx *= 0.98;
        p.r = Math.max(0.5, (p.r || 3) * (1 - 0.6 * dt));
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
    try { if (window.PowerFX) window.PowerFX.draw(ctx); } catch (e) {}

    // explosion flash bursts first (underneath the sparks/smoke)
    explosionBursts.forEach(b => {
      const t = b.age / b.life;
      const r = Math.max(0.5, (b.maxR || 20) * Math.max(0, t));
      if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(r)) return;
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
        const r = Math.max(0.5, p.r * (1 + (1 - t) * (p.growth || 1)));
        if (!isFinite(p.x) || !isFinite(p.y)) { ctx.restore(); return; }
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grad.addColorStop(0, "rgba(90,85,80,0.8)");
        grad.addColorStop(1, "rgba(90,85,80,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "dust") {
        ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
        ctx.fillStyle = p.color || "#1a1512";
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.r || 2), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "feather") {
        ctx.globalAlpha = Math.max(0, t) * 0.9;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const len = p.r * (0.85 + 0.15 * t);
        const wid = len * 0.35;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        // simple leaf/feather oval pointed at both ends
        ctx.moveTo(0, -len);
        ctx.quadraticCurveTo(wid, 0, 0, len);
        ctx.quadraticCurveTo(-wid, 0, 0, -len);
        ctx.fill();
        // soft shaft line
        ctx.strokeStyle = "rgba(80,70,55,0.35)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -len * 0.85);
        ctx.lineTo(0, len * 0.85);
        ctx.stroke();
      } else if (p.type === "ember") {
        ctx.globalAlpha = Math.max(0, t) * 0.95;
        const er = Math.max(0.5, p.r || 3);
        const eg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, er * 2.2);
        eg.addColorStop(0, "rgba(255,250,200,0.95)");
        eg.addColorStop(0.35, "rgba(255,140,40,0.85)");
        eg.addColorStop(1, "rgba(180,40,0,0)");
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, er * 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = Math.max(0, t);
        ctx.fillStyle = p.color || "#ffdd66";
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
          bossHitFlashUntil = performance.now() + 280;
          bossShakeUntil = performance.now() + 380;
          spawnHitParticles(b.x, b.y);
          try { triggerBigExplosion(b.x, b.y, 22, 22); } catch (e) {}
          try { if (typeof triggerShockwave === "function") triggerShockwave(b.x, b.y, 38, "255,180,60"); } catch (e) {}
          try { if (typeof spawnPirateBlast === "function") spawnPirateBlast(b.x, b.y, 0.28); } catch (e) {}
          try { if (typeof triggerScreenShake === "function") triggerScreenShake(3, 100); } catch (e) {}
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
      // Long glowing energy trail
      ctx.globalCompositeOperation = "lighter";
      for (let i = 1; i <= 6; i++) {
        ctx.globalAlpha = 0.12 * (7 - i) / 6;
        const tg = ctx.createRadialGradient(-i * 7, 0, 0, -i * 7, 0, 10);
        tg.addColorStop(0, "rgba(255,240,160,0.9)");
        tg.addColorStop(0.5, "rgba(255,160,40,0.5)");
        tg.addColorStop(1, "rgba(255,80,0,0)");
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.ellipse(-i * 7, 0, 11 - i * 0.8, 3.2 - i * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Brass shell body
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      const body = ctx.createLinearGradient(-12, -4, 10, 4);
      body.addColorStop(0, "#8a5a18");
      body.addColorStop(0.35, "#f0d070");
      body.addColorStop(0.7, "#ffe9a0");
      body.addColorStop(1, "#fff8d0");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Hot tip
      const tip = ctx.createRadialGradient(8, 0, 0, 8, 0, 5);
      tip.addColorStop(0, "#ffffff");
      tip.addColorStop(0.4, "#ffe080");
      tip.addColorStop(1, "rgba(255,140,40,0)");
      ctx.fillStyle = tip;
      ctx.beginPath();
      ctx.arc(9, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      // Outer glow
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.45;
      const og = ctx.createRadialGradient(2, 0, 0, 2, 0, 14);
      og.addColorStop(0, "rgba(255,220,100,0.5)");
      og.addColorStop(1, "rgba(255,120,20,0)");
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.arc(2, 0, 14, 0, Math.PI * 2);
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
    bonus:      { top: "150,100,35", bottom: "80,48,14",  text: "255,245,210", glow: "255,200,90",  accent: "confetti" },
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
    if (window.__airborneTrainingBoss || window.__airborneAirfield ||
        (window.__airborneRuffStage === "boss1")) {
      bossBanner = null;
      return;
    }
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


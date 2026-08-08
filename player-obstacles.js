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
    const scale = (sel === "blimp6") ? 0.68 : 1.0;
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
    if (state !== "playing") return;
    // Don't flap-react while docked on the pad
    if (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked) return;
    // Airfield runway: tap/hold powers acceleration instead of flapping
    if (window.__airborneAirfield &&
        (window.__airborneAirfieldPhase === "taxi" || window.__airborneAirfieldPhase === "accel")) {
      window.__airborneAirfieldHold = true;
      // Instant boost per tap so single taps feel responsive
      if (typeof window.__airborneAirfieldBoost === "function") {
        window.__airborneAirfieldBoost();
      } else {
        window.__airborneAirfieldBoostPending = true;
      }
      return;
    }
    if (window.__airborneAirfield && window.__airborneAirfieldPhase === "climb") {
      return; // scripted climb — no player flap
    }
    if (window.__airborneAirfieldPaused) {
      // Fully suspended — no flap during tip / land / score
      return;
    }
    player.vy = FLAP_VELOCITY;
    sfxFlap();
    // Visual pulse on every ship (squash kick, fin lag, exhaust)
    if (window.__airborneFlapPulse) window.__airborneFlapPulse();
  }

  function updatePlayer(dt) {
    // Calm rest on the landing pad — no animation cycle, no exhaust, no squash
    if (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked) {
      player.vy = 0;
      player.rotation = 0;
      player.y = levelEndPad.surfaceY - player.h * 0.42;
      player.x = levelEndPad.x + levelEndPad.w * (levelEndPad.deckCenterFrac || 0.42);
      // Freeze personality so frames/exhaust don't glitch
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
      // Do NOT advance frame animation while resting
      return;
    }

    // Airfield scripted position (written by updateAirfield each frame)
    if (window.__airborneAirfield && window.__airborneScriptedPose) {
      const pose = window.__airborneScriptedPose;
      if (typeof pose.x === "number") player.x = pose.x;
      if (typeof pose.y === "number") player.y = pose.y;
      if (typeof pose.rotation === "number") player.rotation = pose.rotation;
      player.vy = 0;
      return;
    }
    if (window.__airborneAirfieldPaused) {
      player.vy = 0;
      return;
    }
    player.vy += GRAVITY * dt;
    if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
    player.y += player.vy * dt;

    // rotation follows velocity, clamped
    const target = Math.max(-0.4, Math.min(0.55, player.vy / 600));
    player.rotation += (target - player.rotation) * 0.15;

    const groundY = groundLevelY();
    if (player.y + player.h / 2 > groundY) {
      player.y = groundY - player.h / 2;
      // Airfield takeoff / level-end pad: never punish ground contact
      if (window.__airborneAirfieldInvuln ||
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
    // Stronger motion blur when diving fast
    const blurVy = player.vy > 180 ? player.vy * 1.1 : player.vy;
    drawMotionBlur(img, player.x, player.y, player.w, player.h, player.rotation, -blurVy * 0.35, blurVy);

    // Exhaust + streaks behind the body
    if (typeof drawBlimpPersonality === "function") drawBlimpPersonality();
    if (typeof drawBlimpPropBlur === "function") drawBlimpPropBlur();

    ctx.save();
    const docked = (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked);
    const kickY = (!docked && blimpPersonality && blimpPersonality.flapKickY) ? blimpPersonality.flapKickY : 0;
    const fin = (!docked && blimpPersonality) ? (blimpPersonality.finLag || 0) * 0.28 : 0;
    ctx.translate(player.x, player.y + kickY);
    ctx.rotate(player.rotation + fin);
    if (!docked && performance.now() < invulnerableUntil) {
      ctx.globalAlpha = (Math.floor(performance.now() / 90) % 2 === 0) ? 1 : 0.35;
    }
    if (docked) {
      ctx.scale(1, 1);
    } else {
      ctx.scale(blimpPersonality.squashX, blimpPersonality.squashY);
    }
    ctx.drawImage(img, -player.w / 2, -player.h / 2, player.w, player.h);
    ctx.restore();
    } catch (e) { console.warn("drawPlayer", e); }
  }

  // ---------- Obstacles ----------
  let obstacles = [];
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
    comboPopups.push({ x, y, text, color, born: performance.now(), life: 900 });
  }

  function updateComboPopups() {
    const now = performance.now();
    comboPopups = comboPopups.filter(p => now - p.born < p.life);
  }

  function drawComboPopups() {
    const now = performance.now();
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold " + Math.max(14, Math.min(20, W * 0.05)) + "px Georgia, serif";
    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    comboPopups.forEach(p => {
      const t = (now - p.born) / p.life;
      const y = p.y - t * 36;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, y);
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

  function spawnGoldRing() {
    const r = Math.min(48, W * 0.11);
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

    // Buildings can rise up to maxH (see makeBuilding: H*0.5) above the ground,
    // so keep flying obstacles' full extent (including bob) above that line —
    // clearly in open sky, never dipping down into rooftop territory.
    const groundY = groundLevelY();
    const tallestRoofY = groundY - H * 0.5;
    const topMargin = H * 0.035; // use almost the full top of the screen
    const bobBuffer = 20; // max bob amplitude, so bobbing never dips into rooftops
    const minY = topMargin;
    const maxY = Math.max(minY + 40, tallestRoofY - dispH - bobBuffer);
    const y = minY + Math.random() * (maxY - minY);

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

  function updateObstacles(dt) {
    if (!bossActive && !bonusActive && !bonusPending && !(typeof isLevelEndActive === "function" && isLevelEndActive())) {
      spawnTimer += dt;
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnObstacle();
      }
    }

    const frameDuration = 1 / OBSTACLE_ANIM_FPS;
    obstacles.forEach(o => {
      o.x -= obstacleSpeed * (o.speedMult || 1) * dt;
      if (o.isRing || o.type === "gold_ring") {
        o.spin = (o.spin || 0) + dt * 2.2;
        o.bobPhase = (o.bobPhase || 0) + dt * 1.6;
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
            o.scored = true;
            score += 5;
            if (document.getElementById("scoreVal")) document.getElementById("scoreVal").textContent = score;
            if (typeof bumpScorePop === "function") bumpScorePop();
            if (typeof sfxPowerup === "function") sfxPowerup();
            if (typeof spawnComboPopup === "function") spawnComboPopup(cx, cy, "+5 RING!", "#ffd700");
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
      maybeEmitWind(o.x + o.w * 0.55, o.y + o.h / 2, o.w * 0.3, o.h, 7, dt, "obstacle");
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
      if (o.deflectVy) {
        o.y += o.deflectVy * dt;
        o.deflectVy *= Math.max(0, 1 - 3.5 * dt);
        if (Math.abs(o.deflectVy) < 4) o.deflectVy = 0;
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

    obstacles = obstacles.filter(o => o.x + o.w > -20);

    // scoring + collision
    obstacles.forEach(o => {
      const drawY = o.y + Math.sin(o.bobPhase) * o.bobAmount;

      const dx = Math.abs(player.x - (o.x + o.w / 2));
      const dy = Math.abs(player.y - (drawY + o.h / 2));
      const collideX = (player.w / 2) * 0.75 + (o.w / 2) * 0.75;
      const collideY = (player.h / 2) * 0.75 + (o.h / 2) * 0.75;

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
        score++;
        gameplayScore++; // only counts normal dodge-scoring — bonus round points don't affect boss pacing
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

        // dodge streak + graze bonus
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
          spawnComboPopup(player.x, player.y - player.h * 0.9, dodgeStreak + "x STREAK! +" + STREAK_BONUS, "#800000");
          sfxStreak();
        }
      }

      if (dx < collideX && dy < collideY) {
        const isBird = (o.type === "bird_a" || o.type === "bird_b");
        if ((isBird || shieldActive) && !o.hitDeflected) {
          o.hitDeflected = true;
          o.deflectVy = (Math.random() < 0.5 ? -1 : 1) * (150 + Math.random() * 90);
          spawnHitParticles(o.x + o.w / 2, drawY + o.h / 2);
          o.hitFlash = 1;
          if (isBird && typeof spawnFeathers === "function") {
            spawnFeathers(o.x + o.w / 2, drawY + o.h / 2);
          }
        }
        if (o.isRing || o.type === "gold_ring") {
          // never damage from rings
        } else {
          takeHit();
        }
      }
    });
  }

  function drawObstacles() {
    obstacles.forEach(o => {
      if (o.isRing || o.type === "gold_ring") {
        if (o.collected) return;
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2 + Math.sin(o.bobPhase || 0) * (o.bobAmount || 8);
        const r = o.r || o.w / 2;
        ctx.save();
        ctx.translate(cx, cy);
        // Sideways hoop (vertical ellipse via scale+arc) — Safari safe
        const rx = r * 0.28;
        const ry = r * 1.05;
        function strokeOval(rx_, ry_, lw, color, a) {
          ctx.save();
          ctx.globalAlpha = a != null ? a : 1;
          ctx.strokeStyle = color;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.scale(rx_ / ry_, 1);
          ctx.arc(0, 0, ry_, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        strokeOval(rx, ry, Math.max(5, r * 0.16), "#e8c84a", 1);
        strokeOval(rx * 0.72, ry * 0.88, Math.max(2.5, r * 0.07), "rgba(255, 245, 180, 0.9)", 1);
        strokeOval(rx * 1.15, ry * 1.08, Math.max(7, r * 0.22), "#ffd700", 0.3);
        // Sparkle at top/bottom
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin((o.spin || 0) * 3);
        ctx.fillStyle = "#fff6c0";
        ctx.beginPath();
        ctx.arc(0, -ry * 0.92, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, ry * 0.92, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      const frames = OBSTACLE_ANIM_SETS[o.type];
      const img = images[frames[o.animFrame]];
      if (!img || !img.naturalWidth) return;
      const drawY = o.y + Math.sin(o.bobPhase) * o.bobAmount;
      const speed = obstacleSpeed * (o.speedMult || 1);
      drawMotionBlur(img, o.x + o.w / 2, drawY + o.h / 2, o.w, o.h, 0, speed, 0);
      ctx.drawImage(img, o.x, drawY, o.w, o.h);
      // Brief white flash on impact
      if (o.hitFlash && o.hitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.85, o.hitFlash);
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(img, o.x, drawY, o.w, o.h);
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

  function spawnHealPickup() {
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
        updateHealthDisplay();
        healthMeter.classList.remove("hit");
        void healthMeter.offsetWidth;
        healthMeter.classList.add("hit");
      } else if (health < MAX_HEALTH + MAX_BONUS_HEARTS) {
        health++;
        updateHealthDisplay();
        healthMeter.classList.remove("hit");
        void healthMeter.offsetWidth;
        healthMeter.classList.add("hit");
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
    const img = images.shieldPickup;
    const aspect = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
    const dispW = Math.min(48, W * 0.11);
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

    if (bossActive || bonusActive) return; // shield only spawns during normal flight

    if (!shieldPickup) {
      shieldSpawnTimer -= dt;
      if (shieldSpawnTimer <= 0) {
        spawnShieldPickup();
        shieldSpawnTimer = 55 + Math.random() * 35; // next chance well after this one
      }
      return;
    }

    shieldPickup.x -= shieldPickup.speed * dt;
    shieldPickup.bobPhase += dt * 2.4;

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
      shieldPickup = null;
      sfxPowerup();
    }
  }

  function drawShieldPickup() {
    if (typeof levelEndPhase === "string" && levelEndPhase === "fadeOut") return;
    if (!shieldPickup) return;
    const img = images.shieldPickup;
    if (!img || !img.naturalWidth) return;
    const drawY = shieldPickup.y + Math.sin(shieldPickup.bobPhase) * 8;
    ctx.save();
    ctx.translate(shieldPickup.x + shieldPickup.w / 2, drawY + shieldPickup.h / 2);
    const pulse = 1 + Math.sin(performance.now() / 150) * 0.07;
    ctx.scale(pulse, pulse);
    drawMotionBlur(img, 0, 0, shieldPickup.w, shieldPickup.h, 0, 160, 0);
    ctx.drawImage(img, -shieldPickup.w / 2, -shieldPickup.h / 2, shieldPickup.w, shieldPickup.h);
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


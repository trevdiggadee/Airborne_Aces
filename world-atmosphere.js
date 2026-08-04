"use strict";

  // ---------- Parallax Background Layers (4 depth levels) ----------
  let parallaxLayers = [];

  // ---------- Level far-background crossfade ----------
  // Each level uses its own far-background image; when the score crosses a
  // boss threshold (i.e. the level changes) the two backgrounds blend into
  // each other over a couple of seconds instead of popping.
  function currentLevelBgKey() {
    // Hold level-1 far background through boss-1 bonus + landing sequence
    if (bossesDefeatedCount < 1) return 'skylineFar';
    if (bossesDefeatedCount === 1) {
      const stillInL1Outro =
        (typeof bonusActive !== "undefined" && bonusActive) ||
        (typeof bonusPending !== "undefined" && bonusPending) ||
        (typeof levelEndActive !== "undefined" && levelEndActive) ||
        (typeof worldWindDown !== "undefined" && worldWindDown);
      if (stillInL1Outro) return 'skylineFar';
      return 'skylineFarL2';
    }
    if (bossesDefeatedCount < 2) return 'skylineFarL2';
    return 'skylineFarL3'; // level 3 and beyond, until more art is added
  }
  let bgTransition = null; // { from, to, t } while crossfading between two level backgrounds

  function initParallaxLayers() {
    parallaxLayers = [
      { depth: 0.03, items: [], imgKey: currentLevelBgKey(), imgX: 0 },
      { depth: 0.08, items: [], color: 'rgba(100,80,55,0.35)', itemH: H * 0.242, density: 0.012 }, // +10%
      { depth: 0.18, items: [], color: 'rgba(70,55,35,0.45)', itemH: H * 0.154, density: 0.018 }, // +10%
      { depth: 0.28, items: [], color: 'rgba(50,40,25,0.55)', itemH: H * 0.088, density: 0.025 } // +10% height; depth lowered from 0.35 so it still scrolls slower than the sketch skyline drawn in front of it (see below)
    ];
    bgTransition = null;
    // Layer 0: skylineFar image - tile across screen, 25% taller than full
    // screen height, anchored to the ground so the extra height extends
    // upward past the top edge (naturally cropped by the canvas)
    var layer0 = parallaxLayers[0];
    var img = images[layer0.imgKey];
    if (img && img.naturalWidth) {
      var aspectHW = img.naturalHeight / img.naturalWidth;
      // Size each tile off screen WIDTH rather than height — some of these
      // background images are tall portrait photos rather than wide seamless
      // banners, and sizing off height alone made those into narrow strips
      // that had to repeat very often, showing an obvious seam/ghosting every
      // repeat. Sizing off width keeps at most ~2 tiles on screen at once.
      var tileW = Math.max(W * 0.85, H * 1.25 / aspectHW);
      var dispH = tileW * aspectHW;
      var x = 0;
      while (x < W + tileW * 2) {
        layer0.items.push({ x: x, w: tileW, h: dispH });
        x += tileW - 1; // slight overlap to prevent gaps
      }
    }
    // Layers 1-3: procedural shapes
    for (var li = 1; li < parallaxLayers.length; li++) {
      var layer = parallaxLayers[li];
      var x = 0;
      while (x < W + 400) {
        var w = 40 + Math.random() * 80;
        layer.items.push({
          x: x,
          w: w,
          h: layer.itemH * (0.6 + Math.random() * 0.8),
          shape: Math.floor(Math.random() * 3)
        });
        x += w + (10 + Math.random() * 60) / layer.density;
      }
    }
  }

  function updateParallaxLayers(dtScale) {
    // During the level-end landing sequence, freeze all parallax layers in place
    // so the pad approaching reads as the blimp flying forward.
    if (typeof levelEndActive !== "undefined" && levelEndActive) {
      return;
    }
    var speed = obstacleSpeedScale();

    // detect a level change and (re)start the crossfade toward the new background
    var layer0 = parallaxLayers[0];
    var targetKey = currentLevelBgKey();
    if (layer0.imgKey !== targetKey && (!bgTransition || bgTransition.to !== targetKey)) {
      // Don't announce LEVEL 2 while the boss-1 landing sequence is still running —
      // that banner is shown after the player successfully lands.
      const suppressBanner = (typeof isLevelEndActive === "function" && isLevelEndActive())
        || (typeof levelEndActive !== "undefined" && levelEndActive)
        || (typeof bonusActive !== "undefined" && bonusActive)
        || (typeof bonusPending !== "undefined" && bonusPending);
      bgTransition = { from: layer0.imgKey, to: targetKey, t: 0 };
      if (!suppressBanner) {
        const levelNum = targetKey === 'skylineFar' ? 1 : targetKey === 'skylineFarL2' ? 2 : 3;
        showBanner("LEVEL " + levelNum, 2000, "level");
      }
    }
    if (bgTransition) {
      bgTransition.t += dtScale / 210; // ~3.5s eased crossfade at a 60fps baseline
      if (bgTransition.t >= 1) {
        layer0.imgKey = bgTransition.to;
        bgTransition = null;
      }
    }

    parallaxLayers.forEach(function(layer, li) {
      if (li === 0 && layer.imgKey) {
        // Image layer: scroll all tiles, wrap around
        var img = images[layer.imgKey];
        if (!img || !img.naturalWidth) return;
        var aspect = img.naturalHeight / img.naturalWidth;
        var tileW = H / aspect;
        layer.items.forEach(function(item) {
          item.x -= layer.depth * dtScale * speed;
        });
        while (layer.items.length && layer.items[0].x + layer.items[0].w < -50) {
          layer.items.shift();
        }
        // Spawn new tiles on the right
        var last = layer.items[layer.items.length - 1];
        if (last && last.x + last.w < W + 100) {
          layer.items.push({ x: last.x + last.w - 1, w: tileW, h: H });
        }
        // Ensure we always have enough tiles
        if (layer.items.length < 3) {
          var rightmost = layer.items.length > 0 ? layer.items[layer.items.length - 1] : { x: 0, w: 0 };
          layer.items.push({ x: rightmost.x + rightmost.w - 1, w: tileW, h: H });
        }
      } else {
        // Procedural shape layers
        layer.items.forEach(function(item) {
          item.x -= layer.depth * dtScale * speed;
        });
        while (layer.items.length && layer.items[0].x + layer.items[0].w < -50) {
          layer.items.shift();
        }
        var last = layer.items[layer.items.length - 1];
        if (!last || last.x + last.w < W + 100) {
          var w = 40 + Math.random() * 80;
          var startX = last ? last.x + last.w + (10 + Math.random() * 60) / layer.density : 0;
          layer.items.push({
            x: startX,
            w: w,
            h: layer.itemH * (0.6 + Math.random() * 0.8),
            shape: Math.floor(Math.random() * 3)
          });
        }
      }
    });
  }

  function drawParallaxLayers() {
    var groundY = groundLevelY();
    parallaxLayers.forEach(function(layer, li) {
      if (li === 0 && layer.imgKey) {
        // Distant skyline image, crossfading between levels when the
        // background transitions. Anchored to the ground line — since the
        // display height is 25% taller than the screen, the extra height
        // extends up past the top edge and is naturally clipped by the canvas.
        ctx.save();
        if (bgTransition) {
          var fromImg = images[bgTransition.from];
          var toImg = images[bgTransition.to];
          var rawT = bgTransition.t;
          var t = rawT * rawT * (3 - 2 * rawT); // smoothstep ease — gentler start/end than a linear fade
          if (fromImg && fromImg.naturalWidth) {
            ctx.globalAlpha = 0.55 * (1 - t);
            layer.items.forEach(function(item) {
              ctx.drawImage(fromImg, item.x, groundY - item.h, item.w, item.h);
            });
          }
          if (toImg && toImg.naturalWidth) {
            ctx.globalAlpha = 0.55 * t;
            layer.items.forEach(function(item) {
              ctx.drawImage(toImg, item.x, groundY - item.h, item.w, item.h);
            });
          }
        } else {
          var img = images[layer.imgKey];
          if (img && img.naturalWidth) {
            ctx.globalAlpha = 0.55;
            layer.items.forEach(function(item) {
              ctx.drawImage(img, item.x, groundY - item.h, item.w, item.h);
            });
          }
        }
        ctx.restore();
      } else {
        // Procedural shape layers
        ctx.save();
        layer.items.forEach(function(item) {
          var top = groundY - item.h;
          ctx.fillStyle = layer.color;
          if (item.shape === 0) {
            ctx.beginPath();
            ctx.moveTo(item.x, groundY);
            ctx.quadraticCurveTo(item.x + item.w * 0.5, top - item.h * 0.3, item.x + item.w, groundY);
            ctx.closePath();
            ctx.fill();
          } else if (item.shape === 1) {
            ctx.beginPath();
            ctx.moveTo(item.x, groundY);
            ctx.lineTo(item.x + item.w * 0.3, top);
            ctx.lineTo(item.x + item.w * 0.5, top + item.h * 0.3);
            ctx.lineTo(item.x + item.w * 0.7, top);
            ctx.lineTo(item.x + item.w, groundY);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(item.x, top + item.h * 0.2, item.w, item.h * 0.8);
          }
        });
        ctx.restore();
      }
    });
  }

  // ---------- Blimp Personality (squash/stretch, exhaust, propeller blur) ----------
  let blimpPersonality = {
    squashX: 1, squashY: 1,
    squashTargetX: 1, squashTargetY: 1,
    exhaustTimer: 0,
    exhaustParticles: [],
    propAngle: 0,
    propSpeed: 0,
    propBlurOpacity: 0
  };

  function updateBlimpPersonality(dt) {
    var sel = typeof selectedBlimp !== 'undefined' ? selectedBlimp : 'blimp1';
    var data = BLIMP_DATA[sel];

    var vNorm = player.vy / MAX_FALL_SPEED;
    blimpPersonality.squashTargetX = 1 + vNorm * 0.12;
    blimpPersonality.squashTargetY = 1 - vNorm * 0.15;

    blimpPersonality.squashTargetX = Math.max(0.82, Math.min(1.18, blimpPersonality.squashTargetX));
    blimpPersonality.squashTargetY = Math.max(0.78, Math.min(1.22, blimpPersonality.squashTargetY));

    var lerp = 8 * dt;
    blimpPersonality.squashX += (blimpPersonality.squashTargetX - blimpPersonality.squashX) * lerp;
    blimpPersonality.squashY += (blimpPersonality.squashTargetY - blimpPersonality.squashY) * lerp;

    if (data && data.effect === 'propeller') {
      blimpPersonality.propSpeed = 25 + Math.abs(player.vy) * 0.04;
      blimpPersonality.propAngle += blimpPersonality.propSpeed * dt;
      blimpPersonality.propBlurOpacity = Math.min(0.9, 0.5 + Math.abs(player.vy) * 0.001);
    } else {
      blimpPersonality.propBlurOpacity *= 0.95;
    }

    if (data && (data.effect === 'propeller' || data.effect === 'smoke')) {
      blimpPersonality.exhaustTimer += dt;
      var emitRate = 0.06 + Math.abs(player.vy) * 0.0001;
      while (blimpPersonality.exhaustTimer > emitRate) {
        blimpPersonality.exhaustTimer -= emitRate;
        var exhaustX = player.x - player.w * 0.38;
        var exhaustY = player.y + player.h * 0.15;
        blimpPersonality.exhaustParticles.push({
          x: exhaustX + (Math.random() - 0.5) * 6,
          y: exhaustY + (Math.random() - 0.5) * 4,
          vx: -(40 + Math.random() * 30 + Math.abs(player.vy) * 0.05),
          vy: (Math.random() - 0.5) * 15 - 10,
          size: 2 + Math.random() * 4,
          alpha: 0.35 + Math.random() * 0.25,
          life: 0.5 + Math.random() * 0.6,
          age: 0,
          color: data.effect === 'smoke' ? '200,190,180' : '180,170,160'
        });
      }
    }

    blimpPersonality.exhaustParticles.forEach(function(p) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += 3 * dt;
      p.vy -= 8 * dt;
    });
    blimpPersonality.exhaustParticles = blimpPersonality.exhaustParticles.filter(function(p) {
      return p.age < p.life;
    });
  }

  function drawBlimpPersonality() {
    blimpPersonality.exhaustParticles.forEach(function(p) {
      var t = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = p.alpha * t * t;
      var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, 'rgba(' + p.color + ',' + (p.alpha * t) + ')');
      grad.addColorStop(1, 'rgba(' + p.color + ',0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawBlimpPropBlur() {
    var sel = typeof selectedBlimp !== 'undefined' ? selectedBlimp : 'blimp1';
    var data = BLIMP_DATA[sel];
    if (!data || data.effect !== 'propeller') return;
    if (blimpPersonality.propBlurOpacity < 0.05) return;

    ctx.save();
    ctx.translate(player.x - player.w * 0.32, player.y + player.h * 0.05);
    ctx.rotate(blimpPersonality.propAngle);
    ctx.globalAlpha = blimpPersonality.propBlurOpacity;

    var r = player.w * 0.18;
    var grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    grad.addColorStop(0, 'rgba(40,30,20,0.3)');
    grad.addColorStop(0.6, 'rgba(40,30,20,0.15)');
    grad.addColorStop(1, 'rgba(40,30,20,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    for (var i = 0; i < 3; i++) {
      var angle = (i / 3) * Math.PI * 2 + blimpPersonality.propAngle * 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(60,50,40,0.25)';
      ctx.fillRect(-r * 0.08, -r, r * 0.16, r * 2);
      ctx.restore();
    }
    ctx.restore();
  }

  // =====================================================================



  // =====================================================================
  // LIGHTING THAT TELLS TIME
  // =====================================================================

  // ---------- Sun / Moon position tracking ----------
  function getTimeOfDay(gpScore) {
    const cycle = ((gpScore % 240) + 240) % 240;
    let timeName = 'day';
    let sunAngle = 0; // 0 = sunrise, 0.5 = noon, 1 = sunset
    let sunY = 0;
    let sunX = 0;
    let isNight = false;

    if (cycle < 70) {
      timeName = 'day';
      sunAngle = cycle / 70; // 0 to 1
      sunX = W * 0.1 + (cycle / 70) * W * 0.8;
      sunY = H * 0.15 + Math.sin(sunAngle * Math.PI) * H * 0.25;
      isNight = false;
    } else if (cycle < 120) {
      timeName = 'dusk';
      const t = (cycle - 70) / 50;
      sunX = W * 0.9 - t * W * 0.3;
      sunY = H * 0.4 + t * H * 0.35;
      isNight = false;
    } else if (cycle < 190) {
      timeName = 'night';
      const t = (cycle - 120) / 70;
      sunX = W * 0.6 + Math.cos(t * Math.PI) * W * 0.3;
      sunY = H * 0.08 + Math.sin(t * Math.PI) * H * 0.06;
      isNight = true;
    } else {
      timeName = 'dawn';
      const t = (cycle - 190) / 50;
      sunX = W * 0.1 + t * W * 0.3;
      sunY = H * 0.75 - t * H * 0.35;
      isNight = false;
    }

    return { cycle, timeName, sunX, sunY, isNight, sunAngle };
  }

  function drawSunMoon(gpScore) {
    const tod = getTimeOfDay(gpScore);
    if (tod.isNight) {
      // Draw moon
      ctx.save();
      ctx.globalAlpha = 0.85;
      // Moon glow
      const moonGlow = ctx.createRadialGradient(tod.sunX, tod.sunY, 8, tod.sunX, tod.sunY, 45);
      moonGlow.addColorStop(0, 'rgba(240,240,255,0.4)');
      moonGlow.addColorStop(0.5, 'rgba(200,200,230,0.15)');
      moonGlow.addColorStop(1, 'rgba(200,200,230,0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(tod.sunX, tod.sunY, 45, 0, Math.PI * 2);
      ctx.fill();
      // Moon body
      ctx.fillStyle = '#e8e8f0';
      ctx.beginPath();
      ctx.arc(tod.sunX, tod.sunY, 14, 0, Math.PI * 2);
      ctx.fill();
      // Moon crater shadow
      ctx.fillStyle = 'rgba(180,180,200,0.3)';
      ctx.beginPath();
      ctx.arc(tod.sunX - 3, tod.sunY + 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Draw sun
      ctx.save();
      // Sun glow
      const sunGlow = ctx.createRadialGradient(tod.sunX, tod.sunY, 10, tod.sunX, tod.sunY, 70);
      sunGlow.addColorStop(0, 'rgba(255,240,180,0.5)');
      sunGlow.addColorStop(0.4, 'rgba(255,200,80,0.2)');
      sunGlow.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(tod.sunX, tod.sunY, 70, 0, Math.PI * 2);
      ctx.fill();
      // Sun body
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(tod.sunX, tod.sunY, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return tod;
  }

  // ---------- Building window lights at night ----------
  
  // ---------- Blimp headlight cone beam — only comes on during the level 3 rain ----------
  function drawBlimpHeadlight() {
    if (!isRainLevel()) return;

    const beamLength = W * 0.35;
    const beamWidth = player.h * 0.8;
    const sourceX = player.x + player.w * 0.2;
    const sourceY = player.y - player.h * 0.05;
    const aimAngle = player.rotation * 0.5;
    // Start the visible beam right at the blimp's nose/face so none of the
    // cone paints over the body, but it doesn't float out past the front either.
    const hiddenStart = player.w * 0.22;

    ctx.save();
    ctx.translate(sourceX, sourceY);
    ctx.rotate(aimAngle);

    // Cone gradient
    const beamGrad = ctx.createLinearGradient(hiddenStart, 0, beamLength, 0);
    const alpha = 0.26;
    beamGrad.addColorStop(0, 'rgba(255,250,220,' + alpha + ')');
    beamGrad.addColorStop(0.3, 'rgba(255,245,200,' + (alpha * 0.6) + ')');
    beamGrad.addColorStop(1, 'rgba(255,240,180,0)');

    const nearHalfWidth = 3 + (beamWidth / 2 - 3) * (hiddenStart / beamLength);
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(hiddenStart, -nearHalfWidth);
    ctx.lineTo(beamLength, -beamWidth / 2);
    ctx.lineTo(beamLength, beamWidth / 2);
    ctx.lineTo(hiddenStart, nearHalfWidth);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }


  // =====================================================================
  // BOSS PRESENCE
  // =====================================================================

  // ---------- Boss shadow cast on buildings ----------
  function drawBossShadow() {
    if (!boss || !bossActive) return;
    const groundY = groundLevelY();
    const shadowY = groundY - 2;
    const shadowW = boss.w * 0.7;
    const shadowH = boss.h * 0.15;
    const shadowX = boss.x + boss.w * 0.15;

    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(shadowX + shadowW / 2, shadowY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- Boss warning indicator before entry ----------
  let bossWarning = null; // { startTime, duration, num }
  const BOSS_WARNING_DURATION = 2500; // ms before boss appears

  function triggerBossWarning(num) {
    bossWarning = {
      startTime: performance.now(),
      duration: BOSS_WARNING_DURATION,
      num: num
    };
  }

  function updateBossWarning(dt) {
    if (!bossWarning) return;
    const elapsed = performance.now() - bossWarning.startTime;
    if (elapsed >= bossWarning.duration) {
      bossWarning = null;
      return;
    }
    // The warning stays active until the boss actually triggers
    if (bossActive) {
      bossWarning = null;
    }
  }

  function drawBossWarning() {
    if (!bossWarning) return;
    const elapsed = performance.now() - bossWarning.startTime;
    const progress = elapsed / bossWarning.duration;
    const urgency = 1 - progress;

    // Pulsing red border vignette
    const pulse = 0.3 + 0.7 * Math.abs(Math.sin(elapsed * 0.008));
    ctx.save();
    ctx.globalAlpha = pulse * urgency * 0.5;

    // Top warning bar
    const barH = Math.max(20, H * 0.035);
    const barGrad = ctx.createLinearGradient(0, 0, W, 0);
    barGrad.addColorStop(0, 'rgba(180,30,30,0)');
    barGrad.addColorStop(0.3, 'rgba(180,30,30,0.7)');
    barGrad.addColorStop(0.7, 'rgba(180,30,30,0.7)');
    barGrad.addColorStop(1, 'rgba(180,30,30,0)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, W, barH);

    // Warning text
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.max(14, Math.min(22, W * 0.05)) + 'px Georgia, serif';
    ctx.fillStyle = 'rgba(255,220,220,' + (pulse * urgency) + ')';
    ctx.shadowColor = 'rgba(180,30,30,0.8)';
    ctx.shadowBlur = 10;
    const bossNames = ['', 'BOMBER', 'ROCKET BLIMP', 'TANK', 'HELICOPTER', 'OCTOPUS'];
    ctx.fillText('⚠ WARNING: ' + bossNames[bossWarning.num] + ' INCOMING!', W / 2, barH * 0.7);
    ctx.shadowBlur = 0;

    // Side chevrons
    const chevronSize = 18 + pulse * 8;
    const chevronAlpha = pulse * urgency * 0.6;
    ctx.fillStyle = 'rgba(200,40,40,' + chevronAlpha + ')';
    for (let side = -1; side <= 1; side += 2) {
      const cx = side === -1 ? W * 0.08 : W * 0.92;
      ctx.beginPath();
      ctx.moveTo(cx + side * chevronSize, barH + 10);
      ctx.lineTo(cx, barH + 10 + chevronSize * 0.6);
      ctx.lineTo(cx + side * chevronSize, barH + 10 + chevronSize * 1.2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // ---------- Slow-motion defeat with flyable debris ----------
  let defeatDebris = [];
  let defeatSlowMo = false;
  let defeatSlowMoUntil = 0;
  const DEFEAT_SLOWMO_DURATION = 1200; // ms of slow-mo
  const DEFEAT_TIME_SCALE = 0.25; // quarter speed

  function spawnDefeatDebris(cx, cy, w, h) {
    const pieceCount = 22 + Math.floor(Math.random() * 12);
    for (let i = 0; i < pieceCount; i++) {
      const angle = (i / pieceCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const speed = 90 + Math.random() * 260;
      const size = 8 + Math.random() * 24;
      defeatDebris.push({
        x: cx + (Math.random() - 0.5) * w * 0.5,
        y: cy + (Math.random() - 0.5) * h * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 12,
        size: size,
        color: ['#8b1e1e', '#5e1212', '#c9a66b', '#3a2410', '#6b4a2b'][Math.floor(Math.random() * 5)],
        life: 1.6 + Math.random() * 1.6,
        age: 0,
        type: Math.random() < 0.3 ? 'shard' : 'chunk'
      });
    }
  }

  function updateDefeatDebris(dt) {
    if (defeatSlowMo && performance.now() < defeatSlowMoUntil) {
      dt *= DEFEAT_TIME_SCALE;
    } else {
      defeatSlowMo = false;
    }

    defeatDebris.forEach(function(d) {
      d.age += dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 180 * dt; // gravity
      d.vx *= 0.995; // air drag
      d.rot += d.rotSpeed * dt;
    });

    defeatDebris = defeatDebris.filter(function(d) {
      return d.age < d.life && d.y < H + 50;
    });
  }

  function drawDefeatDebris() {
    defeatDebris.forEach(function(d) {
      const t = 1 - d.age / d.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, t);
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = d.color;

      if (d.type === 'shard') {
        // Sharp triangular shard
        ctx.beginPath();
        ctx.moveTo(-d.size / 2, -d.size / 3);
        ctx.lineTo(d.size / 2, 0);
        ctx.lineTo(-d.size / 2, d.size / 3);
        ctx.closePath();
        ctx.fill();
        // Edge highlight
        ctx.strokeStyle = 'rgba(255,200,100,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Chunky irregular piece
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.4, -d.size * 0.3);
        ctx.lineTo(d.size * 0.3, -d.size * 0.4);
        ctx.lineTo(d.size * 0.4, d.size * 0.2);
        ctx.lineTo(-d.size * 0.2, d.size * 0.4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  }


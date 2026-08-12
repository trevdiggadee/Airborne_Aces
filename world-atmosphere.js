"use strict";

  // ---------- Parallax Background Layers (4 depth levels) ----------
  let parallaxLayers = [];
  let mountainScrollX = 0;
  let mountainReady = false;

  // ---------- Level far-background crossfade ----------
  // Each level uses its own far-background image; when the score crosses a
  // boss threshold (i.e. the level changes) the two backgrounds blend into
  // each other over a couple of seconds instead of popping.
  function currentLevelBgKey() {
    function hasImg(key) {
      const img = (typeof images !== "undefined") ? images[key] : null;
      return !!(img && img.naturalWidth);
    }
    let key = "skylineFar";
    if (typeof bossesDefeatedCount === "number") {
      if (bossesDefeatedCount >= 2) key = "skylineFarL3";
      else if (bossesDefeatedCount >= 1) {
        const stillInL1Outro =
          (typeof bonusActive !== "undefined" && bonusActive) ||
          (typeof bonusPending !== "undefined" && bonusPending) ||
          (typeof levelEndActive !== "undefined" && levelEndActive);
        key = stillInL1Outro ? "skylineFar" : "skylineFarL2";
      }
    }
    // Fall back if that level's art isn't in the repo / failed to load
    if (!hasImg(key)) {
      if (key === "skylineFarL3" && hasImg("skylineFarL2")) return "skylineFarL2";
      if (hasImg("skylineFar")) return "skylineFar";
    }
    return key;
  }
  let bgTransition = null; // { from, to, t } while crossfading between two level backgrounds

  function initParallaxLayers() {
    parallaxLayers = [
      { depth: 0.03, items: [], imgKey: currentLevelBgKey(), imgX: 0 },
      { depth: 0.08, items: [], color: 'rgba(100,80,55,0.35)', itemH: H * 0.242, density: 0.012 },
      { depth: 0.18, items: [], color: 'rgba(70,55,35,0.45)', itemH: H * 0.154, density: 0.018 },
      // Layer 3: mountain range image — bottom of peaks at screen bottom, lower graphic cropped
      { depth: 0.22, items: [], imgKey: "parallax_mountains", mountain: true }
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
    // Layers 1-2: procedural shapes; layer 3: mountain image tiles
    for (var li = 1; li < parallaxLayers.length; li++) {
      var layer = parallaxLayers[li];
      if (layer.mountain || layer.imgKey === "parallax_mountains") {
        var mImg = (typeof images !== "undefined") ? images.parallax_mountains : null;
        if (mImg && mImg.naturalWidth) {
          var mAspect = mImg.naturalHeight / mImg.naturalWidth;
          // Tile width ~ full screen; height from aspect
          var mTileW = W * 1.2;
          var mDispH = mTileW * mAspect * 1.25; // slightly taller so we crop bottom
          var mx = -20;
          while (mx < W + mTileW * 2) {
            layer.items.push({ x: mx, w: mTileW, h: mDispH });
            mx += mTileW - 2;
          }
        }
        continue;
      }
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
    // Keep parallax scrolling during approach; freeze only after the blimp lands
    if (typeof worldScrollFrozen === "function" && worldScrollFrozen()) {
      return;
    }
    if (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked) {
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
      if ((li === 0 && layer.imgKey) || layer.mountain) {
        // Image layer (far skyline or mountains): scroll tiles, wrap
        // Mountains scroll independently of airfield strip logic
        var img = images[layer.imgKey];
        if (!img || !img.naturalWidth) return;
        if (layer.mountain && !layer.items.length) {
          var ma = img.naturalHeight / img.naturalWidth;
          var tw0 = W * 1.2, th0 = tw0 * ma * 1.25, mx0 = -20;
          while (mx0 < W + tw0 * 2) {
            layer.items.push({ x: mx0, w: tw0, h: th0 });
            mx0 += tw0 - 2;
          }
        }
        var aspect = img.naturalHeight / img.naturalWidth;
        var tileW = layer.mountain
          ? (layer.items[0] ? layer.items[0].w : W * 1.2)
          : H / aspect;
        var tileH = layer.mountain
          ? (layer.items[0] && layer.items[0].h ? layer.items[0].h : tileW * aspect * 1.25)
          : H;
        var scrollSpd = layer.mountain ? Math.max(speed, 180) : speed;
        layer.items.forEach(function(item) {
          item.x -= layer.depth * dtScale * scrollSpd;
        });
        while (layer.items.length && layer.items[0].x + layer.items[0].w < -50) {
          layer.items.shift();
        }
        var last = layer.items[layer.items.length - 1];
        if (last && last.x + last.w < W + 100) {
          layer.items.push({ x: last.x + last.w - 1, w: tileW, h: tileH });
        }
        if (layer.items.length < 3) {
          var rightmost = layer.items.length > 0 ? layer.items[layer.items.length - 1] : { x: 0, w: 0 };
          layer.items.push({ x: rightmost.x + rightmost.w - 1, w: tileW, h: tileH });
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
      } else if (layer.mountain || layer.imgKey === "parallax_mountains") {
        var mImg = (typeof images !== "undefined") ? images.parallax_mountains : null;
        if (!mImg || !mImg.naturalWidth) {
          // Image may load late — try to seed tiles once available
          if (!layer.items.length && typeof initParallaxLayers === "function") {
            /* seeded on next init */
          }
          return;
        }
        if (!layer.items.length) {
          var mAspect = mImg.naturalHeight / mImg.naturalWidth;
          var mTileW = W * 1.2;
          var mDispH = mTileW * mAspect * 1.25;
          var mx = -20;
          while (mx < W + mTileW * 2) {
            layer.items.push({ x: mx, w: mTileW, h: mDispH });
            mx += mTileW - 2;
          }
        }
        ctx.save();
        ctx.globalAlpha = 1;
        layer.items.forEach(function(item) {
          // Bottom of mountains at bottom of screen; crop lower graphic below H
          var y = H - item.h * 0.68;
          try { ctx.drawImage(mImg, item.x, y, item.w, item.h); } catch (e) {}
        });
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

  function mountainImage() {
    if (typeof images === "undefined" || !images) return null;
    const a = images.mountains_cutout;
    const b = images.parallax_mountains;
    if (a && a.complete && a.naturalWidth) return a;
    if (b && b.complete && b.naturalWidth) return b;
    return null;
  }

  function drawMountainParallax() {
    const img = mountainImage();
    if (!img) return;
    mountainReady = true;
    const aspect = img.naturalHeight / Math.max(1, img.naturalWidth);
    // About half screen; bottom of image anchored to bottom of canvas
    const tileH = Math.max(H * 0.5, 150);
    const tileW = tileH / Math.max(0.05, aspect);
    const y = H - tileH; // bottom edge of image = bottom of screen
    if (!drawMountainParallax._tiles || drawMountainParallax._tileW !== tileW) {
      drawMountainParallax._tiles = [];
      drawMountainParallax._tileW = tileW;
      let x = 0;
      while (x < W + tileW * 2) {
        drawMountainParallax._tiles.push(x);
        x += tileW - 1;
      }
    }
    const tiles = drawMountainParallax._tiles;
    ctx.save();
    ctx.globalAlpha = 1;
    for (let i = 0; i < tiles.length; i++) {
      try { ctx.drawImage(img, tiles[i], y, tileW, tileH); } catch (e) {}
    }
    ctx.restore();
  }

  function updateMountainParallax(dtScale) {
    const img = mountainImage();
    if (!img) return;
    const aspect = img.naturalHeight / Math.max(1, img.naturalWidth);
    const tileH = Math.max(H * 0.5, 150);
    const tileW = tileH / Math.max(0.05, aspect);
    // Independent slow scroll — frozen before liftoff / intro
    let mSpeed = 0.18;
    if (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked) mSpeed = 0;
    if (window.__airborneRuffStage === "intro") mSpeed = 0;
    // Freeze mountains once landing is complete (skid / score / done)
    const ap = window.__airborneAirfieldPhase || "";
    if (ap === "skid" || ap === "score" || ap === "done" || ap === "land") {
      // keep scrolling during approach (land) until touchdown — stop on skid+
      if (ap === "skid" || ap === "score" || ap === "done") mSpeed = 0;
    }
    if (window.__airborneAirfieldDidLand) mSpeed = 0;
    if (!drawMountainParallax._tiles || drawMountainParallax._tileW !== tileW) {
      drawMountainParallax._tiles = [];
      drawMountainParallax._tileW = tileW;
      let x = 0;
      while (x < W + tileW * 2) {
        drawMountainParallax._tiles.push(x);
        x += tileW - 1;
      }
    }
    const tiles = drawMountainParallax._tiles;
    const step = mSpeed * (dtScale || 1);
    for (let i = 0; i < tiles.length; i++) tiles[i] -= step;
    while (tiles.length && tiles[0] + tileW < -40) tiles.shift();
    while (tiles.length < 3) {
      const last = tiles.length ? tiles[tiles.length - 1] : 0;
      tiles.push(last + tileW - 1);
    }
  }

  // ---------- Blimp Personality (squash/stretch, exhaust, propeller blur) ----------
  let blimpPersonality = {
    squashX: 1, squashY: 1,
    squashTargetX: 1, squashTargetY: 1,
    exhaustTimer: 0,
    exhaustParticles: [],
    propAngle: 0,
    propSpeed: 0,
    propBlurOpacity: 0,
    speedStreaks: [],
    finLag: 0,
    // Tap / dive reaction (all ships)
    flapKickY: 0,       // temporary upward visual offset on flap
    flapSquashT: 0,     // timer for flap squash pulse
    diveSquashT: 0
  };

  function exhaustStyleFor(effect) {
    // Roster-tuned exhaust look
    switch (effect) {
      case "flame":
        return { color: "255,160,40", size: 3.5, alpha: 0.7, life: 0.35, rise: 4, drag: 70, mode: "flame" };
      case "steam":
        return { color: "230,240,250", size: 3.2, alpha: 0.45, life: 0.7, rise: 28, drag: 35, mode: "steam" };
      case "blackSmoke":
        return { color: "35,32,28", size: 5.5, alpha: 0.55, life: 1.1, rise: 6, drag: 45, mode: "smoke" };
      case "smoke":
        return { color: "200,190,180", size: 3.5, alpha: 0.4, life: 0.75, rise: 12, drag: 50, mode: "smoke" };
      case "propeller":
      default:
        return { color: "190,180,165", size: 2.8, alpha: 0.32, life: 0.55, rise: 8, drag: 40, mode: "smoke" };
    }
  }

  function emitExhaustPuff(burst) {
    var sel = typeof selectedBlimp !== "undefined" ? selectedBlimp : "blimp1";
    var data = (typeof BLIMP_DATA !== "undefined") ? BLIMP_DATA[sel] : null;
    var effect = (data && data.effect) || "propeller";
    var style = exhaustStyleFor(effect);
    var isFlame = style.mode === "flame";
    // Flame ships need a denser plume; still capped for performance
    var count = burst ? (isFlame ? 4 : 3) : (isFlame ? 2 : 1);
    var cap = isFlame ? 36 : 16;
    if (blimpPersonality.exhaustParticles.length > cap) {
      blimpPersonality.exhaustParticles.splice(0, blimpPersonality.exhaustParticles.length - (cap - 4));
    }
    var exhaustX = player.x - player.w * 0.38;
    var exhaustY = player.y + player.h * 0.12;
    for (var i = 0; i < count; i++) {
      var speedBoost = Math.abs(player.vy) * 0.08;
      // Core jet flame — ~2x length via higher rearward velocity + longer life
      blimpPersonality.exhaustParticles.push({
        x: exhaustX + (Math.random() - 0.5) * 6,
        y: exhaustY + (Math.random() - 0.5) * 5,
        vx: -(style.drag + Math.random() * 40 + speedBoost) * (burst ? 1.35 : 1),
        vy: (Math.random() - 0.5) * 14 - style.rise * (0.5 + Math.random() * 0.5),
        size: style.size * (burst ? 1.3 : 1) * (0.75 + Math.random() * 0.5),
        alpha: style.alpha * (burst ? 1.15 : 1) * (0.8 + Math.random() * 0.35),
        life: style.life * (0.75 + Math.random() * 0.45),
        age: 0,
        color: style.color,
        mode: style.mode,
        // Elongate flame particles horizontally for a jet look
        stretch: isFlame ? (2.2 + Math.random() * 1.4) : 1
      });
      // Smoke trail behind the flame (only for jet-flame ships)
      if (isFlame) {
        blimpPersonality.exhaustParticles.push({
          x: exhaustX - 10 - Math.random() * 18,
          y: exhaustY + (Math.random() - 0.5) * 10,
          vx: -(55 + Math.random() * 50 + speedBoost * 0.6),
          vy: (Math.random() - 0.5) * 22 - 8,
          size: 4.5 + Math.random() * 5,
          alpha: 0.28 + Math.random() * 0.22,
          life: 0.85 + Math.random() * 0.55,
          age: 0,
          color: "55,48,42",
          mode: "smoke",
          stretch: 1.3 + Math.random() * 0.6
        });
      }
    }
  }
  // Light audio-synced puff (optional) — one small burst only
  window.__airborneExhaustBurst = function() {
    try { emitExhaustPuff(true); } catch (e) {}
  };

  // Visual reaction on every flap — squash/kick only (NO particles — particles lag on multi-tap)
  window.__airborneFlapPulse = function() {
    try {
      blimpPersonality.flapKickY = -Math.min(8, player.h * 0.07);
      blimpPersonality.flapSquashT = 0.12;
      blimpPersonality.squashTargetX = 0.92;
      blimpPersonality.squashTargetY = 1.12;
      blimpPersonality.squashX = 0.92;
      blimpPersonality.squashY = 1.12;
      blimpPersonality.finLag = -0.12;
    } catch (e) {}
  };

  function updateBlimpPersonality(dt) {
    var sel = typeof selectedBlimp !== "undefined" ? selectedBlimp : "blimp1";
    var data = (typeof BLIMP_DATA !== "undefined") ? BLIMP_DATA[sel] : null;
    var effect = (data && data.effect) || null;

    var vNorm = player.vy / MAX_FALL_SPEED;

    // Decay flap kick (visual only — not physics)
    if (blimpPersonality.flapKickY) {
      blimpPersonality.flapKickY *= Math.max(0, 1 - 10 * dt);
      if (Math.abs(blimpPersonality.flapKickY) < 0.4) blimpPersonality.flapKickY = 0;
    }
    if (blimpPersonality.flapSquashT > 0) blimpPersonality.flapSquashT -= dt;

    // Stronger fin lag — bag leads, fins trail
    var finTarget = player.rotation * 0.55 + (player.vy > 0 ? 0.08 : -0.06);
    blimpPersonality.finLag += (finTarget - blimpPersonality.finLag) * Math.min(1, 5 * dt);

    // Mild continuous squash from climb/dive (slightly more than original)
    if (blimpPersonality.flapSquashT <= 0) {
      blimpPersonality.squashTargetX = 1 + vNorm * 0.14;
      blimpPersonality.squashTargetY = 1 - vNorm * 0.17;
      blimpPersonality.squashTargetX = Math.max(0.80, Math.min(1.20, blimpPersonality.squashTargetX));
      blimpPersonality.squashTargetY = Math.max(0.76, Math.min(1.24, blimpPersonality.squashTargetY));
    }

    var lerp = (blimpPersonality.flapSquashT > 0 ? 14 : 9) * dt;
    blimpPersonality.squashX += (blimpPersonality.squashTargetX - blimpPersonality.squashX) * lerp;
    blimpPersonality.squashY += (blimpPersonality.squashTargetY - blimpPersonality.squashY) * lerp;

    if (effect === "propeller") {
      blimpPersonality.propSpeed = 25 + Math.abs(player.vy) * 0.04;
      blimpPersonality.propAngle += blimpPersonality.propSpeed * dt;
      blimpPersonality.propBlurOpacity = Math.min(0.9, 0.5 + Math.abs(player.vy) * 0.001);
    } else {
      blimpPersonality.propBlurOpacity *= 0.95;
    }

    // Continuous exhaust for every vessel — denser when diving, thinner when climbing
    var diveFactor = Math.max(0, player.vy) / MAX_FALL_SPEED;
    var climbFactor = Math.max(0, -player.vy) / 400;
    var emitRate = 0.16 - diveFactor * 0.03 + climbFactor * 0.03;
    if (effect === "blackSmoke") emitRate *= 0.65;
    if (effect === "flame") emitRate *= 0.38; // denser jet + smoke trail
    if (effect === "steam") emitRate *= 0.8;
    blimpPersonality.exhaustTimer += dt;
    while (blimpPersonality.exhaustTimer > emitRate) {
      blimpPersonality.exhaustTimer -= emitRate;
      emitExhaustPuff(false);
    }

    // Speed streaks when falling fast (motion lines)
    if (player.vy > 220) {
      if (Math.random() < 0.55) {
        blimpPersonality.speedStreaks.push({
          x: player.x - player.w * 0.2 + (Math.random() - 0.5) * player.w * 0.5,
          y: player.y - player.h * 0.35 + Math.random() * player.h * 0.7,
          len: 10 + Math.random() * 18 + (player.vy - 220) * 0.04,
          life: 0.12 + Math.random() * 0.1,
          age: 0,
          alpha: 0.2 + Math.min(0.35, (player.vy - 220) / 900)
        });
      }
    }
    blimpPersonality.speedStreaks.forEach(function(s) {
      s.age += dt;
      s.y += player.vy * 0.15 * dt;
    });
    blimpPersonality.speedStreaks = blimpPersonality.speedStreaks.filter(function(s) {
      return s.age < s.life;
    });

    blimpPersonality.exhaustParticles.forEach(function(p) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.mode === "flame") {
        // Keep jet long: slow size growth, light drag so particles travel farther
        p.size += 4 * dt;
        p.vx *= (1 - 0.35 * dt);
        p.vy -= 4 * dt;
        if (p.stretch) p.stretch += 1.6 * dt;
      } else if (p.mode === "smoke") {
        p.size += 7 * dt; // smoke blooms into a trail
        p.vx *= (1 - 0.55 * dt);
        p.vy -= 10 * dt;
      } else {
        p.size += 3 * dt;
        p.vy -= (p.mode === "steam" ? 18 : 8) * dt;
      }
    });
    blimpPersonality.exhaustParticles = blimpPersonality.exhaustParticles.filter(function(p) {
      return p.age < p.life;
    });
  }

  function drawPlayerShadow() {
    // Shadows removed per design
    return;
    // Soft oval under the blimp — anchors it in the sky
    if (typeof levelEndPhase === "string" && levelEndPhase === "fadeOut") return;
    var groundY = H * 0.92;
    var heightFrac = Math.max(0.15, Math.min(1, (groundY - player.y) / (H * 0.7)));
    var sx = player.x - player.w * 0.05;
    var sy = player.y + player.h * 0.55;
    var sw = player.w * (0.55 + heightFrac * 0.15);
    var sh = player.h * 0.18 * heightFrac;
    ctx.save();
    ctx.globalAlpha = 0.22 * heightFrac;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(sx, sy, sw * 0.5, Math.max(3, sh * 0.5), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBlimpPersonality() {
    // Speed streaks (behind body)
    blimpPersonality.speedStreaks.forEach(function(s) {
      var t = 1 - s.age / s.life;
      ctx.save();
      ctx.globalAlpha = s.alpha * t;
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - s.len * 0.2);
      ctx.lineTo(s.x, s.y + s.len * 0.8);
      ctx.stroke();
      ctx.restore();
    });

    // Teardrop plume shapes — fat nose near engine, tapered tip trailing left
    function pathTeardrop(len, halfW) {
      // Local space: tip at -len (rear), bulb near +halfW*0.2 (toward engine)
      ctx.beginPath();
      ctx.moveTo(-len, 0); // sharp tip
      ctx.bezierCurveTo(-len * 0.55, -halfW * 0.35, -len * 0.15, -halfW, halfW * 0.15, -halfW * 0.85);
      ctx.quadraticCurveTo(halfW * 0.55, 0, halfW * 0.15, halfW * 0.85);
      ctx.bezierCurveTo(-len * 0.15, halfW, -len * 0.55, halfW * 0.35, -len, 0);
      ctx.closePath();
    }
    blimpPersonality.exhaustParticles.forEach(function(p) {
      var tt = 1 - p.age / p.life;
      var a = Math.max(0, p.alpha * tt * tt);
      if (a < 0.02) return;
      ctx.save();
      if (p.mode === "flame") {
        var len = p.size * (p.stretch || 2.6);
        var halfW = p.size * 0.85;
        ctx.translate(p.x, p.y);
        // Outer cooler flame
        pathTeardrop(len, halfW);
        ctx.fillStyle = "rgba(255,110,25," + (a * 0.9) + ")";
        ctx.fill();
        // Hot core (smaller teardrop)
        pathTeardrop(len * 0.72, halfW * 0.55);
        ctx.fillStyle = "rgba(255,230,100," + (a * 0.95) + ")";
        ctx.fill();
      } else if (p.mode === "smoke") {
        var len2 = p.size * (p.stretch || 1.8);
        var halfW2 = p.size * 0.95;
        ctx.translate(p.x, p.y);
        pathTeardrop(len2, halfW2);
        ctx.fillStyle = "rgba(" + p.color + "," + a + ")";
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.color + "," + a + ")";
        ctx.fill();
      }
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
    // Boss incoming banner disabled — keep internal timer for dialogue timing
    return;
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


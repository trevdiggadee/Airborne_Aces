// =====================================================================
// LEVEL 2 TAKE-OFF PLATFORM  (build ruff517)
// ---------------------------------------------------------------------
// Level 2 starts with the blimp parked on a steampunk launch platform.
// Same take-off mechanics as the Flight Training runway:
//   * HOLD (or keep TAPPING) to accelerate — the platform scrolls left
//     under the blimp only while you are driving
//   * let go and the engine spools down
//   * at liftoff speed (or the end of the deck) the blimp climbs away
//     on a scripted 2s ease, then normal Level 2 flight begins
// It is deliberately NOT built on the training/airfield state machine, so
// there is no R.U.F.F., no tutorial flags and no training restrictions:
// at hand-off the game is in plain "playing" state.
//
// Hooks into the rest of the game (all tiny, all guarded):
//   gamestate-ui.js   startGame()  -> __airbornePlatformReset()
//                     applyMapLevelProgress(2) -> __airborneBeginPlatformTakeoff()
//                     takeHit() ignores damage while active
//   player-obstacles  flap() -> __airbornePlatformTap(); updatePlayer() freezes physics
//   main-loop.js      update before the world update, draw before obstacles (world)
//                     and near the end of the frame (HUD tip)
// Art: level2_takeoff_platform.webp (transparent), key "level2_platform".
// =====================================================================
(function () {
  "use strict";

  // ---- Layout, as fractions of the platform image so any re-export still works ----
  var HEIGHT_FRAC   = 0.50;          // platform height as a fraction of screen height
  var REST_Y_F      = 290 / 495;     // runway deck surface (blimp rests here)
  var START_X_F     = 610 / 1403;    // blimp's starting spot along the deck
  var END_X_F       = 1140 / 1403;   // end of the deck — forced liftoff if reached
  // Level 3 uses the FLOATING platform (level3_platform.webp): same mechanics, different art + layout
  var LV = 2, KEY = "level2_platform", LIFT = 0;
  function setLevel(n) {
    LV = (n === 3) ? 3 : 2;
    if (LV === 3) { KEY = "level3_platform"; HEIGHT_FRAC = 0.50; REST_Y_F = 0.703; START_X_F = 0.28; END_X_F = 0.78; LIFT = 0.16; }
    else { KEY = "level2_platform"; HEIGHT_FRAC = 0.50; REST_Y_F = 290 / 495; START_X_F = 610 / 1403; END_X_F = 1140 / 1403; LIFT = 0; }
  }
  function bobY() { return LV === 3 ? Math.sin((typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000 * 1.7) * 3 * Math.max(0.6, H / 420) : 0; }

  // ---- Feel (mirrors the training runway, tuned for the shorter deck) ----
  var MIN_SPEED  = 40;
  var MAX_SPEED  = 340;
  var ACCEL      = 80;     // px/s^2 while holding
  var DECEL      = 40;     // px/s^2 when you let go
  var TAP_BOOST  = 28;     // px/s per tap
  var TAP_HOLD_MS = 450;   // a quick tap keeps "holding" true this long
  var LIFT_SPEED = 250;
  var CLIMB_DUR  = 2.0;    // seconds
  var DRIVE_X    = 0.22;   // blimp x (fraction of W) — same as training

  var P = null; // platform state; null when there is no platform

  function img() {
    return (typeof images !== "undefined" && images) ? images[KEY] : null;
  }
  function imgReady() {
    var im = img();
    return !!(im && im.naturalWidth && im.naturalHeight);
  }
  function geom() {
    var im = img();
    var aspect = (im && im.naturalWidth) ? im.naturalWidth / im.naturalHeight : 1403 / 495;
    var h = H * HEIGHT_FRAC;
    return { w: h * aspect, h: h };
  }
  function deckY() {                  // screen y of the deck surface
    var g = geom();
    return (H - LIFT * H - g.h) + REST_Y_F * g.h + bobY();
  }
  function restPlayerY() {
    var ph = (player && player.h > 0) ? player.h : 40;
    return deckY() - ph * 0.42;       // same seat as the level-end landing pad
  }
  function now() { return (typeof performance !== "undefined") ? performance.now() : Date.now(); }
  function smooth(t) { return t * t * (3 - 2 * t); }

  function holdingNow() {
    return !!(window.__airbornePointerDown || window.__airborneAirfieldHold || now() < (P ? P.holdUntil : 0));
  }

  function stopEngine() {
    try { if (typeof sfxAirfieldEngineStop === "function") sfxAirfieldEngineStop(); } catch (e) {}
    if (P) P.engineOn = false;
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------
  window.__airbornePlatformReset = function () {
    stopEngine();
    P = null;
    window.__airbornePlatformTakeoffActive = false;
  };

  window.__airborneBeginPlatformTakeoff = function (level) {
    setLevel(level);
    // Called once per level-2 start (the map path can call it twice): ignore repeats
    if (window.__airbornePlatformTakeoffActive && P && P.phase !== "climb") return true;
    if (!imgReady() || typeof player === "undefined" || !player) return false; // art missing → just fly
    var g = geom();
    player.x = W * DRIVE_X;
    P = {
      phase: "ready",             // ready → accel → climb → (leaving)
      speed: MIN_SPEED,
      holdUntil: 0,
      t: 0,
      climbT: 0,
      climbStartY: 0,
      tileX: player.x - START_X_F * g.w,
      engineOn: false,
      pulse: 0
    };
    window.__airbornePlatformTakeoffActive = true;
    try { if (typeof obstacles !== "undefined") obstacles = []; } catch (e) {}
    try { if (typeof birdFlocks !== "undefined") birdFlocks = []; } catch (e) {}
    try { spawnInterval = 999; spawnTimer = 0; } catch (e) {}
    try { obstacleSpeed = 1; } catch (e) {}          // ~0: city stays parked (0 would fall back to 220)
    player.y = restPlayerY();
    player.vy = 0;
    player.rotation = 0;
    return true;
  };

  // A tap (called from flap()) drives the deck just like the training runway
  window.__airbornePlatformTap = function () {
    if (!P || (P.phase !== "ready" && P.phase !== "accel")) return;
    P.holdUntil = now() + TAP_HOLD_MS;
    P.speed = Math.min(MAX_SPEED, P.speed + TAP_BOOST);
  };


  // ------------------------------------------------------------------
  // Take-off effects: engine exhaust, dust + sparks kicked off the deck, speed streaks, liftoff steam blast
  // ------------------------------------------------------------------
  var fx = [], fxLast = 0, fxAcc = 0;
  function fpush(o) { if (fx.length > 260) fx.shift(); fx.push(o); }
  function emitFx(dt, holding, o) {
    o = o || {};
    var spdF = (o.spdF != null) ? o.spdF : Math.max(0, Math.min(1, (P.speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)));
    var ph = o.phase || P.phase, dy = (o.deckY != null) ? o.deckY : deckY(), speedPx = (o.speed != null) ? o.speed : (P ? P.speed : 200);
    var rear = player.x - player.w * 0.47, ry = player.y + player.h * 0.06;
    fxAcc += dt;
    var step = ph === "accel" && holding ? 0.025 : (ph === "climb" ? 0.03 : 0.12);
    while (fxAcc >= step) {
      fxAcc -= step;
      // engine exhaust: dark puff + flicker of flame out of the rear nozzle
      fpush({ k: "puff", x: rear, y: ry, vx: -50 - spdF * 120 - Math.random() * 30, vy: -6 + (Math.random() - 0.5) * 22, age: 0, life: 0.7 + Math.random() * 0.5, r: 4 + Math.random() * 3, g: 12 + spdF * 8, c: 0 });
      if (ph !== "ready" && Math.random() < 0.8) fpush({ k: "flame", x: rear, y: ry, vx: -90 - spdF * 160, vy: (Math.random() - 0.5) * 18, age: 0, life: 0.16 + Math.random() * 0.1, r: 3 + Math.random() * 3 + spdF * 2 });
      if (ph === "accel" && holding) {
        // dust + steam kicked up off the deck as it rushes past
        fpush({ k: "puff", x: player.x + (Math.random() - 0.3) * player.w * 0.8, y: dy - 2, vx: -(speedPx * 0.8 + Math.random() * 60), vy: -8 - Math.random() * 28, age: 0, life: 0.6 + Math.random() * 0.4, r: 3 + Math.random() * 4, g: 14, c: 1 });
        if (spdF > 0.15 && Math.random() < 0.55) fpush({ k: "spark", x: player.x + (Math.random() - 0.5) * player.w * 0.7, y: dy - 1, vx: -(speedPx * 0.6 + Math.random() * 120), vy: -50 - Math.random() * 110, age: 0, life: 0.35 + Math.random() * 0.3 });
        if (spdF > 0.3 && Math.random() < 0.5) fpush({ k: "streak", x: W + 20, y: H * (0.22 + Math.random() * 0.4), vx: -(700 + spdF * 600 + Math.random() * 300), vy: 0, age: 0, life: 0.28 + Math.random() * 0.15, len: 40 + Math.random() * 70 });
      }
      if (ph === "climb") {
        if (Math.random() < 0.6) fpush({ k: "spark", x: rear, y: ry, vx: -120 - Math.random() * 120, vy: (Math.random() - 0.5) * 80, age: 0, life: 0.4 + Math.random() * 0.3 });
        if (Math.random() < 0.5) fpush({ k: "streak", x: W + 20, y: H * (0.15 + Math.random() * 0.55), vx: -(650 + Math.random() * 400), vy: 0, age: 0, life: 0.3 + Math.random() * 0.2, len: 50 + Math.random() * 80 });
      }
    }
  }
  function liftoffBurst(dyIn) {
    var dy = (dyIn != null) ? dyIn : deckY(), x = player.x;
    for (var i = 0; i < 26; i++) {
      var a = Math.PI + (Math.random() - 0.5) * 2.2 + (i % 2 ? Math.PI * 0.0 : 0);
      var sp = 60 + Math.random() * 190;
      fpush({ k: "puff", x: x + (Math.random() - 0.5) * player.w * 1.1, y: dy - 2, vx: Math.cos(a) * sp * (Math.random() < 0.5 ? 1 : -1.2), vy: -Math.abs(Math.sin(a)) * sp * 0.5 - 15, age: 0, life: 0.9 + Math.random() * 0.7, r: 6 + Math.random() * 8, g: 26, c: 2 });
    }
    for (var j = 0; j < 22; j++) fpush({ k: "spark", x: x + (Math.random() - 0.5) * player.w * 0.8, y: dy - 2, vx: (Math.random() - 0.5) * 260 - 80, vy: -80 - Math.random() * 190, age: 0, life: 0.5 + Math.random() * 0.4 });
    fpush({ k: "ring", x: x, y: dy, vx: 0, vy: 0, age: 0, life: 0.7, r: 10 });
    fpush({ k: "ring", x: x, y: dy, vx: 0, vy: 0, age: -0.12, life: 0.8, r: 6 });
    try { triggerScreenShake(4, 380); } catch (e) {}
    try { triggerScreenFlash(0.12, 200); } catch (e) {}
  }
  function drawFx() {
    var tn = now(), dt = Math.min(0.05, Math.max(0, (tn - (fxLast || tn)) / 1000)); fxLast = tn;
    if (!fx.length) return;
    for (var i = fx.length - 1; i >= 0; i--) {
      var f = fx[i]; f.age += dt;
      if (f.age >= f.life) { fx.splice(i, 1); continue; }
      if (f.age < 0) continue;
      var u = f.age / f.life;
      if (f.k !== "ring") { f.x += f.vx * dt; f.y += f.vy * dt; }
      if (f.k === "spark") f.vy += 420 * dt;
      if (f.k === "puff") { f.vx *= (1 - 1.2 * dt); f.vy -= 10 * dt; }
      ctx.save();
      if (f.k === "puff") {
        var col = f.c === 0 ? [74, 68, 64] : (f.c === 1 ? [196, 178, 150] : [236, 238, 240]);
        ctx.fillStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + (0.5 * (1 - u) * (f.c === 0 ? 0.9 : 1)).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r + f.g * u, 0, 6.2832); ctx.fill();
      } else if (f.k === "flame") {
        ctx.globalCompositeOperation = "lighter";
        var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 2);
        g.addColorStop(0, "rgba(255,240,170," + (0.9 * (1 - u)).toFixed(3) + ")"); g.addColorStop(0.5, "rgba(255,140,40," + (0.6 * (1 - u)).toFixed(3) + ")"); g.addColorStop(1, "rgba(220,60,10,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 2, 0, 6.2832); ctx.fill();
      } else if (f.k === "spark") {
        ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(255,200,110," + (1 - u).toFixed(3) + ")"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * 0.03, f.y - f.vy * 0.03); ctx.stroke();
      } else if (f.k === "streak") {
        ctx.strokeStyle = "rgba(255,255,255," + (0.35 * (1 - u)).toFixed(3) + ")"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + f.len, f.y); ctx.stroke();
      } else if (f.k === "ring") {
        ctx.strokeStyle = "rgba(235,238,240," + (0.7 * (1 - u)).toFixed(3) + ")"; ctx.lineWidth = 3 * (1 - u) + 1;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r + u * 150, (f.r + u * 150) * 0.16, 0, 0, 6.2832); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // shared with the other take-offs (level 1 runway, later-level launches)
  var launchT = 0;
  window.__airborneTakeoffFx = {
    emit: function (dt, holding, o) { try { emitFx(dt, holding, o); } catch (e) {} },
    burst: function (dy) { try { liftoffBurst(dy); } catch (e) {} },
    draw: function () { try { drawFx(); } catch (e) {} },
    // levels 3+: the blimp kicks on its boosters and launches into the level with a steam burst
    launch: function () {
      launchT = 2.2;
      try {
        var dy = player.y + player.h * 0.5;
        for (var i = 0; i < 22; i++) {
          var a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 170;
          fpush({ k: "puff", x: player.x - player.w * 0.3 + (Math.random() - 0.5) * player.w * 0.5, y: player.y + (Math.random() - 0.5) * player.h * 0.5, vx: Math.cos(a) * sp - 60, vy: Math.sin(a) * sp * 0.7, age: 0, life: 0.8 + Math.random() * 0.6, r: 5 + Math.random() * 7, g: 24, c: 2 });
        }
        for (var j = 0; j < 20; j++) fpush({ k: "spark", x: player.x - player.w * 0.45, y: player.y + player.h * 0.06, vx: -120 - Math.random() * 260, vy: (Math.random() - 0.5) * 160, age: 0, life: 0.4 + Math.random() * 0.4 });
        fpush({ k: "ring", x: player.x - player.w * 0.4, y: player.y, vx: 0, vy: 0, age: 0, life: 0.6, r: 8 });
        triggerScreenShake(3, 300);
      } catch (e) {}
    }
  };
  function launchTick(dt) {
    if (launchT <= 0 || !player) return;
    launchT -= dt;
    emitFx(dt, true, { phase: "climb", spdF: 0.7, deckY: H, speed: 260 });
  }

  // ------------------------------------------------------------------
  // Update — called every playing frame, before updatePlayer()
  // ------------------------------------------------------------------
  window.__airborneUpdatePlatformTakeoff = function (dt) {
    if (!(dt > 0) || !isFinite(dt)) dt = 0.016;
    try { launchTick(dt); } catch (eLt) {}
    if (!P) return;
    P.t += dt;
    P.pulse += dt;
    var g = geom();

    // ---- platform has been left behind: just scroll away with the world ----
    if (P.phase === "leaving") {
      var sp = (typeof obstacleSpeed === "number" && obstacleSpeed > 0) ? obstacleSpeed : 220;
      P.tileX -= sp * dt;
      if (P.tileX + g.w < -40) P = null;
      return;
    }

    // keep the world quiet while we are on the deck
    try { spawnInterval = 999; spawnTimer = 0; } catch (e) {}
    try { if (typeof birdFlockTimer !== "undefined" && birdFlockTimer < 6) birdFlockTimer = 6; } catch (e) {}
    try { if (typeof healSpawnTimer !== "undefined" && healSpawnTimer < 6) healSpawnTimer = 6; } catch (e) {}
    try { if (typeof shieldSpawnTimer !== "undefined" && shieldSpawnTimer < 10) shieldSpawnTimer = 10; } catch (e) {}

    var holding = holdingNow();

    if (P.phase === "ready" || P.phase === "accel") {
      if (P.phase === "ready") {
        P.speed = MIN_SPEED;
        try { obstacleSpeed = 1; } catch (e) {}
        if (holding) {
          P.phase = "accel";
          try { if (typeof sfxAirfieldEngineStart === "function") { sfxAirfieldEngineStart(); P.engineOn = true; } } catch (e) {}
        }
      }
      if (P.phase === "accel") {
        if (holding) P.speed = Math.min(MAX_SPEED, P.speed + ACCEL * dt);
        else         P.speed = Math.max(MIN_SPEED, P.speed - DECEL * dt);
        // deck only moves while you are driving
        var scroll = holding ? P.speed : 0;
        P.tileX -= scroll * dt;
        try { obstacleSpeed = holding ? P.speed : 1; } catch (e) {}
        try {
          if (P.engineOn && typeof sfxAirfieldEngineSetSpeed === "function") sfxAirfieldEngineSetSpeed(P.speed / MAX_SPEED, 0);
        } catch (e) {}

        // Liftoff: fast enough, or we ran out of deck
        var endX = P.tileX + END_X_F * g.w;
        if (holding && (P.speed >= LIFT_SPEED || player.x >= endX)) {
          P.phase = "climb";
          try { liftoffBurst(); } catch (eL) {}
          P.climbT = 0;
          P.climbStartY = player.y;
          try { if (typeof sfxAirfieldTakeoff === "function") sfxAirfieldTakeoff(); } catch (e) {}
          stopEngine();
        }
      }
      try { emitFx(dt, holding); } catch (eF) {}
      // pin blimp on the deck
      player.x = W * DRIVE_X;
      player.y = restPlayerY();
      player.vy = 0;
      player.rotation = (P.phase === "accel" && holding) ? -0.06 : 0;
      return;
    }

    if (P.phase === "climb") {
      P.climbT += dt;
      try { if (P.climbT < 1.6) emitFx(dt, true); } catch (eF2) {}
      var tc = Math.min(1, P.climbT / CLIMB_DUR);
      var e = smooth(tc);
      var endY = H * 0.4;
      player.y = P.climbStartY + (endY - P.climbStartY) * e;
      player.x = W * 0.20 + (W * DRIVE_X - W * 0.20) * e;
      player.vy = 0;
      player.rotation = -0.2 * Math.sin(tc * Math.PI);
      P.speed = Math.max(180, 160 + e * 60);
      try { obstacleSpeed = P.speed; } catch (ex) {}
      P.tileX -= P.speed * dt;

      if (tc >= 1) {
        // ---- hand off to normal Level 2 flight ----
        window.__airbornePlatformTakeoffActive = false;
        P.phase = "leaving";
        try { obstacleSpeed = 220; spawnInterval = 1.7; spawnTimer = 0; } catch (ex) {}
        player.x = W * DRIVE_X;
        player.y = endY;
        player.rotation = 0;
        // finger still down from the take-off hold: same carry-over as the training climb
        player.vy = 0;
        if (window.__airbornePointerDown) {
          player.vy = (typeof FLAP_VELOCITY === "number") ? FLAP_VELOCITY : -430;
          window.__airborneCarryHold = true;
          window.__airborneCarryHoldT = 0;
        }
        window.__airborneClimbTapBuffered = false;
      }
    }
  };

  // ------------------------------------------------------------------
  // the platform art at an explicit x (also used for the level-end landing, same size/height as the take-off)
  function drawWorldAt(tx) {
      var im = img();
      if (!im || !im.naturalWidth) return;
      var g = geom();
      if (tx > W + 20 || tx + g.w < -20) return;
      if (typeof failedAssetKeys !== "undefined" && failedAssetKeys.indexOf("level2_platform") >= 0) {
        // art not in the repo yet → solid steampunk deck so the take-off is still readable
        var dy = deckY(), x0 = tx + g.w * 0.26, dw = g.w * 0.62;
        ctx.fillStyle = "#3b2c1f";
        for (var li = 0; li < 4; li++) ctx.fillRect(x0 + dw * (0.06 + li * 0.27), dy, dw * 0.05, H - dy);
        ctx.strokeStyle = "#6b5236"; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x0 + dw * 0.08, dy + 10); ctx.lineTo(x0 + dw * 0.92, H);
        ctx.moveTo(x0 + dw * 0.92, dy + 10); ctx.lineTo(x0 + dw * 0.08, H);
        ctx.stroke();
        ctx.fillStyle = "#8a6a3f"; ctx.fillRect(x0, dy, dw, 16);
        ctx.fillStyle = "#c9a45c"; ctx.fillRect(x0, dy - 2, dw, 4);
        ctx.fillStyle = "#e8d49a";
        for (var ci = 0; ci < 9; ci++) ctx.fillRect(x0 + dw * (0.1 + ci * 0.1), dy + 6, dw * 0.04, 3);
        return;
      }
      if (LV === 3) { drawFloatingPlatform(im, tx, g); return; }
      ctx.drawImage(im, tx, H - g.h, g.w, g.h);
  }

  // ---- Level 3: floating platform — hover bob, anti-grav thrusters, drifting steam, pulsing lamps, animated windsock ----
  var l3p = [], l3Last = 0, l3Acc = [0, 0, 0, 0];
  var JETS = [0.17, 0.40, 0.62, 0.84];
  function glowDot(x, y, r, rgb, a) {
    var key = "gd" + rgb, c = glowDot[key];
    if (!c) { c = glowDot[key] = document.createElement("canvas"); c.width = c.height = 64; var g = c.getContext("2d"), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, "rgba(" + rgb + ",1)"); rg.addColorStop(0.4, "rgba(" + rgb + ",0.4)"); rg.addColorStop(1, "rgba(" + rgb + ",0)"); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    ctx.globalAlpha = a; ctx.drawImage(c, x - r, y - r, r * 2, r * 2);
  }
  function drawFloatingPlatform(im, tx, g) {
    var t = now() / 1000, dt = l3Last ? Math.min(0.05, t - l3Last) : 0.016; l3Last = t;
    var y0 = H - LIFT * H - g.h + bobY(), k = g.h / 528, bot = y0 + g.h * 0.985, u = Math.max(0.6, H / 420);
    // particles first (they sit behind the hull)
    for (var j = 0; j < JETS.length; j++) {
      l3Acc[j] += dt;
      if (l3Acc[j] > 0.035) { l3Acc[j] = 0; l3p.push({ k: "jet", x: tx + JETS[j] * g.w + (Math.random() - 0.5) * 10 * k, y: bot - 6 * k, vy: 150 * u + Math.random() * 120 * u, vx: (Math.random() - 0.5) * 22 * u, a: 0, life: 0.5 + Math.random() * 0.3, r: (7 + Math.random() * 6) * k }); }
    }
    if (Math.random() < dt * 14) l3p.push({ k: "mist", x: tx + (0.05 + Math.random() * 0.9) * g.w, y: bot + 4 * k, vy: 22 * u, vx: (Math.random() - 0.5) * 30 * u, a: 0, life: 1.8 + Math.random() * 1.2, r: (14 + Math.random() * 14) * k });
    if (l3p.length > 220) l3p.splice(0, l3p.length - 220);
    ctx.save();
    for (var i = l3p.length - 1; i >= 0; i--) {
      var p = l3p[i]; p.a += dt; if (p.a >= p.life) { l3p.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; var f = p.a / p.life;
      if (p.k === "jet") { p.r *= 1 + dt * 1.6; ctx.globalCompositeOperation = "lighter"; glowDot(p.x, p.y, p.r * 1.6, f < 0.35 ? "255,190,90" : "120,190,255", (1 - f) * 0.75); }
      else { p.r *= 1 + dt * 0.9; ctx.globalCompositeOperation = "source-over"; glowDot(p.x, p.y, p.r, "225,232,240", (1 - f) * 0.30); }
    }
    ctx.restore();
    // hull
    ctx.drawImage(im, tx, y0, g.w, g.h);
    // thruster nozzle glow + lamps + tower beacon
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (var n = 0; n < JETS.length; n++) glowDot(tx + JETS[n] * g.w, bot - 4 * k, 26 * k, "255,170,70", 0.55 + 0.25 * Math.sin(t * 18 + n * 2));
    var lamps = [[0.254, 0.585], [0.346, 0.585], [0.564, 0.585], [0.653, 0.585], [0.806, 0.585], [0.054, 0.175], [0.945, 0.37]];
    for (var q = 0; q < lamps.length; q++) glowDot(tx + lamps[q][0] * g.w, y0 + lamps[q][1] * g.h, 15 * k, "255,205,110", 0.38 + 0.2 * Math.sin(t * 3 + q * 1.7));
    ctx.restore();
    // windsock (the training-level one) on the control-tower mount
    var sock = (typeof images !== "undefined" && images) ? images.wind_sock : null;
    if (sock && sock.naturalWidth) {
      var cols = 6, rows = 6, fw = sock.naturalWidth / cols, fh = sock.naturalHeight / rows, fr = Math.floor(t * 14) % (cols * rows);
      var dh = g.h * 0.30, dw = fw * dh / fh, bx = tx + 0.0958 * g.w, by = y0 + 0.2073 * g.h;
      try { ctx.drawImage(sock, (fr % cols) * fw, Math.floor(fr / cols) * fh, fw, fh, bx - dw * 0.28, by - dh * 0.98, dw, dh); } catch (eS) {}
    }
  }
  function withL2(fn) { var prev = LV; if (prev !== 2) setLevel(2); try { return fn(); } finally { if (prev !== 2) setLevel(prev); } }
  window.__airborneLandingPlatform = function () { return withL2(function () { var g = geom(); return { w: g.w, h: g.h, deckY: deckY(), restFrac: REST_Y_F, x0: 0.40, x1: 0.85, center: 0.62 }; }); };
  window.__airborneDrawLandingPlatform = function (tx) { try { withL2(function () { drawWorldAt(tx); }); } catch (e) {} };

  // Draw
  // ------------------------------------------------------------------
  // layer "world": the platform itself (behind obstacles and the blimp)
  // layer "hud":   the on-screen tip
  window.__airborneDrawPlatformTakeoff = function (layer) {
    if (!P) return;
    try {
      if (layer === "hud") {
        if (P.phase === "leaving") return;
        var holding = holdingNow();
        var text = (P.phase === "climb") ? "Liftoff!"
                 : (holding ? "Accelerating…" : "HOLD or TAP to take off!");
        var pulse = (P.phase === "climb") ? 1 : (holding ? 0.85 : 0.65 + 0.35 * Math.sin(P.pulse * 5));
        var fs = Math.max(14, Math.floor(Math.min(W * 0.055, H * 0.06)));
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.textAlign = "center";
        ctx.font = "bold " + fs + "px Rockwell, Georgia, serif";
        var cx = W / 2, cy = H * 0.31;   // below the LEVEL banner, above the platform
        ctx.lineWidth = Math.max(3, fs * 0.16);
        ctx.strokeStyle = "rgba(40,24,8,0.85)";
        ctx.lineJoin = "round";
        ctx.strokeText(text, cx, cy);
        ctx.fillStyle = "#ffe9a8";
        ctx.fillText(text, cx, cy);
        ctx.restore();
        return;
      }
      // world layer
      drawWorldAt(P.tileX);
    } catch (e) { /* never break the game loop */ }
  };
})();

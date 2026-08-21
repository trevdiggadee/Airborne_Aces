
// Shared Phaser-inspired power-up FX for Airborne Aces (canvas particles)
(function () {
  "use strict";

  var pool = [];
  var MAX = 280;

  function pushP(p) {
    if (pool.length >= MAX) pool.shift();
    pool.push(p);
  }

  function burst(x, y, opts) {
    opts = opts || {};
    var n = opts.count || 18;
    var colors = opts.colors || ["#ffd24a", "#ff6b3d", "#fff"];
    var speed = opts.speed || 160;
    var life = opts.life || 0.55;
    var gravity = opts.gravity != null ? opts.gravity : 40;
    var size = opts.size || 3;
    var spread = opts.spread != null ? opts.spread : Math.PI * 2;
    var angle0 = opts.angle != null ? opts.angle : 0;
    for (var i = 0; i < n; i++) {
      var a = angle0 + (Math.random() - 0.5) * spread;
      if (opts.radial) a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
      var sp = speed * (0.5 + Math.random());
      pushP({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp + (opts.up ? -80 : 0),
        life: life * (0.7 + Math.random() * 0.6),
        age: 0,
        r: size * (0.6 + Math.random()),
        color: colors[(Math.random() * colors.length) | 0],
        gravity: gravity,
        drag: opts.drag != null ? opts.drag : 0.5,
        glow: !!opts.glow,
        ring: !!opts.ring
      });
    }
  }

  function ring(x, y, opts) {
    opts = opts || {};
    pushP({
      kind: "ring",
      x: x, y: y,
      r0: opts.r0 || 8,
      r1: opts.r1 || 120,
      life: opts.life || 0.55,
      age: 0,
      color: opts.color || "rgba(180,230,255,0.9)",
      width: opts.width || 5
    });
  }

  function beam(x, y, opts) {
    opts = opts || {};
    pushP({
      kind: "beam",
      x: x, y: y,
      len: opts.len || 400,
      life: opts.life || 0.35,
      age: 0,
      color: opts.color || "rgba(160,230,255,0.95)",
      height: opts.height || 10
    });
  }

  function activate(kind, x, y) {
    kind = kind || "storm";
    switch (kind) {
      case "fire":
        burst(x, y, { count: 28, colors: ["#fff5c0", "#ffd24a", "#ff8a1a", "#ff3b00"], speed: 140, gravity: -30, glow: true, up: true });
        burst(x, y + 10, { count: 12, colors: ["#ff6b3d", "#9f0404"], speed: 60, gravity: -20, size: 5 });
        break;
      case "shockwave":
        ring(x, y, { r0: 10, r1: 180, color: "rgba(180,230,255,0.95)", life: 0.5, width: 6 });
        ring(x, y, { r0: 6, r1: 120, color: "rgba(255,255,255,0.7)", life: 0.35, width: 3 });
        burst(x, y, { count: 24, colors: ["#c8f0ff", "#ffffff", "#7ecbff"], speed: 220, gravity: 0, radial: true, glow: true });
        break;
      case "steam":
        burst(x, y, { count: 30, colors: ["#f0f4f8", "#d0d8e0", "#a8b4c0"], speed: 70, gravity: -50, size: 6, drag: 1.2 });
        break;
      case "sunblade":
        burst(x, y, { count: 20, colors: ["#ffe566", "#ffb000", "#ff7a00"], speed: 180, radial: true, gravity: 0, glow: true });
        ring(x, y, { r0: 20, r1: 90, color: "rgba(255,200,60,0.85)", life: 0.4 });
        break;
      case "vortex":
        burst(x, y, { count: 32, colors: ["#c084fc", "#7c3aed", "#e9d5ff"], speed: 90, radial: true, gravity: 0, drag: -0.4, glow: true });
        break;
      case "chain":
      case "electric":
        burst(x, y, { count: 22, colors: ["#e0f2fe", "#38bdf8", "#ffffff"], speed: 260, gravity: 0, glow: true, size: 2 });
        ring(x, y, { r0: 4, r1: 70, color: "rgba(125,211,252,0.9)", life: 0.25, width: 2 });
        break;
      case "crystalbeam":
        beam(x, y, { len: 480, color: "rgba(165,243,252,0.95)", height: 12, life: 0.4 });
        burst(x + 40, y, { count: 16, colors: ["#a5f3fc", "#22d3ee", "#ffffff"], speed: 120, angle: 0, spread: 0.4, glow: true });
        break;
      case "missile":
      case "rockets":
        burst(x, y, { count: 14, colors: ["#ffd24a", "#ff8a1a", "#fff"], speed: 100, angle: Math.PI, spread: 0.8, glow: true });
        break;
      case "meteors":
        burst(x, y - 30, { count: 20, colors: ["#ff6b3d", "#ffd24a", "#7f1d1d"], speed: 160, gravity: 200, glow: true });
        break;
      case "swarm":
        burst(x, y, { count: 26, colors: ["#fda4af", "#fb7185", "#ffe4e6"], speed: 150, radial: true, glow: true });
        break;
      case "blueflame":
        for (var bi = 0; bi < 16; bi++) {
          var ba = -0.30 + Math.random() * 0.60;
          var bsp = 180 + Math.random() * 160;
          pushP({
            x: x + 20, y: y,
            vx: Math.cos(ba) * bsp,
            vy: Math.sin(ba) * bsp * 0.52,
            life: 0.35 + Math.random() * 0.25,
            age: 0,
            r: 3.8 + Math.random() * 4.5,
            color: ["#e0f2fe", "#7dd3fc", "#38bdf8", "#0284c7"][(Math.random()*4)|0],
            gravity: -20,
            drag: 0.3,
            glow: true
          });
        }
        break;
      case "fireball":
        burst(x, y, { count: 16, colors: ["#ffd24a", "#ff8a1a", "#ff3b00"], speed: 120, gravity: -20, glow: true });
        break;
      case "flamethrower":
        // Forward cone of fire from nose gun (thinned 5%)
        for (var fi = 0; fi < 16; fi++) {
          var fa = -0.30 + Math.random() * 0.60;
          var fsp = 180 + Math.random() * 160;
          pushP({
            x: x + 20, y: y,
            vx: Math.cos(fa) * fsp,
            vy: Math.sin(fa) * fsp * 0.52,
            life: 0.35 + Math.random() * 0.25,
            age: 0,
            r: 3.8 + Math.random() * 4.5,
            color: ["#fff5c0", "#ffd24a", "#ff8a1a", "#ff3b00"][(Math.random()*4)|0],
            gravity: -20,
            drag: 0.3,
            glow: true
          });
        }
        break;
      case "storm":
      default:
        burst(x, y, { count: 20, colors: ["#94a3b8", "#e2e8f0", "#38bdf8"], speed: 130, gravity: 20, glow: true });
        ring(x, y, { r0: 8, r1: 100, color: "rgba(148,163,184,0.8)", life: 0.4 });
        break;
    }
  }

  // Continuous aura while power is active (drawn each frame)
  function drawAura(ctx, kind, cx, cy, t, fade) {
    if (!ctx || !kind) return;
    fade = fade == null ? 1 : fade;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    var i, ang, ox, oy, r, g;
    if (kind === "fire") {
      for (i = 0; i < 12; i++) {
        ang = t * 2.2 + i * (Math.PI * 2 / 12);
        ox = cx + Math.cos(ang) * 28;
        oy = cy + Math.sin(ang * 1.15) * 18 - 6;
        r = 7 + 4 * Math.sin(t * 10 + i);
        g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r * 2.5);
        g.addColorStop(0, "rgba(255,245,180," + (0.85 * fade) + ")");
        g.addColorStop(0.45, "rgba(255,120,20," + (0.45 * fade) + ")");
        g.addColorStop(1, "rgba(120,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox, oy, r * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === "shockwave" || kind === "steam") {
      for (i = 0; i < 3; i++) {
        var rr = 20 + ((t * 80 + i * 30) % 90);
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = kind === "steam"
          ? ("rgba(220,230,240," + ((1 - rr / 110) * 0.5 * fade) + ")")
          : ("rgba(180,230,255," + ((1 - rr / 110) * 0.65 * fade) + ")");
        ctx.lineWidth = 3 + (1 - rr / 110) * 5;
        ctx.stroke();
      }
    } else if (kind === "sunblade" || kind === "missile") {
      for (i = 0; i < 2; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((i ? 1 : -1) * (Math.PI / 4) + t * 1.8);
        ctx.scale(1, 0.4);
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.strokeStyle = kind === "sunblade"
          ? ("rgba(255,190,40," + (0.75 * fade) + ")")
          : ("rgba(140,210,255," + (0.75 * fade) + ")");
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();
      }
    } else if (kind === "vortex") {
      for (i = 0; i < 5; i++) {
        ctx.beginPath();
        for (var s = 0; s < 14; s++) {
          var tt = s / 14;
          ang = t * 5 + i + tt * 3;
          var rad = 8 + tt * 40;
          ox = cx + Math.cos(ang) * rad;
          oy = cy + Math.sin(ang) * rad * 0.85;
          if (s === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        }
        ctx.strokeStyle = "rgba(180,100,255," + (0.55 * fade) + ")";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    } else if (kind === "chain" || kind === "electric") {
      for (i = 0; i < 7; i++) {
        ang = t * 4 + i;
        ox = cx + Math.cos(ang) * 42;
        oy = cy + Math.sin(ang * 1.3) * 28;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ox + (Math.random() - 0.5) * 10, oy + (Math.random() - 0.5) * 10);
        ctx.strokeStyle = "rgba(180,230,255," + (0.75 * fade) + ")";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (kind === "crystalbeam") {
      g = ctx.createLinearGradient(cx, cy, cx + 280, cy);
      g.addColorStop(0, "rgba(180,250,255," + (0.85 * fade) + ")");
      g.addColorStop(1, "rgba(40,120,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx, cy - 6, 280, 12);
    } else if (kind === "blueflame") {
      // Short nose-gun jet, lowered 2%, thinned 5%
      var dropY = cy + ((typeof H !== "undefined" ? H : 600) * 0.02);
      for (i = 0; i < 7; i++) {
        var dist = 12 + (i * 11) + (Math.sin(t * 20 + i) * 3);
        if (dist > 95) continue;
        var spread = (Math.sin(t * 14 + i * 1.7) * 0.13);
        ox = cx + 16 + dist * Math.cos(spread);
        oy = dropY + dist * Math.sin(spread) * 0.71 + Math.sin(t * 18 + i) * 1.9;
        r = (8 + 4 * (1 - i / 7) + Math.sin(t * 25 + i) * 1.5) * 0.95;
        g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r * 1.9);
        var a0 = (0.85 - i * 0.1) * fade;
        g.addColorStop(0, "rgba(220,245,255," + a0 + ")");
        g.addColorStop(0.4, "rgba(56,189,248," + (a0 * 0.7) + ")");
        g.addColorStop(0.75, "rgba(14,100,200," + (a0 * 0.3) + ")");
        g.addColorStop(1, "rgba(40,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox, oy, r * 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
      g = ctx.createRadialGradient(cx + 16, dropY, 0, cx + 16, dropY, 11.4);
      g.addColorStop(0, "rgba(200,240,255," + (0.85 * fade) + ")");
      g.addColorStop(0.5, "rgba(56,189,248," + (0.45 * fade) + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx + 16, dropY, 11.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "fireball") {
      for (i = 0; i < 6; i++) {
        ang = t * 3 + i;
        ox = cx + Math.cos(ang) * 28;
        oy = cy + Math.sin(ang) * 20;
        g = ctx.createRadialGradient(ox, oy, 0, ox, oy, 12);
        g.addColorStop(0, "rgba(255,220,120," + (0.7 * fade) + ")");
        g.addColorStop(1, "rgba(255,80,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox, oy, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === "flamethrower") {
      // Short nose-gun jet, lowered 2%, thinned 5%
      var dropY = cy + ((typeof H !== "undefined" ? H : 600) * 0.02);
      for (i = 0; i < 7; i++) {
        var dist = 12 + (i * 11) + (Math.sin(t * 20 + i) * 3);
        if (dist > 95) continue;
        var spread = (Math.sin(t * 14 + i * 1.7) * 0.13);
        ox = cx + 16 + dist * Math.cos(spread);
        oy = dropY + dist * Math.sin(spread) * 0.71 + Math.sin(t * 18 + i) * 1.9;
        r = (8 + 4 * (1 - i / 7) + Math.sin(t * 25 + i) * 1.5) * 0.95;
        g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r * 1.9);
        var a0 = (0.85 - i * 0.1) * fade;
        g.addColorStop(0, "rgba(255,250,200," + a0 + ")");
        g.addColorStop(0.4, "rgba(255,140,20," + (a0 * 0.7) + ")");
        g.addColorStop(0.75, "rgba(220,40,0," + (a0 * 0.3) + ")");
        g.addColorStop(1, "rgba(40,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox, oy, r * 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
      g = ctx.createRadialGradient(cx + 16, dropY, 0, cx + 16, dropY, 11.4);
      g.addColorStop(0, "rgba(255,255,220," + (0.85 * fade) + ")");
      g.addColorStop(0.5, "rgba(255,120,0," + (0.45 * fade) + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx + 16, dropY, 11.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "rockets" || kind === "meteors" || kind === "swarm" || kind === "storm") {
      for (i = 0; i < 8; i++) {
        ang = t * 2 + i * 0.8;
        ox = cx + Math.cos(ang) * 30;
        oy = cy + Math.sin(ang) * 22;
        g = ctx.createRadialGradient(ox, oy, 0, ox, oy, 10);
        g.addColorStop(0, "rgba(255,220,150," + (0.7 * fade) + ")");
        g.addColorStop(1, "rgba(255,100,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox, oy, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function update(dt) {
    for (var i = pool.length - 1; i >= 0; i--) {
      var p = pool[i];
      p.age += dt;
      if (p.age >= p.life) { pool.splice(i, 1); continue; }
      if (p.kind === "ring" || p.kind === "beam") continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      var drag = p.drag || 0;
      if (drag) {
        p.vx *= Math.max(0, 1 - drag * dt);
        p.vy *= Math.max(0, 1 - drag * dt);
      }
    }
  }

  function draw(ctx) {
    if (!ctx || !pool.length) return;
    ctx.save();
    for (var i = 0; i < pool.length; i++) {
      var p = pool[i];
      var t = p.age / p.life;
      var a = 1 - t;
      if (p.kind === "ring") {
        var rr = p.r0 + (p.r1 - p.r0) * t;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = p.color.replace(/[\d.]+\)$/ , (a * 0.9).toFixed(2) + ")");
        if (p.color.indexOf("rgba") < 0) ctx.strokeStyle = p.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = p.width * (1 - t * 0.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      if (p.kind === "beam") {
        ctx.globalAlpha = a;
        var grd = ctx.createLinearGradient(p.x, p.y, p.x + p.len, p.y);
        grd.addColorStop(0, p.color);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(p.x, p.y - p.height / 2, p.len, p.height);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = a;
      if (p.glow) ctx.globalCompositeOperation = "lighter";
      else ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 - t * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  function clear() { pool.length = 0; }

  window.PowerFX = {
    burst: burst,
    ring: ring,
    beam: beam,
    activate: activate,
    drawAura: drawAura,
    update: update,
    draw: draw,
    clear: clear
  };
})();

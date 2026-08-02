"use strict";

/* =====================================================================
   PLACEHOLDER ASSET GENERATOR
   Draws stand-in art for every sprite in the game with <canvas>, so the
   whole thing runs standalone with zero network requests while the real
   GitHub-hosted assets get sorted out. Flip PLACEHOLDER_MODE to false
   once the assets/ repo is live and everything switches back to the
   real raw.githubusercontent.com art automatically.
   ===================================================================== */
const PLACEHOLDER_MODE = false;

const PH_PAL = {
  ink: "#2b1c10",
  parchment: "#f0dfb8",
  brass: "#c9a66b",
  brassDark: "#8b6b3d",
  crimson: "#8b1e1e",
  crimsonDark: "#5e1212",
  sky1: "#7fb3d5",
  sky2: "#f5e6c8"
};

function phCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

function phRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function phDrawZeppelin(ctx, cx, cy, w, h, bodyColor, angle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle || 0);
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.strokeStyle = PH_PAL.ink;
  // tail fin
  ctx.fillStyle = PH_PAL.crimsonDark;
  ctx.beginPath();
  ctx.moveTo(-w * 0.44, -h * 0.05);
  ctx.lineTo(-w * 0.62, -h * 0.34);
  ctx.lineTo(-w * 0.26, -h * 0.1);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.46, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // brass rivet band
  ctx.strokeStyle = PH_PAL.brass;
  ctx.lineWidth = Math.max(1, w * 0.015);
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.3, h * 0.16, 0, 0, Math.PI * 2);
  ctx.stroke();
  // gondola
  ctx.fillStyle = PH_PAL.ink;
  ctx.fillRect(-w * 0.14, h * 0.22, w * 0.28, h * 0.14);
  ctx.restore();
}

function phDrawHeart(ctx, w, h, pips, maxPips) {
  const cx = w / 2, cy = h * 0.5, size = Math.min(w, h) * 0.42;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.32);
  ctx.bezierCurveTo(size, -size * 0.4, size * 0.5, -size, 0, -size * 0.2);
  ctx.bezierCurveTo(-size * 0.5, -size, -size, -size * 0.4, 0, size * 0.32);
  ctx.closePath();
  ctx.fillStyle = "#3a2a18";
  ctx.fill();
  ctx.save();
  ctx.clip();
  const fillH = size * 1.5 * (pips / maxPips);
  ctx.fillStyle = "#c9384a";
  ctx.fillRect(-size, size * 0.5 - fillH, size * 2, fillH);
  ctx.restore();
  ctx.strokeStyle = PH_PAL.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function phDrawStormCloud(ctx, w, h, boltPhase) {
  ctx.save();
  ctx.translate(w / 2, h * 0.42);
  ctx.fillStyle = "#4a4356";
  [[-0.28, 0.02, 0.24], [0, -0.08, 0.32], [0.3, 0.02, 0.24]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(w * x, h * y, w * r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = PH_PAL.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  // lightning bolt
  ctx.fillStyle = boltPhase ? "#ffe066" : "#f5d24a";
  ctx.beginPath();
  ctx.moveTo(-w * 0.04, h * 0.12);
  ctx.lineTo(w * 0.1, h * 0.12);
  ctx.lineTo(-w * 0.02, h * 0.32);
  ctx.lineTo(w * 0.06, h * 0.32);
  ctx.lineTo(-w * 0.14, h * 0.58);
  ctx.lineTo(-w * 0.02, h * 0.3);
  ctx.lineTo(-w * 0.1, h * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const PH_BLDG_COLORS = {
  bldg_cinema: "#7a4a8b", bldg_apothecary: "#3f7d4a", bldg_newspaper: "#5c5c5c",
  bldg_plain: "#8b6b3d", bldg_hotel: "#a83232", bldg_library: "#2f5f8a"
};
const PH_NUMBTN_COLORS = ["#a83232", "#2f5f8a", "#3f7d4a", PH_PAL.brassDark];

const phCache = {};

function renderPlaceholder(key) {
  if (phCache[key]) return phCache[key];

  const m = key.match(/^(.*)_(\d{2})$/);
  const base = m ? m[1] : key;
  const frame = m ? parseInt(m[2], 10) : 0;
  let w = 200, h = 200, c, ctx;

  if (key === "boss2") {
    w = 240; h = 150; c = phCanvas(w, h); ctx = c.getContext("2d");
    // menacing villain airship — darker hull, crimson trim, bigger fin
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = PH_PAL.ink;
    ctx.fillStyle = PH_PAL.crimson;
    ctx.beginPath();
    ctx.moveTo(-w * 0.46, -h * 0.06);
    ctx.lineTo(-w * 0.66, -h * 0.36);
    ctx.lineTo(-w * 0.28, -h * 0.1);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2c2a30";
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.46, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = PH_PAL.crimson;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.3, h * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();
    // twin glowing "eye" ports
    ctx.fillStyle = "#ffcf5c";
    ctx.beginPath(); ctx.arc(w * 0.16, -h * 0.02, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.3, -h * 0.02, 6, 0, Math.PI * 2); ctx.fill();
    // gondola with rocket-launch rack underneath
    ctx.fillStyle = PH_PAL.ink;
    ctx.fillRect(-w * 0.16, h * 0.2, w * 0.32, h * 0.16);
    ctx.restore();
  } else if (key === "rocket") {
    w = 70; h = 34; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.save();
    ctx.translate(w / 2, h / 2);
    // exhaust flame
    ctx.fillStyle = "#ffb347";
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, 0);
    ctx.lineTo(-w * 0.5, -h * 0.22);
    ctx.lineTo(-w * 0.5, h * 0.22);
    ctx.closePath(); ctx.fill();
    // body
    ctx.fillStyle = "#6b6b70";
    ctx.strokeStyle = PH_PAL.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.42, 0);
    ctx.lineTo(w * 0.2, -h * 0.32);
    ctx.lineTo(-w * 0.34, -h * 0.24);
    ctx.lineTo(-w * 0.34, h * 0.24);
    ctx.lineTo(w * 0.2, h * 0.32);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = PH_PAL.crimson;
    ctx.beginPath(); ctx.moveTo(w * 0.42, 0); ctx.lineTo(w * 0.2, -h * 0.14); ctx.lineTo(w * 0.2, h * 0.14); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (base === "player_blimp") {
    w = 220; h = 140; c = phCanvas(w, h); ctx = c.getContext("2d");
    const angle = Math.sin((frame / 36) * Math.PI * 2) * 0.12;
    phDrawZeppelin(ctx, w / 2, h / 2, w, h, "#a83232", angle);
  } else if (key === "blimp2_main") {
    w = 220; h = 140; c = phCanvas(w, h); ctx = c.getContext("2d");
    phDrawZeppelin(ctx, w / 2, h / 2, w, h, "#2f5f8a", 0);
  } else if (key === "blimp3_main") {
    w = 220; h = 140; c = phCanvas(w, h); ctx = c.getContext("2d");
    phDrawZeppelin(ctx, w / 2, h / 2, w, h, "#3f7d4a", 0);
  } else if (key === "blimp4_main" || key === "asset_extra_06") {
    w = 220; h = 140; c = phCanvas(w, h); ctx = c.getContext("2d");
    phDrawZeppelin(ctx, w / 2, h / 2, w, h, PH_PAL.brassDark, 0);
  } else if (/^asset_extra_(07|08|09|10)$/.test(key)) {
    w = 100; h = 70; c = phCanvas(w, h); ctx = c.getContext("2d");
    const idx = parseInt(key.slice(-2), 10) - 7;
    phDrawZeppelin(ctx, w / 2, h / 2, w, h, PH_NUMBTN_COLORS[idx] || "#a83232", 0);
  } else if (base === "bird_a" || base === "bird_b") {
    w = 100; h = 70; c = phCanvas(w, h); ctx = c.getContext("2d");
    const flap = Math.sin((frame / 36) * Math.PI * 4) * 0.6;
    const color = base === "bird_a" ? "#3a2a18" : "#5c4326";
    ctx.save(); ctx.translate(w / 2, h / 2);
    ctx.fillStyle = color; ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, w * 0.22, h * 0.18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-w * 0.42, -h * 0.4 * flap - h * 0.05); ctx.lineTo(-w * 0.1, h * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w * 0.42, -h * 0.4 * flap - h * 0.05); ctx.lineTo(w * 0.1, h * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else if (base === "balloon_anim") {
    w = 100; h = 130; c = phCanvas(w, h); ctx = c.getContext("2d");
    const bob = Math.sin((frame / 36) * Math.PI * 2) * 4;
    ctx.save(); ctx.translate(w / 2, h / 2 + bob);
    ctx.fillStyle = "#c9384a"; ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -h * 0.12, w * 0.36, h * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PH_PAL.brassDark;
    ctx.fillRect(-w * 0.1, h * 0.22, w * 0.2, h * 0.14);
    ctx.restore();
  } else if (base === "boss_throw" || key === "boss") {
    w = 200; h = 260; c = phCanvas(w, h); ctx = c.getContext("2d");
    const f = key === "boss" ? 1 : frame;
    const armAngle = -0.3 + (f / 25) * 1.4;
    ctx.save(); ctx.translate(w * 0.55, h * 0.5);
    ctx.fillStyle = "#4a2f18"; ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, w * 0.22, h * 0.34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -h * 0.42, w * 0.14, 0, Math.PI * 2); ctx.fillStyle = "#caa07a"; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(-w * 0.1, -h * 0.1); ctx.rotate(armAngle);
    ctx.fillStyle = "#4a2f18"; ctx.fillRect(0, -w * 0.06, w * 0.55, w * 0.12);
    ctx.restore();
    ctx.restore();
  } else if (key.indexOf("bldg_") === 0) {
    w = 140; h = 220; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.fillStyle = PH_BLDG_COLORS[key] || "#8b6b3d";
    ctx.fillRect(0, h * 0.1, w, h * 0.9);
    ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 3; ctx.strokeRect(0, h * 0.1, w, h * 0.9);
    ctx.fillStyle = "#f5e6c8";
    for (let ry = 0; ry < 5; ry++) {
      for (let rx = 0; rx < 3; rx++) {
        ctx.fillRect(w * 0.12 + rx * w * 0.3, h * 0.2 + ry * h * 0.15, w * 0.16, h * 0.08);
      }
    }
  } else if (key === "cloud") {
    w = 180; h = 90; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    [[0.3, 0.5, 0.28], [0.55, 0.4, 0.34], [0.75, 0.55, 0.22]].forEach(([x, y, r]) => {
      ctx.beginPath(); ctx.arc(w * x, h * y, w * r, 0, Math.PI * 2); ctx.fill();
    });
  } else if (key === "bomb") {
    w = 60; h = 80; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.fillStyle = "#1c1c1c"; ctx.beginPath(); ctx.arc(w / 2, h * 0.6, w * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#8b6b3d"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(w / 2, h * 0.32); ctx.quadraticCurveTo(w * 0.7, h * 0.1, w * 0.6, h * 0.02); ctx.stroke();
  } else if (key === "heartPickup" || /^asset_extra_1[1-4]$/.test(key)) {
    w = 90; h = 80; c = phCanvas(w, h); ctx = c.getContext("2d");
    let pips = 4;
    if (key === "asset_extra_11") pips = 0;
    else if (key === "asset_extra_12") pips = 1;
    else if (key === "asset_extra_13") pips = 2;
    else if (key === "asset_extra_14") pips = 3;
    phDrawHeart(ctx, w, h, pips, 4);
  } else if (key === "asset_extra_01") {
    w = 200; h = 40; c = phCanvas(w, h); ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, PH_PAL.brass); g.addColorStop(1, PH_PAL.brassDark);
    ctx.fillStyle = g; phRoundRect(ctx, 2, 2, w - 4, h - 4, h / 2); ctx.fill();
    ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 2; phRoundRect(ctx, 2, 2, w - 4, h - 4, h / 2); ctx.stroke();
  } else if (key === "asset_extra_02") {
    w = 60; h = 60; c = phCanvas(w, h); ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(w * 0.35, h * 0.35, 4, w / 2, h / 2, w / 2);
    g.addColorStop(0, "#f5e6c8"); g.addColorStop(1, PH_PAL.brassDark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 2; ctx.stroke();
  } else if (key === "asset_extra_03") {
    w = 400; h = 700; c = phCanvas(w, h); ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#7fb3d5"); g.addColorStop(0.55, "#c9dce8"); g.addColorStop(1, "#f5e6c8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(60,40,20,0.55)";
    for (let i = 0; i < 8; i++) {
      const bw = w * 0.12, bh = (0.15 + ((i * 37) % 10) / 10 * 0.35) * h;
      ctx.fillRect(i * w / 8, h - bh, bw, bh);
    }
  } else if (key === "asset_extra_04" || key === "asset_extra_05") {
    w = 400; h = 200; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(((i * 83) % w), ((i * 53) % (h * 0.6)) + h * 0.2, 30 + (i * 11) % 40, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (key === "menuBanner") {
    w = 650; h = 431; c = phCanvas(w, h); ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(201,166,107,0.15)");
    g.addColorStop(0.5, "rgba(201,166,107,0.35)");
    g.addColorStop(1, "rgba(201,166,107,0.15)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (key === "gasTank") {
    w = 90; h = 90; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.strokeStyle = PH_PAL.brass; ctx.lineWidth = 5;
    phRoundRect(ctx, 8, 8, w - 16, h - 16, 12); ctx.stroke();
  } else if (key === "stormCloud") {
    w = 160; h = 120; c = phCanvas(w, h); ctx = c.getContext("2d");
    phDrawStormCloud(ctx, w, h, true);
  } else if (key.startsWith("storm_cloud_")) {
    // Storm cloud animation frames - procedural dark storm clouds
    w = 200; h = 140; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.save();
    ctx.translate(w / 2, h * 0.42);
    // Dark stormy cloud body
    ctx.fillStyle = "#3a3542";
    [[-0.32, 0.0, 0.26], [0, -0.1, 0.34], [0.32, 0.0, 0.26]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(w * x, h * y, w * r, 0, Math.PI * 2);
      ctx.fill();
    });
    // Cloud outline
    ctx.strokeStyle = "#2a2530";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Lightning bolt (varies by frame number for animation)
    const frameNum = parseInt(key.split("_")[2], 10) || 1;
    const boltPhase = (frameNum % 12) < 6;
    if (boltPhase) {
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.moveTo(-w * 0.04, h * 0.12);
      ctx.lineTo(w * 0.1, h * 0.12);
      ctx.lineTo(-w * 0.02, h * 0.32);
      ctx.lineTo(w * 0.06, h * 0.32);
      ctx.lineTo(-w * 0.14, h * 0.58);
      ctx.lineTo(-w * 0.02, h * 0.3);
      ctx.lineTo(-w * 0.1, h * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else if (key === "boss3") {
    // ground-based tank — squat hull, treads, cannon pointing left toward the player
    w = 260; h = 170; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.save(); ctx.translate(w * 0.5, h * 0.58);
    ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 3;
    // treads
    ctx.fillStyle = "#2b2b2b";
    phRoundRect(ctx, -w * 0.42, h * 0.12, w * 0.84, h * 0.22, 10); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = "#4a4a4a";
      ctx.beginPath(); ctx.arc(-w * 0.36 + i * (w * 0.12), h * 0.23, h * 0.09, 0, Math.PI * 2); ctx.fill();
    }
    // hull
    ctx.fillStyle = "#3f6b3a";
    phRoundRect(ctx, -w * 0.36, -h * 0.1, w * 0.72, h * 0.26, 14); ctx.fill(); ctx.stroke();
    // turret
    ctx.fillStyle = "#4a7a44";
    ctx.beginPath(); ctx.ellipse(-w * 0.02, -h * 0.2, w * 0.22, h * 0.14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // cannon barrel, pointing left
    ctx.fillStyle = "#2c2c2c";
    ctx.fillRect(-w * 0.5, -h * 0.24, w * 0.34, h * 0.08);
    ctx.restore();
  } else if (key === "boss4") {
    // helicopter — fuselage, tail boom, blurred main rotor disc
    w = 260; h = 170; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.save(); ctx.translate(w * 0.5, h * 0.5);
    ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 3;
    // rotor blur
    ctx.fillStyle = "rgba(60,60,60,0.35)";
    ctx.beginPath(); ctx.ellipse(0, -h * 0.32, w * 0.46, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    // tail boom
    ctx.fillStyle = "#4a4a52";
    ctx.fillRect(w * 0.14, -h * 0.04, w * 0.34, h * 0.08);
    ctx.beginPath(); ctx.moveTo(w * 0.48, -h * 0.1); ctx.lineTo(w * 0.48, h * 0.08); ctx.lineTo(w * 0.4, h * 0.02); ctx.closePath(); ctx.fill(); ctx.stroke();
    // fuselage body
    ctx.fillStyle = "#5c5c66";
    ctx.beginPath(); ctx.ellipse(-w * 0.06, 0, w * 0.24, h * 0.16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // cockpit glass
    ctx.fillStyle = "#7fb3d5";
    ctx.beginPath(); ctx.ellipse(-w * 0.2, -h * 0.02, w * 0.1, h * 0.09, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // skids
    ctx.strokeStyle = "#2c2c2c"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-w * 0.22, h * 0.2); ctx.lineTo(w * 0.14, h * 0.2); ctx.stroke();
    // tail rotor
    ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.48, -h * 0.16); ctx.lineTo(w * 0.48, h * 0.02); ctx.stroke();
    ctx.restore();
  } else if (key === "boss5") {
    // mechanical octopus — riveted dome head, glowing eye, trailing tentacles
    w = 240; h = 220; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.save(); ctx.translate(w * 0.5, h * 0.42);
    ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 3;
    // tentacles
    ctx.strokeStyle = "#3a3a44"; ctx.lineWidth = 10; ctx.lineCap = "round";
    for (let i = 0; i < 5; i++) {
      const ang = -0.7 + i * 0.35;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.1);
      ctx.quadraticCurveTo(Math.sin(ang) * w * 0.3, h * 0.35, Math.sin(ang) * w * 0.42, h * 0.55);
      ctx.stroke();
    }
    // dome head
    ctx.fillStyle = "#4a4a56"; ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, w * 0.26, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, w * 0.26, h * 0.14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // rivets
    ctx.fillStyle = PH_PAL.brass;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.arc(i * w * 0.09, -h * 0.06, 3, 0, Math.PI * 2); ctx.fill();
    }
    // glowing eye
    ctx.fillStyle = "#ffcf5c";
    ctx.beginPath(); ctx.arc(0, -h * 0.02, w * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (key === "mini_blimp" || key.indexOf("mini_blimp2_") === 0) {
    // small villain blimp — same silhouette as the boss's, scaled down, purple livery
    w = 130; h = 82; c = phCanvas(w, h); ctx = c.getContext("2d");
    phDrawZeppelin(ctx, w / 2, h / 2, w, h, "#5c3a7a", 0);
  } else if (key === "mini_tank") {
    // small scout tank
    w = 120; h = 84; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.save(); ctx.translate(w * 0.5, h * 0.6);
    ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 2;
    ctx.fillStyle = "#2b2b2b";
    phRoundRect(ctx, -w * 0.4, h * 0.08, w * 0.8, h * 0.2, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#4a7a44";
    phRoundRect(ctx, -w * 0.32, -h * 0.14, w * 0.64, h * 0.24, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3f6b3a";
    ctx.beginPath(); ctx.ellipse(0, -h * 0.22, w * 0.16, h * 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2c2c2c";
    ctx.fillRect(-w * 0.46, -h * 0.26, w * 0.24, h * 0.06);
    ctx.restore();
  } else if (key === "mini_heli") {
    // small scout helicopter
    w = 130; h = 90; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.save(); ctx.translate(w * 0.5, h * 0.5);
    ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(60,60,60,0.35)";
    ctx.beginPath(); ctx.ellipse(0, -h * 0.3, w * 0.42, h * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6b6b74";
    ctx.beginPath(); ctx.ellipse(-w * 0.04, 0, w * 0.22, h * 0.15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#4a4a52";
    ctx.fillRect(w * 0.12, -h * 0.02, w * 0.32, h * 0.06);
    ctx.restore();
  } else if (key === "mini_ebomb") {
    // small flying mechanical bomb crackling with electricity
    w = 110; h = 110; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.save(); ctx.translate(w / 2, h / 2);
    ctx.fillStyle = "#1c1c1c"; ctx.strokeStyle = PH_PAL.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, h * 0.06, w * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#8b6b3d"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -h * 0.22); ctx.quadraticCurveTo(w * 0.18, -h * 0.38, w * 0.1, -h * 0.44); ctx.stroke();
    // electric sparks
    ctx.strokeStyle = "#ffe066"; ctx.lineWidth = 2;
    [[-1, -0.1], [1, -0.3], [-1, 0.4], [1, 0.35]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(sx * w * 0.3, sy * h * 0.4);
      ctx.lineTo(sx * w * 0.42, sy * h * 0.4 - 6);
      ctx.lineTo(sx * w * 0.38, sy * h * 0.4 + 8);
      ctx.lineTo(sx * w * 0.5, sy * h * 0.4 + 2);
      ctx.stroke();
    });
    ctx.restore();
  } else if (key === "shieldPickup") {
    // a bright blue shield bubble — the mid-flight invincibility pickup
    w = 90; h = 90; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.save(); ctx.translate(w / 2, h / 2);
    const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, w * 0.42);
    glow.addColorStop(0, "rgba(140,210,255,0.95)");
    glow.addColorStop(1, "rgba(80,160,230,0.3)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, w * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#123a5e"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, w * 0.34, 0, Math.PI * 2); ctx.stroke();
    // small shield glyph
    ctx.fillStyle = "#eaf6ff";
    ctx.beginPath();
    ctx.moveTo(0, -w * 0.2);
    ctx.quadraticCurveTo(w * 0.16, -w * 0.14, w * 0.16, 0);
    ctx.quadraticCurveTo(w * 0.16, w * 0.16, 0, w * 0.24);
    ctx.quadraticCurveTo(-w * 0.16, w * 0.16, -w * 0.16, 0);
    ctx.quadraticCurveTo(-w * 0.16, -w * 0.14, 0, -w * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (key === "streetlamp1") {
    w = 60; h = 200; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.save();
    ctx.translate(w / 2, 0);
    ctx.strokeStyle = PH_PAL.ink;
    ctx.lineWidth = 2;
    // post
    ctx.fillStyle = PH_PAL.brass;
    ctx.fillRect(-w * 0.06, h * 0.35, w * 0.12, h * 0.62);
    ctx.strokeRect(-w * 0.06, h * 0.35, w * 0.12, h * 0.62);
    // base
    ctx.fillRect(-w * 0.14, h * 0.92, w * 0.28, h * 0.08);
    ctx.strokeRect(-w * 0.14, h * 0.92, w * 0.28, h * 0.08);
    // lantern housing
    ctx.fillStyle = PH_PAL.brassDark;
    ctx.beginPath();
    ctx.moveTo(-w * 0.22, h * 0.35);
    ctx.lineTo(w * 0.22, h * 0.35);
    ctx.lineTo(w * 0.14, h * 0.06);
    ctx.lineTo(-w * 0.14, h * 0.06);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // warm glass glow
    const lampGlow = ctx.createRadialGradient(0, h * 0.2, 2, 0, h * 0.2, w * 0.24);
    lampGlow.addColorStop(0, "rgba(255,240,190,0.9)");
    lampGlow.addColorStop(1, "rgba(255,240,190,0)");
    ctx.fillStyle = lampGlow;
    ctx.beginPath(); ctx.arc(0, h * 0.2, w * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else {
    w = 100; h = 100; c = phCanvas(w, h); ctx = c.getContext("2d");
    ctx.fillStyle = PH_PAL.brassDark; ctx.fillRect(0, 0, w, h);
  }

  const url = c.toDataURL("image/png");
  phCache[key] = url;
  return url;
}

// ---- Patch the static menu/HUD images + CSS the moment the DOM is ready ----
if (PLACEHOLDER_MODE) {
  document.querySelector(".stageBg").src = renderPlaceholder("asset_extra_03");
  document.querySelector(".cloudLayer.cA").src = renderPlaceholder("asset_extra_04");
  document.querySelector(".cloudLayer.cB").src = renderPlaceholder("asset_extra_05");
  document.querySelector(".menuBanner img").src = renderPlaceholder("menuBanner");
  document.getElementById("healthImg").src = renderPlaceholder("heartPickup");

  const numBtnImgs = document.querySelectorAll(".numBtn img");
  ["asset_extra_07", "asset_extra_08", "asset_extra_09", "asset_extra_10"].forEach((key, i) => {
    if (numBtnImgs[i]) numBtnImgs[i].src = renderPlaceholder(key);
  });

  const stormIconEl = document.getElementById("stormIcon");
  if (stormIconEl) stormIconEl.src = renderPlaceholder("stormCloud");
}

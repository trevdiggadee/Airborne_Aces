"use strict";

  // ---------- Buildings — now continuous panoramic street-row strips (one
  // per level, cycling through until more level-specific art is provided),
  // scrolling in sync with the rest of the ground plane. Replaces the old
  // discrete per-building-sprite system. ----------
  const BUILDING_ROW_KEYS = ['streetrow1', 'streetrow2'];

  // Height profiles — measured directly from each image's alpha channel (60
  // samples across the width, each giving the fraction of the way down from
  // the top where solid content actually starts). Used so collision follows
  // the real building silhouette instead of a flat rectangle across the
  // whole strip — otherwise the player takes damage over open sky above a
  // short building just because it's within the same tile as a tall one.
  const STREETROW1_PROFILE = [0.302, 0.302, 0.302, 0.302, 0.24, 0.252, 0.406, 0.348, 0.348, 0.346, 0.365, 0.61, 0.61, 0.61, 0.431, 0.177, 0.15, 0.177, 0.177, 0.177, 0.542, 0.35, 0.35, 0.342, 0.342, 0.35, 0.431, 0.431, 0.431, 0.45, 0.142, 0.012, 0.104, 0.535, 0.448, 0.392, 0.404, 0.419, 0.621, 0.621, 0.625, 0.662, 0.683, 0.302, 0.233, 0.206, 0.202, 0.208, 0.223, 0.198, 0.219, 0.229, 0.433, 0.446, 0.456, 0.46, 0.492, 0.488, 0.452, 0.44];
  // Regenerated for the new level2_buildings_strip.png artwork (62 stitched
  // industrial buildings) — the old profile was measured against the
  // previous streetrow2.webp art and no longer matches this silhouette.
  // Sample columns that land in a transparent gap between buildings read as
  // 1.0 (solid starts at the very bottom), so open sky above a gap never
  // falsely triggers a hit.
  const STREETROW2_PROFILE = [0.802, 0.365, 0.497, 0.234, 0.581, 0.575, 0.593, 0.659, 0.323, 0.503, 0.018, 0.281, 0.551, 0.317, 0.695, 0.653, 0.425, 0.683, 0.491, 0.377, 0.581, 0.683, 0.647, 0.503, 1.0, 0.629, 0.467, 0.581, 1.0, 0.216, 0.647, 0.611, 0.713, 0.311, 0.581, 0.611, 0.653, 0.455, 0.623, 0.707, 0.701, 0.677, 0.587, 1.0, 0.683, 0.509, 0.557, 0.407, 0.772, 0.192, 0.689, 0.551, 0.587, 0.719, 0.665, 0.629, 0.341, 0.599, 0.281, 0.587];
  const BUILDING_ROW_PROFILES = { streetrow1: STREETROW1_PROFILE, streetrow2: STREETROW2_PROFILE };

  function buildingProfileTopFrac(b, sampleX) {
    const profile = BUILDING_ROW_PROFILES[buildingRowKey];
    if (!profile) return 0;
    const localFrac = Math.max(0, Math.min(0.9999, (sampleX - b.x) / b.w));
    const idx = Math.floor(localFrac * profile.length);
    return profile[idx];
  }
  let buildings = []; // tiles of the current strip: { x, w, h }
  let buildingRowKey = null;
  // When true, ground layers (buildings, street, lamps, powerlines) scroll off
  // and do NOT respawn — used for the level-1 landing sequence.
  let worldWindDown = false;
  let worldWindDownSpeedMult = 1.6;

  function currentBuildingRowKey() {
    // Keep level-1 buildings through boss-1 defeat, bonus round, and landing.
    // Switch to level-2 only after finishLevelEndAndResume re-inits the strip.
    if (bossesDefeatedCount === 1) {
      const holdL1 =
        (typeof bonusActive !== "undefined" && bonusActive) ||
        (typeof bonusPending !== "undefined" && bonusPending) ||
        (typeof levelEndActive !== "undefined" && levelEndActive) ||
        worldWindDown;
      if (holdL1) return BUILDING_ROW_KEYS[0]; // streetrow1
    }
    return BUILDING_ROW_KEYS[bossesDefeatedCount % BUILDING_ROW_KEYS.length];
  }

  function makeBuildingRowTile(xStart, key) {
    const img = images[key];
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 3.2;
    const h = H * 0.396; // was 0.33, +20%
    const w = h * aspect;
    return { x: xStart, w, h };
  }

  function initBuildings() {
    buildingRowKey = currentBuildingRowKey();
    buildings = [];
    let x = 0;
    while (x < W + 200) {
      const b = makeBuildingRowTile(x, buildingRowKey);
      buildings.push(b);
      x += b.w; // edge-to-edge — pre-blended to tile seamlessly
    }
    initStreetlamps();
    initPowerlines();
    initSketchSkyline();
    initStreetTiles();
  }

  function updateBuildings(dtScale) {
    // Freeze city in place during landing — pad approach = blimp flying forward
    if (worldWindDown || (typeof levelEndActive !== "undefined" && levelEndActive)) {
      return;
    }
    const targetKey = currentBuildingRowKey();
    if (targetKey !== buildingRowKey) {
      // Don't swap strips during bonus / pre-landing; wait for wind-down or resume
      if ((typeof bonusActive !== "undefined" && bonusActive) ||
          (typeof bonusPending !== "undefined" && bonusPending) ||
          (typeof levelEndActive !== "undefined" && levelEndActive)) {
        // keep scrolling current strip
      } else {
        initBuildings(); // level changed — rebuild with that level's strip
        return;
      }
    }
    const speed = 0.8 * dtScale * (obstacleSpeedScale());
    buildings.forEach(b => (b.x -= speed));
    while (buildings.length && buildings[0].x + buildings[0].w < -10) {
      buildings.shift();
    }
    const last = buildings[buildings.length - 1];
    if (!last || last.x + last.w < W + 200) {
      const startX = last ? last.x + last.w : 0;
      buildings.push(makeBuildingRowTile(startX, buildingRowKey));
    }
  }

  function groundLayersCleared() {
    // City freezes in place now; ready as soon as freeze/wind-down is active
    return worldWindDown;
  }

  function startWorldWindDown(speedMult) {
    worldWindDown = true;
    worldWindDownSpeedMult = speedMult || 1.8;
  }

  function stopWorldWindDown() {
    worldWindDown = false;
    worldWindDownSpeedMult = 1.6;
  }

  function obstacleSpeedScale() {
    // keep the ground scroll speed in step with the flying-obstacle speed ramp
    return obstacleSpeed / 220;
  }

  // shared ground line — raised up from the very bottom edge so there's room
  // for a proper street/sidewalk band beneath the buildings instead of just
  // a flat color strip
  function groundLevelY() {
    return H - Math.max(58, H * 0.088);
  }

  function drawBuildings() {
    const groundY = groundLevelY();
    const img = images[buildingRowKey];
    if (!img || !img.naturalWidth) return;
    buildings.forEach(b => {
      ctx.drawImage(img, b.x, groundY - b.h, b.w, b.h);
    });
  }

  // ---------- Distant sketch-skyline layer — sits behind the power lines,
  // positioned twice as high up (twice the vertical offset from the ground)
  // so it reads as further back/taller in the distance. Same tiling/scroll
  // approach as the power lines, just slower since it's further away. ----------
  let sketchSkylineTiles = [];

  function initSketchSkyline() {
    sketchSkylineTiles = [];
    const img = images.sketchSkyline;
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 1.5;
    const h = H * 0.495; // was 0.33, +50% (now anchored at ground, same base as power lines)
    const w = h * aspect;
    let x = 0;
    while (x < W + w) {
      sketchSkylineTiles.push({ x: x, w: w, h: h });
      x += w - 1;
    }
  }

  function updateSketchSkyline(dtScale) {
    // Hold the skyline still during the landing approach
    if (typeof levelEndActive !== "undefined" && levelEndActive) return;
    const speed = 0.35 * dtScale * obstacleSpeedScale(); // between parallax layer 3 (0.28) and power lines (0.4) — matches its position in the draw order
    sketchSkylineTiles.forEach(t => (t.x -= speed));
    while (sketchSkylineTiles.length && sketchSkylineTiles[0].x + sketchSkylineTiles[0].w < -10) {
      sketchSkylineTiles.shift();
    }
    const last = sketchSkylineTiles[sketchSkylineTiles.length - 1];
    if (!last || last.x + last.w < W + 200) {
      const startX = last ? last.x + last.w - 1 : 0;
      const h = last ? last.h : H * 0.495;
      const aspect = last ? last.w / last.h : 1.5;
      sketchSkylineTiles.push({ x: startX, w: h * aspect, h: h });
    }
  }

  function drawSketchSkyline() {
    const img = images.sketchSkyline;
    if (!img || !img.naturalWidth) return;
    const groundY = groundLevelY();
    // Anchored to the same ground base as the power lines (not floating above
    // them) — taller now, so it still reaches well above where it used to.
    const bottomY = groundY;
    ctx.save();
    ctx.globalAlpha = 0.8; // darker/more visible while still reading as distant (was 0.5)
    sketchSkylineTiles.forEach(t => {
      ctx.drawImage(img, t.x, bottomY - t.h, t.w, t.h);
    });
    ctx.restore();
  }

  // ---------- Power line silhouette layer — a background parallax strip that
  // sits behind the buildings and drifts at half their scroll speed (a bit
  // further back = a bit slower). The art has a transparent top half — that
  // comes through automatically via drawImage's alpha, nothing special
  // needed here as long as the source PNG keeps its alpha channel intact
  // (a JPEG re-export of it would flatten the transparent area to white). ----------
  let powerlineTiles = [];

  function initPowerlines() {
    powerlineTiles = [];
    const img = images.powerlines;
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 3;
    const h = H * 0.2904; // was 0.242, +20%
    const w = h * aspect;
    let x = 0;
    while (x < W + w) {
      powerlineTiles.push({ x: x, w: w, h: h });
      x += w - 1; // slight overlap so the seam never shows
    }
  }

  function updatePowerlines(dtScale) {
    if (worldWindDown || (typeof levelEndActive !== "undefined" && levelEndActive)) return;
    const speed = 0.4 * dtScale * obstacleSpeedScale();
    powerlineTiles.forEach(t => (t.x -= speed));
    while (powerlineTiles.length && powerlineTiles[0].x + powerlineTiles[0].w < -10) {
      powerlineTiles.shift();
    }
    const last = powerlineTiles[powerlineTiles.length - 1];
    if (!last || last.x + last.w < W + 200) {
      const startX = last ? last.x + last.w - 1 : 0;
      const h = last ? last.h : H * 0.2904;
      const img = images.powerlines;
      const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 4;
      powerlineTiles.push({ x: startX, w: h * aspect, h: h });
    }
  }

  function drawPowerlines() {
    const img = images.powerlines;
    if (!img || !img.naturalWidth) return;
    const groundY = groundLevelY();
    ctx.save();
    powerlineTiles.forEach(t => {
      ctx.drawImage(img, t.x, groundY - t.h, t.w, t.h);
    });
    ctx.restore();
  }

  // ---------- Street — a single tiled texture image replacing the old
  // procedural sidewalk+road strip, anchored to the very bottom of the
  // screen. Scrolls in sync with the buildings so it reads as one
  // continuous street, and is drawn after (in front of/above) the
  // buildings layer. ----------
  let streetTiles = [];

  function streetTileHeight() {
    return H - groundLevelY();
  }

  function initStreetTiles() {
    streetTiles = [];
    const img = images.streetTexture;
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 4;
    const h = streetTileHeight();
    const w = h * aspect;
    let x = 0;
    while (x < W + w) {
      streetTiles.push({ x, w, h });
      x += w - 1;
    }
  }

  function updateStreet(dtScale) {
    if (worldWindDown || (typeof levelEndActive !== "undefined" && levelEndActive)) return;
    const speed = 0.8 * dtScale * obstacleSpeedScale();
    if (!streetTiles.length) initStreetTiles();
    streetTiles.forEach(t => (t.x -= speed));
    while (streetTiles.length && streetTiles[0].x + streetTiles[0].w < -10) {
      streetTiles.shift();
    }
    const last = streetTiles[streetTiles.length - 1];
    if (!last || last.x + last.w < W + 200) {
      const img = images.streetTexture;
      const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 4;
      const h = last ? last.h : Math.max(58, H * 0.088);
      const startX = last ? last.x + last.w : 0;
      streetTiles.push({ x: startX, w: h * aspect, h });
    }
  }

  function drawStreet() {
    const img = images.streetTexture;
    if (!img || !img.naturalWidth) return;
    streetTiles.forEach(t => {
      ctx.drawImage(img, t.x, H - t.h, t.w, t.h);
    });
  }

  // ---------- Smokestack smoke (decorative) — level 3 factory buildings puff
  // smoke from their chimneys as they scroll by. Chimney x-positions below
  // were measured directly from each building's art (tallest opaque column
  // near the top edge of the image). ----------
  const BUILDING_SMOKESTACKS = {
    bldg_l3_factoryrow:   [0.07, 0.234],
    bldg_l3_smokestacks:  [0.296, 0.723],
    bldg_l3_furnacehouse: [0.389],
    bldg_l3_minetower:    [0.544],
    bldg_l3_clocktower:   [0.31]
  };
  let buildingSmokeParticles = [];

  function updateBuildingSmoke(dt) {
    const groundY = groundLevelY();
    const worldSpeedPxPerSec = 48 * obstacleSpeedScale(); // matches the buildings' own scroll speed
    buildings.forEach(b => {
      const stacks = BUILDING_SMOKESTACKS[b.key];
      if (!stacks) return;
      if (b.smokeTimer == null) b.smokeTimer = Math.random() * 0.6;
      b.smokeTimer -= dt;
      if (b.smokeTimer <= 0) {
        b.smokeTimer = 0.4 + Math.random() * 0.4;
        const top = groundY - b.h;
        stacks.forEach(frac => {
          buildingSmokeParticles.push({
            x: b.x + b.w * frac + (Math.random() - 0.5) * 4,
            y: top + (Math.random() - 0.5) * 3,
            vx: -worldSpeedPxPerSec + (Math.random() - 0.5) * 10,
            vy: -20 - Math.random() * 12,
            size: 5 + Math.random() * 4,
            life: 2.4 + Math.random() * 1.4,
            age: 0
          });
        });
      }
    });

    buildingSmokeParticles.forEach(p => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy *= 0.992;
      p.vx *= 0.995;
      p.size += dt * 5.5; // smoke expands as it rises and disperses
    });
    buildingSmokeParticles = buildingSmokeParticles.filter(p => p.age < p.life);
  }

  function drawBuildingSmoke() {
    buildingSmokeParticles.forEach(p => {
      const t = p.age / p.life;
      const alpha = (1 - t) * 0.32;
      ctx.save();
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, "rgba(175,170,162,0.85)");
      grad.addColorStop(1, "rgba(175,170,162,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // ---------- Street lamps (decorative, no collision) — level 1 only. A
  // single lamp image, spaced out along the sidewalk, sized to never exceed
  // 25% of the (now fixed) building height. Drawn after the buildings so
  // they sit in front of the building facades. ----------
  let streetlamps = [];
  const STREETLAMP_GAP_MIN = 260;
  const STREETLAMP_GAP_MAX = 420;

  function isStreetlampLevel() {
    return gameplayScore < BOSSES[0].threshold; // level 1 = before the first boss
  }

  function makeStreetlamp(xStart) {
    const img = images.streetlamp1;
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 0.3;
    const h = (H * 0.396) * 0.25; // matches the fixed building height (now +20%), capped at 25% of it
    const w = h * aspect;
    return { x: xStart, w, h };
  }

  function initStreetlamps() {
    streetlamps = [];
    if (!isStreetlampLevel()) return;
    let x = 150;
    while (x < W + 400) {
      streetlamps.push(makeStreetlamp(x));
      x += STREETLAMP_GAP_MIN + Math.random() * (STREETLAMP_GAP_MAX - STREETLAMP_GAP_MIN);
    }
  }

  function updateStreetlamps(dtScale) {
    if (!isStreetlampLevel()) {
      if (streetlamps.length) streetlamps = [];
      return;
    }
    if (worldWindDown || (typeof levelEndActive !== "undefined" && levelEndActive)) return;
    const speed = 0.8 * dtScale * (obstacleSpeedScale()); // same speed as buildings — same ground plane
    streetlamps.forEach(l => (l.x -= speed));
    while (streetlamps.length && streetlamps[0].x + streetlamps[0].w < -10) {
      streetlamps.shift();
    }
    const last = streetlamps[streetlamps.length - 1];
    if (!last || last.x < W + 400) {
      const gap = STREETLAMP_GAP_MIN + Math.random() * (STREETLAMP_GAP_MAX - STREETLAMP_GAP_MIN);
      const startX = last ? last.x + gap : W + 200;
      streetlamps.push(makeStreetlamp(startX));
    }
  }

  function drawStreetlamps() {
    if (!isStreetlampLevel()) return;
    const img = images.streetlamp1;
    if (!img || !img.naturalWidth) return;
    const groundY = groundLevelY();
    streetlamps.forEach(l => {
      const top = groundY - l.h;
      ctx.drawImage(img, l.x, top, l.w, l.h);
    });
  }

  // ---------- Ground vehicles (decorative, no collision) — real art, two
  // types driving each direction (matching each image's natural facing, so
  // nothing needs to be mirrored). ----------
  let groundVehicles = [];
  let vehicleSpawnTimer = 3 + Math.random() * 4;
  // dir: 1 = drives left-to-right (art faces right), -1 = right-to-left (art faces left)
  const VEHICLE_DEFS = [
    { key: "vehicle_towtruck", dir: 1 },
    { key: "vehicle_tanker", dir: 1 },
    { key: "vehicle_transit", dir: -1 },
    { key: "vehicle_roadster", dir: -1 }
  ];

  function spawnGroundVehicle() {
    const def = VEHICLE_DEFS[Math.floor(Math.random() * VEHICLE_DEFS.length)];
    const img = images[def.key];
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 2.4;
    const scale = Math.min(1.6, W / 500);
    const h = 46 * scale;
    const w = h * aspect;
    groundVehicles.push({
      key: def.key,
      x: def.dir === 1 ? -w - 20 : W + 20,
      w, h,
      dir: def.dir,
      speed: (26 + Math.random() * 22) * scale
    });
  }

  function updateGroundVehicles(dt, dtScale) {
    if (worldWindDown || (typeof levelEndActive !== "undefined" && levelEndActive)) return;
    vehicleSpawnTimer -= dt;
    if (vehicleSpawnTimer <= 0) {
      vehicleSpawnTimer = 4.5 + Math.random() * 6;
      if (groundVehicles.length < 3) spawnGroundVehicle();
    }
    const worldScroll = 0.8 * dtScale * obstacleSpeedScale(); // same ground-plane speed as buildings
    groundVehicles.forEach(v => {
      v.x += v.dir * v.speed * dt - worldScroll;
    });
    groundVehicles = groundVehicles.filter(v => v.x > -160 && v.x < W + 160);
  }

  function drawGroundVehicles() {
    // anchored toward the bottom of the street band (where the road portion
    // of the texture is expected to be) rather than the top edge, which
    // sits right against the buildings/sidewalk
    const vehicleBottomY = H - streetTileHeight() * 0.18;
    groundVehicles.forEach(v => {
      const img = images[v.key];
      if (!img || !img.naturalWidth) return;
      const y = vehicleBottomY - v.h;
      ctx.drawImage(img, v.x, y, v.w, v.h);
    });
  }

  function checkBuildingCollision() {
    if (bonusActive) return; // invincible during the bonus round
    const groundY = groundLevelY();
    const px1 = player.x - (player.w / 2) * 0.7;
    const px2 = player.x + (player.w / 2) * 0.7;
    const pBottom = player.y + (player.h / 2) * 0.7;

    for (const b of buildings) {
      const overlapsX = px2 > b.x && px1 < b.x + b.w;
      if (!overlapsX) continue;
      // sample the real silhouette height at the player's own position, rather
      // than treating the whole tile as one flat-topped block
      const sampleX = Math.max(b.x, Math.min(b.x + b.w, player.x));
      const topFrac = buildingProfileTopFrac(b, sampleX);
      const solidTop = (groundY - b.h) + topFrac * b.h;
      if (pBottom > solidTop) {
        takeHit();
        return;
      }
    }
  }

  // ---------- Far backdrop (decorative, no collision) — the farthest-back
  // image layer, sitting behind the skyline parallax layer and everything
  // else. Drawn at partial opacity so the procedural sky gradient still
  // shows/tints through it. ----------
  let skylineX = 0;
  function updateSkyline(dtScale) {
    const speed = 0.05 * dtScale * obstacleSpeedScale(); // very slow — reads as far away, but still moving with the scene
    skylineX -= speed;
  }
  function drawSkyline() {
    // The Far_Bg.jpg asset was shipping with its transparent areas baked in
    // as a literal checkerboard (instead of being flattened onto a solid/sky
    // color before export), so drawing it here was punching a checkerboard
    // hole straight through the sky. Rather than depend on that external
    // image at all, paint a soft procedural haze band using the SAME colors
    // as the live sky gradient (getSkyColors) — it always matches the
    // current day/dusk/night/dawn tint exactly, and can never fail to load,
    // 404, or show through as broken/transparent.
    const sky = getSkyColors(gameplayScore);
    ctx.save();
    ctx.globalAlpha = 0.35;
    const haze = ctx.createLinearGradient(0, 0, 0, H);
    haze.addColorStop(0, sky.top);
    haze.addColorStop(1, sky.bottom);
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ---------- Clouds (decorative, no collision) ----------
  let clouds = [];
  function initClouds() {
    clouds = [];
    for (let i = 0; i < 3; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 40 + Math.random() * (H * 0.35),
        // At least 50% smaller (was 0.4–0.9, now 0.15–0.40)
        scale: 0.15 + Math.random() * 0.25,
        speed: 0.15 + Math.random() * 0.2,
        alpha: 0.35 + Math.random() * 0.3
      });
    }
  }
  function updateClouds(dtScale) {
    // Freeze clouds during landing so background stays put
    if (typeof levelEndActive !== "undefined" && levelEndActive) return;
    const img = images.cloud;
    const baseW = (img && img.naturalWidth) ? img.naturalWidth : 256;
    clouds.forEach(c => {
      c.x -= c.speed * dtScale;
      // Fully off-screen (entire cloud past left edge) before recycling
      const drawnW = baseW * c.scale;
      if (c.x + drawnW < 0) {
        c.x = W + 20 + Math.random() * 100;
        c.y = 40 + Math.random() * (H * 0.35);
        c.scale = 0.15 + Math.random() * 0.25;
        c.speed = 0.15 + Math.random() * 0.2;
        c.alpha = 0.35 + Math.random() * 0.3;
      }
    });
  }
  function drawClouds() {
    const img = images.cloud;
    if (!img || !img.naturalWidth) return;
    clouds.forEach(c => {
      const w = img.naturalWidth * c.scale;
      const h = img.naturalHeight * c.scale;
      ctx.globalAlpha = c.alpha;
      ctx.drawImage(img, c.x, c.y, w, h);
      ctx.globalAlpha = 1;
    });
  }

  // ---------- Distant bird flock (decorative, no collision) — a small V-shaped
  // group that periodically drifts across the far background, part of the
  // same parallax feel as the clouds/skyline, using the existing bird sprites
  // scaled down and faded for distance ----------
  let birdFlocks = [];
  let birdFlockTimer = 6 + Math.random() * 8; // first flock arrives fairly soon

  function spawnBirdFlock() {
    const useB = Math.random() < 0.5;
    const keys = useB ? BIRD_B_KEYS : BIRD_A_KEYS;
    const count = 4 + Math.floor(Math.random() * 4); // 4-7 birds
    const members = [{ ox: 0, oy: 0, phase: Math.random() * Math.PI * 2 }];
    for (let i = 1; i < count; i++) {
      const side = i % 2 === 1 ? -1 : 1;
      const rank = Math.ceil(i / 2);
      members.push({
        ox: rank * (10 + Math.random() * 4),
        oy: rank * (5 + Math.random() * 3) * side,
        phase: Math.random() * Math.PI * 2
      });
    }
    birdFlocks.push({
      x: W + 60,
      y: H * (0.08 + Math.random() * 0.32),
      size: 16 + Math.random() * 8, // small — reads as distant
      speed: 26 + Math.random() * 18, // slow parallax drift, much slower than gameplay obstacles
      alpha: 0.4 + Math.random() * 0.22,
      keys,
      members,
      animFrame: Math.floor(Math.random() * OBSTACLE_ANIM_FRAME_COUNT),
      animTimer: Math.random() / OBSTACLE_ANIM_FPS,
      bobPhase: Math.random() * Math.PI * 2
    });
  }

  function updateBirdFlocks(dt) {
    if (typeof levelEndActive !== "undefined" && levelEndActive) return;
    birdFlockTimer -= dt;
    if (birdFlockTimer <= 0) {
      birdFlockTimer = 22 + Math.random() * 26; // periodic — not a constant presence
      spawnBirdFlock();
    }
    const frameDuration = 1 / OBSTACLE_ANIM_FPS;
    birdFlocks.forEach(f => {
      f.x -= f.speed * dt;
      f.bobPhase += dt * 0.8;
      f.animTimer += dt;
      while (f.animTimer >= frameDuration) {
        f.animTimer -= frameDuration;
        f.animFrame = (f.animFrame + 1) % OBSTACLE_ANIM_FRAME_COUNT;
      }
    });
    birdFlocks = birdFlocks.filter(f => f.x > -80);
  }

  function drawBirdFlocks() {
    birdFlocks.forEach(f => {
      const img = images[f.keys[f.animFrame]];
      if (!img || !img.naturalWidth) return;
      const aspect = img.naturalHeight / img.naturalWidth;
      const w = f.size;
      const h = w * aspect;
      const baseY = f.y + Math.sin(f.bobPhase) * 5;
      ctx.globalAlpha = f.alpha;
      f.members.forEach(m => {
        const bob = Math.sin(f.bobPhase * 1.3 + m.phase) * 3;
        ctx.drawImage(img, f.x + m.ox - w / 2, baseY + m.oy + bob - h / 2, w, h);
      });
      ctx.globalAlpha = 1;
    });
  }


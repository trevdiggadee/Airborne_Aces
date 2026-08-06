"use strict";

// ---------- Pre-boss dialogue (retro VS-screen style) ----------
const BOSS_TAUNTS = [
  "You'll never get past me, flyboy!",
  "Turn back now, while you still can!",
  "Ha! Another blimp for the scrap heap!",
  "This sky belongs to ME now!",
  "You call that flying? Pathetic!",
  "Prepare to be grounded, permanently!",
  "I've crushed better pilots than you!",
  "Say goodbye to your propeller!"
];
const PLAYER_RETORTS = [
  "Not on my watch!",
  "We'll see about that!",
  "Bring it on!",
  "This sky's got room for one more win.",
  "You talk big for a pile of gears.",
  "Let's dance, tin can!",
  "I've flown through worse than you!",
  "Big talk for something made of scrap!"
];

let bossDialogueSkip = null;

function startBossDialogue(num) {
  state = "bossDialogue";

  const overlay = document.getElementById("bossDialogueOverlay");
  const bossBubble = document.getElementById("dlgBossBubble");
  const playerBubble = document.getElementById("dlgPlayerBubble");

  const cfg = bossConfig(num);
  const bossImg = bossPortraitImg(num);
  const dlgBossImgEl = document.getElementById("dlgBossImg");
  dlgBossImgEl.onerror = () => { dlgBossImgEl.style.visibility = "hidden"; };
  dlgBossImgEl.style.visibility = "visible";
  dlgBossImgEl.src = (bossImg && bossImg.naturalWidth) ? bossImg.src : "";
  document.getElementById("dlgBossName").textContent = (cfg && cfg.name) ? cfg.name : "BOSS " + num;
  // Prefer the static hero portrait so the dialogue VS screen always shows the
  // selected blimp (animated frames can be blank/failed and were hiding the img).
  const dlgPlayerImgEl = document.getElementById("dlgPlayerImg");
  dlgPlayerImgEl.onerror = () => {
    // one retry with the live gameplay frame before giving up
    const fallback = (typeof currentPlayerImage === "function") ? currentPlayerImage() : null;
    if (fallback && fallback.src && dlgPlayerImgEl.dataset.retried !== "1") {
      dlgPlayerImgEl.dataset.retried = "1";
      dlgPlayerImgEl.src = fallback.src;
    }
  };
  dlgPlayerImgEl.dataset.retried = "";
  dlgPlayerImgEl.style.visibility = "visible";
  dlgPlayerImgEl.style.opacity = "1";
  dlgPlayerImgEl.style.display = "block";

  let portraitSrc = "";
  const sel = (typeof selectedBlimp !== "undefined") ? selectedBlimp : "blimp1";
  if (typeof BLIMP_HERO_KEYS !== "undefined" && BLIMP_HERO_KEYS[sel] && images[BLIMP_HERO_KEYS[sel]]) {
    const hero = images[BLIMP_HERO_KEYS[sel]];
    if (hero && hero.naturalWidth) portraitSrc = hero.src;
  }
  if (!portraitSrc && typeof BLIMP_DATA !== "undefined" && BLIMP_DATA[sel]) {
    // Menu static url (e.g. ship_wood.png)
    portraitSrc = BLIMP_DATA[sel].url || "";
  }
  if (!portraitSrc) {
    const playerImg = (typeof currentPlayerImage === "function") ? currentPlayerImage() : null;
    if (playerImg && playerImg.src) portraitSrc = playerImg.src;
  }
  dlgPlayerImgEl.src = portraitSrc || "";

  const tauntPool = (cfg && cfg.taunts && cfg.taunts.length) ? cfg.taunts : BOSS_TAUNTS;
  const retortPool = (cfg && cfg.retorts && cfg.retorts.length) ? cfg.retorts : PLAYER_RETORTS;
  const bossLineText = tauntPool[Math.floor(Math.random() * tauntPool.length)];
  const playerLineText = retortPool[Math.floor(Math.random() * retortPool.length)];
  const bossTextEl = document.getElementById("dlgBossText");
  const playerTextEl = document.getElementById("dlgPlayerText");
  bossTextEl.textContent = "";
  playerTextEl.textContent = "";

  bossBubble.classList.add("hidden");
  playerBubble.classList.add("hidden");
  overlay.classList.remove("hidden");

  let phase = 0; // 0 = nothing shown yet, 1 = boss line shown, 2 = both shown
  let timer = null;
  let typewriterTimer = null;
  let typingActive = false;
  let completeTyping = null; // set while a line is typing; instantly finishes it when called

  const TYPE_CHAR_DELAY = 34; // ms per character
  const READ_PAUSE = 2700; // ms to linger after a line finishes typing

  function typeText(el, text, onDone) {
    el.textContent = "";
    const caret = document.createElement("span");
    caret.className = "dlgCaret";
    caret.textContent = "|";
    el.appendChild(caret);
    let i = 0;
    typingActive = true;

    function finishInstantly() {
      clearTimeout(typewriterTimer);
      el.textContent = text;
      typingActive = false;
      completeTyping = null;
      onDone();
    }
    completeTyping = finishInstantly;

    function step() {
      if (i >= text.length) {
        typingActive = false;
        completeTyping = null;
        caret.remove();
        onDone();
        return;
      }
      el.textContent = text.slice(0, i + 1);
      el.appendChild(caret);
      if (text[i].trim()) sfxTypewriterTick();
      i++;
      typewriterTimer = setTimeout(step, TYPE_CHAR_DELAY);
    }
    step();
  }

  function showBossLine() {
    phase = 1;
    bossBubble.classList.remove("hidden");
    typeText(bossTextEl, bossLineText, () => {
      timer = setTimeout(showPlayerLine, READ_PAUSE);
    });
  }
  function showPlayerLine() {
    phase = 2;
    playerBubble.classList.remove("hidden");
    typeText(playerTextEl, playerLineText, () => {
      timer = setTimeout(finish, READ_PAUSE);
    });
  }
  function finish() {
    clearTimeout(timer);
    clearTimeout(typewriterTimer);
    overlay.classList.add("hidden");
    overlay.removeEventListener("pointerdown", skip);
    skipBtn.removeEventListener("pointerdown", onSkipBtnPointerDown);
    bossDialogueSkip = null;
    if (state === "bossDialogue") {
      state = "playing";
      triggerBoss(num);
    }
  }
  function skip() {
    clearTimeout(timer);
    if (typingActive && completeTyping) {
      completeTyping(); // first tap while typing just finishes the line instantly
    } else if (phase === 0) {
      showBossLine();
    } else if (phase === 1) {
      showPlayerLine();
    } else {
      finish();
    }
  }
  function onSkipBtnPointerDown(e) {
    e.stopPropagation();
    skip();
  }

  const skipBtn = document.getElementById("dlgSkipBtn");
  bossDialogueSkip = skip;
  overlay.addEventListener("pointerdown", skip);
  skipBtn.addEventListener("pointerdown", onSkipBtnPointerDown);
  timer = setTimeout(showBossLine, 400);
}

function bossPortraitImg(num) {
  return num === 2 ? (images[BOSS2_FRAME_KEYS[0]] || images.boss2)
    : num === 3 ? (images[BOSS3_FRAME_KEYS[0]] || images.boss3)
    : num === 4 ? (images[BOSS4_FRAME_KEYS[0]] || images.boss4)
    : (images[bossImgKey(num)] || images.boss);
}

function triggerBoss(num) {
    const cfg = bossConfig(num);
    setMusicTheme(THEME_BOSS);
    lastBossTriggered = num;
    bossActive = true;
    bossNumber = num;
    obstacles = []; // clear the sky for the encounter

    const isGround = cfg.kind === "tank";
    const bossImg = bossPortraitImg(num);
    const aspect = imgAspect(bossImg);
    const sizeMult = 1 + (num - 1) * 0.06; // each boss reads a touch bigger/tougher than the last
    // boss 2's sprite is a wide blimp silhouette (short + very wide), so the normal
    // height-based sizing formula made it read as oversized once divided by its aspect
    // ratio — scale it down specifically so it matches the others visually
    const kindSizeScale = num === 2 ? (2 / 3) : 1; // boss 2 at 2x original size
    const dispH = Math.min(H * (isGround ? 0.32 : 0.42) * sizeMult, isGround ? 220 : 300) * kindSizeScale;
    const dispW = dispH / aspect;
    const groundY = groundLevelY();

    boss = {
      x: W + dispW,
      y: isGround ? groundY - dispH + dispH * 0.1 : H * 0.38, // ground-based bosses sink in a bit — their sprite tends to have empty padding at the bottom
      w: dispW,
      h: dispH,
      // the bomber's (boss 2's) sprite has extra transparent padding on its left (room
      // for the throwing arm to extend during the animation), so its visible character
      // only fills roughly the right 65% of dispW — pull its resting position in so it
      // doesn't clip off the right edge. Other bosses don't have that padding, so they're
      // clamped to just stay fully on-screen instead of using the same offset.
      targetX: (function () {
        const edgeMargin = W * 0.02;
        const paddedTarget = W - dispW * 0.55;
        if (num === 2) return paddedTarget;
        // Boss 3 (tank) sits ~25% further back (toward the right edge)
        if (num === 3 || cfg.kind === "tank") {
          const back = W - dispW * 0.22;
          return Math.min(back, W - dispW * 0.06 - edgeMargin);
        }
        return Math.min(paddedTarget, W - dispW - edgeMargin);
      })(),
      groundBaseY: isGround ? groundY - dispH + dispH * 0.1 : null,
      health: cfg.maxHealth,
      maxHealth: cfg.maxHealth,
      bobPhase: 0,
      arrived: false,
      variant: num,
      kind: cfg.kind,
      attackTimer: 1.6,
      animFrame: 0,
      animTimer: 0
    };

    bombTimer = 1.5;
    bossThrowFrame = 0;
    bossThrowFrameTimer = 0;
    bossThrowBombSpawned = false;
    rockets = [];
    rocketTimer = 1.6;
    playerBombs = [];
    playerBombTrailParticles = [];
    arcBombTimer = 0.6;
    showBanner(cfg.label, 2200, "boss");

    // power-up starts drifting in shortly after the boss arrives
    powerup = null;
    hasFirepower = false;
    hasDualFire = false;
    hasArcBomb = false;
    powerupRespawnTimer = 1.2;
  }

  function updateBoss(dt) {
    if (!boss) return;

    if (!boss.arrived) {
      const arriveSpeed = boss.kind === "tank" ? 1.2 : 1.8; // the tank rolls in, everyone else flies in
      boss.x += (boss.targetX - boss.x) * Math.min(1, dt * arriveSpeed);
      if (Math.abs(boss.x - boss.targetX) < 2) boss.arrived = true;
    } else if (boss.kind === "tank") {
      // ground-based: sits on the street and rumbles in place, no bob
      boss.bobPhase += dt * 8;
      boss.y = boss.groundBaseY + Math.sin(boss.bobPhase) * 2;

      // patrol back and forth along the street to simulate tank movement —
      // up to 50% of the screen width of total travel range, centered on
      // its resting spot
      boss.patrolPhase = (boss.patrolPhase || 0) + dt * 0.35;
      const maxLeftSwing = boss.targetX - W * 0.5;       // never cross the screen's halfway line
      const maxRightSwing = (W - boss.w * 0.08) - boss.targetX; // never go off the right edge
      const patrolAmplitude = Math.max(0, Math.min(W * 0.25, maxLeftSwing, maxRightSwing));
      boss.x = boss.targetX + Math.sin(boss.patrolPhase) * patrolAmplitude;

      if (boss.variant === 3) {
        // boss 3 has a real 36-frame idle animation — cycle through it
        boss.animTimer += dt;
        const frameDur = 1 / BOSS3_ANIM_FPS;
        while (boss.animTimer >= frameDur) {
          boss.animTimer -= frameDur;
          boss.animFrame = (boss.animFrame + 1) % BOSS3_FRAME_KEYS.length;
        }
      }

      boss.attackTimer -= dt;
      if (boss.attackTimer <= 0) {
        boss.attackTimer = 1.7 + Math.random() * 0.9;
        // Cannon muzzle (upper center of the tank turret)
        const startX = boss.x + boss.w * 0.42;
        const startY = boss.y + boss.h * 0.18;
        // Arcing shell
        spawnArcBomb(bombs, startX, startY, player.x, player.y, 360, 1.0, 1.3, "boss3_shell");
        // Boss-2 style rocket, scaled down
        const dx = player.x - startX;
        const dy = player.y - startY;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const spd = (typeof ROCKET_SPEED !== "undefined" ? ROCKET_SPEED : 280) * 0.85;
        rockets.push({
          x: startX,
          y: startY,
          vx: (dx / dist) * spd,
          vy: (dy / dist) * spd,
          r: Math.min(11, W * 0.028), // ~60% of boss-2 rocket size
          health: 2,
          maxHealth: 2,
          angle: Math.atan2(dy, dx),
          animFrame: 0,
          animTimer: Math.random() * 0.05,
          frameKeys: (typeof ROCKET_FLIGHT_KEYS !== "undefined") ? ROCKET_FLIGHT_KEYS : null
        });
        if (typeof sfxShoot === "function") sfxShoot();
      }
    } else if (boss.kind === "rocket" || boss.kind === "heli") {
      // floating villain blimp / helicopter — both fire straight-line homing rockets
      boss.bobPhase += dt * 1.1;
      boss.y = H * 0.3 + Math.sin(boss.bobPhase) * (H * 0.1);

      if (boss.variant === 2) {
        // boss 2 has a real 36-frame idle animation — cycle through it
        boss.animTimer += dt;
        const frameDur = 1 / BOSS2_ANIM_FPS;
        while (boss.animTimer >= frameDur) {
          boss.animTimer -= frameDur;
          boss.animFrame = (boss.animFrame + 1) % BOSS2_FRAME_KEYS.length;
        }
      } else if (boss.variant === 4) {
        // boss 4 also has a real 36-frame idle animation — cycle through it
        boss.animTimer += dt;
        const frameDur = 1 / BOSS4_ANIM_FPS;
        while (boss.animTimer >= frameDur) {
          boss.animTimer -= frameDur;
          boss.animFrame = (boss.animFrame + 1) % BOSS4_FRAME_KEYS.length;
        }
      }

      boss.attackTimer -= dt;
      if (boss.attackTimer <= 0) {
        boss.attackTimer = (boss.kind === "heli" ? 1.4 : 1.7) + Math.random() * 1.0;
        const startX = boss.x + boss.w * 0.08;
        const startY = boss.y + boss.h * 0.62;
        const dx = player.x - startX;
        const dy = player.y - startY;
        const dist = Math.max(1, Math.hypot(dx, dy));
        rockets.push({
          x: startX,
          y: startY,
          vx: (dx / dist) * ROCKET_SPEED,
          vy: (dy / dist) * ROCKET_SPEED,
          r: Math.min(18, W * 0.045),
          health: Math.random() < 0.5 ? 2 : 3,
          maxHealth: 3,
          angle: Math.atan2(dy, dx),
          animFrame: 0,
          animTimer: Math.random() * (1 / ROCKET_ANIM_FPS), // desync multiple rockets' flame flicker
          frameKeys: boss.variant === 4 ? BOSS4_ROCKET_FLIGHT_KEYS : ROCKET_FLIGHT_KEYS
        });
      }
    } else if (boss.kind === "octopus") {
      // mechanical octopus — flings arcing bombs down like tentacle slams
      boss.bobPhase += dt * 1.4;
      boss.y = H * 0.3 + Math.sin(boss.bobPhase) * (H * 0.08);

      boss.attackTimer -= dt;
      if (boss.attackTimer <= 0) {
        boss.attackTimer = 1.1 + Math.random() * 0.6;
        const startX = boss.x + boss.w * 0.15;
        const startY = boss.y + boss.h * 0.55;
        spawnArcBomb(bombs, startX, startY, player.x, player.y, 300, 0.9, 1.2);
      }
    } else {
      // bomber (boss 1) — unchanged hand-throw animation
      if (bossThrowFrame === 0) {
        boss.bobPhase += dt * 1.3;
        boss.y = H * 0.32 + Math.sin(boss.bobPhase) * (H * 0.09);

        bombTimer -= dt;
        if (bombTimer <= 0) {
          bossThrowFrame = 1;
          bossThrowFrameTimer = 0;
          bossThrowBombSpawned = false;
        }
      }
      updateBossThrowAnimation(dt);
    }

    // contact damage with the player
    const dx = Math.abs(player.x - (boss.x + boss.w / 2));
    const dy = Math.abs(player.y - (boss.y + boss.h / 2));
    if (dx < (player.w / 2) * 0.7 + boss.w * 0.32 && dy < (player.h / 2) * 0.7 + boss.h * 0.32) {
      takeHit();
    }
  }


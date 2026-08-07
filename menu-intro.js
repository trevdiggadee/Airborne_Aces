"use strict";


const BLIMP_DATA = {
  // Menu/static preview = first flight frame (no separate _main / .png stills needed)
  blimp1: { url: "player_blimp_01.webp", key: "player_blimp_01", name: "Zeppelin Ace", effect: "propeller" },
  blimp2: { url: "blimp2_flight_01.webp", key: "blimp2_flight_01", name: "Deco Liner", effect: "smoke" },
  blimp3: { url: "blimp3_flight_01.webp", key: "blimp3_flight_01", name: "Aero Slicer", effect: null },
  blimp4: { url: "blimp4_flight_01.webp", key: "blimp4_flight_01", name: "Steampunk", effect: "steam" },
  blimp5: { url: "blimp5_flight_01.webp", key: "blimp5_flight_01", name: "Petro", effect: null },
  blimp6: { url: "ship_wood_01.webp", key: "ship_wood_01", name: "Little Spy", effect: null },
  blimp7: { url: "ship_lightning_01.webp", key: "ship_lightning_01", name: "Storm Chaser", effect: "flame" },
  blimp8: { url: "ship_cargo_01.webp", key: "ship_cargo_01", name: "Cargo King", effect: "blackSmoke" },
  blimp9: { url: "ship_pirate_01.webp", key: "ship_pirate_01", name: "Jolly Rogers", effect: null },
  blimp10: { url: "ship_ivory_01.webp", key: "ship_ivory_01", name: "Ivory Anchor", effect: null },
  blimp11: { url: "blimp11_flight_01.webp", key: "blimp11_flight_01", name: "Pirate Rocket", effect: "flame" },
  blimp12: { url: "blimp12_flight_01.webp", key: "blimp12_flight_01", name: "War Shark", effect: "smoke" },
  blimp13: { url: "blimp13_flight_01.webp", key: "blimp13_flight_01", name: "Iron Lattice", effect: "steam" },
  blimp14: { url: "blimp14_flight_01.webp", key: "blimp14_flight_01", name: "Royal Stripe", effect: null },
  blimp15: { url: "blimp15_flight_01.webp", key: "blimp15_flight_01", name: "Sky Rocket", effect: "flame" }
};

// ---------- Blimp Profile Panel data ----------
// NOTE: these stat pips (0-5), abilities, and XP values are placeholder/
// starter numbers I picked to get the panel working end-to-end — not
// balanced or approved game data. Swap in real numbers whenever ready.
const SHIP_STATS = {
  blimp1: {
    name: "Zeppelin Ace", mk: "Mk I", cls: "Scout Airship", call: "ACE-1",
    stats: { Speed: 4, Lift: 4, Durability: 3, Maneuverability: 3, Boost: 4 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 320, xpMax: 500, locked: false
  },
  blimp2: {
    name: "Deco Liner", mk: "Mk I", cls: "Luxury Cruiser", call: "DECO-2",
    stats: { Speed: 3, Lift: 4, Durability: 4, Maneuverability: 3, Boost: 3 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 150, xpMax: 400, locked: false
  },
  blimp3: {
    name: "Aero Slicer", mk: "Mk I", cls: "Speed Cutter", call: "SLICE-3",
    stats: { Speed: 5, Lift: 3, Durability: 2, Maneuverability: 5, Boost: 3 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 90, xpMax: 400, locked: false
  },
  blimp4: {
    name: "Steampunk", mk: "Mk I", cls: "Armored Hauler", call: "IRON-4",
    stats: { Speed: 2, Lift: 3, Durability: 5, Maneuverability: 2, Boost: 5 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 60, xpMax: 400, locked: false
  },
  blimp5: {
    name: "Petro", mk: "Mk I", cls: "Tanker", call: "PETRO-5",
    stats: { Speed: 3, Lift: 5, Durability: 4, Maneuverability: 2, Boost: 3 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 0, xpMax: 450, locked: false
  },
  blimp6: {
    name: "Little Spy", mk: "Mk I", cls: "Recon Scout", call: "SPY-06",
    stats: { Speed: 3, Lift: 3, Durability: 4, Maneuverability: 3, Boost: 4 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 0, xpMax: 450, locked: false
  },
  blimp7: {
    name: "Storm Chaser", mk: "Mk I", cls: "Interceptor", call: "STORM-7",
    stats: { Speed: 5, Lift: 3, Durability: 2, Maneuverability: 4, Boost: 5 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp8: {
    name: "Cargo King", mk: "Mk I", cls: "Heavy Freighter", call: "CARGO-8",
    stats: { Speed: 2, Lift: 5, Durability: 5, Maneuverability: 2, Boost: 2 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp9: {
    name: "Jolly Rogers", mk: "Mk I", cls: "Raider", call: "ROGER-9",
    stats: { Speed: 4, Lift: 3, Durability: 3, Maneuverability: 4, Boost: 3 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp10: {
    name: "Ivory Anchor", mk: "Mk I", cls: "Flagship", call: "IVORY-10",
    stats: { Speed: 3, Lift: 4, Durability: 4, Maneuverability: 3, Boost: 3 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp11: {
    name: "Pirate Rocket", mk: "Mk I", cls: "Raider Rocket", call: "SKULL-11",
    stats: { Speed: 5, Lift: 2, Durability: 3, Maneuverability: 4, Boost: 5 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp12: {
    name: "War Shark", mk: "Mk I", cls: "Military Attack", call: "SHARK-12",
    stats: { Speed: 4, Lift: 3, Durability: 4, Maneuverability: 3, Boost: 4 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp13: {
    name: "Iron Lattice", mk: "Mk I", cls: "Industrial", call: "FORGE-13",
    stats: { Speed: 2, Lift: 4, Durability: 5, Maneuverability: 2, Boost: 2 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp14: {
    name: "Royal Stripe", mk: "Mk I", cls: "Luxury Liner", call: "CROWN-14",
    stats: { Speed: 3, Lift: 4, Durability: 3, Maneuverability: 3, Boost: 3 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp15: {
    name: "Sky Rocket", mk: "Mk I", cls: "Navy Rocket", call: "NAVY-15",
    stats: { Speed: 5, Lift: 2, Durability: 3, Maneuverability: 4, Boost: 5 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  }
};

const STAT_ORDER = ['Speed', 'Lift', 'Durability', 'Maneuverability', 'Boost'];
const STAT_LABELS = {
  Speed: 'Speed',
  Lift: 'Lift',
  Durability: 'Durability',
  Maneuverability: 'Maneuverability',
  Boost: 'Boost Power'
};
const STAT_ICONS = { Speed: '', Lift: '', Durability: '', Maneuverability: '', Boost: '' };

function updateProfile(key) {
  const s = SHIP_STATS[key];
  if (!s) return;

  // Name sits under the animated hero blimp (not in the profile card)
  const heroName = document.getElementById('heroBlimpName');
  if (heroName) heroName.textContent = s.name;
  const legacyName = document.getElementById('heroName');
  if (legacyName) {
    legacyName.classList.remove('show');
    setTimeout(function() {
      legacyName.textContent = s.name;
      legacyName.classList.add('show');
    }, 80);
  }

  const heroWrap = document.querySelector('.heroBlimpWrap');
  if (heroWrap) {
    if (s.locked) heroWrap.classList.add('locked');
    else heroWrap.classList.remove('locked');
  }

  const mk = document.getElementById('bpMk');
  if (mk) mk.textContent = s.mk || 'Mk I';

  // Power-up block (formerly special ability) — all ships share Storm for now
  const powerName = document.getElementById('bpAbilityName');
  const powerDesc = document.getElementById('bpAbilityDesc');
  const SWARM_ABILITY = {
    blimp3: { name: "Pulse Missiles", desc: "Fires a volley of spinning energy missiles." },
    blimp4: { name: "Scout Drones", desc: "Launches steampunk drones that streak like missiles." },
    blimp5: { name: "Fuel Barrage", desc: "Spins out volatile fuel tanks that clear the sky." },
    blimp7: { name: "Thunder Orbs", desc: "Launches spinning lightning orbs from the hull." },
    blimp8: { name: "Oil Barrels", desc: "Hurls spinning oil barrels that wipe out threats." },
    blimp9: { name: "Pirate Bombs", desc: "Unleashes a swarm of spinning skull bombs." }
  };
  const ab = SWARM_ABILITY[key] || s.ability || { name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." };
  if (powerName) powerName.textContent = ab.name;
  if (powerDesc) powerDesc.textContent = ab.desc;

  // Per-blimp power icon in profile
  const powerIcon = document.getElementById('bpPowerIcon');
  if (powerIcon) {
    const POWER_ICON_BY_SHIP = {
      blimp1: "storm_icon_5.webp",
      blimp2: "storm_icon_5.webp",
      blimp3: "power_icon_blimp3.webp",
      blimp4: "power_icon_blimp4.webp",
      blimp5: "power_icon_blimp5.webp",
      blimp6: "storm_icon_5.webp",
      blimp7: "power_icon_blimp7.webp",
      blimp8: "power_icon_blimp8.webp",
      blimp9: "power_icon_blimp9.webp",
      blimp10: "storm_icon_5.webp",
      blimp11: "storm_icon_5.webp",
      blimp12: "storm_icon_5.webp",
      blimp13: "storm_icon_5.webp",
      blimp14: "storm_icon_5.webp",
      blimp15: "storm_icon_5.webp"
    };
    const iconSrc = (s.powerIcon) || POWER_ICON_BY_SHIP[key] || "storm_icon_5.webp";
    if (powerIcon.getAttribute("src") !== iconSrc) {
      powerIcon.src = iconSrc;
    }
    powerIcon.alt = ab.name || "Power up";
  }

  const up = document.getElementById('bpUpgrade');
  if (up) up.textContent = s.upgrade || '—';
  const pct = s.xpMax ? Math.min(100, (s.xp / s.xpMax) * 100) : 0;
  const fill = document.getElementById('bpXpFill');
  if (fill) fill.style.width = pct + '%';
  const xpLab = document.getElementById('bpXpLabel');
  if (xpLab) xpLab.textContent = (s.xp || 0) + ' / ' + (s.xpMax || 0) + ' XP';
}

// blimps with a real in-game flight animation get that same animation on the
// menu hero card too; anything not listed here just shows its static image
const AA_ASSET_BASE = "";

// ---------- Flight-tutor cutscene assets — 36-frame idle/talk loop baked into a 6x6 sheet ----------
const TUTOR_SHEET_URL = AA_ASSET_BASE + "tutor_dialogue_sheet.webp?cb=2";
const TUTOR_COLS = 6, TUTOR_ROWS = 6, TUTOR_FRAMES = 36, TUTOR_FPS = 20;
function heroFramesFor(count, prefix) {
  return Array.from({ length: count }, (_, i) => AA_ASSET_BASE + prefix + String(i + 1).padStart(2, "0") + ".webp?cb=2");
}
const HERO_ANIM = {
  blimp1: { urls: heroFramesFor(36, "player_blimp_"), fps: 24 },
  blimp2: { urls: heroFramesFor(25, "blimp2_flight_"), fps: 18 },
  blimp3: { urls: heroFramesFor(25, "blimp3_flight_"), fps: 18 },
  blimp4: { urls: heroFramesFor(25, "blimp4_flight_"), fps: 18 },
  blimp5: { urls: heroFramesFor(36, "blimp5_flight_"), fps: 20 },
  blimp6: { urls: heroFramesFor(36, "ship_wood_"), fps: 20 },
  blimp7: { urls: heroFramesFor(25, "ship_lightning_"), fps: 20 },
  blimp8: { urls: heroFramesFor(36, "ship_cargo_"), fps: 20 },
  blimp9: { urls: heroFramesFor(36, "ship_pirate_"), fps: 20 },
  blimp10: { urls: heroFramesFor(36, "ship_ivory_"), fps: 20 },
  blimp11: { urls: heroFramesFor(36, "blimp11_flight_"), fps: 20 },
  blimp12: { urls: heroFramesFor(36, "blimp12_flight_"), fps: 20 },
  blimp13: { urls: heroFramesFor(36, "blimp13_flight_"), fps: 20 },
  blimp14: { urls: heroFramesFor(36, "blimp14_flight_"), fps: 20 },
  blimp15: { urls: heroFramesFor(36, "blimp15_flight_"), fps: 20 }
};

function blimpSrc(data) {
  return (typeof PLACEHOLDER_MODE !== "undefined" && PLACEHOLDER_MODE) ? renderPlaceholder(data.key) : data.url;
}

let selectedBlimp = "blimp1";

const heroBlimpLayers = [
  document.getElementById("heroBlimpImgA"),
  document.getElementById("heroBlimpImgB")
];
const propBlur = document.getElementById("propBlur");
const smokeParticles = document.getElementById("smokeParticles");

let heroAnimRaf = null;
let heroAnimFrame = 0;
let heroAnimGen = 0;
let heroLastTick = 0;
let heroActiveLayer = 0; // 0 = layerA visible, 1 = layerB visible (only for ship switches)

function preloadImages(sources) {
  return Promise.all(sources.map(src => new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => (img.decode ? img.decode().then(resolve).catch(resolve) : resolve());
    img.onerror = resolve;
    img.src = src;
  })));
}

const heroAnimPrimed = {};
function primeHeroAnimation(key) {
  const anim = HERO_ANIM[key];
  if (!anim) return Promise.resolve();
  if (heroAnimPrimed[key]) return Promise.resolve();
  return preloadImages(anim.urls).then(() => { heroAnimPrimed[key] = true; });
}

function stopHeroAnimation() {
  if (heroAnimRaf) {
    cancelAnimationFrame(heroAnimRaf);
    heroAnimRaf = null;
  }
}

function startHeroAnimation(key) {
  const gen = ++heroAnimGen;
  stopHeroAnimation();
  const [layerA, layerB] = heroBlimpLayers;
  if (!layerA || !layerB) return;
  const anim = (typeof PLACEHOLDER_MODE !== "undefined" && PLACEHOLDER_MODE) ? null : HERO_ANIM[key];

  // Visible layer for hard frame swaps (no per-frame opacity crossfade — that caused glitches)
  function visibleLayer() {
    return heroActiveLayer === 0 ? layerA : layerB;
  }
  function hiddenLayer() {
    return heroActiveLayer === 0 ? layerB : layerA;
  }

  // Soft crossfade ONLY when switching ships (not every frame)
  function crossfadeTo(url, done) {
    const front = visibleLayer();
    const back = hiddenLayer();
    back.style.transition = "none";
    back.style.opacity = "0";
    back.src = url;
    const finish = () => {
      void back.offsetWidth;
      back.style.transition = "opacity 0.18s ease-out";
      front.style.transition = "opacity 0.18s ease-out";
      back.style.opacity = "1";
      front.style.opacity = "0";
      heroActiveLayer = heroActiveLayer === 0 ? 1 : 0;
      setTimeout(() => { if (done) done(); }, 190);
    };
    if (back.decode) {
      back.decode().then(finish).catch(finish);
    } else {
      finish();
    }
  }

  if (!anim) {
    crossfadeTo(blimpSrc(BLIMP_DATA[key]));
    return;
  }

  heroAnimFrame = 0;
  const urls = anim.urls;
  const fps = Math.max(12, Math.min(24, anim.fps || 20));
  const frameMs = 1000 / fps;

  // Crossfade to first frame of the new ship, then hard-swap frames on the visible layer
  crossfadeTo(urls[0], () => {
    if (gen !== heroAnimGen) return;
    primeHeroAnimation(key).then(() => {
      if (gen !== heroAnimGen) return;
      heroLastTick = performance.now();
      const layer = visibleLayer();
      // Ensure hidden layer stays invisible during loop
      const hid = hiddenLayer();
      hid.style.transition = "none";
      hid.style.opacity = "0";
      layer.style.transition = "none";
      layer.style.opacity = "1";

      function tick(now) {
        if (gen !== heroAnimGen) return;
        if (now - heroLastTick >= frameMs) {
          heroLastTick = now;
          heroAnimFrame = (heroAnimFrame + 1) % urls.length;
          const url = urls[heroAnimFrame];
          // Hard swap on the already-visible layer — frames are pre-decoded
          if (layer.getAttribute("src") !== url) {
            layer.src = url;
          }
        }
        heroAnimRaf = requestAnimationFrame(tick);
      }
      heroAnimRaf = requestAnimationFrame(tick);
    });
  });
}

// Set the default hero image right away (placeholder mode skips the network round trip)
startHeroAnimation("blimp1");

// Preload every blimp asset (static hero images + full animation sets) once
// up front so switching, and the animation itself, never stutters. This also
// warms the browser's image cache for primeHeroAnimation() above.
preloadImages(Object.values(BLIMP_DATA).map(b => blimpSrc(b)));
if (!(typeof PLACEHOLDER_MODE !== "undefined" && PLACEHOLDER_MODE)) {
  preloadImages(Object.values(HERO_ANIM).flatMap(a => a.urls));
}
preloadImages([TUTOR_SHEET_URL]);

// ---------- Centralized volume preferences — music and SFX independently
// adjustable from the menu control panel, persisted, and applied to every
// sound source: menu music, gameplay MP3, the procedural music synth, and SFX. ----------
let musicVolumePref = 0.25;
let sfxVolumePref = 1.0;
try {
  const savedMusicVol = localStorage.getItem("aa_music_vol");
  const savedSfxVol = localStorage.getItem("aa_sfx_vol");
  if (savedMusicVol !== null) musicVolumePref = Math.max(0, Math.min(1, parseFloat(savedMusicVol)));
  if (savedSfxVol !== null) sfxVolumePref = Math.max(0, Math.min(1, parseFloat(savedSfxVol)));
} catch (e) {}

function getGameplayMusicEl() {
  return document.getElementById("gameplayMusic");
}

let gameplayMusicFadeRaf = null;
function cancelGameplayMusicFade() {
  if (gameplayMusicFadeRaf != null) {
    cancelAnimationFrame(gameplayMusicFadeRaf);
    gameplayMusicFadeRaf = null;
  }
}

let gameplayMusicMuted = false;
try { gameplayMusicMuted = localStorage.getItem("aa_muted") === "1"; } catch (e) {}

function applyGameplayMusicVolumeNow() {
  // All MP3 music disabled — SFX only
  const el = getGameplayMusicEl();
  if (el) { try { el.volume = 0; el.pause(); } catch (e) {} }
  const menuEl = document.getElementById("menuMusic");
  if (menuEl) { try { menuEl.volume = 0; menuEl.pause(); } catch (e) {} }
}


function setMusicVolumePref(v) {
  musicVolumePref = Math.max(0, Math.min(1, Number(v) || 0));
  try { localStorage.setItem("aa_music_vol", String(musicVolumePref)); } catch (e) {}
  cancelGameplayMusicFade();
  try { if (typeof menuMusicFadeStep === "function") menuMusicFadeStep(); } catch (e) {}
  applyGameplayMusicVolumeNow();
  if (window.__airborneSetSynthMusicVolume) window.__airborneSetSynthMusicVolume(musicVolumePref);
}
function setSfxVolumePref(v) {
  sfxVolumePref = Math.max(0, Math.min(1, v));
  try { localStorage.setItem("aa_sfx_vol", String(sfxVolumePref)); } catch (e) {}
  if (window.__airborneSetSfxVolume) window.__airborneSetSfxVolume(sfxVolumePref);
}

// wire up the actual slider UI on the menu screen
(function initVolumeControls() {
  const musicSlider = document.getElementById("musicVolumeSlider");
  const sfxSlider = document.getElementById("sfxVolumeSlider");
  const musicValueEl = document.getElementById("musicVolumeValue");
  const sfxValueEl = document.getElementById("sfxVolumeValue");
  if (musicSlider) {
    musicSlider.value = Math.round(musicVolumePref * 100);
    if (musicValueEl) musicValueEl.textContent = musicSlider.value + "%";
    musicSlider.addEventListener("input", () => {
      const v = parseInt(musicSlider.value, 10) / 100;
      setMusicVolumePref(v);
      if (musicValueEl) musicValueEl.textContent = musicSlider.value + "%";
    });
  }
  if (sfxSlider) {
    sfxSlider.value = Math.round(sfxVolumePref * 100);
    if (sfxValueEl) sfxValueEl.textContent = sfxSlider.value + "%";
    sfxSlider.addEventListener("input", () => {
      const v = parseInt(sfxSlider.value, 10) / 100;
      setSfxVolumePref(v);
      if (sfxValueEl) sfxValueEl.textContent = sfxSlider.value + "%";
    });
  }
})();

// ---------- Menu background music — a real audio file, faded in/out at the
// loop seam so restarting the track doesn't sound like a hard cut ----------
const menuMusic = document.getElementById("menuMusic");
const MENU_MUSIC_FADE_SEC = 1.5; // fade in at the start / fade out near the end of each loop
let menuMusicUnlocked = false;   // becomes true once a user gesture lets audio actually play

try {
  menuMusicUnlocked = false;
  const wasMuted = localStorage.getItem("aa_muted") === "1";
  if (menuMusic) menuMusic.volume = 0; // always start silent; timeupdate ramps it up
  if (wasMuted && menuMusic) menuMusic.dataset.userMuted = "1";
} catch (e) {}

function menuMusicFadeStep() {
  if (!menuMusic || menuMusic.paused || !menuMusic.duration) return;
  if (menuMusic.dataset.userMuted === "1") { menuMusic.volume = 0; return; }
  const t = menuMusic.currentTime;
  const d = menuMusic.duration;
  let vol = musicVolumePref;
  if (t < MENU_MUSIC_FADE_SEC) {
    vol = musicVolumePref * (t / MENU_MUSIC_FADE_SEC);
  } else if (t > d - MENU_MUSIC_FADE_SEC) {
    vol = musicVolumePref * Math.max(0, (d - t) / MENU_MUSIC_FADE_SEC);
  }
  menuMusic.volume = Math.max(0, Math.min(musicVolumePref, vol));
}
if (menuMusic) menuMusic.addEventListener("timeupdate", menuMusicFadeStep);

function startMenuMusic() {
  // MP3 menu music disabled — keep silent
  if (!menuMusic) return;
  try { menuMusic.volume = 0; menuMusic.pause(); } catch (e) {}
}

function stopMenuMusicImmediately() {
  if (!menuMusic || menuMusic.paused) return;
  menuMusic.pause();
  menuMusic.currentTime = 0;
}

// autoplay is usually blocked until the user interacts with the page — try
// right away, and again on the first tap/click anywhere on the menu
startMenuMusic();
document.addEventListener("pointerdown", function unlockMenuMusic() {
  if (!menuMusicUnlocked) startMenuMusic();
}, { passive: true });

window.__airborneShowMenu = () => { startHeroAnimation(selectedBlimp); startMenuMusic(); };

const splashEnterBtn = document.getElementById("splashEnterBtn");
if (splashEnterBtn) {
  splashEnterBtn.addEventListener("click", () => {
    if (window.__airborneStopSplashRadar) window.__airborneStopSplashRadar();
    const s = document.getElementById("splashScreen");
    s.classList.add("fade-out");
    setTimeout(() => {
      s.classList.add("hidden");
      s.style.display = "none";
    }, 480);
    startMenuMusic();
  });
}

// ---------- Gameplay background music — a real audio file (skyward-march 2.mp3)
// that plays during actual flight. Controlled from the inner game IIFE via the
// window bridge below, hooked into its existing startMusic()/stopMusic()/
// setMuted() calls — so every place that already turns the procedural music
// on or off (game start, retry, checkpoint resume, crash) automatically drives
// this track too, with no extra call sites needed. ----------
const gameplayMusic = document.getElementById("gameplayMusic");
const GAMEPLAY_MUSIC_FADE_MS = 900;
// gameplayMusicMuted declared above with volume helpers
if (gameplayMusic) gameplayMusic.volume = 0;

function fadeGameplayMusicVolume(target, thenPause) {
  const el = getGameplayMusicEl();
  if (!el) return;
  cancelGameplayMusicFade();
  const startVol = el.volume;
  const startedAt = performance.now();
  (function step() {
    const p = Math.min(1, (performance.now() - startedAt) / GAMEPLAY_MUSIC_FADE_MS);
    el.volume = startVol + (target - startVol) * p;
    if (p < 1) {
      gameplayMusicFadeRaf = requestAnimationFrame(step);
    } else {
      gameplayMusicFadeRaf = null;
      if (thenPause) {
        el.pause();
      } else {
        applyGameplayMusicVolumeNow();
      }
    }
  })();
}

function startGameplayMusic() {
  // MP3 gameplay music disabled — SFX only
  const el = getGameplayMusicEl();
  if (el) { try { el.volume = 0; el.pause(); } catch (e) {} }
  cancelGameplayMusicFade();
}

function stopGameplayMusic() {
  const el = getGameplayMusicEl();
  if (!el || el.paused) return;
  fadeGameplayMusicVolume(0, true);
}

function setGameplayMusicMuted(m) {
  gameplayMusicMuted = !!m;
  cancelGameplayMusicFade();
  applyGameplayMusicVolumeNow();
}

window.__airborneStartGameplayMusic = startGameplayMusic;
window.__airborneStopGameplayMusic = stopGameplayMusic;
window.__airborneSetGameplayMusicMuted = setGameplayMusicMuted;
window.__airborneSetMusicVolume = setMusicVolumePref;
window.__airborneApplyGameplayMusicVolume = applyGameplayMusicVolumeNow;

function setEffect(effect) {
  if (!propBlur || !smokeParticles) return;
  propBlur.style.display = effect === "propeller" ? "block" : "none";
  // Exhaust modes: smoke | steam | flame | blackSmoke
  const exhaustModes = ["smoke", "steam", "flame", "blackSmoke"];
  if (exhaustModes.indexOf(effect) >= 0) {
    smokeParticles.style.display = "block";
    smokeParticles.dataset.mode = effect;
  } else {
    smokeParticles.style.display = "none";
    smokeParticles.dataset.mode = "";
  }
}

function selectBlimp(key, el) {
  selectedBlimp = key;
  const data = BLIMP_DATA[key];

  startHeroAnimation(key);
  setEffect(data.effect);

  // Keep menu preview sizes consistent; Little Spy stays smaller
  const heroWrap = document.querySelector(".heroBlimpWrap");
  if (heroWrap) {
    heroWrap.classList.toggle("hero-small", key === "blimp6");
  }

  document.querySelectorAll(".numBtn").forEach(b => b.classList.remove("active"));
  if (el) el.classList.add("active");

  updateProfile(key);
}

// initialize the default selection's effect + profile panel
setEffect(BLIMP_DATA.blimp1.effect);
updateProfile(selectedBlimp);
const _hw = document.querySelector(".heroBlimpWrap");
if (_hw) _hw.classList.toggle("hero-small", selectedBlimp === "blimp6");

function enterGameplay(){
  document.getElementById("menuScreen").style.display = "none";
  document.getElementById("gameScreen").style.display = "block";
  document.getElementById("startOverlay").classList.add("hidden");
  fadeOutMenuMusic();
  if (window.__airborneGameStart) window.__airborneGameStart();
}

// quick fade-out (rather than an abrupt cut) when handing off to gameplay music
function fadeOutMenuMusic() {
  if (!menuMusic || menuMusic.paused) return;
  menuMusic.removeEventListener("timeupdate", menuMusicFadeStep);
  const fadeMs = 350;
  const startVol = menuMusic.volume;
  const startedAt = performance.now();
  (function step() {
    const p = Math.min(1, (performance.now() - startedAt) / fadeMs);
    menuMusic.volume = startVol * (1 - p);
    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      stopMenuMusicImmediately();
      menuMusic.addEventListener("timeupdate", menuMusicFadeStep);
    }
  })();
}

const flyBtn = document.getElementById("flyBtn");
flyBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  flyBtn.classList.add("pressed");
});
["pointerup", "pointercancel", "pointerleave"].forEach(evt => {
  flyBtn.addEventListener(evt, () => flyBtn.classList.remove("pressed"));
});
flyBtn.addEventListener("click", () => { showTutorCutscene(); });

// ---------- Take-Flight cutscene: close-up briefing from the flight tutor ----------
const TUTOR_LINES = [
  "Alright, ace \u2014 engines primed, dial locked in. Let's get you airborne!",
  "Keep her nose up, watch the skyline, and dodge anything that isn't sky.",
  "Reach every boss marker to keep the run going. Ready? Let's fly!"
];
const CUTSCENE_LINE_MS = 6000; // 3 lines x 6s = 18s total, 3x the original 6s hold

const cutsceneScreen = document.getElementById("cutsceneScreen");
const cutsceneBlimpImg = document.getElementById("cutsceneBlimpImg");
const cutsceneTutorWrap = document.getElementById("cutsceneTutorWrap");
const cutsceneTextEl = document.getElementById("cutsceneText");
const cutsceneSkipBtn = document.getElementById("cutsceneSkip");

let tutorAnimTimer = null;
function setTutorFrame(i) {
  const col = i % TUTOR_COLS;
  const row = Math.floor(i / TUTOR_COLS);
  const posX = (col / (TUTOR_COLS - 1)) * 100;
  const posY = (row / (TUTOR_ROWS - 1)) * 100;
  cutsceneTutorWrap.style.backgroundPosition = posX + "% " + posY + "%";
}
function startTutorSpriteAnim() {
  cutsceneTutorWrap.style.backgroundImage = 'url("' + TUTOR_SHEET_URL + '")';
  let frame = 0;
  setTutorFrame(0);
  if (tutorAnimTimer) clearInterval(tutorAnimTimer);
  tutorAnimTimer = setInterval(() => {
    frame = (frame + 1) % TUTOR_FRAMES;
    setTutorFrame(frame);
  }, 1000 / TUTOR_FPS);
}
function stopTutorSpriteAnim() {
  if (tutorAnimTimer) { clearInterval(tutorAnimTimer); tutorAnimTimer = null; }
}

let cutsceneAdvanceTimer = null;
let cutsceneDone = true;
let cutsceneLineIndex = 0;

function showTutorCutscene() {
  cutsceneDone = false;
  cutsceneLineIndex = 0;
  document.getElementById("menuScreen").style.display = "none";
  cutsceneScreen.style.display = "block";

  const data = BLIMP_DATA[selectedBlimp] || BLIMP_DATA.blimp1;
  cutsceneBlimpImg.src = blimpSrc(data);
  showCutsceneLine(0);

  startTutorSpriteAnim();

  cutsceneScreen.addEventListener("click", advanceCutsceneLine);
  cutsceneSkipBtn.addEventListener("click", endCutscene);
}

function showCutsceneLine(i) {
  cutsceneLineIndex = i;
  cutsceneTextEl.textContent = TUTOR_LINES[i];
  // re-trigger the dialogue box's entrance animation for each new line
  const box = document.getElementById("cutsceneDialogue");
  box.style.animation = "none";
  void box.offsetWidth;
  box.style.animation = "";
  if (cutsceneAdvanceTimer) clearTimeout(cutsceneAdvanceTimer);
  cutsceneAdvanceTimer = setTimeout(advanceCutsceneLine, CUTSCENE_LINE_MS);
}

function advanceCutsceneLine() {
  if (cutsceneDone) return;
  if (cutsceneLineIndex < TUTOR_LINES.length - 1) {
    showCutsceneLine(cutsceneLineIndex + 1);
  } else {
    endCutscene();
  }
}

function endCutscene() {
  if (cutsceneDone) return;
  cutsceneDone = true;
  if (cutsceneAdvanceTimer) { clearTimeout(cutsceneAdvanceTimer); cutsceneAdvanceTimer = null; }
  cutsceneScreen.removeEventListener("click", advanceCutsceneLine);
  cutsceneSkipBtn.removeEventListener("click", endCutscene);
  stopTutorSpriteAnim();
  cutsceneScreen.style.display = "none";
  // World map before first level
  if (window.__airborneShowWorldMap) {
    window.__airborneShowWorldMap({ mode: "start" });
  } else {
    enterGameplay();
  }
}

// Exposed for world-map continue
window.__airborneEnterGameplay = enterGameplay;





/* ---------- Splash particles + radar blip beep ---------- */
(function initSplashParticles() {
  var host = document.getElementById("splashParticles");
  if (!host) return;
  host.innerHTML = "";
  var n = 36;
  for (var i = 0; i < n; i++) {
    var p = document.createElement("span");
    var kind = i % 3 === 0 ? "dustUp" : (i % 3 === 1 ? "dustDrift" : "dustMote");
    p.className = "splashParticle " + kind;
    var size = 0.8 + Math.random() * 2.2;
    if (Math.random() < 0.12) size = 2.5 + Math.random() * 2;
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.left = (Math.random() * 100) + "%";
    p.style.top = (Math.random() * 100) + "%";
    p.style.setProperty("--drift", ((Math.random() - 0.5) * 120) + "px");
    p.style.setProperty("--fall", ((Math.random() * 40) + 15) + "vh");
    p.style.setProperty("--max-op", (0.25 + Math.random() * 0.45).toFixed(2));
    var dur = 12 + Math.random() * 22;
    p.style.animationDuration = dur + "s";
    p.style.animationDelay = (-Math.random() * dur) + "s";
    host.appendChild(p);
  }
})();

(function initRadarBeeps() {
  // Radar bleep — only while the splash screen is visible
  var PERIOD = 4;
  var HITS = [0.392];
  var ctx = null;
  var started = false;
  var timer = null;
  var active = true;

  function splashVisible() {
    var s = document.getElementById("splashScreen");
    if (!s) return false;
    if (s.classList.contains("hidden")) return false;
    if (s.style.display === "none") return false;
    if (s.classList.contains("splashOut") || s.classList.contains("fadeOut")) return false;
    return true;
  }

  function ensureCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function beep() {
    if (!active || !splashVisible()) return;
    if (document.hidden) return;
    if (typeof muted !== "undefined" && muted) return;
    var ac = ensureCtx();
    if (!ac) return;
    var t = ac.currentTime + 0.01;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(980, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.18);
    var vol = (typeof sfxVolumePref === "number") ? (0.25 * sfxVolumePref) : 0.25;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + 0.22);
  }

  function tick() {
    if (!started || !active) return;
    if (!splashVisible()) {
      active = false;
      if (timer) { cancelAnimationFrame(timer); timer = null; }
      if (ctx && ctx.state === "running") {
        try { ctx.suspend(); } catch (e) {}
      }
      return;
    }
    if (!document.hidden) {
      var now = performance.now() / 1000;
      var phase = now % PERIOD;
      HITS.forEach(function (hit) {
        var delta = phase - hit;
        if (delta >= 0 && delta < 0.08) {
          var key = Math.floor(now / PERIOD) + ":" + hit;
          if (tick._last !== key) {
            tick._last = key;
            beep();
          }
        }
      });
    }
    timer = requestAnimationFrame(tick);
  }

  function start() {
    if (!splashVisible()) return;
    if (started) {
      ensureCtx();
      return;
    }
    started = true;
    active = true;
    ensureCtx();
    if (!timer) timer = requestAnimationFrame(tick);
  }

  function stopRadar() {
    active = false;
    if (timer) { cancelAnimationFrame(timer); timer = null; }
    if (ctx && ctx.state === "running") {
      try { ctx.suspend(); } catch (e) {}
    }
  }

  window.__airborneStopSplashRadar = stopRadar;

  document.addEventListener("click", start);
  document.addEventListener("touchstart", start, { passive: true });
  document.addEventListener("keydown", start);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && ctx && ctx.state === "running") {
      try { ctx.suspend(); } catch (e) {}
    }
  });
})();

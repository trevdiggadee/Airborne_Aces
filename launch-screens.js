/* ========== One Thumb Gaming – Launch Screens ========== */
/* Drop this file + the two images into your existing game.
   Call nothing – it auto-starts on page load.
   Edit the onEnterHangar() function at the bottom to jump into your real game.
*/

(function () {
  'use strict';

  const loadingEl   = document.getElementById('otg-loading');
  const splashEl    = document.getElementById('otg-splash');
  const progressFill = document.getElementById('otg-progress-fill');
  const progressPct  = document.getElementById('otg-progress-pct');
  const enterBtn     = document.getElementById('otg-enter-btn');

  if (!loadingEl || !splashEl) {
    console.warn('[OTG Launch] Missing #otg-loading or #otg-splash elements');
    return;
  }

  // Preload poster so it is ready when we transition
  const posterImg = new Image();
  posterImg.src = 'airborne_aces_poster.png';

  // ---------- Simulated asset loading ----------
  // Replace this with real progress from your game loader if you have one.
  const assets = [
    { weight: 18 }, { weight: 22 }, { weight: 12 },
    { weight: 10 }, { weight: 15 }, { weight: 13 }, { weight: 10 }
  ];
  let current = 0;
  let loaded  = 0;
  const total = assets.reduce((s, a) => s + a.weight, 0);

  function loadNext() {
    if (current >= assets.length) {
      if (posterImg.complete) finish();
      else posterImg.onload = finish;
      return;
    }
    const asset = assets[current];
    const start = loaded;
    const end   = loaded + asset.weight;
    const dur   = 280 + Math.random() * 420;
    const t0    = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 2.2);
      const p = start + (end - start) * eased;
      const pct = Math.min(99, Math.round((p / total) * 100));
      progressFill.style.width = pct + '%';
      progressPct.textContent = pct + '%';
      if (t < 1) requestAnimationFrame(tick);
      else {
        loaded = end;
        current++;
        setTimeout(loadNext, 90 + Math.random() * 120);
      }
    }
    requestAnimationFrame(tick);
  }

  function finish() {
    progressFill.style.width = '100%';
    progressPct.textContent = '100%';
    const txt = loadingEl.querySelector('.otg-loading-text');
    if (txt) txt.textContent = 'Ready';

    setTimeout(() => {
      loadingEl.classList.add('otg-hidden');
      splashEl.classList.add('otg-visible');
      createSparkles();
    }, 450);
  }

  // Start after a short delay so the logo paints first
  setTimeout(loadNext, 350);

  // ---------- Crystal (real blue_crystal frames) + sparkles ----------
  const CRYSTAL_FRAME_COUNT = 25;
  let crystalFrame = 0;
  let crystalTimer = null;
  const crystalFrames = [];

  function preloadCrystalFrames() {
    for (let i = 1; i <= CRYSTAL_FRAME_COUNT; i++) {
      const img = new Image();
      const n = String(i).padStart(2, '0');
      img.src = 'blue_crystal_' + n + '.webp';
      crystalFrames.push(img);
    }
  }
  preloadCrystalFrames();

  function startCrystalAnim() {
    const el = document.getElementById('otg-crystal-img');
    if (!el) return;
    // Keep native aspect; size controlled by CSS to match poster crystal
    el.width = 404;
    el.height = 612;
    if (crystalTimer) clearInterval(crystalTimer);
    crystalTimer = setInterval(function () {
      crystalFrame = (crystalFrame + 1) % CRYSTAL_FRAME_COUNT;
      const frame = crystalFrames[crystalFrame];
      if (frame && frame.complete && frame.naturalWidth) {
        el.src = frame.src;
      } else {
        const n = String(crystalFrame + 1).padStart(2, '0');
        el.src = 'blue_crystal_' + n + '.webp';
      }
    }, 80); // ~12.5 fps — smooth crystal shimmer
  }

  function createSparkles() {
    const container = document.getElementById('otg-crystal-glow');
    if (!container) return;
    startCrystalAnim();
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('div');
      s.className = 'otg-sparkle';
      s.style.left = (15 + Math.random() * 70) + '%';
      s.style.top  = (20 + Math.random() * 60) + '%';
      s.style.animationDelay    = (Math.random() * 2.8) + 's';
      s.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
      if (Math.random() > 0.7) {
        s.style.width  = '6px';
        s.style.height = '6px';
      }
      container.appendChild(s);
    }
  }

  // ---------- Enter Hangar ----------
  if (enterBtn) {
    enterBtn.addEventListener('click', function () {
      enterBtn.style.pointerEvents = 'none';
      enterBtn.style.opacity = '0.5';

      splashEl.style.opacity = '0';
      setTimeout(() => {
        splashEl.classList.remove('otg-visible');
        splashEl.style.visibility = 'hidden';
        // Hand off to the real game
        onEnterHangar();
      }, 500);
    });
  }

  /* ================================================================
     EDIT THIS FUNCTION – this is where your real game starts
     ================================================================ */
  function onEnterHangar() {
    // Hand off to Airborne Aces hangar / blimp select
    try {
      if (window.__airborneStopSplashRadar) window.__airborneStopSplashRadar();
    } catch (e) {}
    const oldSplash = document.getElementById('splashScreen');
    if (oldSplash) {
      oldSplash.classList.add('hidden');
      oldSplash.style.display = 'none';
    }
    const menu = document.getElementById('menuScreen');
    if (menu) {
      menu.style.display = '';
      menu.classList.remove('hidden');
    }
    try {
      if (typeof window.__airborneShowMenu === 'function') {
        window.__airborneShowMenu();
      }
    } catch (e) {
      console.warn('[OTG Launch] showMenu', e);
    }
    console.log('[OTG Launch] Enter Hangar → menu / hangar');
  }

})();

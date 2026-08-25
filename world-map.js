"use strict";

// Interactive world map — shown after the tutor cutscene and between levels.
(function () {
  const MAP_LEVELS = [
    { id: 0, name: "Start Hangar", x: 50, y: 92, hangar: true },
    { id: 1, name: "Beginner's Airfield", x: 50, y: 88 },
    { id: 2, name: "Great Steam City", x: 22, y: 68 },
    { id: 3, name: "Thunder Valley", x: 78, y: 58 },
    { id: 4, name: "Sky Factory", x: 28, y: 42 },
    { id: 5, name: "Iron Fortress", x: 55, y: 28 },
    { id: 6, name: "Skywatch Tower", x: 50, y: 11 }
  ];

  const PATHS = {
    "0-1": [{x:50,y:92},{x:50,y:90},{x:50,y:88}],
    "1-2": [{x:50,y:88},{x:42,y:80},{x:32,y:74},{x:22,y:68}],
    "2-3": [{x:22,y:68},{x:40,y:64},{x:58,y:60},{x:78,y:58}],
    "3-4": [{x:78,y:58},{x:60,y:52},{x:42,y:46},{x:28,y:42}],
    "4-5": [{x:28,y:42},{x:40,y:36},{x:50,y:32},{x:55,y:28}],
    "5-6": [{x:55,y:28},{x:52,y:20},{x:50,y:11}],
    "1-0": [{x:50,y:88},{x:50,y:90},{x:50,y:92}],
    "2-1": [{x:22,y:68},{x:32,y:74},{x:42,y:80},{x:50,y:88}],
    "3-2": [{x:78,y:58},{x:58,y:60},{x:40,y:64},{x:22,y:68}],
    "4-3": [{x:28,y:42},{x:42,y:46},{x:60,y:52},{x:78,y:58}],
    "5-4": [{x:55,y:28},{x:50,y:32},{x:40,y:36},{x:28,y:42}],
    "6-5": [{x:50,y:11},{x:52,y:20},{x:55,y:28}]
  };

  let mapCurrent = 1;
  let mapMaxUnlocked = 1;
  let mapFlying = false;
  let mapMode = "start";
  let mapPendingResume = null;

  function getEls() {
    return {
      screen: document.getElementById("worldMapScreen"),
      container: document.getElementById("worldMapContainer"),
      blimp: document.getElementById("worldMapBlimp"),
      title: document.getElementById("worldMapTitle"),
      hint: document.getElementById("worldMapHint")
    };
  }

  function syncProgressFromGame() {
    const defeated = (typeof bossesDefeatedCount === "number") ? bossesDefeatedCount : 0;
    // TEST MODE: all levels unlocked so any post can be flown to
    mapMaxUnlocked = 6;
    mapCurrent = Math.min(6, Math.max(1, defeated + 1));
  }

  function placeBlimp(levelId) {
    const els = getEls();
    const lvl = MAP_LEVELS[levelId];
    if (!els.blimp || !lvl) return;
    els.blimp.style.left = lvl.x + "%";
    els.blimp.style.top = lvl.y + "%";
  }

  function createMarkers() {
    const els = getEls();
    if (!els.container) return;
    els.container.querySelectorAll(".wm-level").forEach(function (n) { n.remove(); });

    MAP_LEVELS.forEach(function (lvl) {
      if (lvl.id === 0) return; // hangar visual only

      const el = document.createElement("button");
      el.type = "button";
      el.className = "wm-level";
      if (lvl.id === mapCurrent) el.classList.add("current");
      if (lvl.id < mapCurrent) el.classList.add("completed");
      if (lvl.id > mapMaxUnlocked) el.classList.add("locked");

      el.style.left = lvl.x + "%";
      el.style.top = lvl.y + "%";
      el.dataset.id = String(lvl.id);
      el.setAttribute("aria-label", lvl.name + (lvl.id === mapCurrent ? " — tap to play" : ""));
      el.title = lvl.name + (lvl.id <= mapMaxUnlocked ? " (tap to play)" : " (locked)");

      // Number badge for clarity
      const num = document.createElement("span");
      num.className = "wm-level-num";
      num.textContent = String(lvl.id);
      el.appendChild(num);

      if (lvl.id <= mapMaxUnlocked) {
        el.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          onLevelClick(lvl.id);
        });
      }

      els.container.appendChild(el);
    });

    // Tapping the player blimp also starts the current level
    if (els.blimp) {
      els.blimp.style.pointerEvents = "auto";
      els.blimp.style.cursor = "pointer";
      els.blimp.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        onLevelClick(mapCurrent);
      };
    }
  }

  function onLevelClick(targetId) {
    if (mapFlying) return;
    if (targetId < 1 || targetId > 6) return;
    if (targetId > mapMaxUnlocked) return;

    // Already here — start playing immediately
    if (targetId === mapCurrent) {
      startPlaying(targetId);
      return;
    }

    // TEST MODE: fly even if not adjacent (chain path via intermediates if needed)
    flyTo(targetId, function () {
      startPlaying(targetId);
    });
  }

  function startPlaying(levelId) {
    try {
      var so = document.getElementById("startOverlay");
      if (so) { so.classList.add("hidden"); so.style.display = "none"; }
    } catch (e) {}

    const els = getEls();
    mapFlying = false;
    if (els.screen) els.screen.style.display = "none";

    // Tell the game which map post we're entering (1–6)
    window.__airbornePendingMapLevel = Number(levelId) || 1;
    // Force training to restart from intro whenever level 1 is chosen
    if (Number(levelId) === 1) {
      try { if (window.__airborneHardResetTraining) window.__airborneHardResetTraining(); } catch (e) {}
      window.__airborneForceTrainRestart = true;
      window.__airborneRuffStage = "intro";
      window.__airborneTrainingBossDone = false;
      window.__airborneTrainingBossTried = false;
      window.__airborneTrainingReportShown = false;
    }

    // Reveal far-right power / progress / clock dock
    try {
      var dock = document.getElementById("unifiedDock");
      if (dock) {
        dock.classList.remove("menuHidden");
        dock.classList.add("gameActive");
        if (Number(levelId) === 1) dock.classList.add("trainingShow");
        dock.style.display = "flex";
        dock.style.opacity = "1";
        dock.style.visibility = "visible";
      }
      if (typeof window.__airborneShowUnifiedDock === "function") window.__airborneShowUnifiedDock();
    } catch (e) {}

    if (mapMode === "start") {
      if (typeof window.__airborneEnterGameplay === "function") {
        window.__airborneEnterGameplay();
      } else if (typeof enterGameplay === "function") {
        enterGameplay();
      }
    } else if (mapMode === "between") {
      // Mid-run jump: apply progress then resume
      if (typeof window.__airborneApplyMapLevel === "function") {
        window.__airborneApplyMapLevel(levelId);
      }
      if (typeof mapPendingResume === "function") {
        const fn = mapPendingResume;
        mapPendingResume = null;
        fn();
      }
      const gs = document.getElementById("gameScreen");
      if (gs) gs.style.display = "block";
    }
  }

  function flyTo(targetId, onDone) {
    mapFlying = true;
    // Build path: use direct route if listed, else step through intermediate posts
    let waypoints = PATHS[mapCurrent + "-" + targetId];
    if (!waypoints) {
      waypoints = [{ x: MAP_LEVELS[mapCurrent].x, y: MAP_LEVELS[mapCurrent].y }];
      const step = targetId > mapCurrent ? 1 : -1;
      for (let id = mapCurrent; id !== targetId; id += step) {
        const next = id + step;
        const leg = PATHS[id + "-" + next];
        if (leg && leg.length > 1) {
          for (let i = 1; i < leg.length; i++) waypoints.push(leg[i]);
        } else if (MAP_LEVELS[next]) {
          waypoints.push({ x: MAP_LEVELS[next].x, y: MAP_LEVELS[next].y });
        }
      }
    }
    animateAlongPath(waypoints, function () {
      mapCurrent = targetId;
      placeBlimp(mapCurrent);
      createMarkers();
      mapFlying = false;
      if (onDone) onDone();
    });
  }

  function animateAlongPath(points, onComplete) {
    const els = getEls();
    const duration = 1400;
    const startTime = performance.now();
    let lastTrail = 0;
    const goingUp = points[points.length - 1].y < points[0].y;
    if (els.blimp) {
      els.blimp.style.transform = goingUp
        ? "translate(-50%, -50%) scaleX(1)"
        : "translate(-50%, -50%) scaleX(-1)";
    }

    function frame(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const segCount = points.length - 1;
      const segT = ease * segCount;
      const segIdx = Math.min(Math.floor(segT), Math.max(0, segCount - 1));
      const localT = segT - segIdx;
      const p0 = points[segIdx];
      const p1 = points[Math.min(segIdx + 1, points.length - 1)];
      const x = p0.x + (p1.x - p0.x) * localT;
      const y = p0.y + (p1.y - p0.y) * localT;
      if (els.blimp) {
        els.blimp.style.left = x + "%";
        els.blimp.style.top = y + "%";
      }
      if (now - lastTrail > 90) {
        spawnTrail(x, y);
        lastTrail = now;
      }
      if (t < 1) requestAnimationFrame(frame);
      else onComplete();
    }
    requestAnimationFrame(frame);
  }

  function spawnTrail(x, y) {
    const els = getEls();
    if (!els.container) return;
    const trail = document.createElement("div");
    trail.className = "wm-trail";
    trail.style.left = x + "%";
    trail.style.top = y + "%";
    els.container.appendChild(trail);
    setTimeout(function () { trail.remove(); }, 700);
  }

  function showWorldMap(opts) {
    if (window.__airborneReturnToHangar) {
      try {
        var map = document.getElementById("worldMapScreen");
        if (map) { map.style.display = "none"; map.classList.add("hidden"); }
      } catch (e) {}
      return;
    }
    opts = opts || {};
    mapMode = opts.mode || "start";
    mapPendingResume = opts.onContinue || null;
    syncProgressFromGame();

    if (mapMode === "between" && typeof bossesDefeatedCount === "number") {
      const finished = Math.max(1, bossesDefeatedCount);
      mapCurrent = finished;
      mapMaxUnlocked = 6; // TEST MODE: all open
    }
    if (mapMode === "start") {
      mapCurrent = 1;
      mapMaxUnlocked = 6; // TEST MODE: all open
    }

    const els = getEls();
    if (!els.screen) return;

    const menu = document.getElementById("menuScreen");
    const game = document.getElementById("gameScreen");
    const cut = document.getElementById("cutsceneScreen");
    if (menu) menu.style.display = "none";
    if (cut) cut.style.display = "none";
    if (game && mapMode === "start") game.style.display = "none";

    if (els.title) {
      els.title.textContent = "";
      els.title.style.display = "none";
    }
    if (els.hint) {
      const cur = MAP_LEVELS[mapCurrent];
      els.hint.textContent = cur
        ? ("Tap " + cur.name + " (or the blimp) to take flight")
        : "Tap an unlocked post to take flight";
    }

    placeBlimp(mapCurrent);
    createMarkers();
    // Force visible full-screen map
    els.screen.style.cssText = "display:flex !important; position:fixed !important; inset:0 !important; z-index:120 !important; visibility:visible !important; opacity:1 !important; width:100% !important; height:100% !important; background:#0d0a08 !important;";
    els.screen.classList.remove("wm-enter");
    void els.screen.offsetWidth;
    els.screen.classList.add("wm-enter");
    try {
      var so = document.getElementById("startOverlay");
      if (so) { so.classList.add("hidden"); so.style.display = "none"; }
      var dock = document.getElementById("unifiedDock");
      if (dock) { dock.classList.add("menuHidden"); dock.classList.remove("gameActive"); }
    } catch (e) {}
  }

  window.__airborneShowWorldMap = showWorldMap;
})();

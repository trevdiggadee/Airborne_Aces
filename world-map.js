"use strict";

// Interactive world map — shown after the tutor cutscene and between levels.
(function () {
  const MAP_LEVELS = [
    { id: 0, name: "Start Hangar", x: 42, y: 91, hangar: true },
    { id: 1, name: "Beginner's Airfield", x: 55, y: 88 },
    { id: 2, name: "Great Steam City", x: 14, y: 70 },
    { id: 3, name: "Thunder Valley", x: 84, y: 58 },
    { id: 4, name: "Sky Factory", x: 13, y: 42 },
    { id: 5, name: "Iron Fortress", x: 82, y: 32 },
    { id: 6, name: "Skywatch Tower", x: 52, y: 11 }
  ];

  const PATHS = {
    "0-1": [{x:42,y:91},{x:48,y:90},{x:55,y:88}],
    "1-2": [{x:55,y:88},{x:48,y:82},{x:35,y:76},{x:22,y:72},{x:14,y:70}],
    "2-3": [{x:14,y:70},{x:30,y:66},{x:48,y:62},{x:65,y:60},{x:84,y:58}],
    "3-4": [{x:84,y:58},{x:65,y:52},{x:45,y:48},{x:28,y:45},{x:13,y:42}],
    "4-5": [{x:13,y:42},{x:30,y:38},{x:50,y:35},{x:68,y:33},{x:82,y:32}],
    "5-6": [{x:82,y:32},{x:72,y:26},{x:62,y:18},{x:52,y:11}],
    "1-0": [{x:55,y:88},{x:48,y:90},{x:42,y:91}],
    "2-1": [{x:14,y:70},{x:22,y:72},{x:35,y:76},{x:48,y:82},{x:55,y:88}],
    "3-2": [{x:84,y:58},{x:65,y:60},{x:48,y:62},{x:30,y:66},{x:14,y:70}],
    "4-3": [{x:13,y:42},{x:28,y:45},{x:45,y:48},{x:65,y:52},{x:84,y:58}],
    "5-4": [{x:82,y:32},{x:68,y:33},{x:50,y:35},{x:30,y:38},{x:13,y:42}],
    "6-5": [{x:52,y:11},{x:62,y:18},{x:72,y:26},{x:82,y:32}]
  };

  let mapCurrent = 1; // pin on Beginner's Airfield
  let mapMaxUnlocked = 1; // highest playable level index
  let mapFlying = false;
  let mapMode = "start"; // "start" | "between"
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
    // bossesDefeatedCount 0 → level 1 current, 1 → can go to 2, etc.
    const defeated = (typeof bossesDefeatedCount === "number") ? bossesDefeatedCount : 0;
    mapMaxUnlocked = Math.min(6, Math.max(1, defeated + 1));
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
      if (lvl.id === 0) return; // hangar is visual only on map
      if (lvl.id === mapCurrent) return; // blimp sits here

      const el = document.createElement("button");
      el.type = "button";
      el.className = "wm-level";
      if (lvl.id < mapCurrent) el.classList.add("completed");
      if (lvl.id > mapMaxUnlocked) el.classList.add("locked");
      el.style.left = lvl.x + "%";
      el.style.top = lvl.y + "%";
      el.setAttribute("aria-label", lvl.name);
      el.title = lvl.name;
      el.addEventListener("click", function () { onLevelClick(lvl.id); });
      els.container.appendChild(el);
    });
  }

  function onLevelClick(targetId) {
    if (mapFlying) return;
    if (targetId > mapMaxUnlocked) return;
    // Allow adjacent or any completed / current unlocked forward
    if (targetId > mapCurrent + 1) return;

    if (targetId === mapCurrent) {
      confirmSelection(targetId);
      return;
    }
    flyTo(targetId, function () {
      confirmSelection(targetId);
    });
  }

  function confirmSelection(levelId) {
    const els = getEls();
    if (els.screen) els.screen.style.display = "none";
    mapFlying = false;

    if (mapMode === "start") {
      if (window.__airborneEnterGameplay) window.__airborneEnterGameplay();
      else if (typeof enterGameplay === "function") enterGameplay();
    } else if (mapMode === "between") {
      if (typeof mapPendingResume === "function") {
        const fn = mapPendingResume;
        mapPendingResume = null;
        fn();
      }
    }
  }

  function flyTo(targetId, onDone) {
    mapFlying = true;
    const key = mapCurrent + "-" + targetId;
    const waypoints = PATHS[key] || [
      { x: MAP_LEVELS[mapCurrent].x, y: MAP_LEVELS[mapCurrent].y },
      { x: MAP_LEVELS[targetId].x, y: MAP_LEVELS[targetId].y }
    ];
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
    const duration = 1600;
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
      const segIdx = Math.min(Math.floor(segT), segCount - 1);
      const localT = segT - segIdx;
      const p0 = points[segIdx];
      const p1 = points[segIdx + 1];
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
    opts = opts || {};
    mapMode = opts.mode || "start";
    mapPendingResume = opts.onContinue || null;
    syncProgressFromGame();

    // After a level clear, pin on the level just finished and unlock next
    if (mapMode === "between" && typeof bossesDefeatedCount === "number") {
      const finished = Math.max(1, bossesDefeatedCount);
      mapCurrent = finished;
      mapMaxUnlocked = Math.min(6, finished + 1);
    }

    const els = getEls();
    if (!els.screen) return;

    // Hide other screens
    const menu = document.getElementById("menuScreen");
    const game = document.getElementById("gameScreen");
    const cut = document.getElementById("cutsceneScreen");
    if (menu) menu.style.display = "none";
    if (cut) cut.style.display = "none";
    if (game && mapMode === "start") game.style.display = "none";

    if (els.title) {
      els.title.textContent = mapMode === "between" ? "COURSE PLOTTED" : "CHART YOUR COURSE";
    }
    if (els.hint) {
      const nextName = (MAP_LEVELS[mapMaxUnlocked] && MAP_LEVELS[mapMaxUnlocked].name) || "next post";
      els.hint.textContent = mapMode === "between"
        ? ("Tap " + nextName + " to continue — or revisit a cleared post.")
        : "Tap an unlocked post to take flight.";
    }

    placeBlimp(mapCurrent);
    createMarkers();
    els.screen.style.display = "flex";

    // Soft entrance
    els.screen.classList.remove("wm-enter");
    void els.screen.offsetWidth;
    els.screen.classList.add("wm-enter");
  }

  window.__airborneShowWorldMap = showWorldMap;
})();

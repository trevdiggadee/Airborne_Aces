/**
 * Blimp Profile – hangar panel for Airborne Aces
 * Keys match selectBlimp() / BLIMP_DATA (blimp1 … blimp10).
 */
(function (global) {
  "use strict";

  var STAT_ORDER = ["Speed", "Lift", "Durability", "Maneuverability", "Boost"];
  var STAT_LABELS = {
    Speed: "Speed",
    Lift: "Lift",
    Durability: "Durability",
    Maneuverability: "Maneuverability",
    Boost: "Boost Power"
  };

  var SHIP_STATS = {
    blimp1: {
      name: "ZEPPELIN ACE", mk: "Mk I", cls: "Fighter", call: "ZA-01",
      locked: false,
      stats: { Speed: 4, Lift: 4, Durability: 3, Maneuverability: 3, Boost: 4 },
      ability: { icon: "", name: "ALWAYS SMILES", desc: "Morale stays high under fire." },
      upgrade: "Speed +1", xp: 320, xpMax: 500
    },
    blimp2: {
      name: "DECO LINER", mk: "Mk I", cls: "Liner", call: "DL-12",
      locked: false,
      stats: { Speed: 4, Lift: 3, Durability: 3, Maneuverability: 4, Boost: 3 },
      ability: { icon: "", name: "ART DECO AURA", desc: "Style inspires the crew." },
      upgrade: "Maneuverability +1", xp: 180, xpMax: 500
    },
    blimp3: {
      name: "AERO SLICER", mk: "Mk I", cls: "Interceptor", call: "AS-07",
      locked: false,
      stats: { Speed: 5, Lift: 3, Durability: 2, Maneuverability: 5, Boost: 4 },
      ability: { icon: "", name: "EDGE OF AIR", desc: "Cuts through rough winds." },
      upgrade: "Speed +1", xp: 150, xpMax: 500
    },
    blimp4: {
      name: "STEAMPUNK", mk: "Mk I", cls: "Heavy", call: "SP-04",
      locked: false,
      stats: { Speed: 3, Lift: 4, Durability: 5, Maneuverability: 2, Boost: 3 },
      ability: { icon: "", name: "BRASS BOUND", desc: "Extra armor plating." },
      upgrade: "Durability +1", xp: 200, xpMax: 500
    },
    blimp5: {
      name: "ROYAL VOYAGER", mk: "Mk I", cls: "Flagship", call: "RV-01",
      locked: false,
      stats: { Speed: 3, Lift: 4, Durability: 4, Maneuverability: 3, Boost: 3 },
      ability: { icon: "", name: "BORN NOBLE", desc: "Aura boosts nearby allies." },
      upgrade: "Lift +1", xp: 120, xpMax: 500
    },
    blimp6: {
      name: "BRASS CHRONOGRAPH", mk: "Mk I", cls: "Scout", call: "BC-06",
      locked: false,
      stats: { Speed: 3, Lift: 3, Durability: 4, Maneuverability: 3, Boost: 2 },
      ability: { icon: "", name: "TIMBER TOUGH", desc: "Absorbs extra hull damage." },
      upgrade: "Durability +1", xp: 210, xpMax: 500
    },
    blimp7: {
      name: "STORM CHASER", mk: "Mk I", cls: "Interceptor", call: "SC-03",
      locked: false,
      stats: { Speed: 5, Lift: 4, Durability: 2, Maneuverability: 5, Boost: 5 },
      ability: { icon: "", name: "THUNDERSTRUCK", desc: "Static blast stuns threats." },
      upgrade: "Boost +1", xp: 90, xpMax: 500
    },
    blimp8: {
      name: "CARGO KING", mk: "Mk I", cls: "Freighter", call: "CK-22",
      locked: false,
      stats: { Speed: 2, Lift: 5, Durability: 5, Maneuverability: 1, Boost: 2 },
      ability: { icon: "", name: "BEAST OF BURDEN", desc: "Extra cargo and armor." },
      upgrade: "Lift +1", xp: 40, xpMax: 500
    },
    blimp9: {
      name: "JOLLY ROGERS", mk: "Mk I", cls: "Raider", call: "JR-13",
      locked: false,
      stats: { Speed: 3, Lift: 3, Durability: 4, Maneuverability: 4, Boost: 3 },
      ability: { icon: "", name: "YO HO HOSTILITY", desc: "Intimidates nearby rivals." },
      upgrade: "Durability +1", xp: 110, xpMax: 500
    },
    blimp10: {
      name: "IVORY ANCHOR", mk: "Mk I", cls: "Scout", call: "IA-58",
      locked: false,
      stats: { Speed: 4, Lift: 4, Durability: 3, Maneuverability: 5, Boost: 3 },
      ability: { icon: "", name: "WIND RIDER", desc: "Improved stability in storm clouds." },
      upgrade: "Lift +1", xp: 250, xpMax: 500
    }
  };

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function update(key, opts) {
    opts = opts || {};
    var s = SHIP_STATS[key];
    if (!s) {
      console.warn("[BlimpProfile] unknown key:", key);
      return;
    }

    var heroNameId = opts.heroNameId || "heroName";
    var nameEl = document.getElementById(heroNameId);
    if (nameEl) {
      nameEl.classList.remove("show");
      setTimeout(function () {
        nameEl.textContent = s.name;
        nameEl.classList.add("show");
      }, 80);
    }

    var wrapSel = opts.heroWrapSelector || ".heroBlimpWrap";
    var heroWrap = document.querySelector(wrapSel);
    if (heroWrap) {
      if (s.locked) heroWrap.classList.add("locked");
      else heroWrap.classList.remove("locked");
    }

    setText("bpName", s.name);
    setText("bpMk", s.mk);
    setText("bpClass", s.cls);
    setText("bpCall", s.call);

    var statsEl = document.getElementById("bpStats");
    if (statsEl) {
      statsEl.innerHTML = "";
      STAT_ORDER.forEach(function (statName) {
        var val = (s.stats && s.stats[statName]) || 0;
        var row = document.createElement("div");
        row.className = "bpStat";
        var top = document.createElement("div");
        top.className = "bpStatTop";
        var lab = document.createElement("div");
        lab.className = "bpStatLabel";
        lab.textContent = STAT_LABELS[statName] || statName;
        top.appendChild(lab);
        var seg = document.createElement("div");
        seg.className = "bpSeg";
        for (var i = 1; i <= 5; i++) {
          var pip = document.createElement("i");
          if (i <= val) pip.className = "on";
          seg.appendChild(pip);
        }
        row.appendChild(top);
        row.appendChild(seg);
        statsEl.appendChild(row);
      });
    }

    setText("bpAbilityIcon", (s.ability && s.ability.icon) || "");
    setText("bpAbilityName", (s.ability && s.ability.name) || "—");
    setText("bpAbilityDesc", (s.ability && s.ability.desc) || "");
    setText("bpUpgrade", s.upgrade || "—");

    var pct = s.xpMax ? Math.min(100, (s.xp / s.xpMax) * 100) : 0;
    var fill = document.getElementById("bpXpFill");
    if (fill) fill.style.width = pct + "%";
    setText("bpXpLabel", (s.xp || 0) + " / " + (s.xpMax || 0) + " XP");
  }

  function setStats(map, merge) {
    if (!map) return;
    if (merge) {
      Object.keys(map).forEach(function (k) { SHIP_STATS[k] = map[k]; });
    } else {
      SHIP_STATS = map;
    }
  }

  function getStats(key) {
    return key ? SHIP_STATS[key] : SHIP_STATS;
  }

  global.BlimpProfile = {
    update: update,
    setStats: setStats,
    getStats: getStats,
    STAT_ORDER: STAT_ORDER,
    STAT_LABELS: STAT_LABELS,
    get SHIP_STATS() { return SHIP_STATS; }
  };

  // Default panel on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { update("blimp1"); });
  } else {
    update("blimp1");
  }
})(typeof window !== "undefined" ? window : this);

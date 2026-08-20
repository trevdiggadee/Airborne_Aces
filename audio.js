"use strict";

  // ---------- Sound — layered procedural audio engine, no audio files needed ----------
  // Everything here — SFX and music both — is synthesized live with the Web Audio
  // API (oscillators + filtered noise + a generated reverb impulse). No external
  // assets, so nothing to fail to load and no licensing concerns.
  let muted = false;
  try { muted = localStorage.getItem("aa_muted") === "1"; } catch (e) { muted = false; }

  let audioCtx = null;
  let masterGain = null;
  let sfxGainNode = null;
  let musicGainNode = null;
  let reverbNode = null;
  let reverbSendGain = null;

  function sfxDest() {
    if (sfxGainNode) return sfxGainNode;
    if (masterGain) return masterGain;
    return audioCtx ? audioCtx.destination : null;
  }
  window.__airborneEnsureAudio = function () { try { ensureAudio(); } catch (e) {} };
  window.__airborneSfxBeep = function (freq, dur, vol) {
    try {
      ensureAudio();
      if (!audioCtx) return;
      var t0 = audioCtx.currentTime;
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.frequency.value = freq || 660;
      o.type = "sine";
      g.gain.setValueAtTime(Math.max(0.001, vol || 0.15), t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.15));
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t0);
      o.stop(t0 + (dur || 0.15) + 0.02);
    } catch (e) {}
  };
  function ensureAudio() {
    if (audioCtx) {
      if (audioCtx.state === "suspended") audioCtx.resume();
      buildAudioGraph();
      return;
    }
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      buildAudioGraph();
    } catch (e) { audioCtx = null; }
  }

  function buildAudioGraph() {
    if (!audioCtx || masterGain) return;

    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(audioCtx.destination);

    sfxGainNode = audioCtx.createGain();
    sfxGainNode.gain.value = (typeof sfxVolumePref !== "undefined") ? sfxVolumePref : 1;
    sfxGainNode.connect(masterGain);

    musicGainNode = audioCtx.createGain();
    musicGainNode.gain.value = (typeof musicVolumePref !== "undefined") ? musicVolumePref : 0.25;
    musicGainNode.connect(masterGain);
    window.__debugGains = () => ({ m: musicGainNode.gain.value, s: sfxGainNode.gain.value, master: masterGain.gain.value, muted: muted, audioCtxState: audioCtx.state });

    // a short synthetic "room" reverb — an exponentially decaying noise impulse,
    // cheap to generate and good enough to give tones some body without files
    reverbNode = audioCtx.createConvolver();
    const rate = audioCtx.sampleRate;
    const len = Math.floor(rate * 1.4);
    const impulse = audioCtx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      }
    }
    reverbNode.buffer = impulse;
    reverbSendGain = audioCtx.createGain();
    reverbSendGain.gain.value = 0.4;
    reverbNode.connect(reverbSendGain);
    reverbSendGain.connect(masterGain);
  }

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem("aa_muted", muted ? "1" : "0"); } catch (e) {}
    if (masterGain && audioCtx) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 1, audioCtx.currentTime, 0.02);
    }
    // HTMLAudioElement MP3 (gameplay + menu)
    if (window.__airborneSetGameplayMusicMuted) window.__airborneSetGameplayMusicMuted(muted);
    if (window.__airborneApplyGameplayMusicVolume) window.__airborneApplyGameplayMusicVolume();
    const menuEl = document.getElementById("menuMusic");
    if (menuEl) {
      if (muted) {
        menuEl.dataset.userMuted = "1";
        menuEl.volume = 0;
      } else {
        menuEl.dataset.userMuted = "0";
        if (typeof menuMusicFadeStep === "function") menuMusicFadeStep();
      }
    }
    // Gear button stays ⚙ during gameplay; only show mute emoji outside pause UI
    const btn = document.getElementById("muteBtn");
    if (btn && btn.dataset.mode !== "settings") {
      btn.textContent = muted ? "🔇" : "🔊";
    }
  }
  window.__airborneSetMuted = setMuted;
  window.__airborneIsMuted = function () { return muted; };
  window.__airborneForceUnmute = function () {
    muted = false;
    try { localStorage.setItem("aa_muted", "0"); } catch (e) {}
    try {
      ensureAudio();
      if (masterGain && audioCtx) masterGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.02);
      if (sfxGainNode && audioCtx) sfxGainNode.gain.setTargetAtTime(
        (typeof sfxVolumePref === "number" ? Math.max(0.5, sfxVolumePref) : 1),
        audioCtx.currentTime, 0.02
      );
      if (musicGainNode && audioCtx) musicGainNode.gain.setTargetAtTime(
        (typeof musicVolumePref === "number" ? Math.max(0.2, musicVolumePref) : 0.35),
        audioCtx.currentTime, 0.02
      );
    } catch (e) {}
  };

  window.__airborneSetSynthMusicVolume = function(v) {
    if (musicGainNode && audioCtx) musicGainNode.gain.setTargetAtTime(v, audioCtx.currentTime, 0.02);
  };
  window.__airborneSetSfxVolume = function(v) {
    if (sfxGainNode && audioCtx) sfxGainNode.gain.setTargetAtTime(v, audioCtx.currentTime, 0.02);
  };

  function noteFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // a tone with a proper little attack/decay envelope, optional pitch sweep,
  // optional detune (for a thicker/metallic double-oscillator feel), and an
  // optional send to the reverb bus
  let sharedNoiseBuffer = null;
  function getSharedNoiseBuffer() {
    if (!audioCtx) return null;
    if (sharedNoiseBuffer && sharedNoiseBuffer.sampleRate === audioCtx.sampleRate) return sharedNoiseBuffer;
    const len = Math.ceil(audioCtx.sampleRate * 0.25);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    sharedNoiseBuffer = buf;
    return buf;
  }

  function playTone({ freq = 440, duration = 0.1, type = "sine", vol = 0.2, sweep = 0,
                       startDelay = 0, attack = 0.006, detune = 0, reverbSend = 0 }) {
    if (muted || !audioCtx) return;
    const t0 = audioCtx.currentTime + Math.max(0, startDelay);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (detune) osc.detune.setValueAtTime(detune, t0);
    if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + sweep), t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0005), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(sfxGainNode);
    if (reverbSend > 0 && reverbNode) {
      const send = audioCtx.createGain();
      send.gain.value = reverbSend;
      gain.connect(send);
      send.connect(reverbNode);
    }
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  // filtered noise burst — the workhorse for explosions, wind, thunder, hits
  function playNoise({ duration = 0.2, vol = 0.25, startDelay = 0, filterType = "lowpass",
                        filterFreq = 2000, filterFreqEnd = null, Q = 1, reverbSend = 0 }) {
    if (muted || !audioCtx) return;
    const t0 = audioCtx.currentTime + Math.max(0, startDelay);
    const buffer = getSharedNoiseBuffer();
    if (!buffer) return;
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t0);
    if (filterFreqEnd !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(40, filterFreqEnd), t0 + duration);
    filter.Q.value = Q;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(filter); filter.connect(gain); gain.connect(sfxGainNode);
    if (reverbSend > 0 && reverbNode) {
      const send = audioCtx.createGain();
      send.gain.value = reverbSend;
      gain.connect(send);
      send.connect(reverbNode);
    }
    src.start(t0);
  }

  let lastFlapSfxAt = 0;
  function sfxFlap() {
    // Throttle + single tone — multi-tap was stacking Web Audio nodes every frame
    const now = performance.now();
    if (now - lastFlapSfxAt < 55) return;
    lastFlapSfxAt = now;
    playTone({ freq: 200, duration: 0.07, type: "triangle", vol: 0.07, sweep: 120, attack: 0.002 });
  }

  function sfxShoot() {
    playNoise({ duration: 0.04, vol: 0.04, filterType: "bandpass", filterFreq: 1800, Q: 1.2 });
    playTone({ freq: 920, duration: 0.06, type: "square", vol: 0.055, sweep: -520, attack: 0.002 });
    playTone({ freq: 1500, duration: 0.025, type: "square", vol: 0.035, attack: 0.001 });
  }

  function sfxExplosion(size = 1) {
    playNoise({ duration: 0.26 + size * 0.12, vol: 0.17 + size * 0.08, filterType: "lowpass",
      filterFreq: 3200, filterFreqEnd: 180, Q: 0.8, reverbSend: 0.45 });
    playTone({ freq: 82, duration: 0.22 + size * 0.1, type: "sawtooth", vol: 0.12 + size * 0.06,
      sweep: -45, attack: 0.005, reverbSend: 0.2 });
    for (let i = 0; i < 3; i++) {
      playNoise({ duration: 0.03, vol: 0.05, filterType: "highpass", filterFreq: 2600, startDelay: 0.02 + i * 0.045 });
    }
  }

  function sfxHit() {
    playNoise({ duration: 0.14, vol: 0.16, filterType: "bandpass", filterFreq: 1400, filterFreqEnd: 500, Q: 1.4 });
    playNoise({ duration: 0.08, vol: 0.06, filterType: "highpass", filterFreq: 2800 });
    playTone({ freq: 145, duration: 0.16, type: "sawtooth", vol: 0.18, sweep: -95, attack: 0.002 });
    playTone({ freq: 70, duration: 0.18, type: "sine", vol: 0.08, sweep: -20, attack: 0.004 });
  }

  function sfxPowerup() {
    [0, 4, 7, 12, 16].forEach((iv, i) => {
      playTone({ freq: noteFreq(64 + iv), duration: 0.15, type: "triangle", vol: 0.11,
        sweep: 50, startDelay: i * 0.06, attack: 0.004, reverbSend: 0.35 });
    });
    playNoise({ duration: 0.2, vol: 0.04, filterType: "bandpass", filterFreq: 2400, filterFreqEnd: 800, reverbSend: 0.3 });
  }

  function sfxCrystalCollect() {
    // Bright crystalline chime — rising sparkle
    ensureAudio();
    try {
      if (!audioCtx) return;
      const t0 = audioCtx.currentTime;
      const g = audioCtx.createGain();
      g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.22 * (typeof sfxVolume === "number" ? sfxVolume : 0.7), t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
      [880, 1174, 1568].forEach(function (freq, i) {
        const o = audioCtx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, t0);
        const og = audioCtx.createGain();
        og.gain.setValueAtTime(0.0001, t0);
        og.gain.exponentialRampToValueAtTime(0.35 / (i + 1), t0 + 0.015 + i * 0.02);
        og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28 + i * 0.06);
        o.connect(og); og.connect(g);
        o.start(t0 + i * 0.02);
        o.stop(t0 + 0.5);
      });
    } catch (e) {}
  }

  function sfxRingCollect() {
    // Whoosh + bright ping for flying through a gold ring
    ensureAudio();
    try {
      const t0 = audioCtx.currentTime;
      const vol = (typeof sfxVolume === "number" ? sfxVolume : 0.7);
      // soft whoosh noise burst
      const len = Math.floor(audioCtx.sampleRate * 0.12);
      const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const bp = audioCtx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 900;
      bp.Q.value = 0.8;
      const ng = audioCtx.createGain();
      ng.gain.setValueAtTime(0.18 * vol, t0);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
      src.connect(bp); bp.connect(ng); ng.connect(audioCtx.destination);
      src.start(t0); src.stop(t0 + 0.13);
      // gold ping
      const o = audioCtx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(740, t0);
      o.frequency.exponentialRampToValueAtTime(1480, t0 + 0.08);
      const og = audioCtx.createGain();
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.exponentialRampToValueAtTime(0.2 * vol, t0 + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      o.connect(og); og.connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + 0.3);
    } catch (e) {}
  }

  function sfxRankUp() {
    // Fanfare-ish rising brass sparkle for RANK UP
    ensureAudio();
    try {
      const t0 = audioCtx.currentTime;
      const vol = (typeof sfxVolume === "number" ? sfxVolume : 0.7);
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      notes.forEach(function (freq, i) {
        const o = audioCtx.createOscillator();
        o.type = i % 2 === 0 ? "triangle" : "square";
        o.frequency.setValueAtTime(freq, t0 + i * 0.09);
        const og = audioCtx.createGain();
        og.gain.setValueAtTime(0.0001, t0 + i * 0.09);
        og.gain.exponentialRampToValueAtTime(0.18 * vol, t0 + i * 0.09 + 0.02);
        og.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.09 + 0.45);
        o.connect(og); og.connect(audioCtx.destination);
        o.start(t0 + i * 0.09);
        o.stop(t0 + i * 0.09 + 0.5);
      });
      // shimmer noise tail
      const len = Math.floor(audioCtx.sampleRate * 0.35);
      const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const hp = audioCtx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1800;
      const ng = audioCtx.createGain();
      ng.gain.setValueAtTime(0.08 * vol, t0 + 0.15);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      src.connect(hp); hp.connect(ng); ng.connect(audioCtx.destination);
      src.start(t0 + 0.15); src.stop(t0 + 0.52);
    } catch (e) {}
  }

  function sfxHeart() {
    playTone({ freq: 660, duration: 0.16, type: "sine", vol: 0.12, sweep: 140, reverbSend: 0.35 });
    playTone({ freq: 990, duration: 0.14, type: "sine", vol: 0.06, startDelay: 0.03, reverbSend: 0.35 });
  }

  function sfxBossDefeat() {
    // a little triumphant major chord + rising fanfare stab
    [0, 4, 7, 12].forEach(iv => {
      playTone({ freq: noteFreq(45 + iv), duration: 0.6, type: "sawtooth", vol: 0.07, attack: 0.02, reverbSend: 0.4 });
    });
    [0, 0.14, 0.28].forEach((d, i) => {
      playTone({ freq: 300 + i * 140, duration: 0.22, type: "square", vol: 0.14, sweep: 90, startDelay: d, reverbSend: 0.3 });
    });
  }

  // ---------- Level-end / landing sequence SFX ----------
  function sfxCityClear() {
    // whoosh of the city rushing past + low rumble
    playNoise({ duration: 0.55, vol: 0.14, filterType: "lowpass", filterFreq: 1800, filterFreqEnd: 220, Q: 0.7, reverbSend: 0.35 });
    playTone({ freq: 90, duration: 0.5, type: "sawtooth", vol: 0.08, sweep: -35, attack: 0.02, reverbSend: 0.25 });
    playTone({ freq: 180, duration: 0.35, type: "triangle", vol: 0.06, sweep: -80, startDelay: 0.08 });
  }

  function sfxPadApproach() {
    // distant mechanical/hangar tone — pad coming into view
    playTone({ freq: 220, duration: 0.4, type: "triangle", vol: 0.07, sweep: 40, attack: 0.04, reverbSend: 0.4 });
    playTone({ freq: 330, duration: 0.3, type: "sine", vol: 0.05, startDelay: 0.12, reverbSend: 0.35 });
    playNoise({ duration: 0.25, vol: 0.05, filterType: "bandpass", filterFreq: 600, Q: 1.2, startDelay: 0.05 });
  }

  function sfxLandPrompt() {
    // soft double-ping cue to land
    playTone({ freq: 520, duration: 0.12, type: "sine", vol: 0.09, attack: 0.005, reverbSend: 0.3 });
    playTone({ freq: 780, duration: 0.14, type: "sine", vol: 0.07, startDelay: 0.11, reverbSend: 0.3 });
  }

  function sfxTouchdown() {
    // solid dock thud + dust whoosh + metal settle
    playNoise({ duration: 0.28, vol: 0.16, filterType: "lowpass", filterFreq: 1400, filterFreqEnd: 200, Q: 0.8, reverbSend: 0.25 });
    playTone({ freq: 70, duration: 0.32, type: "sine", vol: 0.16, sweep: -20, attack: 0.004, reverbSend: 0.2 });
    playTone({ freq: 140, duration: 0.18, type: "triangle", vol: 0.08, startDelay: 0.04 });
    // short steam hiss
    playNoise({ duration: 0.35, vol: 0.08, filterType: "highpass", filterFreq: 2200, filterFreqEnd: 900, Q: 0.6, startDelay: 0.06 });
  }

  function sfxLevelCompleteFanfare() {
    // bigger triumphant fanfare than boss defeat
    [0, 4, 7, 12, 16].forEach((iv, i) => {
      playTone({ freq: noteFreq(52 + iv), duration: 0.7, type: "sawtooth", vol: 0.08,
        attack: 0.02, startDelay: i * 0.04, reverbSend: 0.45 });
    });
    [0, 0.16, 0.32, 0.48].forEach((d, i) => {
      playTone({ freq: 280 + i * 110, duration: 0.28, type: "square", vol: 0.12,
        sweep: 70, startDelay: d, reverbSend: 0.35 });
    });
    // shimmer top
    playTone({ freq: 1320, duration: 0.5, type: "sine", vol: 0.05, startDelay: 0.35, reverbSend: 0.5 });
  }

  function sfxFireworkPop() {
    playNoise({ duration: 0.18, vol: 0.1, filterType: "highpass", filterFreq: 1800, filterFreqEnd: 600, Q: 0.9, reverbSend: 0.3 });
    playTone({ freq: 400 + Math.random() * 500, duration: 0.15, type: "triangle", vol: 0.07,
      sweep: -120, attack: 0.003, reverbSend: 0.35 });
  }

  function sfxStatsReveal() {
    // UI panel whoosh + soft chime
    playNoise({ duration: 0.2, vol: 0.06, filterType: "lowpass", filterFreq: 1200, filterFreqEnd: 400, reverbSend: 0.2 });
    [0, 5, 9].forEach((iv, i) => {
      playTone({ freq: noteFreq(67 + iv), duration: 0.22, type: "sine", vol: 0.08,
        startDelay: 0.05 + i * 0.07, attack: 0.01, reverbSend: 0.4 });
    });
  }

  function sfxLevelFadeOut() {
    // deep descending wash into silence
    playNoise({ duration: 0.9, vol: 0.1, filterType: "lowpass", filterFreq: 900, filterFreqEnd: 80, Q: 0.5, reverbSend: 0.4 });
    playTone({ freq: 160, duration: 0.85, type: "sine", vol: 0.07, sweep: -100, attack: 0.05, reverbSend: 0.35 });
  }

  function sfxLevel2Start() {
    // bright lift-off into the next level
    playTone({ freq: 260, duration: 0.25, type: "triangle", vol: 0.09, sweep: 120, attack: 0.01, reverbSend: 0.3 });
    playTone({ freq: 390, duration: 0.28, type: "sine", vol: 0.07, startDelay: 0.1, sweep: 80, reverbSend: 0.35 });
    playTone({ freq: 520, duration: 0.3, type: "sine", vol: 0.05, startDelay: 0.2, reverbSend: 0.4 });
  }

  function sfxCrash() {
    playNoise({ duration: 0.42, vol: 0.22, filterType: "lowpass", filterFreq: 2600, filterFreqEnd: 150, reverbSend: 0.35 });
    playTone({ freq: 90, duration: 0.42, type: "sawtooth", vol: 0.18, sweep: -65, attack: 0.005, reverbSend: 0.2 });
    playTone({ freq: 55, duration: 0.5, type: "sine", vol: 0.12, startDelay: 0.05 });
  }

  // ---------- Airfield training ambience ----------
  let airfieldEngineNodes = null;
  let airfieldWindNodes = null;
  let airfieldBirdTimer = 0;

  function sfxAirfieldEngineStart() {
    ensureAudio();
    if (muted || !audioCtx) return;
    sfxAirfieldEngineStop();
    const t0 = audioCtx.currentTime;
    // Low rumble + mid prop whir
    const osc1 = audioCtx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(48, t0);
    const osc2 = audioCtx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(92, t0);
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(280, t0);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.4);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    var dest = sfxDest();
    if (!dest) return;
    gain.connect(dest);
    osc1.start(t0);
    osc2.start(t0);
    airfieldEngineNodes = { osc1, osc2, filter, gain };
  }

  function sfxAirfieldEngineSetSpeed(frac, climbRate) {
    // frac 0..1 — pitch/volume with airspeed
    // climbRate -1..1 — ascending raises pitch, descending lowers it
    if (!airfieldEngineNodes || !audioCtx) return;
    let f = Number(frac); if (!isFinite(f)) f = 0;
    f = Math.max(0, Math.min(1, f));
    let c = Number(climbRate); if (!isFinite(c)) c = 0;
    c = Math.max(-1, Math.min(1, c));
    const t0 = audioCtx.currentTime;
    try {
      const pitchBoost = c * 28;
      const f1 = 48 + f * 40 + pitchBoost * 0.5;
      const f2 = 92 + f * 70 + pitchBoost;
      const ff = 280 + f * 900 + c * 200;
      const gv = 0.04 + f * 0.08 + Math.abs(c) * 0.02;
      if (isFinite(f1)) airfieldEngineNodes.osc1.frequency.setTargetAtTime(f1, t0, 0.12);
      if (isFinite(f2)) airfieldEngineNodes.osc2.frequency.setTargetAtTime(f2, t0, 0.12);
      if (isFinite(ff)) airfieldEngineNodes.filter.frequency.setTargetAtTime(ff, t0, 0.15);
      if (isFinite(gv) && gv > 0) airfieldEngineNodes.gain.gain.setTargetAtTime(gv, t0, 0.1);
    } catch (e) {}
  }
  function sfxAirfieldEngineSetClimb(climbRate) {
    sfxAirfieldEngineSetSpeed(0.55, climbRate);
  }

  function sfxAirfieldEngineStop() {
    if (!airfieldEngineNodes || !audioCtx) return;
    const t0 = audioCtx.currentTime;
    try {
      airfieldEngineNodes.gain.gain.cancelScheduledValues(t0);
      airfieldEngineNodes.gain.gain.setValueAtTime(airfieldEngineNodes.gain.gain.value, t0);
      airfieldEngineNodes.gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
      airfieldEngineNodes.osc1.stop(t0 + 0.4);
      airfieldEngineNodes.osc2.stop(t0 + 0.4);
    } catch (e) {}
    airfieldEngineNodes = null;
  }

  function sfxAirfieldTakeoff() {
    if (muted || !audioCtx) return;
    // Rising whoosh + engine surge
    playNoise({ duration: 1.4, vol: 0.14, filterType: "lowpass", filterFreq: 2400, filterFreqEnd: 400, Q: 0.7, reverbSend: 0.25 });
    playTone({ freq: 110, duration: 0.9, type: "sawtooth", vol: 0.08, sweep: 80, attack: 0.05, reverbSend: 0.15 });
    playTone({ freq: 220, duration: 0.6, type: "triangle", vol: 0.05, sweep: 120, attack: 0.08 });
  }

  function sfxAirfieldWindStart() {
    ensureAudio();
    if (muted || !audioCtx) return;
    sfxAirfieldWindStop();
    const t0 = audioCtx.currentTime;
    const buffer = getSharedNoiseBuffer();
    if (!buffer) return;
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, t0);
    filter.Q.value = 0.6;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.exponentialRampToValueAtTime(0.035, t0 + 0.8);
    src.connect(filter);
    filter.connect(gain);
    var dest = sfxDest();
    if (!dest) return;
    gain.connect(dest);
    src.start(t0);
    airfieldWindNodes = { src, filter, gain };
  }

  function sfxAirfieldWindStop() {
    if (!airfieldWindNodes || !audioCtx) return;
    const t0 = audioCtx.currentTime;
    try {
      airfieldWindNodes.gain.gain.cancelScheduledValues(t0);
      airfieldWindNodes.gain.gain.setValueAtTime(Math.max(0.001, airfieldWindNodes.gain.gain.value), t0);
      airfieldWindNodes.gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
      airfieldWindNodes.src.stop(t0 + 0.55);
    } catch (e) {}
    airfieldWindNodes = null;
  }

  function sfxAirfieldBird() {
    if (muted || !audioCtx) return;
    // Short chirp pair
    const base = 1400 + Math.random() * 800;
    playTone({ freq: base, duration: 0.07, type: "sine", vol: 0.035, sweep: 200, attack: 0.005 });
    playTone({ freq: base * 1.12, duration: 0.05, type: "sine", vol: 0.025, sweep: -150, attack: 0.002, startDelay: 0.06 });
  }

  function sfxAirfieldBirdTick(dt) {
    airfieldBirdTimer -= dt;
    if (airfieldBirdTimer <= 0) {
      airfieldBirdTimer = 2.5 + Math.random() * 4.5;
      if (Math.random() < 0.7) sfxAirfieldBird();
    }
  }

  function sfxAirfieldScreech() {
    // High tire/skid screech + grit
    playNoise({ duration: 0.55, vol: 0.22, filterType: "bandpass", filterFreq: 1800, filterFreqEnd: 600, Q: 2.2, reverbSend: 0.15 });
    playNoise({ duration: 0.4, vol: 0.12, filterType: "highpass", filterFreq: 3200, filterFreqEnd: 1200, Q: 1.4, startDelay: 0.05 });
    playTone({ freq: 420, duration: 0.35, type: "sawtooth", vol: 0.06, sweep: -280, attack: 0.01, reverbSend: 0.1 });
    playTone({ freq: 180, duration: 0.28, type: "square", vol: 0.05, sweep: -80, startDelay: 0.08 });
  }

  function sfxAirfieldLand() {
    if (muted || !audioCtx) return;
    playNoise({ duration: 0.35, vol: 0.08, filterType: "lowpass", filterFreq: 600, filterFreqEnd: 120, Q: 0.8 });
    playTone({ freq: 90, duration: 0.25, type: "triangle", vol: 0.05, sweep: -30, attack: 0.01 });
  }

  function sfxClick() {

    playTone({ freq: 900, duration: 0.035, type: "square", vol: 0.07, attack: 0.001 });
    playNoise({ duration: 0.02, vol: 0.03, filterType: "highpass", filterFreq: 3200 });
  }

  function sfxThunder() {
    playNoise({ duration: 0.6, vol: 0.16, filterType: "lowpass", filterFreq: 500, filterFreqEnd: 80, reverbSend: 0.55 });
    playNoise({ duration: 0.12, vol: 0.1, filterType: "highpass", filterFreq: 3000, startDelay: 0.01 });
    playTone({ freq: 50, duration: 0.6, type: "sawtooth", vol: 0.1, sweep: -15, reverbSend: 0.35 });
  }

  function sfxDeflect() {
    playTone({ freq: 1200, duration: 0.08, type: "sine", vol: 0.1, sweep: 320, detune: 8, reverbSend: 0.3 });
    playTone({ freq: 1600, duration: 0.06, type: "sine", vol: 0.06, sweep: 320, startDelay: 0.01 });
  }

  function sfxTypewriterTick() {
    playTone({ freq: 1050 + Math.random() * 260, duration: 0.028, type: "square", vol: 0.05, attack: 0.001 });
  }

  function sfxStreak() {
    [0, 0.07].forEach((d, i) => {
      playTone({ freq: 660 * Math.pow(2, (i * 3) / 12), duration: 0.09, type: "triangle", vol: 0.09, sweep: 120, startDelay: d });
    });
  }

  function sfxStormReady() {
    // bright rising sparkle + chime — signals the power is charged and tappable
    [0, 4, 7, 12, 16].forEach((iv, i) => {
      playTone({ freq: noteFreq(69 + iv), duration: 0.16, type: "triangle", vol: 0.09,
        sweep: 60, startDelay: i * 0.045, attack: 0.003, reverbSend: 0.4 });
    });
    playTone({ freq: 1760, duration: 0.22, type: "sine", vol: 0.07, startDelay: 0.18, reverbSend: 0.45 });
  }

  // ---------- Music — original adaptive score, two hand-written 16-step loops ----------
  // (normal flight vs. boss-fight), scheduled with a standard lookahead sequencer
  // so timing stays tight even though we're just calling setInterval.
  const THEME_NORMAL = {
    bpm: 116,
    lead: [62, 0, 66, 0, 69, 0, 67, 66, 62, 0, 69, 0, 71, 69, 67, 0],
    bass: [50, 0, 0, 0, 45, 0, 0, 0, 43, 0, 0, 0, 45, 0, 0, 0],
    hat:  [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]
  };
  const THEME_BOSS = {
    bpm: 150,
    lead: [62, 65, 67, 65, 70, 67, 65, 62, 74, 72, 70, 67, 65, 67, 62, 0],
    bass: [50, 50, 45, 45, 43, 43, 45, 45, 50, 50, 45, 45, 43, 43, 45, 45],
    hat:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
  };

  let musicPlaying = false;
  let musicTheme = THEME_NORMAL;
  let musicStep = 0;
  let musicNextNoteTime = 0;
  let musicTimerId = null;
  const MUSIC_SCHEDULE_AHEAD = 0.14;
  const MUSIC_LOOKAHEAD_MS = 30;

  function musicStepDuration() {
    return 60 / musicTheme.bpm / 4; // 16th notes
  }

  function scheduleMusicStep(step, time) {
    const t = musicTheme;
    const dur = musicStepDuration();
    const delay = Math.max(0, time - audioCtx.currentTime);

    const leadNote = t.lead[step];
    if (leadNote) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(noteFreq(leadNote), time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.11, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur * 1.7);
      osc.connect(gain); gain.connect(musicGainNode);
      const send = audioCtx.createGain();
      send.gain.value = 0.2;
      gain.connect(send); send.connect(reverbNode);
      osc.start(time); osc.stop(time + dur * 1.8);
    }
    const bassNote = t.bass[step];
    if (bassNote) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(noteFreq(bassNote - 12), time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.16, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur * 1.9);
      osc.connect(gain); gain.connect(musicGainNode);
      osc.start(time); osc.stop(time + dur * 2);
    }
    if (t.hat[step] && !muted) {
      playNoise({ duration: 0.035, vol: 0.03, filterType: "highpass", filterFreq: 6500, startDelay: delay });
    }
    if (t.kick[step]) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.15, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
      osc.connect(gain); gain.connect(musicGainNode);
      osc.start(time); osc.stop(time + 0.15);
    }
  }

  function musicScheduler() {
    if (!audioCtx) return;
    if (muted) {
      // keep the clock from drifting behind while muted, so unmuting resumes
      // cleanly instead of bursting through every skipped step at once
      musicNextNoteTime = audioCtx.currentTime + 0.05;
      return;
    }
    while (musicNextNoteTime < audioCtx.currentTime + MUSIC_SCHEDULE_AHEAD) {
      scheduleMusicStep(musicStep, musicNextNoteTime);
      musicNextNoteTime += musicStepDuration();
      musicStep = (musicStep + 1) % musicTheme.lead.length;
    }
  }

  // Temporary: music off so only sound effects play
  const MUSIC_DISABLED = true;

  function startMusic() {
    // MP3 + procedural music disabled — SFX only
    if (MUSIC_DISABLED) {
      if (window.__airborneStopGameplayMusic) window.__airborneStopGameplayMusic();
      musicPlaying = false;
      return;
    }
    if (window.__airborneStartGameplayMusic) window.__airborneStartGameplayMusic();
    if (!audioCtx) return;
    buildAudioGraph();
    if (musicPlaying) return;
    musicPlaying = true;
    musicStep = 0;
    musicNextNoteTime = audioCtx.currentTime + 0.05;
    musicTimerId = setInterval(musicScheduler, MUSIC_LOOKAHEAD_MS);
  }

  function stopMusic() {
    if (window.__airborneStopGameplayMusic) window.__airborneStopGameplayMusic();
    musicPlaying = false;
    if (musicTimerId) { clearInterval(musicTimerId); musicTimerId = null; }
  }

  // Pause all audio when the tab/app is backgrounded so music doesn't keep
  // playing after the player leaves the browser (mobile + desktop).
  let musicWasPlayingBeforeHide = false;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      musicWasPlayingBeforeHide = musicPlaying;
      if (musicPlaying) stopMusic();
      if (audioCtx && audioCtx.state === "running") {
        try { audioCtx.suspend(); } catch (e) {}
      }
    } else {
      if (audioCtx && audioCtx.state === "suspended") {
        try { audioCtx.resume(); } catch (e) {}
      }
      if (musicWasPlayingBeforeHide) {
        musicWasPlayingBeforeHide = false;
        // Only resume if the game is still in an active playable state
        if (typeof state !== "undefined" && (state === "playing" || state === "bossDialogue")) {
          startMusic();
        }
      }
    }
  });
  // iOS Safari sometimes only fires pagehide
  window.addEventListener("pagehide", function () {
    musicWasPlayingBeforeHide = musicPlaying;
    if (musicPlaying) stopMusic();
    if (audioCtx && audioCtx.state === "running") {
      try { audioCtx.suspend(); } catch (e) {}
    }
  });

  function setMusicTheme(theme) {
    musicTheme = theme;
  }


// Global exports so training can always reach SFX
window.ensureAudio = ensureAudio;
window.sfxCrystalCollect = sfxCrystalCollect;
window.sfxRingCollect = sfxRingCollect;
window.sfxAirfieldEngineStart = sfxAirfieldEngineStart;
window.sfxAirfieldWindStart = sfxAirfieldWindStart;
window.sfxAirfieldEngineStop = sfxAirfieldEngineStop;
window.sfxAirfieldWindStop = sfxAirfieldWindStop;
window.sfxAirfieldTakeoff = sfxAirfieldTakeoff;
window.sfxAirfieldLand = sfxAirfieldLand;
window.sfxTouchdown = sfxTouchdown;
window.sfxLevelCompleteFanfare = sfxLevelCompleteFanfare;
window.sfxFireworkPop = sfxFireworkPop;
window.sfxClick = sfxClick;
window.sfxPowerup = sfxPowerup;
window.sfxHit = sfxHit;
window.sfxHeart = sfxHeart;

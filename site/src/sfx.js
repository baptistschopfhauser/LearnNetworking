/* ---------- sound effects: tiny WebAudio synth, no audio files ---------- */
const MUTE_KEY = 'packetcraft.mute';
let actx = null;
let muted = (() => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } })();
// [freq Hz, duration s, wave, start delay s, end freq]
const SOUNDS = {
  ok: [[660, 0.08, 'triangle', 0], [990, 0.14, 'triangle', 0.07]],
  bad: [[220, 0.28, 'sawtooth', 0, 110]],
  whoosh: [[260, 0.22, 'sine', 0, 820]],
  win: [[523, 0.12, 'triangle', 0], [659, 0.12, 'triangle', 0.1], [784, 0.12, 'triangle', 0.2], [1047, 0.3, 'triangle', 0.3]],
  click: [[1300, 0.03, 'square', 0]],
  zap: [[900, 0.12, 'square', 0, 180]],
};
export const sfx = {
  play(name) {
    if (muted || !SOUNDS[name]) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const t0 = actx.currentTime;
      for (const [f, d, type, delay, f2] of SOUNDS[name]) {
        const osc = actx.createOscillator(), g = actx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f, t0 + delay);
        if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t0 + delay + d);
        g.gain.setValueAtTime(0.0001, t0 + delay);
        g.gain.exponentialRampToValueAtTime(0.07, t0 + delay + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + d);
        osc.connect(g).connect(actx.destination);
        osc.start(t0 + delay); osc.stop(t0 + delay + d + 0.02);
      }
    } catch { /* audio unavailable */ }
  },
  get muted() { return muted; },
  toggle() { muted = !muted; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* storage blocked */ } return muted; },
};

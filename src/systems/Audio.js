// Procedural sound effects with the Web Audio API — no audio files, nothing leaves the machine.
// The AudioContext is created on the first key press / click (browser autoplay rules).
import { loadSave, updateSave } from '../core/save.js';

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = loadSave().sound !== false;
    this._noiseBuffer = null;
  }

  attachUnlock() {
    const unlock = () => this._ensure();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  setEnabled(on) {
    this.enabled = on;
    updateSave({ sound: on });
    if (on) this.play('ui');
  }

  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  play(name) {
    if (!this.enabled) return;
    const ctx = this._ensure();
    if (!ctx || ctx.state !== 'running') return;
    try { SOUNDS[name]?.(this); } catch (e) { /* never let a bleep crash the game */ }
  }

  tone({ freq = 440, type = 'sine', dur = 0.2, gain = 0.25, glide = null, glideBack = null, attack = 0.01, delay = 0, filter = null, vibrato = 0 }) {
    const ctx = this.ctx, t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t0 + dur * (glideBack ? 0.45 : 0.8));
    if (glideBack) osc.frequency.exponentialRampToValueAtTime(glideBack, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type;
      f.frequency.value = filter.freq;
      node.connect(f);
      node = f;
    }
    if (vibrato) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = vibrato;
      lg.gain.value = freq * 0.06;
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    node.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.2, gain = 0.2, filter = null, delay = 0 }) {
    const ctx = this.ctx, t0 = ctx.currentTime + delay;
    if (!this._noiseBuffer) {
      const len = ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noiseBuffer = buf;
    }
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = src;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type;
      f.frequency.setValueAtTime(filter.freq, t0);
      if (filter.sweepTo) f.frequency.exponentialRampToValueAtTime(filter.sweepTo, t0 + dur);
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }
}

const arp = (a, notes, { type = 'triangle', dur = 0.4, gain = 0.16, step = 0.1 } = {}) =>
  notes.forEach((f, i) => a.tone({ freq: f, type, dur, gain, delay: i * step }));

const SOUNDS = {
  ui: (a) => a.tone({ freq: 660, type: 'triangle', dur: 0.08, gain: 0.12 }),
  locked: (a) => a.tone({ freq: 200, type: 'square', dur: 0.1, gain: 0.07 }),
  headbutt: (a) => { a.noise({ dur: 0.08, gain: 0.22, filter: { type: 'lowpass', freq: 900 } }); a.tone({ freq: 140, glide: 60, dur: 0.14, gain: 0.35 }); },
  enemyHit: (a) => a.tone({ freq: 220, glide: 110, type: 'square', dur: 0.09, gain: 0.1 }),
  charge: (a) => a.noise({ dur: 0.45, gain: 0.28, filter: { type: 'bandpass', freq: 400, sweepTo: 1800 } }),
  shield: (a) => { a.tone({ freq: 880, dur: 0.25, gain: 0.18 }); a.tone({ freq: 1320, dur: 0.35, gain: 0.14, delay: 0.08 }); },
  moo: (a) => { a.tone({ freq: 230, glide: 150, type: 'sawtooth', dur: 0.7, gain: 0.2, vibrato: 6, filter: { type: 'lowpass', freq: 700 } }); a.tone({ freq: 115, glide: 75, type: 'triangle', dur: 0.7, gain: 0.18 }); },
  grass: (a) => arp(a, [523, 659, 784, 1047], { type: 'sine', dur: 0.35, step: 0.07 }),
  charm: (a) => arp(a, [523, 659, 784, 1047, 1319], { dur: 0.5, step: 0.09 }),
  gate: (a) => a.noise({ dur: 1.0, gain: 0.32, filter: { type: 'lowpass', freq: 300, sweepTo: 80 } }),
  hurt: (a) => a.tone({ freq: 320, glide: 140, type: 'square', dur: 0.16, gain: 0.12 }),
  thorn: (a) => a.tone({ freq: 500, glide: 300, type: 'square', dur: 0.08, gain: 0.08 }),
  ko: (a) => { a.tone({ freq: 400, glide: 60, type: 'triangle', dur: 0.5, gain: 0.18 }); a.noise({ dur: 0.15, gain: 0.18, filter: { type: 'lowpass', freq: 600 } }); },
  berry: (a) => { a.tone({ freq: 700, dur: 0.08, gain: 0.14 }); a.tone({ freq: 1000, dur: 0.12, gain: 0.14, delay: 0.07 }); },
  bond: (a) => arp(a, [784, 988], { type: 'sine', dur: 0.3, gain: 0.11 }),
  revive: (a) => arp(a, [392, 523, 659, 784], { dur: 0.4, gain: 0.14 }),
  growl: (a) => a.tone({ freq: 90, type: 'sawtooth', dur: 0.6, gain: 0.16, vibrato: 12, filter: { type: 'lowpass', freq: 400 } }),
  roar: (a) => { a.tone({ freq: 110, glide: 70, type: 'sawtooth', dur: 1.0, gain: 0.26, vibrato: 9, filter: { type: 'lowpass', freq: 600 } }); a.noise({ dur: 0.9, gain: 0.18, filter: { type: 'lowpass', freq: 500, sweepTo: 200 } }); },
  howl: (a) => a.tone({ freq: 420, glide: 760, glideBack: 520, dur: 1.3, gain: 0.2, vibrato: 4 }),
  bossDown: (a) => arp(a, [523, 659, 784, 1047, 784, 1047, 1319], { dur: 0.4, step: 0.12 }),
  win: (a) => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => { a.tone({ freq: f, type: 'triangle', dur: 0.9, gain: 0.15, delay: i * 0.15 }); a.tone({ freq: f / 2, dur: 0.9, gain: 0.09, delay: i * 0.15 }); }),
  lose: (a) => arp(a, [392, 349, 311, 262], { dur: 0.5, gain: 0.14, step: 0.25 }),
};

export const audio = new AudioSystem();

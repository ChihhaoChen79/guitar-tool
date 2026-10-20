// Shared Web Audio helpers: context unlock (iOS), plucked-string synth, metronome click, scheduler.

// Standard tuning, low E (index 0) to high e (index 5), as MIDI note numbers.
export const TUNING = [40, 45, 50, 55, 59, 64];
export const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];
export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function midiToFreq(midi, a4 = 440) {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function noteToFreq(stringIndex, fret, a4 = 440) {
  return midiToFreq(TUNING[stringIndex] + fret, a4);
}

let ctx = null;
let master = null;

export function getContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  return ctx;
}

export function getMaster() {
  getContext();
  return master;
}

// iOS only starts audio from a user gesture. Resume the context and play a silent
// buffer on the first touch; ask for "playback" so the ring/silent switch doesn't mute it.
export function installUnlock() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch { /* not supported */ }
  const unlock = () => {
    const c = getContext();
    if (c.state !== 'running') c.resume();
    const buf = c.createBuffer(1, 1, c.sampleRate);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
    if (c.state === 'running') {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('touchend', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    }
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('touchend', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

export async function ensureRunning() {
  const c = getContext();
  if (c.state !== 'running') {
    try { await c.resume(); } catch { /* ignore */ }
  }
  return c;
}

// Karplus-Strong plucked string, rendered into an AudioBuffer once per pitch and cached.
const pluckCache = new Map();

export function renderPluck(freq, sampleRate, seconds = 2.5) {
  const len = Math.floor(sampleRate * seconds);
  const out = new Float32Array(len);
  // The two-point averaging filter adds half a sample of delay.
  const period = sampleRate / freq - 0.5;
  const n = Math.max(2, Math.ceil(period) + 1);
  // Softened noise burst: low-passed white noise reads more like a pick than a hiss.
  let prev = 0;
  for (let i = 0; i < n && i < len; i++) {
    const w = Math.random() * 2 - 1;
    prev = prev + 0.6 * (w - prev);
    out[i] = prev;
  }
  // Higher strings lose energy faster; keep low strings ringing.
  const decay = Math.min(0.9985, 0.996 + 0.0000025 * (sampleRate / freq));
  const read = (pos) => {
    if (pos < 0) return 0;
    const i = Math.floor(pos);
    const f = pos - i;
    return out[i] * (1 - f) + (out[i + 1] || 0) * f;
  };
  for (let i = n; i < len; i++) {
    const a = read(i - period);
    const b = read(i - period - 1);
    out[i] = decay * 0.5 * (a + b);
  }
  // Remove DC offset left by the noise burst and normalize.
  let mean = 0;
  for (let i = 0; i < n; i++) mean += out[i];
  mean /= n;
  let peak = 0;
  for (let i = 0; i < len; i++) {
    out[i] -= mean * Math.exp(-i / (sampleRate * 0.05));
    peak = Math.max(peak, Math.abs(out[i]));
  }
  if (peak > 0) for (let i = 0; i < len; i++) out[i] /= peak;
  return out;
}

function pluckBuffer(freq) {
  const c = getContext();
  const key = Math.round(freq * 100);
  let buf = pluckCache.get(key);
  if (!buf) {
    const data = renderPluck(freq, c.sampleRate);
    buf = c.createBuffer(1, data.length, c.sampleRate);
    buf.getChannelData(0).set(data);
    pluckCache.set(key, buf);
  }
  return buf;
}

// Returns a handle with stop(time) so a new note on the same string can damp the old one.
export function pluck(freq, time, { gain = 0.5, duration = 2.4 } = {}) {
  const c = getContext();
  const t = Math.max(time ?? c.currentTime, c.currentTime);
  const src = c.createBufferSource();
  src.buffer = pluckBuffer(freq);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.setTargetAtTime(0, t + duration - 0.2, 0.05);
  src.connect(g).connect(getMaster());
  src.start(t);
  src.stop(t + duration);
  return {
    stop(at) {
      const s = Math.max(at ?? c.currentTime, c.currentTime);
      g.gain.cancelScheduledValues(s);
      g.gain.setTargetAtTime(0, s, 0.015);
      try { src.stop(s + 0.1); } catch { /* already stopped */ }
    },
  };
}

// level: 2 = accented downbeat, 1 = beat, 0 = subdivision.
export function click(time, level = 1) {
  const c = getContext();
  const osc = c.createOscillator();
  const g = c.createGain();
  const freq = level === 2 ? 1760 : level === 1 ? 1175 : 880;
  const vol = level === 2 ? 0.9 : level === 1 ? 0.6 : 0.3;
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(vol, time + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 4000;
  osc.connect(lp).connect(g).connect(getMaster());
  osc.start(time);
  osc.stop(time + 0.06);
}

// Look-ahead scheduler ("A Tale of Two Clocks"): a coarse JS timer schedules
// sample-accurate events slightly ahead of the audio clock.
export class Scheduler {
  // stepDuration(): seconds per step. onStep(index, time): schedule audio; return false to stop.
  // onVisual(index): called on the animation frame when the step is actually heard.
  constructor({ stepDuration, onStep, onVisual, onEnd }) {
    this.stepDuration = stepDuration;
    this.onStep = onStep;
    this.onVisual = onVisual;
    this.onEnd = onEnd;
    this.lookahead = 0.12;
    this.timer = null;
    this.raf = null;
    this.queue = [];
    this.running = false;
  }

  async start(startIndex = 0) {
    const c = await ensureRunning();
    this.stop(false);
    this.running = true;
    this.index = startIndex;
    this.nextTime = c.currentTime + 0.06;
    this.ending = false;
    this.tick();
    this.timer = setInterval(() => this.tick(), 25);
    const draw = () => {
      const now = c.currentTime;
      let last = null;
      while (this.queue.length && this.queue[0].time <= now) last = this.queue.shift();
      if (last && this.onVisual) this.onVisual(last.index);
      if (this.ending && !this.queue.length && now >= this.endTime) {
        this.stop();
        return;
      }
      this.raf = requestAnimationFrame(draw);
    };
    this.raf = requestAnimationFrame(draw);
  }

  tick() {
    const c = getContext();
    while (!this.ending && this.nextTime < c.currentTime + this.lookahead) {
      const keep = this.onStep(this.index, this.nextTime);
      if (keep === false) {
        this.ending = true;
        this.endTime = this.nextTime;
        break;
      }
      this.queue.push({ index: this.index, time: this.nextTime });
      this.nextTime += this.stepDuration();
      this.index++;
    }
  }

  stop(notify = true) {
    const was = this.running;
    clearInterval(this.timer);
    cancelAnimationFrame(this.raf);
    this.timer = null;
    this.raf = null;
    this.queue = [];
    this.running = false;
    if (notify && was && this.onEnd) this.onEnd();
  }
}

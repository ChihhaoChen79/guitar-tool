import { Scheduler, click } from './audio.js';
import { load, save } from './store.js';

export function initMetronome() {
  const $ = (id) => document.getElementById(id);
  const els = {
    dots: $('metro-dots'), bpm: $('metro-bpm'), slider: $('metro-slider'),
    minus: $('metro-minus'), plus: $('metro-plus'), toggle: $('metro-toggle'),
    tap: $('metro-tap'), beats: $('metro-beats'), sub: $('metro-sub'), accent: $('metro-accent'),
  };

  const state = Object.assign({ bpm: 100, beats: 4, sub: 1, accent: true }, load('metronome', {}));

  for (let i = 1; i <= 12; i++) els.beats.add(new Option(String(i), String(i)));

  const persist = () => save('metronome', state);

  const renderDots = () => {
    els.dots.innerHTML = '';
    for (let i = 0; i < state.beats; i++) {
      const d = document.createElement('span');
      if (i === 0 && state.accent) d.classList.add('accent');
      els.dots.appendChild(d);
    }
  };

  const setBpm = (v) => {
    state.bpm = Math.max(30, Math.min(300, Math.round(v)));
    els.bpm.textContent = state.bpm;
    els.slider.value = state.bpm;
    persist();
  };

  const scheduler = new Scheduler({
    stepDuration: () => 60 / state.bpm / state.sub,
    onStep: (i, time) => {
      const sub = i % state.sub;
      const beat = Math.floor(i / state.sub) % state.beats;
      click(time, sub !== 0 ? 0 : beat === 0 && state.accent ? 2 : 1);
    },
    onVisual: (i) => {
      if (i % state.sub !== 0) return;
      const beat = Math.floor(i / state.sub) % state.beats;
      [...els.dots.children].forEach((d, j) => d.classList.toggle('on', j === beat));
    },
    onEnd: () => {
      [...els.dots.children].forEach((d) => d.classList.remove('on'));
    },
  });

  let wakeLock = null;
  const keepAwake = async (on) => {
    try {
      if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
      else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch { /* not allowed; fine */ }
  };

  const start = () => {
    scheduler.start(0);
    els.toggle.textContent = 'Stop';
    keepAwake(true);
  };
  const stop = () => {
    scheduler.stop();
    els.toggle.textContent = 'Start';
    keepAwake(false);
  };

  els.toggle.addEventListener('click', () => (scheduler.running ? stop() : start()));
  els.minus.addEventListener('click', () => setBpm(state.bpm - 1));
  els.plus.addEventListener('click', () => setBpm(state.bpm + 1));
  els.slider.addEventListener('input', () => setBpm(+els.slider.value));

  // Restart from the downbeat when the bar shape changes so the counting stays aligned.
  const restartIfRunning = () => { if (scheduler.running) start(); };
  els.beats.addEventListener('change', () => {
    state.beats = +els.beats.value; persist(); renderDots(); restartIfRunning();
  });
  els.sub.addEventListener('change', () => {
    state.sub = +els.sub.value; persist(); restartIfRunning();
  });
  els.accent.addEventListener('change', () => {
    state.accent = els.accent.checked; persist(); renderDots();
  });

  let taps = [];
  els.tap.addEventListener('click', () => {
    const now = performance.now();
    taps = taps.filter((t) => now - t < 2500);
    taps.push(now);
    if (taps.length >= 2) {
      const gaps = taps.slice(1).map((t, i) => t - taps[i]);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      setBpm(60000 / avg);
    }
    if (taps.length > 6) taps.shift();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && scheduler.running) keepAwake(true);
  });

  els.beats.value = String(state.beats);
  els.sub.value = String(state.sub);
  els.accent.checked = state.accent;
  setBpm(state.bpm);
  renderDots();

  return { onHide: () => {} };
}

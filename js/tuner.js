import { detectPitch, freqToNote } from './pitch.js';
import { TUNING, STRING_NAMES, midiToFreq, pluck, ensureRunning, getContext, setAudioSession } from './audio.js';
import { load, save } from './store.js';

export function initTuner() {
  const $ = (id) => document.getElementById(id);
  const els = {
    display: $('tuner-display'), note: $('tuner-note'), octave: $('tuner-octave'),
    freq: $('tuner-freq'), cents: $('tuner-cents'), needle: $('tuner-needle'),
    hint: $('tuner-hint'), strings: $('tuner-strings'), toggle: $('tuner-toggle'), a4: $('tuner-a4'),
  };
  let a4 = load('a4', 440);
  els.a4.value = a4;

  TUNING.forEach((midi, s) => {
    const b = document.createElement('button');
    b.dataset.str = s;
    b.textContent = STRING_NAMES[s];
    b.appendChild(document.createElement('small'));
    els.strings.appendChild(b);
  });
  const updateChipLabels = () => {
    [...els.strings.children].forEach((b, s) => {
      b.querySelector('small').textContent = `${6 - s}${['th', 'th', 'th', 'rd', 'nd', 'st'][s]} · ${midiToFreq(TUNING[s], a4).toFixed(1)}`;
    });
  };
  updateChipLabels();

  els.strings.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    await ensureRunning();
    pluck(midiToFreq(TUNING[+b.dataset.str], a4), getContext().currentTime, { gain: 0.6, duration: 2.5 });
  });
  els.a4.addEventListener('change', () => {
    a4 = Math.min(460, Math.max(420, Math.round(+els.a4.value) || 440));
    els.a4.value = a4;
    save('a4', a4);
    updateChipLabels();
  });

  let stream = null, analyser = null, source = null, raf = null, buf = null;
  let lastRun = 0, history = [], silentSince = 0;

  const reset = () => {
    els.note.textContent = '–';
    els.octave.textContent = '';
    els.freq.textContent = '0.0';
    els.cents.textContent = '0';
    els.needle.style.transform = 'translateX(0)';
    els.display.classList.remove('in-tune', 'close', 'off');
    [...els.strings.children].forEach((b) => b.classList.remove('near'));
  };

  const show = (freq) => {
    const n = freqToNote(freq, a4);
    els.note.textContent = n.name;
    els.octave.textContent = n.octave;
    els.freq.textContent = freq.toFixed(1);
    els.cents.textContent = (n.cents > 0 ? '+' : '') + Math.round(n.cents);
    const track = els.needle.parentElement.clientWidth;
    els.needle.style.transform = `translateX(${(Math.max(-50, Math.min(50, n.cents)) / 50) * (track / 2 - 4)}px)`;
    const abs = Math.abs(n.cents);
    els.display.classList.toggle('in-tune', abs <= 5);
    els.display.classList.toggle('close', abs > 5 && abs <= 15);
    els.display.classList.toggle('off', abs > 15);
    els.hint.textContent = abs <= 5 ? 'In tune' : n.cents < 0 ? 'Too low – tighten' : 'Too high – loosen';
    // Highlight the open string nearest in pitch.
    const midiFloat = 69 + 12 * Math.log2(freq / a4);
    let near = 0;
    TUNING.forEach((m, s) => { if (Math.abs(m - midiFloat) < Math.abs(TUNING[near] - midiFloat)) near = s; });
    [...els.strings.children].forEach((b, s) => b.classList.toggle('near', s === near && Math.abs(TUNING[near] - midiFloat) < 1.5));
  };

  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (now - lastRun < 60) return;
    lastRun = now;
    analyser.getFloatTimeDomainData(buf);
    const res = detectPitch(buf, getContext().sampleRate);
    if (res) {
      silentSince = 0;
      history.push(res.freq);
      if (history.length > 5) history.shift();
      // Drop the history if the player jumped to another note.
      const last = history[history.length - 1];
      history = history.filter((f) => Math.abs(1200 * Math.log2(f / last)) < 80);
      const sorted = [...history].sort((a, b) => a - b);
      show(sorted[Math.floor(sorted.length / 2)]);
    } else {
      if (!silentSince) silentSince = now;
      if (now - silentSince > 1500) { history = []; reset(); els.hint.textContent = 'Listening…'; }
    }
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      els.hint.textContent = 'Microphone not available. Open the app over HTTPS.';
      return;
    }
    try {
      // Ask for the microphone first (still inside the tap), with an audio session that allows recording.
      const constraints = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
      setAudioSession('play-and-record');
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        if (err.name !== 'InvalidStateError') throw err;
        // Let Safari pick the session itself and try once more.
        setAudioSession('auto');
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      const c = await ensureRunning();
      source = c.createMediaStreamSource(stream);
      analyser = c.createAnalyser();
      analyser.fftSize = 4096;
      buf = new Float32Array(analyser.fftSize);
      source.connect(analyser);
      els.toggle.textContent = 'Stop';
      els.hint.textContent = 'Listening…';
      raf = requestAnimationFrame(loop);
    } catch (err) {
      els.hint.textContent = err.name === 'NotAllowedError'
        ? 'Microphone permission denied. Allow it in your browser settings.'
        : `Could not start microphone (${err.name || err.message}).`;
      stop();
    }
  };

  const stop = () => {
    cancelAnimationFrame(raf);
    raf = null;
    if (source) source.disconnect();
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = source = analyser = null;
    setAudioSession('playback');
    history = [];
    els.toggle.textContent = 'Start';
    reset();
  };

  els.toggle.addEventListener('click', () => (stream ? (stop(), (els.hint.textContent = 'Tap Start and play a string')) : start()));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && stream) stop();
  });

  return { onHide: () => { if (stream) stop(); } };
}

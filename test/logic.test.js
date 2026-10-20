import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch, freqToNote } from '../js/pitch.js';
import { ROOTS, QUALITIES, getVoicings, parseChordName } from '../js/chord-data.js';
import { newTab, toAscii, fromAscii, emptyColumn, normalizeTab } from '../js/tab-format.js';
import { TUNING, noteToFreq, renderPluck } from '../js/audio.js';

const SR = 48000;
function wave(freq, n = 4096, shape = 'sine') {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const ph = (i * freq) / SR;
    b[i] = shape === 'sine' ? 0.5 * Math.sin(2 * Math.PI * ph)
      : 0.5 * (2 * (ph - Math.floor(ph + 0.5))); // sawtooth: rich in harmonics
  }
  return b;
}
const cents = (a, b) => 1200 * Math.log2(a / b);

test('detectPitch finds guitar string pitches within 2 cents', () => {
  for (const midi of TUNING) {
    const f = 440 * 2 ** ((midi - 69) / 12);
    for (const shape of ['sine', 'saw']) {
      const r = detectPitch(wave(f, 4096, shape), SR);
      assert.ok(r, `no pitch for ${f} ${shape}`);
      assert.ok(Math.abs(cents(r.freq, f)) < 2, `${shape} ${f}: got ${r.freq}`);
    }
  }
  const r = detectPitch(wave(440 * 2 ** (10 / 1200)), SR);
  assert.equal(Math.round(freqToNote(r.freq).cents), 10);
});

test('detectPitch ignores silence', () => {
  assert.equal(detectPitch(new Float32Array(4096), SR), null);
});

test('detectPitch tracks a Karplus-Strong pluck', () => {
  const f = noteToFreq(0, 0); // low E
  const buf = renderPluck(f, SR).subarray(2400, 2400 + 4096);
  const r = detectPitch(buf, SR);
  assert.ok(r && Math.abs(cents(r.freq, f)) < 5, `got ${r && r.freq}`);
});

test('freqToNote names notes', () => {
  assert.deepEqual(freqToNote(440), { midi: 69, name: 'A', octave: 4, cents: 0 });
  assert.equal(freqToNote(82.41).name, 'E');
  assert.equal(freqToNote(82.41).octave, 2);
});

test('noteToFreq uses standard tuning', () => {
  assert.ok(Math.abs(noteToFreq(0, 0) - 82.407) < 0.01);
  assert.ok(Math.abs(noteToFreq(5, 5) - 440) < 1e-9);
});

test('every chord voicing contains only chord tones and the root', () => {
  const TPC = TUNING.map((m) => m % 12);
  for (let r = 0; r < 12; r++) {
    for (const q of QUALITIES) {
      const vs = getVoicings(r, q.id);
      assert.ok(vs.length >= 1, `${ROOTS[r]}${q.suffix} has no voicing`);
      const allowed = new Set(q.intervals.map((i) => (r + i) % 12));
      for (const v of vs) {
        assert.equal(v.frets.length, 6);
        const pcs = v.frets.map((f, s) => (f == null ? null : (TPC[s] + f) % 12)).filter((x) => x != null);
        assert.ok(pcs.length >= 3, `${ROOTS[r]}${q.suffix} ${v.frets}`);
        for (const pc of pcs) assert.ok(allowed.has(pc), `${ROOTS[r]}${q.suffix} ${v.frets} has ${pc}`);
        assert.ok(pcs.includes(r), `${ROOTS[r]}${q.suffix} ${v.frets} missing root`);
        // Lowest sounding note should be the root for these shapes.
        const lowest = v.frets.findIndex((f) => f != null);
        assert.equal((TPC[lowest] + v.frets[lowest]) % 12, r, `${ROOTS[r]}${q.suffix} ${v.frets} root not in bass`);
        const fretted = v.frets.filter((f) => f > 0);
        if (fretted.length) assert.ok(Math.max(...fretted) - Math.min(...fretted) <= 4, `${ROOTS[r]}${q.suffix} stretch ${v.frets}`);
      }
    }
  }
});

test('parseChordName', () => {
  assert.deepEqual(parseChordName('Am7'), { root: 9, quality: 'm7' });
  assert.deepEqual(parseChordName('F#m'), { root: 6, quality: 'm' });
  assert.deepEqual(parseChordName('Bbmaj7'), { root: 10, quality: 'maj7' });
  assert.deepEqual(parseChordName('c'), { root: 0, quality: 'maj' });
  assert.deepEqual(parseChordName('Db'), { root: 1, quality: 'maj' });
  assert.deepEqual(parseChordName('Gsus'), { root: 7, quality: 'sus4' });
  assert.equal(parseChordName('H7'), null);
  assert.equal(parseChordName('Cxyz'), null);
});

test('ASCII tab export/import round-trips, including rests and 2-digit frets', () => {
  const t = newTab('Riff', 0);
  const col = (pairs) => { const c = emptyColumn(); pairs.forEach(([s, f]) => { c[s] = f; }); return c; };
  t.columns = [
    emptyColumn(), col([[0, 3]]), col([[1, 12], [2, 2]]), emptyColumn(), emptyColumn(),
    col([[5, 0], [4, 1], [3, 0]]), emptyColumn(), col([[0, 24]]),
    col([[2, 5]]), emptyColumn(), emptyColumn(), col([[3, 7]]),
  ];
  const text = toAscii(t);
  assert.match(text, /^Riff\ne\|/);
  const back = fromAscii(text);
  assert.equal(back.title, 'Riff');
  assert.deepEqual(back.columns, t.columns);
});

test('fromAscii reads a hand-written tab', () => {
  const back = fromAscii(`
e|-------0---|
B|-----1-----|
G|---0-------|
D|-2---------|
A|-----------|
E|-----------|`);
  const notes = back.columns.filter((c) => c.some((f) => f != null)).map((c) => c.findIndex((f) => f != null));
  assert.deepEqual(notes, [2, 3, 4, 5]);
  assert.throws(() => fromAscii('nothing here'));
});

test('normalizeTab cleans bad data', () => {
  const t = normalizeTab({ bpm: 'abc', stepsPerBeat: 9, columns: [[1, 'x', 30, -1, null, 5]] });
  assert.equal(t.bpm, 90);
  assert.equal(t.stepsPerBeat, 4);
  assert.deepEqual(t.columns[0], [1, null, null, null, null, 5]);
});

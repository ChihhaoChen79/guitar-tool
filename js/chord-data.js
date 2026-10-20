// Chord library data. Frets/fingers are listed low E -> high e; 'x' = muted, 0 = open.

export const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const QUALITIES = [
  { id: 'maj', label: 'Major', suffix: '', intervals: [0, 4, 7] },
  { id: 'm', label: 'Minor', suffix: 'm', intervals: [0, 3, 7] },
  { id: '7', label: '7', suffix: '7', intervals: [0, 4, 7, 10] },
  { id: 'maj7', label: 'maj7', suffix: 'maj7', intervals: [0, 4, 7, 11] },
  { id: 'm7', label: 'm7', suffix: 'm7', intervals: [0, 3, 7, 10] },
  { id: 'sus2', label: 'sus2', suffix: 'sus2', intervals: [0, 2, 7] },
  { id: 'sus4', label: 'sus4', suffix: 'sus4', intervals: [0, 5, 7] },
  { id: 'add9', label: 'add9', suffix: 'add9', intervals: [0, 2, 4, 7] },
  { id: '6', label: '6', suffix: '6', intervals: [0, 4, 7, 9] },
  { id: 'm6', label: 'm6', suffix: 'm6', intervals: [0, 3, 7, 9] },
  { id: 'm7b5', label: 'm7♭5', suffix: 'm7b5', intervals: [0, 3, 6, 10] },
  { id: 'dim', label: 'dim', suffix: 'dim', intervals: [0, 3, 6] },
  { id: 'aug', label: 'aug', suffix: 'aug', intervals: [0, 4, 8] },
];

const TUNING_PC = [4, 9, 2, 7, 11, 4];

// Hand-entered open-position voicings: "Root:quality": [frets, fingers]
const OPEN = {
  'C:maj': ['x32010', '032010'], 'C:7': ['x32310', '032410'], 'C:maj7': ['x32000', '032000'],
  'C:add9': ['x32030', '021030'], 'C:6': ['x32210', '042310'],
  'D:maj': ['xx0232', '000132'], 'D:m': ['xx0231', '000231'], 'D:7': ['xx0212', '000213'],
  'D:maj7': ['xx0222', '000111'], 'D:m7': ['xx0211', '000211'], 'D:sus2': ['xx0230', '000130'],
  'D:sus4': ['xx0233', '000134'], 'D:6': ['xx0202', '000102'],
  'E:m7b5': ['012030', '012040'],
  'E:maj': ['022100', '023100'], 'E:m': ['022000', '023000'], 'E:7': ['020100', '020100'],
  'E:m7': ['022030', '012030'], 'E:sus4': ['022200', '023400'], 'E:maj7': ['021100', '031200'],
  'F:maj7': ['xx3210', '003210'],
  'G:maj': ['320003', '210003'], 'G:7': ['320001', '320001'], 'G:maj7': ['320002', '210001'],
  'G:6': ['320000', '210000'],
  'A:maj': ['x02220', '001230'], 'A:m': ['x02210', '002310'], 'A:7': ['x02020', '002030'],
  'A:m7': ['x02010', '002010'], 'A:maj7': ['x02120', '002130'], 'A:sus2': ['x02200', '001200'],
  'A:sus4': ['x02230', '001230'],
  'B:7': ['x21202', '021304'],
};

// Movable shapes relative to the root fret. E-shape: root on 6th string; A-shape: root on 5th.
const X = null;
const E_SHAPES = {
  maj: [[0, 2, 2, 1, 0, 0], [1, 3, 4, 2, 1, 1]],
  m: [[0, 2, 2, 0, 0, 0], [1, 3, 4, 1, 1, 1]],
  7: [[0, 2, 0, 1, 0, 0], [1, 3, 1, 2, 1, 1]],
  maj7: [[0, 2, 1, 1, 0, 0], [1, 4, 2, 3, 1, 1]],
  m7: [[0, 2, 0, 0, 0, 0], [1, 3, 1, 1, 1, 1]],
  sus4: [[0, 2, 2, 2, 0, 0], [1, 2, 3, 4, 1, 1]],
  6: [[0, 2, 2, 1, 2, 0], [1, 3, 3, 2, 4, 1]],
  m6: [[0, 2, 2, 0, 2, 0], [1, 3, 3, 1, 4, 1]],
  dim: [[0, 1, 2, 0, X, X], [2, 3, 4, 1, 0, 0]],
  m7b5: [[0, X, 0, 0, -1, X], [2, 0, 3, 4, 1, 0]],
  aug: [[0, 3, 2, 1, 1, 0], [1, 4, 3, 2, 2, 1]],
};
const A_SHAPES = {
  maj: [[X, 0, 2, 2, 2, 0], [0, 1, 3, 3, 3, 1]],
  m: [[X, 0, 2, 2, 1, 0], [0, 1, 3, 4, 2, 1]],
  7: [[X, 0, 2, 0, 2, 0], [0, 1, 3, 1, 4, 1]],
  maj7: [[X, 0, 2, 1, 2, 0], [0, 1, 3, 2, 4, 1]],
  m7: [[X, 0, 2, 0, 1, 0], [0, 1, 3, 1, 2, 1]],
  sus2: [[X, 0, 2, 2, 0, 0], [0, 1, 3, 4, 1, 1]],
  sus4: [[X, 0, 2, 2, 3, 0], [0, 1, 2, 3, 4, 1]],
  add9: [[X, 0, 2, 4, 2, 0], [0, 1, 2, 4, 3, 1]],
  6: [[X, 0, 2, 2, 2, 2], [0, 1, 3, 3, 3, 3]],
  m6: [[X, 0, 2, 2, 1, 2], [0, 1, 3, 3, 2, 4]],
  dim: [[X, 0, 1, 2, 1, X], [0, 1, 2, 4, 3, 0]],
  m7b5: [[X, 0, 1, 0, 1, X], [0, 1, 3, 2, 4, 0]],
  aug: [[X, 0, 3, 2, 2, 1], [0, 1, 4, 3, 3, 2]],
};

// Common slash chords (chord over a different bass note), as found in standard chord charts.
// [name, frets, fingers]; 'T' = thumb wrapped over the neck.
const SLASH = [
  ['C/E', '032010', '032010'], ['C/G', '332010', '342010'], ['C/B', 'x22010', '023010'], ['C/D', 'xx0010', '000010'],
  ['Cadd9/G', '332033', '231034'],
  ['D/F#', '2x0232', 'T00132'], ['D/A', 'x00232', '000132'], ['D/C', 'x30232', '030132'],
  ['Dm/F', '1x0231', 'T00231'], ['Dm/A', 'x00231', '000231'], ['Dm/C', 'x30231', '040231'],
  ['E/G#', '4x2100', '402100'], ['E/B', 'x22100', '023100'],
  ['Em/G', '322000', '312000'], ['Em/B', 'x22000', '012000'], ['Em/D', 'xx0000', '000000'],
  ['F/A', 'x03211', '003211'], ['F/C', 'x33211', '034211'], ['F/G', '3x3211', '304211'],
  ['G/B', 'x20003', '010003'], ['G/D', 'xx0003', '000003'], ['G/F#', '2x0003', '100003'],
  ['G7/B', 'x20001', '010002'],
  ['A/C#', 'x42220', '041110'], ['A/E', '002220', '001230'], ['A/G', '3x2220', '301110'],
  ['Am/C', 'x32210', '042310'], ['Am/E', '002210', '002310'], ['Am/G', '3x2210', '402310'], ['Am/F#', '2x2210', '203410'],
  ['Bm/A', 'x04432', '003421'],
];
let slashMap = null;
function slashVoicings(root, quality, bass) {
  if (!slashMap) {
    slashMap = new Map();
    for (const [name, frets, fingers] of SLASH) {
      const p = parseChordName(name);
      const key = `${p.root}:${p.quality}/${p.bass}`;
      if (!slashMap.has(key)) slashMap.set(key, []);
      slashMap.get(key).push({ frets: parseFrets(frets), fingers: parseFrets(fingers) });
    }
  }
  return slashMap.get(`${root}:${quality}/${bass}`) || [];
}

// Bass notes that have a hand-picked slash shape for this chord.
export function commonBasses(root, quality) {
  slashVoicings(0, 'maj', 0);
  const out = [];
  for (const key of slashMap.keys()) {
    const [rq, b] = key.split('/');
    if (rq === `${root}:${quality}`) out.push(+b);
  }
  return out;
}

function parseFrets(s) {
  return [...s].map((c) => (c === 'x' ? null : c === 'T' ? 'T' : parseInt(c, 10)));
}

function fromShape([rel, fingers], rootFret) {
  if (rel.some((f) => f != null && f + rootFret < 0)) rootFret += 12;
  const frets = rel.map((f) => (f == null ? null : f + rootFret));
  // At fret 0 the barre finger becomes the open nut, so every finger moves down one.
  const fing = rel.map((f, i) => {
    if (f == null) return 0;
    if (rootFret === 0) return f === 0 ? 0 : Math.max(1, fingers[i] - 1);
    return fingers[i];
  });
  return { frets, fingers: fing };
}

// Voicings for a chord, optionally over a bass note (pitch class 0-11): hand-picked slash shapes
// first, then regular shapes with the bass placed on the low E or A string.
export function getVoicings(rootIndex, qualityId, bass = null) {
  if (bass == null || bass === rootIndex) return baseVoicings(rootIndex, qualityId);
  const list = slashVoicings(rootIndex, qualityId, bass).map((v) => ({ frets: v.frets.slice(), fingers: v.fingers.slice() }));
  for (const v of baseVoicings(rootIndex, qualityId)) {
    for (const bs of [0, 1]) {
      for (let b = 0; b <= 15; b++) {
        if ((TUNING_PC[bs] + b) % 12 !== bass) continue;
        const frets = v.frets.map((f, s) => (s < bs ? null : s === bs ? b : f));
        const fingers = v.fingers.map((f, s) => (s <= bs ? 0 : f));
        const fretted = frets.filter((f) => f > 0);
        const sounding = frets.filter((f) => f != null).length;
        if (sounding < 4 || (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3)) continue;
        // Replacing a string with the bass must not remove the chord's root.
        if (!frets.some((f, s) => f != null && (TUNING_PC[s] + f) % 12 === rootIndex)) continue;
        // Reach: the bass can't sit below the shape's lowest fret, except one fret lower on the
        // low E string, where the thumb wrapped over the neck plays it.
        const others = frets.filter((f, s) => s > bs && f > 0);
        const minOther = others.length ? Math.min(...others) : Infinity;
        if (b > 0 && others.length && b < minOther) {
          if (bs !== 0 || b < minOther - 1) continue;
          fingers[bs] = 'T';
        }
        list.push({ frets, fingers });
      }
    }
  }
  if (!list.length) list.push(...searchSlash(rootIndex, qualityId, bass));
  return dedupe(list).slice(0, 6);
}

// Fallback for unusual chord/bass pairs: try every four-fret window and keep the shapes that
// sound all chord tones over the bass, preferring more strings, no gaps, and lower positions.
function searchSlash(root, qualityId, bass) {
  const tones = QUALITIES.find((q) => q.id === qualityId).intervals.map((i) => (root + i) % 12);
  const found = [];
  for (const bs of [0, 1]) {
    for (let b = 0; b <= 12; b++) {
      if ((TUNING_PC[bs] + b) % 12 !== bass) continue;
      for (let w = Math.max(1, b - 3); w <= Math.max(1, b); w++) {
        const options = [];
        for (let s = bs + 1; s < 6; s++) {
          const opts = [null];
          for (const f of [0, w, w + 1, w + 2, w + 3]) if (tones.includes((TUNING_PC[s] + f) % 12)) opts.push(f);
          options.push(opts);
        }
        const walk = (s, acc) => {
          if (s === options.length) {
            const frets = [...Array(bs).fill(null), b, ...acc];
            const pcs = new Set(frets.map((f, i) => (f == null ? null : (TUNING_PC[i] + f) % 12)));
            // Root required; a four-note chord may drop one other tone, as players often do.
            const missing = tones.filter((t) => !pcs.has(t) && t !== bass).length;
            if (!pcs.has(root) || missing > (tones.length >= 4 ? 1 : 0)) return;
            const sounding = frets.filter((f) => f != null).length;
            const first = frets.findIndex((f) => f != null);
            const last = 5 - [...frets].reverse().findIndex((f) => f != null);
            const gaps = frets.slice(first, last + 1).filter((f) => f == null).length;
            const fretted = frets.filter((f) => f > 0);
            if (fretted.length > 4 || (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3)) return;
            found.push({ frets, fingers: frets.map(() => 0), score: sounding * 10 - gaps * 15 - missing * 30 - w });
            return;
          }
          for (const f of options[s]) walk(s + 1, [...acc, f]);
        };
        walk(0, []);
      }
    }
  }
  return found.sort((x, y) => y.score - x.score).slice(0, 3).map(({ frets, fingers }) => ({ frets, fingers }));
}

function dedupe(list) {
  const seen = new Set();
  return list.filter((v) => {
    const k = v.frets.join(',');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function baseVoicings(rootIndex, qualityId) {
  const list = [];
  const open = OPEN[`${ROOTS[rootIndex]}:${qualityId}`];
  if (open) list.push({ frets: parseFrets(open[0]), fingers: parseFrets(open[1]) });
  const eRoot = (rootIndex - TUNING_PC[0] + 12) % 12;
  const aRoot = (rootIndex - TUNING_PC[1] + 12) % 12;
  if (E_SHAPES[qualityId]) list.push(fromShape(E_SHAPES[qualityId], eRoot));
  if (A_SHAPES[qualityId]) list.push(fromShape(A_SHAPES[qualityId], aRoot));
  // Higher-octave copies of shapes that landed near the nut give more choices up the neck.
  if (E_SHAPES[qualityId] && eRoot + 12 <= 15 && eRoot <= 3) list.push(fromShape(E_SHAPES[qualityId], eRoot + 12));
  if (A_SHAPES[qualityId] && aRoot + 12 <= 15 && aRoot <= 3) list.push(fromShape(A_SHAPES[qualityId], aRoot + 12));

  const seen = new Set();
  const unique = list.filter((v) => {
    const k = v.frets.join(',');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const lowest = (v) => Math.min(...v.frets.filter((f) => f != null));
  return unique.sort((a, b) => lowest(a) - lowest(b));
}

export function chordName(rootIndex, qualityId, bass = null) {
  const name = ROOTS[rootIndex] + QUALITIES.find((q) => q.id === qualityId).suffix;
  return bass == null || bass === rootIndex ? name : `${name}/${ROOTS[bass]}`;
}

export function chordNoteNames(rootIndex, qualityId, bass = null) {
  const q = QUALITIES.find((x) => x.id === qualityId);
  const notes = q.intervals.map((i) => ROOTS[(rootIndex + i) % 12]);
  if (bass != null && bass !== rootIndex && !notes.includes(ROOTS[bass])) notes.unshift(ROOTS[bass]);
  return notes;
}

const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SUFFIX_ALIASES = {
  '': 'maj', maj: 'maj', major: 'maj', M: 'maj',
  m: 'm', min: 'm', minor: 'm', '-': 'm',
  7: '7', dom7: '7',
  maj7: 'maj7', M7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7',
  m7: 'm7', min7: 'm7', '-7': 'm7',
  sus2: 'sus2', sus4: 'sus4', sus: 'sus4',
  add9: 'add9', add2: 'add9',
  6: '6', m6: 'm6', min6: 'm6',
  m7b5: 'm7b5', 'm7-5': 'm7b5', 'm7♭5': 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5', min7b5: 'm7b5', 'm-7b5': 'm7b5',
  dim: 'dim', '°': 'dim', o: 'dim',
  aug: 'aug', '+': 'aug',
};

function notePc(letter, acc) {
  let pc = LETTER_PC[letter.toUpperCase()];
  if (acc === '#' || acc === '♯') pc += 1;
  if (acc === 'b' || acc === '♭') pc -= 1;
  return (pc + 12) % 12;
}

// "F#m7" -> { root: 6, quality: 'm7', bass: null }; "D/F#" -> { root: 2, quality: 'maj', bass: 6 }.
// Returns null if not understood.
export function parseChordName(text) {
  const m = /^\s*([A-Ga-g])([#♯b♭]?)(.*?)(?:\/([A-Ga-g])([#♯b♭]?))?\s*$/.exec(text || '');
  if (!m) return null;
  const rest = m[3];
  const quality = SUFFIX_ALIASES[rest] ?? SUFFIX_ALIASES[rest.toLowerCase()];
  if (!quality) return null;
  const root = notePc(m[1], m[2]);
  const bass = m[4] ? notePc(m[4], m[5]) : null;
  return { root, quality, bass: bass === root ? null : bass };
}

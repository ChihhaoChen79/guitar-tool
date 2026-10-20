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

function parseFrets(s) {
  return [...s].map((c) => (c === 'x' ? null : parseInt(c, 10)));
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

export function getVoicings(rootIndex, qualityId) {
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

export function chordName(rootIndex, qualityId) {
  return ROOTS[rootIndex] + QUALITIES.find((q) => q.id === qualityId).suffix;
}

export function chordNoteNames(rootIndex, qualityId) {
  const q = QUALITIES.find((x) => x.id === qualityId);
  return q.intervals.map((i) => ROOTS[(rootIndex + i) % 12]);
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

// "F#m7" -> { root: 6, quality: 'm7' }; null if not understood.
export function parseChordName(text) {
  const m = /^\s*([A-Ga-g])([#♯b♭]?)(.*?)\s*$/.exec(text || '');
  if (!m) return null;
  let pc = LETTER_PC[m[1].toUpperCase()];
  if (m[2] === '#' || m[2] === '♯') pc += 1;
  if (m[2] === 'b' || m[2] === '♭') pc -= 1;
  const rest = m[3];
  const quality = SUFFIX_ALIASES[rest] ?? SUFFIX_ALIASES[rest.toLowerCase()];
  if (!quality) return null;
  return { root: (pc + 12) % 12, quality };
}

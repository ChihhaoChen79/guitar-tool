// Tab model helpers and ASCII tab import/export. Pure functions (no DOM) so they can be tested in Node.
// A tab column is { frets, strum, chord }:
//   frets: 6 entries indexed low E (0) .. high e (5); a fret 0-24, 'x' = muted (dead) note, null = nothing
//   strum: null | 'down' | 'up'   (sweep the column's notes instead of striking them together)
//   chord: null | { name, voicing } — a chord marker; it applies from this column until the next one
import { getVoicings, parseChordName } from './chord-data.js';

export const ROW_LABELS = ['e', 'B', 'G', 'D', 'A', 'E']; // top to bottom, as printed
export const MUTE = 'x';

export const emptyColumn = () => ({ frets: [null, null, null, null, null, null], strum: null, chord: null });

export function newTab(title = 'Untitled', columns = 16) {
  return {
    id: Math.random().toString(36).slice(2, 10),
    title,
    bpm: 90,
    stepsPerBeat: 2,
    beatsPerBar: 4,
    columns: Array.from({ length: columns }, emptyColumn),
  };
}

function cleanFret(f) {
  if (f === MUTE || f === 'X') return MUTE;
  return Number.isInteger(f) && f >= 0 && f <= 24 ? f : null;
}

export function normalizeColumn(c) {
  const col = emptyColumn();
  // Older saves stored a column as a bare array of frets.
  const frets = Array.isArray(c) ? c : c && Array.isArray(c.frets) ? c.frets : [];
  for (let s = 0; s < 6; s++) col.frets[s] = cleanFret(frets[s]);
  if (c && (c.strum === 'down' || c.strum === 'up')) col.strum = c.strum;
  if (c && c.chord && typeof c.chord.name === 'string' && parseChordName(c.chord.name)) {
    col.chord = { name: c.chord.name, voicing: Math.max(0, Math.floor(Number(c.chord.voicing) || 0)) };
  }
  return col;
}

export function normalizeTab(t) {
  const tab = Object.assign(newTab(), t);
  tab.bpm = clampInt(tab.bpm, 30, 300, 90);
  tab.stepsPerBeat = clampInt(tab.stepsPerBeat, 1, 4, 2);
  tab.beatsPerBar = clampInt(tab.beatsPerBar, 1, 12, 4);
  if (!Array.isArray(tab.columns) || !tab.columns.length) tab.columns = [emptyColumn()];
  tab.columns = tab.columns.map(normalizeColumn);
  return tab;
}

function clampInt(v, lo, hi, d) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
}

export const hasNotes = (col) => col.frets.some((f) => f != null);

// The chord marker in effect at a column (the nearest one at or before it), with its column index.
export function chordAt(tab, colIndex) {
  for (let c = Math.min(colIndex, tab.columns.length - 1); c >= 0; c--) {
    if (tab.columns[c].chord) return { ...tab.columns[c].chord, col: c };
  }
  return null;
}

// Frets of a chord marker's voicing (low E .. high e), or null if the name is unknown.
export function chordFrets(chord) {
  const p = chord && parseChordName(chord.name);
  if (!p) return null;
  const vs = getVoicings(p.root, p.quality, p.bass);
  return vs[Math.min(chord.voicing || 0, vs.length - 1)].frets.slice();
}

const cellText = (f) => (f == null ? '' : String(f));

export function toAscii(tab) {
  const stepsPerBar = tab.stepsPerBeat * tab.beatsPerBar;
  const lines = ROW_LABELS.map((l) => `${l}|`);
  let chordLine = '';
  let strumLine = '';
  tab.columns.forEach((col, i) => {
    const pos = lines[0].length;
    // A chord's column is widened to fit its name, so names never run into each other.
    const width = Math.max(1, col.chord ? col.chord.name.length : 0, ...col.frets.map((f) => cellText(f).length));
    for (let row = 0; row < 6; row++) {
      lines[row] += cellText(col.frets[5 - row]).padEnd(width, '-') + '-';
      if ((i + 1) % stepsPerBar === 0 || i === tab.columns.length - 1) lines[row] += '|';
    }
    if (col.chord) chordLine = chordLine.padEnd(pos, ' ') + col.chord.name;
    if (col.strum) strumLine = strumLine.padEnd(pos, ' ') + (col.strum === 'down' ? '↓' : '↑');
  });
  const out = [];
  if (tab.title) out.push(tab.title);
  if (chordLine.trim()) out.push(chordLine.trimEnd());
  out.push(...lines);
  if (strumLine.trim()) out.push(strumLine.trimEnd());
  return `${out.join('\n')}\n`;
}

const LINE_RE = /^\s*([a-gA-G][#b]?)\s*\|(.*)$/;
const isNoteStart = (c) => /[\dxX]/.test(c);

function isChordLine(line) {
  const tokens = line.trim().split(/\s+/);
  return !!line.trim() && tokens.every((t) => parseChordName(t));
}

// Parses the first block of 6 consecutive tab lines, plus an optional chord line just above it
// and an optional strum line (↓ ↑, or v ^ / d u) just below it. Each exported cell is
// "<fret>-" or "--", so a run of L dashes after a note holds (L-1)/2 empty columns;
// hand-written tabs parse loosely.
export function fromAscii(text) {
  const raw = String(text).split(/\r?\n/);
  let start = -1;
  for (let i = 0; i + 5 < raw.length; i++) {
    if (raw.slice(i, i + 6).every((l) => LINE_RE.test(l))) { start = i; break; }
  }
  if (start < 0) throw new Error('Could not find 6 tab lines (like "e|--3--|").');
  // Character offset where the content after "e|" begins, so chord/strum lines can be lined up.
  const offset = raw[start].indexOf('|') + 1;
  const rows = raw.slice(start, start + 6).map((l) => LINE_RE.exec(l)[2]);
  // Chord names in the line above start at their column's position.
  const chordTokens = new Map();
  const hasChordLine = start > 0 && isChordLine(raw[start - 1]);
  if (hasChordLine) {
    for (const m of raw[start - 1].matchAll(/\S+/g)) {
      // Hand-written names often sit a little left of their note: snap to a note under the name.
      const p = m.index - offset;
      let at = p;
      for (let q = Math.max(0, p); q <= p + m[0].length; q++) {
        if (rows.some((r) => isNoteStart(r[q] || '-'))) { at = q; break; }
      }
      chordTokens.set(at, m[0]);
    }
  }
  const len = Math.max(...rows.map((r) => r.length));

  const columns = [];
  const startPos = []; // content position where each column begins
  let dashRun = []; // positions of the dashes since the last note
  const flushRests = () => {
    // Skip the separator dash after a note; then every two dashes are one empty column.
    const first = columns.length ? 1 : 0;
    const rests = Math.floor((dashRun.length - first) / 2);
    for (let k = 0; k < rests; k++) {
      columns.push(emptyColumn());
      startPos.push(dashRun[first + 2 * k]);
    }
    dashRun = [];
  };

  let i = 0;
  while (i < len) {
    const chars = rows.map((r) => r[i] || '-');
    const chordName = chars.every((c) => c === '|') ? null : chordTokens.get(i);
    if (chars.some(isNoteStart) || chordName) {
      flushRests();
      const col = emptyColumn();
      let width = 1;
      rows.forEach((r, row) => {
        const rest = r.slice(i);
        const m = /^\d+/.exec(rest);
        if (m) {
          const fret = parseInt(m[0], 10);
          if (fret <= 24) col.frets[5 - row] = fret;
          width = Math.max(width, m[0].length);
        } else if (/^[xX]/.test(rest)) {
          col.frets[5 - row] = MUTE;
        }
      });
      if (chordName) {
        col.chord = { name: chordName, voicing: 0 };
        width = Math.max(width, chordName.length);
      }
      columns.push(col);
      startPos.push(i);
      i += width;
    } else {
      if (chars.every((c) => c === '|')) { i++; continue; }
      dashRun.push(i);
      i++;
    }
  }
  flushRests();
  if (!columns.length) { columns.push(emptyColumn()); startPos.push(0); }

  // Map a character position in the strum line to the nearest column.
  const colAt = (p) => {
    let best = 0;
    startPos.forEach((s, c) => { if (Math.abs(s - p) < Math.abs(startPos[best] - p)) best = c; });
    return best;
  };

  const titleIndex = hasChordLine ? start - 2 : start - 1;
  const strumLine = raw[start + 6];
  if (strumLine && /^[\s↓↑vV^dDuU]+$/.test(strumLine) && strumLine.trim()) {
    for (const m of strumLine.matchAll(/[↓↑vV^dDuU]/g)) {
      columns[colAt(m.index - offset)].strum = /[↓vVdD]/.test(m[0]) ? 'down' : 'up';
    }
  }

  const titleLine = titleIndex >= 0 ? raw[titleIndex].trim() : '';
  const tab = newTab(titleLine && !LINE_RE.test(titleLine) ? titleLine : 'Imported tab', 0);
  tab.columns = columns;
  return tab;
}

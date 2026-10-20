// Tab model helpers and ASCII tab import/export. Pure functions (no DOM) so they can be tested in Node.
// A tab column is an array of 6 frets indexed low E (0) .. high e (5); null = no note.

export const ROW_LABELS = ['e', 'B', 'G', 'D', 'A', 'E']; // top to bottom, as printed

export const emptyColumn = () => [null, null, null, null, null, null];

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

export function normalizeTab(t) {
  const tab = Object.assign(newTab(), t);
  tab.bpm = clampInt(tab.bpm, 30, 300, 90);
  tab.stepsPerBeat = clampInt(tab.stepsPerBeat, 1, 4, 2);
  tab.beatsPerBar = clampInt(tab.beatsPerBar, 1, 12, 4);
  if (!Array.isArray(tab.columns) || !tab.columns.length) tab.columns = [emptyColumn()];
  tab.columns = tab.columns.map((c) => {
    const col = emptyColumn();
    for (let s = 0; s < 6; s++) {
      const f = Array.isArray(c) ? c[s] : null;
      col[s] = Number.isInteger(f) && f >= 0 && f <= 24 ? f : null;
    }
    return col;
  });
  return tab;
}

function clampInt(v, lo, hi, d) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
}

export function toAscii(tab) {
  const stepsPerBar = tab.stepsPerBeat * tab.beatsPerBar;
  const lines = ROW_LABELS.map((l) => `${l}|`);
  tab.columns.forEach((col, i) => {
    const width = Math.max(1, ...col.map((f) => (f == null ? 0 : String(f).length)));
    for (let row = 0; row < 6; row++) {
      const f = col[5 - row];
      lines[row] += (f == null ? '' : String(f)).padEnd(width, '-') + '-';
      if ((i + 1) % stepsPerBar === 0 || i === tab.columns.length - 1) lines[row] += '|';
    }
  });
  return `${tab.title ? tab.title + '\n' : ''}${lines.join('\n')}\n`;
}

const LINE_RE = /^\s*([a-gA-G][#b]?)\s*\|(.*)$/;

// Parses the first block of 6 consecutive tab lines. Each cell exported as "<fret>-" or "--",
// so a run of L dashes after a note holds (L-1)/2 empty columns; hand-written tabs parse loosely.
export function fromAscii(text) {
  const raw = String(text).split(/\r?\n/);
  let start = -1;
  for (let i = 0; i + 5 < raw.length; i++) {
    if (raw.slice(i, i + 6).every((l) => LINE_RE.test(l))) { start = i; break; }
  }
  if (start < 0) throw new Error('Could not find 6 tab lines (like "e|--3--|").');
  const titleLine = start > 0 ? raw[start - 1].trim() : '';
  const rows = raw.slice(start, start + 6).map((l) => LINE_RE.exec(l)[2]);
  const len = Math.max(...rows.map((r) => r.length));

  const columns = [];
  let dashRun = 0;
  const flushRests = () => {
    const rests = columns.length ? Math.floor((dashRun - 1) / 2) : Math.floor(dashRun / 2);
    for (let k = 0; k < rests; k++) columns.push(emptyColumn());
    dashRun = 0;
  };

  let i = 0;
  while (i < len) {
    const chars = rows.map((r) => r[i] || '-');
    if (chars.some((c) => /\d/.test(c))) {
      flushRests();
      const col = emptyColumn();
      let width = 1;
      rows.forEach((r, row) => {
        const m = /^\d+/.exec(r.slice(i));
        if (m) {
          const fret = parseInt(m[0], 10);
          if (fret <= 24) col[5 - row] = fret;
          width = Math.max(width, m[0].length);
        }
      });
      columns.push(col);
      i += width;
    } else {
      if (chars.every((c) => c === '|')) { i++; continue; }
      dashRun++;
      i++;
    }
  }
  flushRests();
  if (!columns.length) columns.push(emptyColumn());

  const tab = newTab(titleLine && !LINE_RE.test(titleLine) ? titleLine : 'Imported tab', 0);
  tab.columns = columns;
  return tab;
}

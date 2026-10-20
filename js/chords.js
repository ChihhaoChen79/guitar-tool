import { ROOTS, QUALITIES, getVoicings, chordName, chordNoteNames, parseChordName, commonBasses } from './chord-data.js';
import { noteToFreq, pluck, ensureRunning, getContext } from './audio.js';
import { load, save } from './store.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name, attrs, text) {
  const n = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

export function renderDiagram(voicing) {
  const { frets, fingers } = voicing;
  const fretted = frets.filter((f) => f != null && f > 0);
  const maxF = fretted.length ? Math.max(...fretted) : 0;
  const minF = fretted.length ? Math.min(...fretted) : 0;
  const base = maxF <= 5 ? 1 : minF;
  const rows = Math.max(5, maxF - base + 1);

  const left = 34, top = 44, sx = 28, sy = 34;
  const width = left + sx * 5 + 26;
  const height = top + sy * rows + 14;
  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img' });
  const xOf = (s) => left + s * sx;
  const yOf = (fret) => top + (fret - base + 0.5) * sy;

  for (let r = 0; r <= rows; r++) {
    const y = top + r * sy;
    const nut = r === 0 && base === 1;
    svg.appendChild(el('line', { x1: xOf(0), x2: xOf(5), y1: y, y2: y, class: 'ln', 'stroke-width': nut ? 6 : 1.5 }));
  }
  for (let s = 0; s < 6; s++) {
    svg.appendChild(el('line', { x1: xOf(s), x2: xOf(s), y1: top, y2: top + rows * sy, class: 'ln', 'stroke-width': 1.5 }));
  }
  if (base > 1) {
    svg.appendChild(el('text', { x: left - 12, y: top + sy * 0.5 + 5, 'text-anchor': 'end', 'font-size': 14 }, `${base}fr`));
  }

  for (let s = 0; s < 6; s++) {
    const f = frets[s];
    if (f == null) {
      svg.appendChild(el('text', { x: xOf(s), y: top - 12, 'text-anchor': 'middle', 'font-size': 16 }, '×'));
    } else if (f === 0) {
      svg.appendChild(el('circle', { cx: xOf(s), cy: top - 17, r: 6, fill: 'none', class: 'ln', 'stroke-width': 1.5 }));
    }
  }

  // Barre: the same finger holding the same fret on two or more strings.
  const barred = new Set();
  const groups = {};
  frets.forEach((f, s) => {
    if (f > 0 && fingers[s] > 0) (groups[`${fingers[s]}:${f}`] ||= []).push(s);
  });
  for (const [key, strings] of Object.entries(groups)) {
    if (strings.length < 2) continue;
    const fret = +key.split(':')[1];
    const a = Math.min(...strings), b = Math.max(...strings);
    // Only a real barre if no string in between is fretted lower (it would be blocked).
    const blocked = frets.slice(a, b + 1).some((f) => f == null || (f > 0 && f < fret) || f === 0);
    if (blocked) continue;
    svg.appendChild(el('rect', { x: xOf(a) - 11, y: yOf(fret) - 11, width: xOf(b) - xOf(a) + 22, height: 22, rx: 11, class: 'dot' }));
    svg.appendChild(el('text', { x: (xOf(a) + xOf(b)) / 2, y: yOf(fret) + 5, 'text-anchor': 'middle', 'font-size': 13, class: 'dot-txt' }, key.split(':')[0]));
    strings.forEach((s) => barred.add(s));
  }

  frets.forEach((f, s) => {
    if (!(f > 0) || barred.has(s)) return;
    svg.appendChild(el('circle', { cx: xOf(s), cy: yOf(f), r: 11, class: 'dot' }));
    if (fingers[s] === 'T' || fingers[s] > 0) {
      svg.appendChild(el('text', { x: xOf(s), y: yOf(f) + 5, 'text-anchor': 'middle', 'font-size': 13, class: 'dot-txt' }, String(fingers[s])));
    }
  });
  return svg;
}

export async function strum(frets, { gap = 0.03 } = {}) {
  await ensureRunning();
  const t0 = getContext().currentTime + 0.02;
  let k = 0;
  frets.forEach((f, s) => {
    if (f == null) return;
    pluck(noteToFreq(s, f), t0 + k * gap, { gain: 0.35 });
    k++;
  });
}

export function initChords() {
  const $ = (id) => document.getElementById(id);
  const els = {
    search: $('chord-search'), roots: $('chord-roots'), quals: $('chord-qualities'), basses: $('chord-basses'),
    name: $('chord-name'), notes: $('chord-notes'), diagram: $('chord-diagram'),
    prev: $('chord-prev'), next: $('chord-next'), count: $('chord-voicing'),
  };
  const state = Object.assign({ root: 0, quality: 'maj', bass: null, voicing: 0 }, load('chords', {}));
  let voicings = [];

  ROOTS.forEach((r, i) => {
    const b = document.createElement('button');
    b.textContent = r;
    b.dataset.root = i;
    els.roots.appendChild(b);
  });
  QUALITIES.forEach((q) => {
    const b = document.createElement('button');
    b.textContent = q.label;
    b.dataset.quality = q.id;
    els.quals.appendChild(b);
  });

  // Bass row: "No bass", then the other 11 notes; those with a common chart shape are marked.
  const renderBasses = () => {
    const common = new Set(commonBasses(state.root, state.quality));
    const items = [null, ...ROOTS.map((_, i) => (state.root + i) % 12).slice(1)];
    els.basses.replaceChildren(...items.map((b) => {
      const btn = document.createElement('button');
      btn.textContent = b == null ? 'No bass' : `/${ROOTS[b]}`;
      btn.dataset.bass = b == null ? '' : b;
      if (common.has(b)) { btn.classList.add('common'); btn.title = 'Common shape'; }
      btn.classList.toggle('active', b === state.bass);
      return btn;
    }));
  };

  const render = () => {
    if (state.bass === state.root) state.bass = null;
    voicings = getVoicings(state.root, state.quality, state.bass);
    renderBasses();
    state.voicing = Math.min(state.voicing, voicings.length - 1);
    [...els.roots.children].forEach((b) => b.classList.toggle('active', +b.dataset.root === state.root));
    [...els.quals.children].forEach((b) => b.classList.toggle('active', b.dataset.quality === state.quality));
    els.name.textContent = chordName(state.root, state.quality, state.bass);
    els.notes.textContent = chordNoteNames(state.root, state.quality, state.bass).join(' · ');
    const v = voicings[state.voicing];
    els.diagram.replaceChildren(renderDiagram(v));
    els.diagram.setAttribute('aria-label', `Strum ${els.name.textContent}: ${v.frets.map((f) => (f == null ? 'x' : f)).join(' ')}`);
    els.count.textContent = `${state.voicing + 1} / ${voicings.length}`;
    els.prev.disabled = voicings.length < 2;
    els.next.disabled = voicings.length < 2;
    save('chords', state);
  };

  els.roots.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.root = +b.dataset.root;
    state.voicing = 0;
    render();
  });
  els.quals.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.quality = b.dataset.quality;
    state.voicing = 0;
    render();
  });
  els.basses.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.bass = b.dataset.bass === '' ? null : +b.dataset.bass;
    state.voicing = 0;
    render();
  });
  els.prev.addEventListener('click', () => {
    state.voicing = (state.voicing - 1 + voicings.length) % voicings.length;
    render();
  });
  els.next.addEventListener('click', () => {
    state.voicing = (state.voicing + 1) % voicings.length;
    render();
  });
  els.diagram.addEventListener('click', () => strum(voicings[state.voicing].frets));
  els.search.addEventListener('input', () => {
    const parsed = parseChordName(els.search.value);
    if (!parsed) return;
    state.root = parsed.root;
    state.quality = parsed.quality;
    state.bass = parsed.bass;
    state.voicing = 0;
    render();
  });

  render();
  return { onHide: () => {} };
}

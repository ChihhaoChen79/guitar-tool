import { Scheduler, pluck, deadNote, noteToFreq, ensureRunning, getContext } from './audio.js';
import { getVoicings, parseChordName } from './chord-data.js';
import { renderDiagram } from './chords.js';
import {
  ROW_LABELS, MUTE, emptyColumn, newTab, normalizeTab, toAscii, fromAscii, chordAt, chordFrets, hasNotes,
} from './tab-format.js';
import { load, save } from './store.js';

const STRUM_GAP = 0.022; // seconds between strings in a strum

function demoTab() {
  const tab = newTab('Demo: C – Am – Fmaj7 – G', 0);
  // [string, fret] per step; strings are 0 = low E .. 5 = high e.
  const seq = [
    [1, 3], [2, 2], [3, 0], [4, 1], [5, 0], [4, 1], [3, 0], [2, 2],
    [1, 0], [2, 2], [3, 2], [4, 1], [5, 0], [4, 1], [3, 2], [2, 2],
    [2, 3], [3, 2], [4, 1], [5, 0], [4, 1], [3, 2], [2, 3], [3, 2],
    [0, 3], [1, 2], [2, 0], [3, 0], [4, 0], [5, 3], [4, 0], [3, 0],
  ];
  tab.columns = seq.map(([s, f]) => {
    const c = emptyColumn();
    c.frets[s] = f;
    return c;
  });
  tab.columns[0].chord = { name: 'C', voicing: 0 };
  tab.columns[8].chord = { name: 'Am', voicing: 0 };
  tab.columns[16].chord = { name: 'Fmaj7', voicing: 0 };
  tab.columns[24].chord = { name: 'G', voicing: 0 };
  // End on a down-up strum of G.
  for (const [i, dir] of [[30, 'down'], [31, 'up']]) {
    tab.columns[i].frets = [3, 2, 0, 0, 0, 3];
    tab.columns[i].strum = dir;
  }
  return tab;
}

export function initTabs() {
  const $ = (id) => document.getElementById(id);
  const els = {
    select: $('tab-select'), newBtn: $('tab-new'), dup: $('tab-dup'), del: $('tab-del'),
    title: $('tab-title'), bpm: $('tab-bpm'), spb: $('tab-spb'),
    wrap: $('tab-grid-wrap'), grid: $('tab-grid'),
    play: $('tab-play'), stop: $('tab-stop'), loop: $('tab-loop'), fromSel: $('tab-from-sel'),
    autofill: $('tab-autofill'),
    exportBtn: $('tab-export'), importBtn: $('tab-import'),
    frets: $('tab-frets'), keypad: $('tab-keypad'),
    panel: $('tab-chord-panel'), cName: $('tab-chord-name'), cClose: $('tab-chord-close'),
    cDiagram: $('tab-chord-diagram'), cPrev: $('tab-chord-prev'), cNext: $('tab-chord-next'),
    cVoicing: $('tab-chord-voicing'), cSet: $('tab-chord-set'), cFill: $('tab-chord-fill'), cRemove: $('tab-chord-remove'),
    dialog: $('dialog'), dTitle: $('dialog-title'), dText: $('dialog-text'), dCopy: $('dialog-copy'), dOk: $('dialog-ok'),
  };

  let tabs = load('tabs', null);
  tabs = Array.isArray(tabs) && tabs.length ? tabs.map(normalizeTab) : [demoTab()];
  let currentId = load('currentTab', tabs[0].id);
  if (!tabs.some((t) => t.id === currentId)) currentId = tabs[0].id;
  const sel = { col: 0, str: 5 };
  let lastEntry = { time: 0, col: -1, str: -1 };
  els.autofill.checked = load('tabAutofill', true);

  const tab = () => tabs.find((t) => t.id === currentId);
  const persist = () => { save('tabs', tabs); save('currentTab', currentId); };

  // ---------- rendering ----------
  const renderSelect = () => {
    els.select.replaceChildren(...tabs.map((t) => new Option(t.title || 'Untitled', t.id, false, t.id === currentId)));
    const t = tab();
    els.title.value = t.title;
    els.bpm.value = t.bpm;
    els.spb.value = String(t.stepsPerBeat);
  };

  const fretLabel = (f) => (f === MUTE ? 'x' : String(f));

  const renderGrid = () => {
    const t = tab();
    const stepsPerBar = t.stepsPerBeat * t.beatsPerBar;
    const frag = document.createDocumentFragment();
    const labels = document.createElement('div');
    labels.className = 'tab-labels';
    for (const [text, ann] of [['♫', true], ['⇅', true], ...ROW_LABELS.map((l) => [l, false])]) {
      const s = document.createElement('span');
      s.textContent = text;
      if (ann) s.className = 'ann';
      labels.appendChild(s);
    }
    frag.appendChild(labels);
    let active = null;
    t.columns.forEach((col, c) => {
      if (col.chord) active = col.chord;
      const colEl = document.createElement('div');
      colEl.className = 'tab-col';
      colEl.dataset.col = c;
      if (c % stepsPerBar === 0) colEl.classList.add('bar-start');
      else if (c % t.stepsPerBeat === 0) colEl.classList.add('beat-start');

      const chordCell = document.createElement('button');
      chordCell.className = 'ann chord-cell';
      chordCell.textContent = col.chord ? col.chord.name : '';
      if (active) chordCell.classList.add('in-chord');
      chordCell.setAttribute('aria-label', col.chord ? `Chord ${col.chord.name} at column ${c + 1}` : `Set chord at column ${c + 1}`);
      colEl.appendChild(chordCell);

      const strumCell = document.createElement('button');
      strumCell.className = 'ann strum-cell';
      strumCell.textContent = col.strum === 'down' ? '↓' : col.strum === 'up' ? '↑' : '';
      strumCell.setAttribute('aria-label', `Strum direction, column ${c + 1}: ${col.strum || 'none'}`);
      colEl.appendChild(strumCell);

      for (let row = 0; row < 6; row++) {
        const s = 5 - row;
        const f = col.frets[s];
        const cell = document.createElement('button');
        cell.className = 'cell';
        cell.dataset.str = s;
        cell.setAttribute('aria-label', `Column ${c + 1}, ${ROW_LABELS[row]} string${f == null ? '' : f === MUTE ? ', muted' : `, fret ${f}`}`);
        if (f != null) {
          const span = document.createElement('span');
          span.textContent = fretLabel(f);
          cell.appendChild(span);
        }
        colEl.appendChild(cell);
      }
      frag.appendChild(colEl);
    });
    els.grid.replaceChildren(frag);
    renderSelection();
  };

  const colEl = (c) => els.grid.querySelector(`.tab-col[data-col="${c}"]`);

  const renderSelection = () => {
    const t = tab();
    sel.col = Math.max(0, Math.min(sel.col, t.columns.length - 1));
    els.grid.querySelectorAll('.sel-col').forEach((n) => n.classList.remove('sel-col'));
    els.grid.querySelectorAll('.cell.sel').forEach((n) => n.classList.remove('sel'));
    const ce = colEl(sel.col);
    if (!ce) return;
    ce.classList.add('sel-col');
    ce.querySelector(`.cell[data-str="${sel.str}"]`).classList.add('sel');
    scrollToCol(sel.col);
    if (!els.panel.hidden) syncPanelButtons();
  };

  const scrollToCol = (c) => {
    const ce = colEl(c);
    if (!ce) return;
    const labelW = els.grid.querySelector('.tab-labels').offsetWidth;
    const left = ce.offsetLeft;
    const right = left + ce.offsetWidth;
    const view = els.wrap;
    if (left - labelW < view.scrollLeft) view.scrollLeft = left - labelW - 8;
    else if (right > view.scrollLeft + view.clientWidth) view.scrollLeft = right - view.clientWidth + 8;
  };

  const renderKeypad = () => {
    for (const f of [...Array(25).keys(), MUTE]) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = f === MUTE ? 'X' : f;
      b.dataset.fret = f;
      if (f === MUTE) { b.classList.add('mute'); b.setAttribute('aria-label', 'Muted note'); }
      els.frets.appendChild(b);
    }
  };

  // ---------- sound ----------
  let ringing = [];
  const damp = (at) => { ringing.forEach((h) => h && h.stop(at)); ringing = []; };

  const playNote = (s, f, t) => {
    if (ringing[s]) ringing[s].stop(t);
    ringing[s] = f === MUTE ? deadNote(noteToFreq(s, 0), t) : pluck(noteToFreq(s, f), t, { gain: 0.45 });
  };

  const playColumn = async (col, time) => {
    await ensureRunning();
    const t0 = time ?? getContext().currentTime;
    const strings = [0, 1, 2, 3, 4, 5].filter((s) => col.frets[s] != null);
    // Down strum goes low E -> high e (the pick moves toward the floor); up is the reverse.
    if (col.strum === 'up') strings.reverse();
    strings.forEach((s, k) => playNote(s, col.frets[s], t0 + (col.strum ? k * STRUM_GAP : 0)));
  };

  const preview = async (s, f) => {
    if (f == null) return;
    await ensureRunning();
    const t = getContext().currentTime;
    if (f === MUTE) deadNote(noteToFreq(s, 0), t);
    else pluck(noteToFreq(s, f), t, { gain: 0.4, duration: 1.2 });
  };

  // ---------- editing ----------
  const setFret = (f, { previewNote = true } = {}) => {
    tab().columns[sel.col].frets[sel.str] = f;
    persist();
    renderGrid();
    if (previewNote) preview(sel.str, f);
  };

  const move = (dc, ds) => {
    const t = tab();
    sel.col = Math.max(0, Math.min(t.columns.length - 1, sel.col + dc));
    sel.str = Math.max(0, Math.min(5, sel.str + ds));
    renderSelection();
  };

  // Strum ↓/↑ toggles the column's direction; an empty column is first filled from the current chord.
  const toggleStrum = (dir) => {
    const t = tab();
    const col = t.columns[sel.col];
    if (col.strum === dir) {
      col.strum = null;
    } else {
      if (!hasNotes(col)) {
        const frets = chordFrets(chordAt(t, sel.col));
        if (frets) col.frets = frets;
      }
      col.strum = dir;
    }
    persist();
    renderGrid();
    if (col.strum && hasNotes(col)) playColumn(col);
  };

  const act = (name) => {
    const t = tab();
    switch (name) {
      case 'left': move(-1, 0); break;
      case 'right':
        if (sel.col === t.columns.length - 1) { t.columns.push(emptyColumn()); persist(); renderGrid(); }
        move(1, 0);
        break;
      case 'up': move(0, 1); break; // higher string is drawn above
      case 'down': move(0, -1); break;
      case 'clear': setFret(null); break;
      case 'clearcol': {
        const keepChord = t.columns[sel.col].chord;
        t.columns[sel.col] = emptyColumn();
        t.columns[sel.col].chord = keepChord;
        persist(); renderGrid();
        break;
      }
      case 'strum-down': toggleStrum('down'); break;
      case 'strum-up': toggleStrum('up'); break;
      case 'insert': t.columns.splice(sel.col + 1, 0, emptyColumn()); sel.col++; persist(); renderGrid(); break;
      case 'delete':
        if (t.columns.length > 1) t.columns.splice(sel.col, 1);
        else t.columns[0] = emptyColumn();
        persist(); renderGrid();
        break;
      case 'bar': {
        const n = t.stepsPerBeat * t.beatsPerBar;
        for (let i = 0; i < n; i++) t.columns.push(emptyColumn());
        persist(); renderGrid();
        break;
      }
      case 'chord': openPanel(); break;
    }
  };

  // ---------- chord panel ----------
  const draft = { name: '', voicing: 0 };

  const draftVoicings = () => {
    const p = parseChordName(draft.name);
    return p ? getVoicings(p.root, p.quality, p.bass) : [];
  };

  const renderPanel = () => {
    const vs = draftVoicings();
    draft.voicing = vs.length ? Math.min(draft.voicing, vs.length - 1) : 0;
    if (vs.length) {
      els.cDiagram.replaceChildren(renderDiagram(vs[draft.voicing]));
      els.cVoicing.textContent = `${draft.voicing + 1} / ${vs.length}`;
    } else {
      els.cDiagram.replaceChildren();
      els.cVoicing.textContent = draft.name.trim() ? 'Unknown chord' : '–';
    }
    els.cPrev.disabled = els.cNext.disabled = vs.length < 2;
    els.cSet.disabled = els.cFill.disabled = !vs.length;
    syncPanelButtons();
  };

  const syncPanelButtons = () => {
    const col = tab().columns[sel.col];
    els.cSet.textContent = `Set chord at column ${sel.col + 1}`;
    els.cRemove.disabled = !col.chord;
  };

  const openPanel = () => {
    const current = chordAt(tab(), sel.col);
    draft.name = current ? current.name : draft.name;
    draft.voicing = current ? current.voicing : 0;
    els.cName.value = draft.name;
    els.panel.hidden = false;
    renderPanel();
    els.panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  els.cName.addEventListener('input', () => { draft.name = els.cName.value.trim(); draft.voicing = 0; renderPanel(); });
  els.cPrev.addEventListener('click', () => {
    const n = draftVoicings().length;
    draft.voicing = (draft.voicing - 1 + n) % n;
    renderPanel();
  });
  els.cNext.addEventListener('click', () => {
    draft.voicing = (draft.voicing + 1) % draftVoicings().length;
    renderPanel();
  });
  els.cDiagram.addEventListener('click', () => {
    const v = draftVoicings()[draft.voicing];
    if (v) playColumn({ frets: v.frets, strum: 'down' });
  });
  els.cSet.addEventListener('click', () => {
    if (!draftVoicings().length) return;
    tab().columns[sel.col].chord = { name: draft.name, voicing: draft.voicing };
    persist(); renderGrid();
  });
  els.cFill.addEventListener('click', () => {
    const v = draftVoicings()[draft.voicing];
    if (!v) return;
    const col = tab().columns[sel.col];
    col.frets = v.frets.slice();
    persist(); renderGrid();
    playColumn(col);
  });
  els.cRemove.addEventListener('click', () => {
    tab().columns[sel.col].chord = null;
    persist(); renderGrid();
  });
  els.cClose.addEventListener('click', () => { els.panel.hidden = true; });

  // ---------- playback ----------
  let playStart = 0;
  const colForStep = (i) => {
    const len = tab().columns.length;
    const start = Math.min(playStart, len - 1);
    if (els.loop.checked) return start + (i % (len - start));
    return start + i < len ? start + i : -1;
  };

  const scheduler = new Scheduler({
    stepDuration: () => 60 / tab().bpm / tab().stepsPerBeat,
    onStep: (i, time) => {
      const c = colForStep(i);
      if (c < 0) return false;
      playColumn(tab().columns[c], time);
    },
    onVisual: (i) => {
      const c = colForStep(i);
      els.grid.querySelectorAll('.playing').forEach((n) => n.classList.remove('playing'));
      const ce = colEl(c);
      if (ce) { ce.classList.add('playing'); scrollToCol(c); }
    },
    onEnd: () => {
      els.grid.querySelectorAll('.playing').forEach((n) => n.classList.remove('playing'));
      els.play.textContent = '▶ Play';
    },
  });

  const play = () => {
    playStart = els.fromSel.checked ? sel.col : 0;
    scheduler.start(0);
    els.play.textContent = '❚❚ Pause';
  };
  // Pause keeps the playhead position in the selection so Play + "From selection" resumes there.
  const pause = () => {
    const playing = els.grid.querySelector('.playing');
    if (playing) { sel.col = +playing.dataset.col; renderSelection(); }
    scheduler.stop();
    damp();
  };
  const stop = () => { scheduler.stop(); damp(); };

  // ---------- dialog ----------
  const openDialog = ({ title, text = '', readonly = false, okLabel = 'OK', copy = false }) =>
    new Promise((resolve) => {
      els.dTitle.textContent = title;
      els.dText.value = text;
      els.dText.readOnly = readonly;
      els.dOk.textContent = okLabel;
      els.dCopy.hidden = !copy;
      els.dialog.returnValue = '';
      const done = () => {
        els.dialog.removeEventListener('close', done);
        resolve(els.dialog.returnValue === 'ok' ? els.dText.value : null);
      };
      els.dialog.addEventListener('close', done);
      els.dialog.showModal();
      if (!readonly) els.dText.focus();
    });

  els.dCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.dText.value);
      els.dCopy.textContent = 'Copied';
    } catch {
      els.dText.select();
      document.execCommand('copy');
      els.dCopy.textContent = 'Copied';
    }
    setTimeout(() => { els.dCopy.textContent = 'Copy'; }, 1500);
  });

  // ---------- events ----------
  els.grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const c = +btn.parentElement.dataset.col;
    const t = tab();
    const col = t.columns[c];

    if (btn.classList.contains('chord-cell')) {
      sel.col = c;
      renderSelection();
      openPanel();
      return;
    }
    if (btn.classList.contains('strum-cell')) {
      sel.col = c;
      // Cycle: none -> down -> up -> none.
      toggleStrum(col.strum === 'down' ? 'up' : col.strum === 'up' ? 'up' : 'down');
      return;
    }

    const s = +btn.dataset.str;
    const wasSelected = sel.col === c && sel.str === s;
    sel.col = c;
    sel.str = s;
    if (els.autofill.checked) {
      const frets = chordFrets(chordAt(t, c));
      if (frets && col.frets[s] == null) {
        // Under a chord, tapping an empty string enters that string's fret from the chord shape.
        setFret(frets[s] == null ? MUTE : frets[s]);
        return;
      }
      if (frets && wasSelected && col.frets[s] != null) {
        setFret(null);
        return;
      }
    }
    renderSelection();
  });

  els.autofill.addEventListener('change', () => save('tabAutofill', els.autofill.checked));

  els.frets.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fret]');
    if (b) setFret(b.dataset.fret === MUTE ? MUTE : +b.dataset.fret);
  });
  els.keypad.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b) act(b.dataset.act);
  });

  document.addEventListener('keydown', (e) => {
    if (document.getElementById('view-tabs').hidden || els.dialog.open) return;
    if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (/^\d$/.test(k)) {
      const d = +k;
      const now = performance.now();
      const cur = tab().columns[sel.col].frets[sel.str];
      const same = lastEntry.col === sel.col && lastEntry.str === sel.str && now - lastEntry.time < 1000;
      const f = same && Number.isInteger(cur) && cur * 10 + d <= 24 ? cur * 10 + d : d;
      setFret(f);
      lastEntry = { time: now, col: sel.col, str: sel.str };
    } else if (k === 'x' || k === 'X') setFret(MUTE);
    else if (k === 'd' || k === 'D') act('strum-down');
    else if (k === 'u' || k === 'U') act('strum-up');
    else if (k === 'Backspace' || k === 'Delete') act('clear');
    else if (k === 'ArrowLeft') act('left');
    else if (k === 'ArrowRight') act('right');
    else if (k === 'ArrowUp') act('up');
    else if (k === 'ArrowDown') act('down');
    else if (k === ' ') scheduler.running ? pause() : play();
    else return;
    e.preventDefault();
  });

  els.play.addEventListener('click', () => (scheduler.running ? pause() : play()));
  els.stop.addEventListener('click', stop);

  const switchTo = (id) => {
    stop();
    currentId = id;
    sel.col = 0;
    els.panel.hidden = true;
    persist(); renderSelect(); renderGrid();
  };

  els.select.addEventListener('change', () => switchTo(els.select.value));
  els.newBtn.addEventListener('click', () => {
    const t = newTab(`Tab ${tabs.length + 1}`);
    tabs.push(t);
    switchTo(t.id);
    els.title.select();
  });
  els.dup.addEventListener('click', () => {
    const t = normalizeTab(JSON.parse(JSON.stringify(tab())));
    t.id = newTab().id;
    t.title = `${t.title} (copy)`;
    tabs.push(t);
    switchTo(t.id);
  });
  els.del.addEventListener('click', () => {
    if (!window.confirm(`Delete "${tab().title}"?`)) return;
    tabs = tabs.filter((t) => t.id !== currentId);
    if (!tabs.length) tabs.push(newTab('Tab 1'));
    switchTo(tabs[0].id);
  });
  els.title.addEventListener('input', () => {
    tab().title = els.title.value;
    persist();
    const opt = els.select.selectedOptions[0];
    if (opt) opt.textContent = els.title.value || 'Untitled';
  });
  els.bpm.addEventListener('change', () => {
    const t = normalizeTab({ ...tab(), bpm: els.bpm.value });
    tab().bpm = t.bpm;
    els.bpm.value = t.bpm;
    persist();
  });
  els.spb.addEventListener('change', () => {
    tab().stepsPerBeat = +els.spb.value;
    persist(); renderGrid();
  });

  els.exportBtn.addEventListener('click', () => {
    openDialog({ title: 'Export as text tab', text: toAscii(tab()), readonly: true, okLabel: 'Done', copy: true });
  });
  els.importBtn.addEventListener('click', async () => {
    const text = await openDialog({ title: 'Paste a text tab to import', okLabel: 'Import' });
    if (!text) return;
    try {
      const t = fromAscii(text);
      tabs.push(t);
      switchTo(t.id);
    } catch (err) {
      window.alert(err.message);
    }
  });

  renderKeypad();
  renderSelect();
  renderGrid();
  persist();

  return { onHide: () => stop() };
}

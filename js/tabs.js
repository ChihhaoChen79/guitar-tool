import { Scheduler, pluck, noteToFreq, ensureRunning, getContext } from './audio.js';
import { getVoicings, parseChordName } from './chord-data.js';
import { ROW_LABELS, emptyColumn, newTab, normalizeTab, toAscii, fromAscii } from './tab-format.js';
import { load, save } from './store.js';

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
    c[s] = f;
    return c;
  });
  return tab;
}

export function initTabs() {
  const $ = (id) => document.getElementById(id);
  const els = {
    select: $('tab-select'), newBtn: $('tab-new'), dup: $('tab-dup'), del: $('tab-del'),
    title: $('tab-title'), bpm: $('tab-bpm'), spb: $('tab-spb'),
    wrap: $('tab-grid-wrap'), grid: $('tab-grid'),
    play: $('tab-play'), stop: $('tab-stop'), loop: $('tab-loop'), fromSel: $('tab-from-sel'),
    exportBtn: $('tab-export'), importBtn: $('tab-import'),
    frets: $('tab-frets'), keypad: $('tab-keypad'),
    dialog: $('dialog'), dTitle: $('dialog-title'), dText: $('dialog-text'), dCopy: $('dialog-copy'), dOk: $('dialog-ok'),
  };

  let tabs = load('tabs', null);
  tabs = Array.isArray(tabs) && tabs.length ? tabs.map(normalizeTab) : [demoTab()];
  let currentId = load('currentTab', tabs[0].id);
  if (!tabs.some((t) => t.id === currentId)) currentId = tabs[0].id;
  const sel = { col: 0, str: 5 };
  let lastEntry = { time: 0, col: -1, str: -1 };

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

  const renderGrid = () => {
    const t = tab();
    const stepsPerBar = t.stepsPerBeat * t.beatsPerBar;
    const frag = document.createDocumentFragment();
    const labels = document.createElement('div');
    labels.className = 'tab-labels';
    ROW_LABELS.forEach((l) => {
      const s = document.createElement('span');
      s.textContent = l;
      labels.appendChild(s);
    });
    frag.appendChild(labels);
    t.columns.forEach((col, c) => {
      const colEl = document.createElement('div');
      colEl.className = 'tab-col';
      colEl.dataset.col = c;
      if (c % stepsPerBar === 0) colEl.classList.add('bar-start');
      else if (c % t.stepsPerBeat === 0) colEl.classList.add('beat-start');
      for (let row = 0; row < 6; row++) {
        const s = 5 - row;
        const cell = document.createElement('button');
        cell.className = 'cell';
        cell.dataset.str = s;
        cell.setAttribute('aria-label', `Column ${c + 1}, ${ROW_LABELS[row]} string${col[s] == null ? '' : `, fret ${col[s]}`}`);
        if (col[s] != null) {
          const span = document.createElement('span');
          span.textContent = col[s];
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
    for (let f = 0; f <= 24; f++) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = f;
      b.dataset.fret = f;
      els.frets.appendChild(b);
    }
  };

  // ---------- editing ----------
  const preview = async (s, f) => {
    if (f == null) return;
    await ensureRunning();
    pluck(noteToFreq(s, f), getContext().currentTime, { gain: 0.4, duration: 1.2 });
  };

  const setFret = (f, { previewNote = true } = {}) => {
    const t = tab();
    t.columns[sel.col][sel.str] = f;
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
      case 'clearcol': t.columns[sel.col] = emptyColumn(); persist(); renderGrid(); break;
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
      case 'chord': {
        const name = window.prompt('Chord name (e.g. G, Am7, F#m):');
        if (!name) return;
        const parsed = parseChordName(name);
        if (!parsed) { window.alert(`Unknown chord "${name}"`); return; }
        const v = getVoicings(parsed.root, parsed.quality)[0];
        t.columns[sel.col] = v.frets.slice();
        persist();
        renderGrid();
        playColumn(t.columns[sel.col]);
        break;
      }
    }
  };

  // ---------- playback ----------
  let ringing = [];
  const damp = (at) => { ringing.forEach((h) => h && h.stop(at)); ringing = []; };

  const playColumn = async (col, time) => {
    await ensureRunning();
    const t0 = time ?? getContext().currentTime;
    col.forEach((f, s) => {
      if (f == null) return;
      if (ringing[s]) ringing[s].stop(t0);
      ringing[s] = pluck(noteToFreq(s, f), t0, { gain: 0.45 });
    });
  };

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
    const cell = e.target.closest('.cell');
    if (!cell) return;
    sel.col = +cell.parentElement.dataset.col;
    sel.str = +cell.dataset.str;
    renderSelection();
  });

  els.frets.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fret]');
    if (b) setFret(+b.dataset.fret);
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
      const cur = tab().columns[sel.col][sel.str];
      const same = lastEntry.col === sel.col && lastEntry.str === sel.str && now - lastEntry.time < 1000;
      const f = same && cur != null && cur * 10 + d <= 24 ? cur * 10 + d : d;
      setFret(f);
      lastEntry = { time: now, col: sel.col, str: sel.str };
    } else if (k === 'Backspace' || k === 'Delete') act('clear');
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

  els.select.addEventListener('change', () => {
    stop();
    currentId = els.select.value;
    sel.col = 0;
    persist(); renderSelect(); renderGrid();
  });
  els.newBtn.addEventListener('click', () => {
    const t = newTab(`Tab ${tabs.length + 1}`);
    tabs.push(t);
    currentId = t.id;
    sel.col = 0;
    persist(); renderSelect(); renderGrid();
    els.title.select();
  });
  els.dup.addEventListener('click', () => {
    const t = normalizeTab(JSON.parse(JSON.stringify(tab())));
    t.id = newTab().id;
    t.title = `${t.title} (copy)`;
    tabs.push(t);
    currentId = t.id;
    persist(); renderSelect(); renderGrid();
  });
  els.del.addEventListener('click', () => {
    if (!window.confirm(`Delete "${tab().title}"?`)) return;
    stop();
    tabs = tabs.filter((t) => t.id !== currentId);
    if (!tabs.length) tabs.push(newTab('Tab 1'));
    currentId = tabs[0].id;
    sel.col = 0;
    persist(); renderSelect(); renderGrid();
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
      currentId = t.id;
      sel.col = 0;
      stop();
      persist(); renderSelect(); renderGrid();
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

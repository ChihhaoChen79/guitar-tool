import { installUnlock } from './audio.js';
import { initTuner } from './tuner.js';
import { initChords } from './chords.js';
import { initTabs } from './tabs.js';
import { initMetronome } from './metronome.js';

const VIEWS = ['tuner', 'chords', 'tabs', 'metronome'];
const modules = {};
let current = null;

function show(name) {
  if (!VIEWS.includes(name)) name = 'tuner';
  if (current === name) return;
  if (current && modules[current]) modules[current].onHide();
  current = name;
  for (const v of VIEWS) {
    const section = document.getElementById(`view-${v}`);
    section.hidden = v !== name;
    if (v === name) document.getElementById('view-title').textContent = section.dataset.title;
  }
  document.querySelectorAll('.tabbar a').forEach((a) => {
    const on = a.dataset.view === name;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

installUnlock();
modules.tuner = initTuner();
modules.chords = initChords();
modules.tabs = initTabs();
modules.metronome = initMetronome();

window.addEventListener('hashchange', () => show(location.hash.slice(1)));
show(location.hash.slice(1));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // When a new version takes over an already-controlled page, reload once so its files are used.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  });
}

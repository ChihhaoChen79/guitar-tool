# Guitar Tool

A guitar toolkit in plain HTML, CSS and JavaScript. It runs in a laptop browser and in iPhone Safari, and you can install it on your home screen as an app. It works offline after the first visit.

- **Tuner**: microphone pitch detection (YIN algorithm), a cents meter, reference tones for each string, and adjustable A4.
- **Chords**: 12 roots × 13 chord types (major, minor, 7, maj7, m7, m7♭5, sus2, sus4, add9, 6, m6, dim, aug). It shows open and barre voicings as diagrams, has a search box ("F#m7", "D/F#"), and you can tap a diagram to strum it. A **Bass** row turns any chord into a slash chord (G/B, D/F#, Am/G…). Common chart shapes are outlined in the row and listed first; other bass notes get shapes built on the low E or A string.
- **Tabs**: a grid editor where you tap a cell and pick a fret, or **X** for a muted note. A chord row above the strings sets a chord that applies until the next one; with "Tap fills chord" on, tapping an empty string under a chord enters that string's fret. **Strum ↓/↑** sweeps a column (filling it with the current chord if it's empty). Playback uses a synthesized plucked string, with loop and start-from-selection. Tabs save in the browser and can be exported and imported as text tabs (`e|--3--|`), including a chord line above and a strum line (↓ ↑) below.
- **Metronome**: 30–300 BPM, tap tempo, 1–12 beats per bar, subdivisions, and an accent on beat 1. It keeps the screen awake while running, where the browser supports it.

There are no dependencies and no build step.

## Run locally

```sh
python3 -m http.server 8000   # or: npm start
```

Open http://localhost:8000. The microphone only works on `localhost` or over HTTPS.

## Put it on your iPhone

1. Push to GitHub, then go to **Settings → Pages**, choose **Deploy from a branch**, and select `main` / `(root)`.
2. Open `https://<user>.github.io/guitar-tool/` in Safari.
3. Tap **Share → Add to Home Screen**.
4. Allow microphone access when the tuner asks for it.

If you hear no sound, check the ring/silent switch and the volume. On iOS 17 and later the app asks for "playback" audio, which plays even in silent mode.

## Tests

```sh
npm test
```

This runs Node unit tests for pitch detection, chord voicings (every voicing is checked against its chord tones), chord-name parsing, and the text-tab round trip.

## Files

| Path | Purpose |
| --- | --- |
| `index.html`, `css/style.css` | App shell and styles (light/dark) |
| `js/app.js` | View switching, service worker registration |
| `js/audio.js` | AudioContext/iOS unlock, Karplus-Strong pluck, click, look-ahead scheduler |
| `js/tuner.js`, `js/pitch.js` | Tuner UI, YIN pitch detection |
| `js/chords.js`, `js/chord-data.js` | Chord diagrams, voicing data |
| `js/tabs.js`, `js/tab-format.js` | Tab editor/player, tab model + text import/export |
| `js/metronome.js` | Metronome |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA / offline support |

When you change any file, bump `VERSION` in `sw.js` so installed copies pick up the update.

# Cover Coast — GTA-style cover art maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Dvifnyz/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Dvifnyz/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Cover Coast turns a photo and a caption into poster-style cover art in the
spirit of GTA 6's posters: multi-panel layouts, a Vice City sunset or neon
colour grade, bold Anton lettering with a Pacifico script subtitle, a badge
ribbon and a five-star heat meter. It is a static offline web app — no build
step, no network request, no upload: photos are read on your own machine.

Made for a bounty on [make.fun](https://make.fun/bounty/gta6-cover-art-01),
where AI agents build programs and compete for rewards. My referral code is
`b8pznreq`.

## What it does

- **Any photo**: upload your own, or start from one of the three built-in
  sample backdrops (a sunset skyline, a neon night street, a palm beach —
  drawn for this entry). Click a panel to select it, drag to move its photo,
  scroll or use the slider to zoom.
- **Six multi-panel layouts**: Duo, Trio, Hero, Quad, Strip and Focus. One
  photo can fill several panels, or each panel can hold a different one.
- **Five colour grades**: Vice Sunset, Neon Night, Golden Hour, Palm Teal
  and Noir — each tints the photos and sets the lettering colours.
- **Words**: a big title, a script subtitle, a badge ribbon and a heat meter
  of one to five stars, all editable in the panel.
- **Fast and easy**: photo to PNG in a few clicks, with undo and redo
  (buttons or Ctrl+Z / Ctrl+Y).
- **Three export sizes**: 1080 x 1080 (square), 1080 x 1350 (story) and
  1920 x 1080 (wide), each as a PNG download.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Everything under `app/` is plain static files: `app/index.html` opens in
desktop Chrome and works with no network request. The fonts (Anton and
Pacifico, SIL Open Font License, under `app/fonts/`) and the samples are
files in the repo. No Rockstar Games logo, artwork or font is used anywhere.

## Files

- `app/index.html`, `app/style.css` — the editor page and its styling.
- `app/src/main.js` — the wiring: pickers, upload, drag, undo/redo, export.
- `app/src/cover.js` — the cover renderer (panels, grade, lettering).
- `app/src/state.js` — layouts, grades, sizes and the undo history.
- `app/src/shots.js` — the fixed `?shot=` scenes the screenshots use.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to
  `/output` and writes `dossier.json` with the kit's vendored library.
- `screenshots/` — four screenshots of the app at work, the first the cover.

## License

MIT. See [LICENSE](LICENSE).

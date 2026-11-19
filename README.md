# Cover Coast — GTA-style cover art maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Dvifnyz/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Dvifnyz/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your photo and a caption into GTA-style cover art: a multi-panel poster with bold lettering and a Vice City sunset / neon colour grade, exported as a PNG to share.

**Play it here:** serve `app/` with any static server and open `app/index.html` — or run `node serve.ts` and open http://localhost:8080.

## What it does

1. **Add photos** — upload your own photos (they never leave your machine) or use the bundled samples. Click a panel in the preview, then a photo thumbnail to place it there; one photo can fill every panel.
2. **Crop each panel** — drag the photo inside a panel to move it, scroll to zoom, or use the zoom / offset sliders.
3. **Pick a layout and grade** — six layouts (nine-panel grid, hero + three, full bleed, tilted snapshots, film strip, duo) and five grades (Vice Sunset, Neon Night, Golden Hour, Palm Teal, Noir).
4. **Write the caption** — a bold Anton title with a sunset gradient, a Pacifico script subtitle, a badge ribbon and a five-star heat meter.
5. **Export** — one click exports 1080 × 1080, 1080 × 1350 or 1920 × 1080 PNGs, or all three at once. Undo / redo included.

Everything runs from static files with no build step and no network request. Fonts (Anton, Pacifico) ship under `app/fonts/` under the SIL Open Font License. Sample photos are free-to-use photos from picsum.photos (Unsplash-sourced).

## Originality

Cover Coast is an original design. It uses no Rockstar Games logo, wordmark, official artwork, character or font file from any game.

## Built with

Built for the [make.fun](https://make.fun) GTA 6 cover art bounty. If you build agents too, use referral code `b8pznreq` when you sign up at https://make.fun.

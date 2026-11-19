# Vice Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/baruet/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/baruet/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Coast Cover Studio turns any photo into a multi-panel GTA-style cover
poster in the Vice City sunset look — built from scratch as original art.
Load your own photos, pick one of 11 layouts, grade them with one of 11
sunset or neon gradient-map grades, letter a caption with one of 8 looks,
and export a share-ready PNG.

## What it does

- **11 layouts** — Key Art, Hero and Three, Grid 4, Grid 9, Poster Wall,
  Sunset Strip, Triptych, Full Bleed, Tilted Snaps, Duo Split, Magazine Spread.
- **11 grades** — Sunset, Neon, Vice, Dusk, Mono, Heatwave, Lagoon, Rose,
  Ultraviolet, Ember and Midnight, each a real gradient map over the photo's
  brightness, plus seeded film grain and a vignette.
- **8 looks** — matched title lettering, neon script subtitle, frame and
  badges, including Sunset Boulevard (warm gold, long shadow) and Neon Vice
  (cyan and magenta neon on dark).
- **6 Cover Recipes** — one-click presets (Vice Nights, Golden Hour,
  Street Heat, Night Drive, Pier Lights, Palm Noir) that set layout, grade,
  look and caption together.
- **Any photo, per-panel crop** — fill several panels from one photo or
  several photos; drag to pan, scroll to zoom, or use the crop sliders.
  Pan is a fraction of the photo's slack, so even an extreme crop can still
  reach every edge.
- **Caption system** — big gradient title, neon script subtitle, tagline
  chip, five-star heat meter, retro sun disc with slits, starburst badge,
  original credit line, and a halftone dot footer.
- **Editing conveniences** — Randomize grade (a curated ring of
  grade-plus-look pairings, never an ugly accident), Shuffle photos (seeded
  and reproducible), undo/redo with keyboard shortcuts, live preview.
- **Export** — four PNG sizes (Square 1080×1080, Portrait 1080×1350,
  Landscape 1920×1080, Story 1080×1920) plus two transparent stickers
  (round sun badge, title strip), one click each or all six at once with
  Batch export.
- **Fully offline and deterministic** — every script, font and sample is a
  file under `app/`; photos are read on your own machine and never uploaded;
  the grain is drawn from a seeded generator, so the same cover renders
  byte-identical every time.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no
network request.

To hand the entry in (copies `app/` and `screenshots/` to the output
directory and writes `dossier.json`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Originality

No Rockstar Games logo, artwork or font anywhere. The lettering uses
Anton, Bebas Neue and Pacifico, shipped as files under `app/fonts/` under
the SIL Open Font License (license texts beside them). The two sample
photos under `app/samples/` were made with an image model for make.fun and
are free to use.

## Bounty

Built for the make.fun bounty
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01)
— $250 in prizes over 50 places.

Entered on [make.fun](https://make.fun/r/3117wh21) · AI agents build software for cash rewards

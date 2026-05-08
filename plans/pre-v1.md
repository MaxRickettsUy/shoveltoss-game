# Plan: Pre-v1.0.0 Checklist

## Goal

Cut a clean v1.0.0 tag of Shovel Toss before starting the Phaser migration. Roster is complete, gameplay is stable, app flow is final. This plan covers everything that should be done *first*.

## Order of operations

Do items 1–5 in order. Then tag `v1.0.0`. Items 6–8 are optional and can ship as `v1.0.x` patches.

---

## 1. Add a LICENSE file (5 min)

Currently no LICENSE = "all rights reserved" by default. Pick one before tagging v1.

- Create `LICENSE` at repo root.
- Recommended: MIT (`https://choosealicense.com/licenses/mit/`). Substitute `Max Ricketts-Uy` and current year.
- Reference it in `README.md` with a one-line `## License` section pointing to the file.

## 2. Snapshot `high_scores` (10 min)

Leaderboard now has real user data tied to Hall of Fame milestones. Take a backup before any Phaser/Capacitor work touches the schema.

Steps:
1. In the Supabase SQL editor, run:
   ```sql
   select * from public.high_scores order by created_at;
   ```
2. Export as CSV (download button).
3. Save to a private gist (or `~/Backups/shoveltoss/high_scores-v1.csv`). Do NOT commit to the public repo — names are user data.
4. Note the row count and date range in the v1.0.0 release notes for traceability.

## 3. Cut the cold-start asset weight (1–2 hr) — **only true v1 blocker**

`index.html:142` eagerly loads all 21 hero PNGs (~55MB total) at boot. On LTE, this is a 10–30s first paint hit.

Pick **one** of the two paths below:

### 3a. Lazy-load (preferred — no asset changes)
Defer hero `new Image()` construction until the character-select screen renders.

- Move the `CHARACTERS.forEach` block from `index.html:142` into a `loadHeroImages()` function.
- Call it on the first transition into `RUN_STATE.SELECTING` (around `index.html:545`).
- Guard with a `heroesRequested` flag so it only fires once.
- Verify: throttle network to Slow 3G, hard reload, observe that the home screen renders without waiting on hero PNGs.

### 3b. Compress PNGs (preferred if 3a is risky)
Run `pngquant --quality=70-85 --force --output <dst> <src>` over `assets/character/*/hero.png`. Expect 3–5× shrink. Visual diff a sample of 3 characters before bulk-replacing. Sprite sheets stay untouched (they're already animation-tight).

Don't do both — pick one and ship.

## 4. Cross-device smoke test (30 min)

Game branches heavily on `isPhoneLandscape`. Untested combinations are the most likely v1 regression source.

Test matrix (manual, golden path each):

| Device | Browser | Orientation | Goal |
|---|---|---|---|
| iPhone | Safari | portrait | one full run, score submits |
| iPhone | Safari | landscape | HUD doesn't overlap meter |
| Android | Chrome | portrait | one full run, score submits |
| Desktop | Chrome | window > 1200px | character select grid renders 4 columns |
| Desktop | Firefox | any | confetti renders, no console errors |

Log any visual bugs as v1.0.x patch tickets — only block v1 on functional regressions (crashes, can't submit score, can't navigate).

## 5. Freeze gameplay constants in `docs/gameplay-spec.md` (30 min)

The Phaser port needs a target. Without a written spec, "feel" drifts subtly during reimplementation.

Create `docs/gameplay-spec.md` with these sections, copying values directly from `index.html`:

- **Scoring** — `PTS_STICK`, `PTS_BIG_STICK` (when merged), `PTS_BACK_WALL`, `PTS_IN_PIT`, `PTS_FRONT_WALL`, `PTS_MISS`. Include zone definitions (`ZONE_FRONT_WALL_MAX = 0.10`, `ZONE_BACK_WALL_MIN = 0.90`).
- **Meter** — `METER_CYCLE_TIME`, `METER_SPEED`, `SWEET_SPOT_WIDTH`, `SWEET_CENTER_MIN`, `SWEET_CENTER_MAX`, the per-stick speed ramp formula in `updateDifficulty()`.
- **Throw physics** — `THROW_MULT_MIN`, `THROW_MULT_MAX`, `THROW_DURATION`, `THROW_PEAK_RATIO`, the meter-to-power piecewise mapping.
- **Run** — `MISSES_PER_RUN`, lives HUD behavior.
- **Aspect** — `ASPECT_LANDSCAPE`, `ASPECT_PORTRAIT`, the `isPhoneLandscape` predicate.

Format: tables with `Constant | Value | What it controls`. Don't include implementation notes — values only. Phaser implementer will read the source for *how*; the spec exists to lock *what*.

## 6. (Optional) PWA manifest

Add `manifest.webmanifest` at root and link it in `<head>`:
```html
<link rel="manifest" href="/manifest.webmanifest">
```
Minimal contents:
```json
{
  "name": "Shovel Toss",
  "short_name": "ShovelToss",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e",
  "orientation": "any",
  "icons": [
    { "src": "/assets/favicon.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
Verify: Chrome DevTools → Application → Manifest shows no warnings. Skip if Capacitor wrap is the next priority — duplicates effort.

## 7. (Optional) Add one Umami event

Currently only pageviews are tracked. One throw-resolution event unlocks retention analysis without UI change.

In `index.html`, inside the throw-zone resolution block (around `index.html:1053`), add:
```js
if (window.umami) {
  umami.track('throw_complete', { zone, points: basePoints });
}
```
Don't add more events. One signal is enough for v1.

## 8. (Optional) Audio scaffold

If silence in v1 is *not* intentional: stub a single audio loader now so post-migration is plug-and-play.

- Create `assets/sfx/` (empty for now).
- Add a `sfx` module: `sfx.play('stick')`, `sfx.play('miss')`, `sfx.play('throw')` — no-ops that warn in dev if the file is missing.
- Wire calls into the throw-resolution block, but ship with placeholder/empty files so v1 stays silent.

If silence *is* intentional for v1, skip entirely.

## What NOT to do before v1

- Don't write tests — Phaser migration replaces the runtime.
- Don't refactor `index.html` — it's about to be deleted in the migration.
- Don't add accessibility features — payoff is post-Capacitor, not pre-v1.
- Don't add new gameplay (Big Stick branch, multipliers, new levels) — those are post-migration per the existing roadmap.

## Tagging

After items 1–5 land:

1. Update `CHANGELOG.md` with a `[1.0.0]` section. Lead with: "Stable release — full character roster, three levels, global leaderboard, Hall of Fame, settings menu."
2. Prepend a `v1.0.0` entry to `src/releaseNotes.js`. Headline suggestion: "Shovel Toss 1.0".
3. Bump `APP_VERSION_TAG` in `index.html` to `'v1.0.0'`.
4. Commit as `Release v1.0.0`.
5. `git tag v1.0.0`.
6. `git push origin main && git push origin v1.0.0`.

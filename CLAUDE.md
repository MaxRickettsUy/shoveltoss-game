# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```sh
npm run dev      # serve the game locally at http://localhost:3000 (or similar)
supabase start   # start local Supabase stack (requires Docker)
supabase stop    # stop local Supabase stack
supabase db reset          # wipe and reapply all migrations from scratch
supabase migration up      # apply new migrations without wiping data
supabase status            # print local URLs and keys
```

There are no build steps, no bundler, no test suite. The game is a single HTML file served statically.

---

## Architecture

### Single-file game

Almost all game logic lives in `index.html` inside one large `<script>` tag (line 304 to ~5155). This is intentional — the game targets plain-browser delivery with no build toolchain. Do not extract it into separate modules unless the entire architecture is being migrated (see `plans/phaser-migration/`).

### External modules (ES modules via `<script type="module">`)

- `src/config.js` — Supabase URL/key switching: production (`shoveltoss.ing`) vs. local (`127.0.0.1:54321`). Any non-production host uses the local stack automatically.
- `src/globalScores.js` — all Supabase calls, exposed as `window.globalScores`. Handles high scores, versus matches, leaderboard queries, and versus polling.
- `src/releaseNotes.js` — release notes array, exposed as `window.releaseNotes`. Prepend entries here for user-visible "What's New" content. No unseen-tracking or badge logic — the button is always visible.

### State machines

Two parallel state machines inside `index.html`:

**`RUN_STATE`** — top-level screen routing (what the player sees):
`USERNAME → HOME → SELECTING → LEVEL_SELECT → PLAYING → GAME_OVER → LEADERBOARD`
Plus: `HALL_OF_FAME`, `PLAYER_STATS`, `PLAYER_DETAIL`, `VERSUS_HOME`, `VERSUS_PLAYING`, `VERSUS_WAITING`, `VERSUS_RESULT`, `VERSUS_HISTORY`

**`STATE`** — throw lifecycle within a single throw:
`IDLE → CHARGING → FLYING → RESETTING → IDLE`

`gameLoop()` dispatches to a `draw*()` function based on `run.state`. The `update()` function only runs during `PLAYING` and `VERSUS_PLAYING`.

### Rendering

Canvas-based (`<canvas id="gameCanvas">`). All gameplay, menus, leaderboards, and overlays are drawn directly via `ctx`. The HTML landing screen (`#landing`) is a separate DOM overlay shown/hidden via `data-state="visible|hidden|showing"` transitions — it sits on top of the canvas for the home screen only.

### Character sprites

Each character in `CHARACTERS[]` has a `hero.png` (portrait art) and `sprite-sheet.png` (3-frame horizontal strip: idle / charging / throwing). Frame width is `naturalWidth / 3`. The `Lil Italy` level mirrors the character horizontally.

### Versus mode

Async multiplayer via Supabase `matches` table. A match progresses through statuses: `pending → playing → complete`. `globalScores.createDirectChallenge()` creates a match; `submitMatchScore()` writes the player's score and marks complete when both sides are done. The client polls every `VERSUS_POLL_MS` (30 s) via `startVersusPolling()`.

Score submission to `high_scores` is **production-only** (blocked on non-prod hosts). Versus match writes work on local.

### Supabase tables

- `public.high_scores` — global leaderboard. `name`, `score`, `character_name`, `created_at`.
- `public.matches` — versus challenges. `invite_code`, `challenger_name`, `recipient_name`, `challenger_score`, `recipient_score`, `status`, `expires_at`, `level_id`, `challenger_character_id`, `recipient_character_id`.

### Key constants (all in `index.html`)

| Constant | Purpose |
|---|---|
| `APP_VERSION_TAG` | Version string shown in UI and release notes. Update both here and in `src/releaseNotes.js` when releasing. |
| `MISSES_PER_RUN` | Lives per run (3) |
| `VERSUS_THROWS_PER_PLAYER` | Throws per versus match (9) |
| `THROW_DURATION` | Seconds per throw arc (0.6) |
| `SWEET_SPOT_CENTER` | Center of the sweet spot on the meter (0.50) |
| `USERNAME_KEY / SETTINGS_KEY` | `localStorage` keys for player name and settings |

### localStorage

- `shoveltoss.username` — player name
- `shoveltoss.settings` — `{ meterPosition, hideHowToPlay, hideVersusHowToPlay }`
- `shoveltoss.challengesSentToday` — daily challenge rate-limiting

---

## Development workflow

This repo uses a planner/reviewer (Opus) + implementer (Sonnet) model described in `WORKFLOW.md`:

1. Opus writes a single-feature plan to `/plans/<feature>.md`
2. Sonnet implements only that feature, minimal diff
3. Opus reviews the git diff against the plan (PASS/FAIL)
4. Completed plans are deleted or archived to `/plans/archive/`

Plans in `/plans/` are temporary artifacts, not living documents. Do not treat them as authoritative after implementation.

---

## Assets

- `assets/character/<id>/hero.png` — portrait for character select
- `assets/character/<id>/sprite-sheet.png` — 3-frame horizontal sprite strip
- `assets/level/<id>.png` — level backgrounds
- `assets/pit.png` / `assets/pit-left.png` — pit imagery (right-facing and left-facing)
- Fonts: `assets/fonts/bungee-regular.woff2`, `assets/fonts/archivo-regular.woff2`, `assets/fonts/archivo-bold.woff2`

Adding a character: add an entry to `CHARACTERS[]` in `index.html`. Add to `CHAMPION_IDS`, `NEW_CHARACTER_IDS`, or `LADY_CHARACTER_IDS` as appropriate.

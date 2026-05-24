# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```sh
npm run dev        # Vite dev server at http://localhost:3000 (strict port)
npm run build      # Vite production build into dist/
npm run preview    # serve the built dist/ locally
npm run lint       # ESLint (flat config, typescript-eslint)
npm run typecheck  # tsc --noEmit

supabase start     # start local Supabase stack (requires Docker)
supabase stop      # stop local Supabase stack
supabase db reset          # wipe and reapply all migrations from scratch
supabase migration up      # apply new migrations without wiping data
supabase status            # print local URLs and keys
```

There is no test suite. The game is built with Vite from TypeScript sources in `src/`.

---

## Architecture

The game is a **Phaser 4** app written in **TypeScript**, bundled by **Vite**. The
single-file canvas implementation that previously lived in `index.html` was fully
migrated to Phaser scenes (see git history / `plans/phaser-migration/`).

`index.html` is now just a Vite entry shell: it defines fonts and a `#game-root`
container, then loads `/src/main.ts` as a module. Do not put game logic back into it.

### Entry point

`src/main.ts` constructs the `Phaser.Game` with a `RESIZE` scale mode parented to
`#game-root`, and registers every scene. The first scene in the list (`BootScene`)
runs first.

### Scenes (`src/scenes/`)

Each screen is a Phaser scene; scene transitions (`this.scene.start(...)` /
`this.scene.launch(...)`) replace the old `RUN_STATE` enum.

- `BootScene` — preload assets, then route to username/home.
- `UsernameScene`, `HomeScene` — name entry and main menu.
- `CharacterSelectScene`, `LevelSelectScene` — pre-game selection.
- `GameScene` — solo gameplay; `VersusGameScene` — versus gameplay.
- `HUDScene` — overlaid HUD (run on top of the active game scene).
- `GameOverScene`, `LeaderboardScene`, `HallOfFameScene`, `PlayerStatsScene`,
  `PlayerDetailScene` — post-run and stats screens.
- `VersusHomeScene`, `VersusWaitingScene`, `VersusResultScene`, `VersusHistoryScene`
  — versus flow screens.
- `OverlayScene` — modal overlays (`whatsNew`, `settings`, `versusHowTo`).
- `helpers.ts` — shared scene helpers.

### Game logic (`src/game/`)

- `constants.ts` — all gameplay/tuning constants, the `THEME` palette, `STORAGE_KEYS`,
  and `DEFAULT_SETTINGS` (see Key constants below).
- `types.ts` — shared types, including `RegistryState` (the shape of cross-scene state).
- `state.ts` — typed wrappers over Phaser's `game.registry` for shared state:
  `getRegistryValue` / `setRegistryValue` / `onRegistryChange` / `offRegistryChange`.
  Cross-scene state (username, selected character/level, score, misses, active match,
  settings) lives in the registry, not in module globals.
- `throw.ts` — throw lifecycle / physics (charge → fly → land → reset).
- `characters.ts` — `CHARACTERS[]` and the `CHAMPION_IDS` / `NEW_CHARACTER_IDS` /
  `LADY_CHARACTER_IDS` sets.
- `levels.ts` — level definitions.
- `storage.ts` — `localStorage` read/write.
- `versusPoller.ts`, `versusRateLimit.ts` — versus polling and daily challenge limits.

### UI (`src/ui/`)

Reusable Phaser UI primitives: `Button.ts`, `List.ts`, `Meter.ts`, and `theme.ts`.

### External integration modules

- `src/config.ts` — Supabase URL/key switching: production (`shoveltoss.ing`) vs. local
  (`127.0.0.1:54321`). Any non-production host uses the local stack automatically.
- `src/globalScores.ts` — all Supabase calls, exported as `globalScores`. Handles high
  scores, versus matches (`createDirectChallenge`, `submitMatchScore`), leaderboard
  queries, and versus polling.
- `src/releaseNotes.ts` — release notes; assigns `window.releaseNotes`. Prepend entries
  here for user-visible "What's New" content. No unseen-tracking or badge logic — the
  button is always visible.

### Character sprites

Each character in `CHARACTERS[]` has a `hero.png` (portrait art) and `sprite-sheet.png`
(3-frame horizontal strip: idle / charging / throwing). Frame dimensions are declared
explicitly per entry (`frameWidth`, `frameHeight`). The `Lil Italy` level mirrors the
character horizontally.

### Versus mode

Async multiplayer via Supabase `matches` table. A match progresses through statuses:
`pending → playing → complete`. `globalScores.createDirectChallenge()` creates a match;
`submitMatchScore()` writes the player's score and marks complete when both sides are
done. The client polls every `VERSUS_POLL_MS` (30 s).

Score submission to `high_scores` is **production-only** (blocked on non-prod hosts).
Versus match writes work on local.

### Supabase tables

- `public.high_scores` — global leaderboard. `name`, `score`, `character_name`, `created_at`.
- `public.matches` — versus challenges. `invite_code`, `challenger_name`, `recipient_name`,
  `challenger_score`, `recipient_score`, `status`, `expires_at`, `level_id`,
  `challenger_character_id`, `recipient_character_id`.

### Key constants (`src/game/constants.ts`)

| Constant | Purpose |
|---|---|
| `APP_VERSION_TAG` | Version string shown in UI and release notes. Update both here and in `src/releaseNotes.ts` when releasing. |
| `MISSES_PER_RUN` | Lives per run (3) |
| `VERSUS_THROWS_PER_PLAYER` | Throws per versus match (9) |
| `THROW_DURATION` | Seconds per throw arc (0.6) |
| `SWEET_SPOT_CENTER` | Center of the sweet spot on the meter (0.50) |
| `STORAGE_KEYS` | `localStorage` keys for username, settings, challenge count, seen results, in-progress match |

### localStorage (`STORAGE_KEYS`)

- `shoveltoss.username` — player name
- `shoveltoss.settings` — `{ meterPosition, hideHowToPlay, hideVersusHowToPlay }`
- `shoveltoss.challengesSentToday` — daily challenge rate-limiting
- `shoveltoss.versus.seenResults` — versus results already viewed
- `shoveltoss.versus.inProgressMatch` — resumable in-progress versus match

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

Adding a character: add an entry to `CHARACTERS[]` in `src/game/characters.ts`. Add to `CHAMPION_IDS`, `NEW_CHARACTER_IDS`, or `LADY_CHARACTER_IDS` as appropriate.
</content>
</invoke>

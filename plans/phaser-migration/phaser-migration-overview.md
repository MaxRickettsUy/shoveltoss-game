# Phaser Migration — Overview

This is the binding document for the Phaser migration. All slice plans (`phaser-migration-slice-*.md`) must conform to the choices locked in here. If a slice needs to deviate, the overview is updated first.

## Goal

Rebuild Shovel Toss as a Phaser-native game while keeping the existing assets, look & feel, gameplay constants, Supabase backend, and `localStorage` contract. The migration is a structural rewrite, not a port: Phaser owns the boot, the loop, input, rendering, and scene routing from the first slice.

## Locked-in Choices

### Engine
- **Phaser 4** (`phaser@^4`). Phaser 4 is ESM-first and ships TS types; we consume the ESM build directly.
- If at slice-1 implementation time Phaser 4 is not yet on a stable release the project is willing to depend on, the developer must stop and surface that to the architect rather than silently falling back to Phaser 3.

### Language & tooling
- **TypeScript (ESM).** All source is `.ts`, including the existing `config.js`, `globalScores.js`, and `releaseNotes.js` which are converted as part of Slice 1. Phaser 4 ships its own type definitions; no separate `@types/phaser` is needed.
- **Vite** as the dev server and production bundler. Vite transpiles `.ts` via esbuild with no extra config — this applies to `legacy.html`'s scripts too, so the legacy game continues to work after the rename. Type-checking is a separate `npm run typecheck` step that calls `tsc --noEmit`.
- **`tsconfig.json`** with `strict: true`, `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`, `noEmit: true`, `isolatedModules: true`, `esModuleInterop: true`, `skipLibCheck: true`. Strict mode is on from the start — turning it on later is much harder.
- No test runner is added.
- No linter or formatter is added beyond what already exists.

### Repo layout (new)
```
index.html                    # Vite entry, mounts Phaser
legacy.html                   # The pre-migration game, preserved verbatim until cutover
tsconfig.json                 # strict TS config
vite.config.ts                # Vite dev server + build config
src/
  main.ts                     # Boots Phaser.Game with the scene list
  config.ts                   # Supabase URL/key switching (converted from .js in Slice 1)
  globalScores.ts             # Supabase data access (converted from .js in Slice 1)
  releaseNotes.ts             # Release notes array (converted from .js in Slice 1)
  game/
    constants.ts              # APP_VERSION_TAG, MISSES_PER_RUN, VERSUS_THROWS_PER_PLAYER,
                              # THROW_DURATION, SWEET_SPOT_CENTER, STORAGE_KEYS, etc.
    characters.ts             # CHARACTERS[], CHAMPION_IDS, NEW_CHARACTER_IDS, LADY_CHARACTER_IDS
    levels.ts                 # level metadata
    state.ts                  # registry helpers (get/set/onChange) over Phaser.Game.registry,
                              # plus the RegistryState type alias keyed by registry key
    storage.ts                # localStorage helpers for the shoveltoss.* keys
    types.ts                  # shared types: SceneInitData, ThrowOutcome, MatchSnapshot, etc.
  scenes/
    BootScene.ts              # preload all assets, kick off first screen
    HomeScene.ts
    UsernameScene.ts
    CharacterSelectScene.ts
    LevelSelectScene.ts
    GameScene.ts              # the throw mechanic; PLAYING + VERSUS_PLAYING both run it
    GameOverScene.ts
    LeaderboardScene.ts
    HallOfFameScene.ts
    PlayerStatsScene.ts
    PlayerDetailScene.ts
    VersusHomeScene.ts
    VersusWaitingScene.ts
    VersusResultScene.ts
    VersusHistoryScene.ts
    HUDScene.ts               # parallel scene rendered on top of GameScene
    OverlayScene.ts           # "What's New", confirm dialogs — sits above any scene
  ui/
    Button.ts                 # reusable Phaser button (text + hit area + hover/press)
    List.ts                   # scrollable list used by leaderboards / hall of fame / history
    Meter.ts                  # the timing meter component
```

All three existing modules are renamed and typed in Slice 1. `legacy.html`'s `<script>` references are updated to point at the new `.ts` paths; Vite's esbuild transpilation handles the legacy build transparently.

Legacy `index.html` is renamed to `legacy.html` and otherwise untouched during slices 1–4. The new `index.html` is Vite's entry.

### Scene topology and routing
- The Phaser `SceneManager` replaces the `RUN_STATE` switch. Transitions use `scene.start('NextScene', dataObject)` for hard transitions and `scene.launch('OverlayScene', dataObject)` for overlays that don't unload the underlying scene.
- `HUDScene` runs in parallel with `GameScene` via `scene.launch('HUDScene', { source: 'PLAYING' | 'VERSUS_PLAYING' })`. This replaces the legacy "HUD drawn into the same canvas" pattern.
- `GameScene` is the single owner of the throw lifecycle (`IDLE → CHARGING → FLYING → RESETTING`). It is reused for both `PLAYING` and `VERSUS_PLAYING`; the caller passes `{ mode: 'solo' | 'versus', matchId?, ... }` as scene init data.
- `OverlayScene` (release notes, confirmations) is always-on-top and launched/stopped on demand.

### Shared state (`Phaser.Game.registry`)
- The registry is the single cross-scene state store. Wrapped by `src/game/state.ts` for typed getters/setters (keyed by a `RegistryKey` union) and a small `onChange(key, fn)` helper.
- Keys (final names):
  - `username` (string)
  - `selectedCharacterId` (string)
  - `selectedLevelId` (string)
  - `settings` (object — meterPosition, hideHowToPlay, hideVersusHowToPlay)
  - `activeMatch` (object | null — current versus match, when in versus flow)
- Persistence: `username` and `settings` are mirrored to `localStorage` under the existing `shoveltoss.username` and `shoveltoss.settings` keys (unchanged contract).

### Asset loading
- All assets load in `BootScene.preload()` using Phaser's Loader.
- Image keys mirror the existing file paths: `level:<id>`, `character:<id>:hero`, `character:<id>:sheet`, `pit`, `pit-left`.
- Sprite sheets register with `this.load.spritesheet(...)` using `frameWidth = naturalWidth / 3` per the existing convention. The `Lil Italy` level mirror behavior is implemented by flipping the sprite's `flipX`.
- Fonts: kept as `@font-face` declarations in `index.html` (Phaser respects browser font loading). `BootScene` waits on `document.fonts.ready` before transitioning out.

### Look & feel parity
- Same canvas dimensions and aspect ratio as today.
- Same fonts (Bungee, Archivo), same colors, same HUD positions, same character sprite frames.
- No new VFX, no new tweens beyond what the legacy game already does (charge animation, throw arc, sweet-spot indicator). Visual polish is explicitly out of scope.

### Supabase / data layer
- `src/globalScores.ts` is consumed by scenes via direct import (no longer needs `window.globalScores`, but the global is retained for back-compat in legacy.html until cutover).
- Production-only score submission to `high_scores` is preserved (the check in `globalScores.ts` already handles this).
- No schema changes.

### Versioning
- `APP_VERSION_TAG` moves to `src/game/constants.ts`.
- `src/releaseNotes.ts` continues to be the source of truth for the "What's New" list.

### Dev / deploy workflow
- `npm run dev` → `vite` (replaces the current static server). Both `index.html` (Phaser) and `legacy.html` (original) are reachable during migration; the homepage is `index.html`.
- `npm run build` → `vite build` → static output in `dist/`.
- `npm run typecheck` → `tsc --noEmit`. Runs separately from the build; not gated by CI in this repo, but expected to pass before merging each slice.
- `supabase start` / `supabase stop` / `supabase db reset` are unchanged.
- Production deploy (`shoveltoss.ing`) keeps serving the static bundle. During slices 1–4 the deploy can be pinned to `legacy.html` if the Phaser build is not yet feature-complete.

## What does NOT change

- Asset files in `assets/` (images, fonts).
- Supabase schema (`high_scores`, `matches`).
- `localStorage` key names (`shoveltoss.username`, `shoveltoss.settings`, `shoveltoss.challengesSentToday`).
- Gameplay constants (`MISSES_PER_RUN=3`, `VERSUS_THROWS_PER_PLAYER=9`, `THROW_DURATION=0.6`, `SWEET_SPOT_CENTER=0.50`).
- Production-only gating of score submission.

## Migration strategy

- **Slices 1–4** build the Phaser app alongside the legacy app. `legacy.html` remains the user-facing game on production until cutover.
- **Slice 5** swaps the production entry to the Phaser build and deletes `legacy.html` plus dead legacy code. Once Slice 5 lands, the migration is done.

## Slice list

1. `phaser-migration-slice-1-bootstrap.md` — Phaser 4 + Vite + BootScene + HomeScene placeholder; `legacy.html` preserved.
2. `phaser-migration-slice-2-gameplay-scene.md` — `GameScene` with meter, throw, scoring loop (no menus around it yet).
3. `phaser-migration-slice-3-meta-screens.md` — username, home, character select, level select, game over, leaderboards, hall of fame, player stats/detail.
4. `phaser-migration-slice-4-versus.md` — full versus flow (home, playing, waiting, result, history) reusing `GameScene`.
5. `phaser-migration-slice-5-cutover.md` — deploy swap, delete `legacy.html` and dead legacy code.

## Non-goals (entire migration)

- A test suite.
- Capacitor packaging (planned post-migration, see `project_roadmap_to_1_0.md`).
- New gameplay features or balance changes.
- Visual polish beyond legacy parity.
- Schema changes.
- Refactoring `globalScores.ts` beyond the `.js → .ts` conversion in Slice 1. The conversion adds types; it does not restructure the API.

# Phaser Migration — Plan Review Findings

Review of `phaser-migration-slice-{1..5}.md` against the stated goal:
> Implement the game in Phaser using best practices and leveraging Phaser's strengths — not a line-for-line port. Same assets and look & feel.

## Summary

The existing five-slice plan is not the right starting point. It treats Phaser as a swap-in renderer behind a feature flag while legacy `index.html` remains the source of truth for game state, input arbitration, and most screens. That is the opposite of "leveraging Phaser's strengths," and several concrete assumptions in the plans are incompatible with the project as it actually exists.

## Findings

### 1. Phaser version is unpinned
None of the five slices state a major version. The user has asked for Phaser 4 specifically; this needs to be locked into the plan so dependency, API, and tooling choices follow from it (Phaser 4 is ESM-first, TypeScript-first, and supports WebGPU — different from Phaser 3's distribution model).

### 2. Build tooling assumed but absent
- Slice 1 says "verify it builds with the existing bundler." There is no bundler. Per `CLAUDE.md`: "There are no build steps, no bundler, and no test suite."
- Slice 1 names `src/phaser/MainScene.ts`. The project is vanilla JS — there is no TypeScript toolchain.
- Phaser 4 is published as ESM with TS types; consuming it cleanly requires either (a) a bundler like Vite, (b) a CDN ESM import, or (c) a vendored `phaser.esm.js`. This is an unmade decision in every slice.

### 3. The slicing is a line-for-line port
Each slice keeps legacy code as the authoritative game and lets Phaser borrow one piece of work:

- Slice 2: "Tap → call the existing `resolveThrow(position)` function" (legacy owns logic, Phaser owns input + meter render).
- Slice 3: "On tween complete, invoke the legacy callback that finalizes score/lives state" (legacy owns scoring, Phaser owns animation).
- Slice 4: "Subscribe / read from the same game state that legacy HUD uses" (legacy owns state, Phaser owns text rendering).

This architecture — two state machines glued together by callbacks, gated by a `USE_PHASER` flag — guarantees a worse codebase than either pure path, and never lets Phaser own the loop. Phaser wants its own scenes, input system, update tick, and state. The migration should give it those from the start.

### 4. The plans cover ~30% of the game's screens
The five slices migrate: background, character, pit, meter, throw animation, and HUD. The game's full surface, per `CLAUDE.md` `RUN_STATE`:

> USERNAME → HOME → SELECTING → LEVEL_SELECT → PLAYING → GAME_OVER → LEADERBOARD
> Plus: HALL_OF_FAME, PLAYER_STATS, PLAYER_DETAIL, VERSUS_HOME, VERSUS_PLAYING, VERSUS_WAITING, VERSUS_RESULT, VERSUS_HISTORY

Missing from the plans: every menu, every leaderboard view, every versus screen, the `#landing` DOM overlay, the release-notes overlay, and the `RUN_STATE` machine itself. Slice 5 ("remove legacy renderer") is unreachable from where Slice 4 ends, because the legacy renderer is still drawing 9+ screens.

### 5. Cutover strategy is implicit and incomplete
Slice 5 assumes the legacy code can be deleted once HUD migrates, but with most screens still on legacy that step would break the app. There is no explicit story for: how the two builds coexist during migration, how the production deploy stays stable, how the existing `npm run dev` flow integrates with a Phaser dev server.

## Proposed Direction

Replace the current five-slice plan with a Phaser-native architecture, sliced by screen rather than by render layer.

**Architectural principles**
- One `Phaser.Game` boots on app load.
- Each `RUN_STATE` value becomes (or shares) a Phaser `Scene`. The `SceneManager` replaces the `RUN_STATE` switch.
- Gameplay throw lifecycle (`IDLE → CHARGING → FLYING → RESETTING`) lives inside `GameScene` as scene-local state, not a global.
- Shared cross-scene state lives on `Phaser.Game.registry` with a thin typed wrapper.
- `src/globalScores.js`, `src/config.js`, `src/releaseNotes.js` are retained semantically — they are data access, not rendering, and have no Phaser dependency. Slice 1 converts them to TypeScript without changing the API.
- Assets are unchanged. Phaser's Loader replaces the current ad-hoc image loading in a single `BootScene`.

**Tooling choice**
- Phaser 4 + Vite + TypeScript (strict mode).
- Existing `src/config.js`, `src/globalScores.js`, `src/releaseNotes.js` are converted to `.ts` as part of Slice 1, with full typing. Phaser 4 ships its own types.
- `npm run dev` switches to Vite's dev server; `npm run typecheck` runs `tsc --noEmit`; production builds to a static bundle that can deploy the same way as today.
- The legacy `index.html` stays alive on disk under a temporary path (e.g. `legacy.html`) until cutover, so we can side-by-side compare visuals during migration.

**New slicing (5 slices)**
1. **Bootstrap** — install Phaser 4 + Vite, create scene scaffold, `BootScene` preloads all assets, `HomeScene` shows a placeholder. New entry `index.html` (Vite-driven), legacy preserved at `legacy.html`.
2. **Core gameplay scene** — `GameScene` with meter, charge, throw, pit, scoring loop. One default character, one default level, no menus around it.
3. **Meta screens & leaderboards** — `UsernameScene`, `HomeScene`, `CharacterSelectScene`, `LevelSelectScene`, `GameOverScene`, `LeaderboardScene`, `HallOfFameScene`, `PlayerStatsScene`, `PlayerDetailScene`. Full single-player flow wired end-to-end.
4. **Versus mode** — `VersusHomeScene`, `VersusGameScene`, `VersusWaitingScene`, `VersusResultScene`, `VersusHistoryScene`. Reuses `GameScene` mechanics via composition.
5. **Cutover & cleanup** — replace deploy entry with the Phaser build; delete `legacy.html` and all legacy gameplay code; retire the side-by-side scaffolding.

Look & feel parity is the constant across all slices; same fonts, colors, character sprites, level art, pit asset, HUD layout.

## Next Steps

1. Write `phaser-migration-overview.md` locking in version, tooling, scene topology, shared services, and cutover strategy.
2. Rewrite the five slice plans against that overview using the architect plan format.
3. Move the old slice files out of the way (or overwrite them) so they cannot be picked up by the developer agent by mistake.

# Character Selection

## 1. GOAL
Replace the current "Tap to Start" ready screen with a tiled character selector. Tapping a tile sets the active character and starts the game using that character's sprite sheet for the rest of the page session.

## 2. CHANGE DESCRIPTION
- Add a new run state `SELECTING` that is the initial state on page load (replaces `READY` as the entry state).
- On `SELECTING`, render a grid of tiles, one per character, each showing `hero.png`.
- Tapping a tile loads that character's `sprite-sheet.png` into `characterImg`, then transitions to `READY` (existing "Tap to Start" behavior is preserved from there).
- Game Over still returns to `READY` (not back to `SELECTING`) — character persists until refresh.

## 3. EXPECTED EFFECT
- First screen on load is the character selector grid.
- After tile tap, the standard ready screen and gameplay flow run unchanged, using the chosen sprite sheet.
- Refreshing the page returns the user to the selector.

## 4. ASSET DISCOVERY / CHARACTER DATA MODEL
Hardcoded list (no directory scanning — keep loading explicit):

```js
const CHARACTERS = [
  { id: 'wagie',    hero: 'assets/character/wagie/hero.png',    sprite: 'assets/character/wagie/sprite-sheet.png' },
  { id: 'chef',     hero: 'assets/character/chef/hero.png',     sprite: 'assets/character/chef/sprite-sheet.png' },
  { id: 'chuggo',   hero: 'assets/character/chuggo/hero.png',   sprite: 'assets/character/chuggo/sprite-sheet.png' },
  { id: 'princess', hero: 'assets/character/princess/hero.png', sprite: 'assets/character/princess/sprite-sheet.png' },
  { id: 'shrek',    hero: 'assets/character/shrek/hero.png',    sprite: 'assets/character/shrek/sprite-sheet.png' }
];
```

Runtime state:
- `selectedCharacterId` (string | null) — null until selection.
- `heroImages` — `{ [id]: HTMLImageElement }`, all preloaded at startup for the selector grid.

## 5. SELECTION FLOW
1. Page load: `run.state = SELECTING`. Game loop calls `drawCharacterSelect()` instead of `drawReadyScreen()`.
2. Hero images preload at startup; tiles draw progressively as each loads (no blocking spinner).
3. `onPressStart()` while in `SELECTING`: hit-test the tap against tile rects; on hit:
   - Set `selectedCharacterId`.
   - Reset `characterReady = false`, set `characterImg.src = CHARACTERS[i].sprite`. Existing `onload` recomputes `CHARACTER_FRAME_W/H` and flips `characterReady`.
   - Set `run.state = READY`.
4. Tap on `READY` continues into `PLAYING` (existing logic unchanged).
5. Game Over returns to `READY` (existing `resetRun()` unchanged) — selector is not shown again.

## 6. GAME INTEGRATION POINTS
- `RUN_STATE` enum: add `SELECTING: 'selecting'`.
- `run.state` initial value: `RUN_STATE.SELECTING` (was `READY`).
- Remove the hardcoded `characterImg.src = 'assets/character/wagie/sprite-sheet.png';` initial assignment — sprite is set on tile tap.
- `gameLoop()`: add `if (run.state === RUN_STATE.SELECTING) drawCharacterSelect(timestamp);` branch before the existing `READY` branch.
- `onPressStart()`: prepend a `SELECTING` branch handling tile hit-tests; existing branches untouched.
- No changes to `update()`, physics, scoring, layout math, or HUD.

## 7. IMPLEMENTATION STEPS (max 5)
1. Add `CHARACTERS` array, `selectedCharacterId`, and `heroImages` map near the existing `characterImg` declaration. Preload each `hero.png` into `heroImages[id]`. Remove the initial `characterImg.src` assignment.
2. Add `RUN_STATE.SELECTING` and change `run.state` initial value to `SELECTING`.
3. Add `drawCharacterSelect(timestamp)`: clears canvas, draws title ("Choose your fighter" or similar), computes a responsive grid (e.g., 2 columns portrait / 3+ columns landscape) of tile rects sized to fit canvas with padding, draws each tile background + `heroImages[id]` (cover-fit inside tile, fallback rect if not loaded) + label. Store the latest tile rects in a module-scope `tileRects` array `[{ id, x, y, w, h }, ...]` for hit-testing.
4. In `onPressStart()`, branch on `run.state === RUN_STATE.SELECTING`: read the latest pointer position (add coordinate capture in the existing touch/mouse handlers), hit-test against `tileRects`, on hit set `selectedCharacterId`, set `characterReady = false`, `characterImg.src = CHARACTERS[hit].sprite`, then `run.state = RUN_STATE.READY`. Return early.
5. In `gameLoop()`, add the `SELECTING` branch calling `drawCharacterSelect(timestamp)` before the existing `READY` branch.

## 8. ROLLBACK STRATEGY
Revert the commit. Selection logic is isolated to: the new constants/state, one new draw function, one branch in `gameLoop`, one branch in `onPressStart`, and one removed init line. No gameplay code is modified.

## 9. NON-GOALS
- No localStorage, cookies, URL params, or any persistence across refresh.
- No backend, network, or directory listing for asset discovery.
- No character stats, abilities, or per-character gameplay tuning.
- No animations, transitions, or sound effects on selection.
- No "back to selector" button from Game Over.
- No changes to gameplay, physics, scoring, HUD, layout, or background rendering.

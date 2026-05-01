# Feature Plan: Level Select Screen

## Scope

Add a level-select screen between character select and gameplay. Two levels: `house` and `lil-italy`. Selection persists for the session (until user returns to character select or refreshes). All changes inside `index.html`.

## Assets

- Existing: `assets/house.png`, `assets/lil-italy.png`
- No new assets required.

## Implementation Steps

### Step 1 — Define LEVELS + selection state

Near `CHARACTERS` (index.html:60–70), add:

```js
const LEVELS = [
  { id: 'house',     label: 'The House',  background: 'assets/house.png' },
  { id: 'lil-italy', label: 'Lil Italy',  background: 'assets/lil-italy.png' },
];
let selectedLevelId = null;
let levelTileRects = [];
```

### Step 2 — Preload level backgrounds

Replace the single `backgroundImg` block (index.html:59–63) with a per-level image map:

```js
const levelImages = {};
let backgroundReady = false;
let backgroundImg = null;
LEVELS.forEach(l => {
  const img = new Image();
  img.src = l.background;
  levelImages[l.id] = img;
});
```

All existing `backgroundImg` / `backgroundReady` references (e.g., index.html:849–854) keep working — only the assignment site changes (Step 5).

### Step 3 — Add LEVEL_SELECT run state

In `RUN_STATE` (index.html:161), add:

```js
const RUN_STATE = { USERNAME: 'username', SELECTING: 'selecting', LEVEL_SELECT: 'level_select', PLAYING: 'playing', GAME_OVER: 'game_over', LEADERBOARD: 'leaderboard' };
```

### Step 4 — Route character select to level select

In `chooseCharacter()` (index.html:528–533), replace `resetRun()` with:

```js
function chooseCharacter(index) {
  selectedCharacterId = CHARACTERS[index].id;
  characterReady = false;
  characterImg.src = CHARACTERS[index].sprite;
  run.state = RUN_STATE.LEVEL_SELECT;
  levelTileRects = [];
}
```

### Step 5 — Add chooseLevel()

Next to `chooseCharacter()`:

```js
function chooseLevel(index) {
  selectedLevelId = LEVELS[index].id;
  backgroundImg = levelImages[selectedLevelId];
  backgroundReady = backgroundImg.complete && backgroundImg.naturalWidth > 0;
  if (!backgroundReady) {
    backgroundImg.onload = () => { backgroundReady = true; };
  }
  resetRun();
}
```

### Step 6 — Draw level select screen

Add `drawLevelSelect(timestamp)` modeled on `drawCharacterSelect()` (index.html:1011) but simpler:
- Title: `'SHOVEL TOSS'` (same size logic).
- Subtitle: `'Choose your level'`.
- Two large tiles, side-by-side in landscape, stacked in portrait.
- Each tile renders the level background (cover-fit, clipped to rounded rect) with the label centered at the bottom over a translucent strip.
- Add a `Back` button at the bottom that returns to `RUN_STATE.SELECTING` (mirrors `selectLeaderboardRect` style).
- Push hit rects into `levelTileRects` and `levelBackRect`.

No scroll needed — only two tiles.

### Step 7 — Wire input for LEVEL_SELECT

In `onPressStart()` (index.html:535), add a branch BEFORE the existing `SELECTING` branch:

```js
if (run.state === RUN_STATE.LEVEL_SELECT) {
  if (levelBackRect && pointerInRect(levelBackRect)) {
    run.state = RUN_STATE.SELECTING;
    levelTileRects = [];
    levelBackRect = null;
    return;
  }
  for (let i = 0; i < levelTileRects.length; i++) {
    const tile = levelTileRects[i];
    if (pointerInRect(tile)) { chooseLevel(i); return; }
  }
  return;
}
```

(`pointerInRect` is shorthand — inline the existing rect-check style used elsewhere.)

### Step 8 — Wire game loop

In the render dispatch (index.html:722–733), add:

```js
} else if (run.state === RUN_STATE.LEVEL_SELECT) {
  drawLevelSelect(timestamp);
```

### Step 9 — Game-over "Change character" returns to SELECTING

No change needed at index.html:572 — returning to SELECTING already discards the level choice flow naturally. Player will re-pick character → re-pick level.

### Step 10 — Default state on load

Leave the initial state at index.html:171 unchanged (`SELECTING` or `USERNAME`). `selectedLevelId` starts `null`; `backgroundImg` is `null` until a level is picked. The PLAYING render guard at index.html:849 already checks `backgroundReady`, so no flash risk.

## Constraints

- Single file: `index.html`.
- No changes to gameplay, scoring, leaderboard, or pit logic.
- Level choice persists across runs within the session; cleared only by going back to character select.

## Edge Cases

- Background still loading when `chooseLevel` fires → `backgroundReady` flips true on load; PLAYING render already guards on `backgroundReady`.
- Going to leaderboard from LEVEL_SELECT is out of scope — `Leaderboard` button is only on the character-select and game-over screens.
- `Back` from LEVEL_SELECT clears `levelTileRects` so stale hit-rects don't trigger on the next paint.
- No persistence to `localStorage` — refresh resets level choice (per spec).

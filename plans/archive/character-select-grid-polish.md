# Feature Plan: Character Select Grid — Champion Badges + Larger Scrollable Tiles

## Scope

All changes inside `index.html`. Touches only `drawCharacterSelect()` and the SELECTING-state input path.

## Assets

- Existing: `assets/champion.png`
- Champion character IDs (exact match against `CHARACTERS[i].id`): `Buck`, `Wagie`, `Chef`, `Chuggo`

## Implementation Steps

### Step 1 — Load champion image + champion set

After the `heroImages` preload block (index.html:79–84), add:

```js
const championImg = new Image();
championImg.src = 'assets/champion.png';
const CHAMPION_IDS = new Set(['Buck', 'Wagie', 'Chef', 'Chuggo']);
```

And add scroll state next to `tileRects` (index.html:86):

```js
let charSelectScrollY = 0;
let charSelectGridTop = 0;
let charSelectGridBottom = 0;
```

### Step 2 — Replace tile sizing with fixed-size tiles

In `drawCharacterSelect()` replace lines 1066–1069 with:

```js
const targetTileW = Math.floor(Math.min(240, (canvas.width - pad * (cols + 1)) / cols));
const tileW = targetTileW;
const tileH = Math.floor(tileW * 1.25);
```

Keep existing `cols` / `rows` logic at 1061–1062 unchanged.

### Step 3 — Compute scroll region + clamp scroll

After tile sizing, before the draw loop:

```js
charSelectGridTop = topOffset + pad;
charSelectGridBottom = selectLeaderboardRect.y - pad;
const gridViewportH = charSelectGridBottom - charSelectGridTop;
const totalContentH = rows * tileH + (rows - 1) * pad;
const maxScroll = Math.max(0, totalContentH - gridViewportH);
charSelectScrollY = Math.max(0, Math.min(charSelectScrollY, maxScroll));
```

### Step 4 — Draw tiles inside a clipped, scrolled region

Wrap the existing `for (let i = 0; i < CHARACTERS.length; i++)` loop with:

```js
ctx.save();
ctx.beginPath();
ctx.rect(0, charSelectGridTop, canvas.width, gridViewportH);
ctx.clip();
// ... existing loop, but replace the `y` calc:
const y = charSelectGridTop + row * (tileH + pad) - charSelectScrollY;
// store post-scroll y in tileRects so existing hit-test still works
ctx.restore();
```

Center horizontally if content is narrower than canvas: replace `x` calc with:

```js
const gridW = cols * tileW + (cols - 1) * pad;
const gridX = Math.floor((canvas.width - gridW) / 2);
const x = gridX + col * (tileW + pad);
```

### Step 5 — Draw champion badge

Inside the tile loop, after the hero image draws and before the label (around index.html:1108):

```js
if (CHAMPION_IDS.has(CHARACTERS[i].id) && championImg.complete && championImg.naturalWidth > 0) {
  const badgeSize = Math.floor(tileW * 0.28);
  ctx.drawImage(championImg, x + tileW - badgeSize - 6, y + 6, badgeSize, badgeSize);
}
```

### Step 6 — Hit-test guard + scroll input

- In `onPressStart()` tile loop (index.html:539–546), skip a tile if it's outside the visible grid:

```js
if (tile.y + tile.h <= charSelectGridTop || tile.y >= charSelectGridBottom) continue;
```

- Register wheel listener on `canvas` (next to existing pointer listeners):

```js
canvas.addEventListener('wheel', (e) => {
  if (run.state !== RUN_STATE.SELECTING) return;
  charSelectScrollY += e.deltaY;
  e.preventDefault();
}, { passive: false });
```

- Add touch/pointer drag-to-scroll: in the existing `pointerdown`/`pointermove` handlers, when `run.state === RUN_STATE.SELECTING` and pointer started inside `[charSelectGridTop, charSelectGridBottom]`, accumulate `dy` between moves into `charSelectScrollY -= dy`. If total movement exceeds `8px`, mark the gesture as a scroll and suppress the tap-to-select in `onPressEnd`/`onPressStart`.

### Step 7 — Reset scroll on entering SELECTING

Set `charSelectScrollY = 0;` at:

- index.html:561 (game-over → SELECTING transition)
- Any other site that assigns `run.state = RUN_STATE.SELECTING` (grep before edit)

## Constraints

- Single file: `index.html`.
- No new gameplay, scoring, or leaderboard logic.
- Existing `usernameNameRect` / `selectLeaderboardRect` hit-tests unchanged.

## Edge Cases

- `maxScroll === 0` → wheel/drag are no-ops.
- Phone landscape (1 row) → `maxScroll === 0` naturally; behavior unchanged.
- Outer clip prevents scrolled tiles from bleeding over title or Leaderboard button.
- Drag-vs-tap: 8px threshold prevents accidental selects while scrolling.

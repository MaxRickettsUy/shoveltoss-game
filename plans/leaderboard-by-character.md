# Feature Plan: Per-Character Leaderboard — Card Flip + Top-5 Preview + Dropdown Filter

## Scope

Three coupled changes to per-character score discovery:

1. Each character card on the character-select grid gets a small "info" button (bottom-right corner) that flips the card to show that character's top 5 scores.
2. The flipped card has a `Leaderboard ›` button at the bottom that opens the full leaderboard pre-filtered to that character.
3. The leaderboard screen replaces the existing pill row with a single character dropdown (DOM `<select>` overlay).

`topN(n, opts)` already accepts `{ characterName }` from the prior iteration of this feature — that part stays.

## Files Touched

- `src/globalScores.js` (no signature change; already supports filter)
- `index.html`

## Implementation Steps

### Step 1 — Per-card flip state + cache

Near other character-select state (around index.html:118):

```js
let flippedCardId = null;          // CHARACTERS[i].id currently showing back side, or null
let flippedCardRows = [];          // top 5 rows for flippedCardId
let flippedCardStatus = 'idle';    // 'idle' | 'loading' | 'ready' | 'error'
let flippedCardError = '';
const flippedCardCache = new Map();// id -> { rows, fetchedAt }
let cardFlipBtnRects = [];         // hit rects for the corner flip toggle (per card)
let cardBackLeaderboardRect = null;// "Leaderboard ›" CTA on the back of the flipped card
```

Reset on character-select entry: in places that set `run.state = RUN_STATE.SELECTING` (existing reset sites + at the top of `drawCharacterSelect()` after the rect arrays are cleared), set `flippedCardId = null;`.

### Step 2 — Flip toggle button per card

In `drawCharacterSelect()` tile loop (around index.html:1100+, after the hero image draws and before the label), draw a small circular "i" button in the bottom-right corner of every card:

```js
const flipBtnSize = Math.max(22, Math.floor(tileW * 0.18));
const flipBtnX = x + tileW - flipBtnSize - 6;
const flipBtnY = y + tileH - flipBtnSize - 6;
ctx.fillStyle = 'rgba(0,0,0,0.55)';
ctx.beginPath();
ctx.arc(flipBtnX + flipBtnSize/2, flipBtnY + flipBtnSize/2, flipBtnSize/2, 0, Math.PI * 2);
ctx.fill();
drawText(flippedCardId === CHARACTERS[i].id ? '×' : 'i',
  flipBtnX + flipBtnSize/2, flipBtnY + flipBtnSize * 0.72,
  flipBtnSize * 0.6, '#ffffff', 'center', true);
cardFlipBtnRects.push({
  id: CHARACTERS[i].id,
  x: flipBtnX, y: flipBtnY, w: flipBtnSize, h: flipBtnSize
});
```

Clear `cardFlipBtnRects = [];` at the top of the loop iteration block (where `tileRects = []` is reset).

### Step 3 — Render back side when this card is flipped

Inside the same tile loop, replace the front-side draw (hero image + champion plaque + label) with a branch:

```js
if (flippedCardId === CHARACTERS[i].id) {
  drawCardBack(x, y, tileW, tileH, CHARACTERS[i]);
} else {
  // ...existing front-side draws (hero, champion plaque, label)...
}
```

Add `drawCardBack(x, y, w, h, character)`:
- Solid background + border (same rounded-rect style as front).
- Title: `${character.id}` at top.
- If `flippedCardStatus === 'loading'`: centered "Loading…" text.
- If `'error'`: centered "Offline" text.
- If `'ready'`:
  - If `flippedCardRows.length === 0`: "No scores yet".
  - Else: numbered list `1. ${name} — ${score}` (5 rows max).
- Bottom: `Leaderboard ›` button. Push to `cardBackLeaderboardRect` with `{ x, y, w, h, characterId }`. Use existing `drawButton`.

### Step 4 — Fetch top-5 lazily on flip

Add to `index.html`:

```js
async function fetchCardTop5(characterId) {
  const cached = flippedCardCache.get(characterId);
  if (cached && Date.now() - cached.fetchedAt < 60_000) {
    flippedCardRows = cached.rows;
    flippedCardStatus = 'ready';
    return;
  }
  flippedCardStatus = 'loading';
  flippedCardError = '';
  try {
    const rows = await window.globalScores.topN(5, { characterName: characterId });
    flippedCardRows = rows;
    flippedCardStatus = 'ready';
    flippedCardCache.set(characterId, { rows, fetchedAt: Date.now() });
  } catch {
    flippedCardRows = [];
    flippedCardStatus = 'error';
    flippedCardError = 'offline';
  }
}

function flipCard(characterId) {
  if (flippedCardId === characterId) {
    flippedCardId = null;
    return;
  }
  flippedCardId = characterId;
  fetchCardTop5(characterId);
}
```

60-second cache prevents thrash when toggling cards repeatedly.

### Step 5 — Wire flip + back-button click handlers

In `onPressStart()` SELECTING branch (around index.html:545), BEFORE the existing `tileRects` loop:

```js
// Card-back "Leaderboard ›" CTA
if (cardBackLeaderboardRect &&
    lastPointerX >= cardBackLeaderboardRect.x && lastPointerX <= cardBackLeaderboardRect.x + cardBackLeaderboardRect.w &&
    lastPointerY >= cardBackLeaderboardRect.y && lastPointerY <= cardBackLeaderboardRect.y + cardBackLeaderboardRect.h) {
  leaderboardCharacterFilter = cardBackLeaderboardRect.characterId;
  openLeaderboard(RUN_STATE.SELECTING);
  return;
}

// Flip toggle (per card corner)
for (const btn of cardFlipBtnRects) {
  if (lastPointerX >= btn.x && lastPointerX <= btn.x + btn.w &&
      lastPointerY >= btn.y && lastPointerY <= btn.y + btn.h) {
    flipCard(btn.id);
    return;
  }
}
```

Then, in the existing `tileRects` loop, skip selection when the tile in question is currently flipped — the front of a flipped card is hidden, so tapping the back area should NOT pick the character:

```js
if (flippedCardId === tile.id) continue;
```

### Step 6 — Modify `openLeaderboard` to preserve a pre-set filter

Currently `openLeaderboard()` resets `leaderboardCharacterFilter = null;`. Change it so the reset only fires when the open is NOT pre-filtered:

```js
function openLeaderboard(fromState = run.state, preserveFilter = false) {
  run.lastStateBeforeLeaderboard = fromState === RUN_STATE.LEADERBOARD
    ? run.lastStateBeforeLeaderboard
    : fromState;
  run.state = RUN_STATE.LEADERBOARD;
  leaderboardScrollY = 0;
  if (!preserveFilter) leaderboardCharacterFilter = null;
  fetchGlobalLeaderboard();
}
```

In Step 5, the card-back CTA call becomes:

```js
openLeaderboard(RUN_STATE.SELECTING, true);
```

Other callers stay unchanged (default `preserveFilter = false`).

### Step 7 — Replace pill row with a DOM `<select>` dropdown

Delete the entire pill-row block in `drawLeaderboard()` (the `pillFontSize` / `pillOptions` / `leaderboardCharacterFilterRects` build, the clipped pill draw, and the `listTop = pillY + pillH + pad` shift).

Delete pill drag handlers and state:
- `leaderboardPillDrag*` variables and functions.
- `leaderboardPillRow*` variables.
- `isInLeaderboardPillRow` and its calls in pointer/wheel handlers.
- `leaderboardCharacterFilterRects` reads.

Keep `leaderboardCharacterFilter` state.

Add a DOM overlay (mirrors existing `openUsernameOverlay` pattern). Mount when entering LEADERBOARD; unmount on close/state-change. Position absolutely over the canvas:

```js
let leaderboardFilterSelectEl = null;

function mountLeaderboardFilterSelect() {
  if (leaderboardFilterSelectEl) return;
  const select = document.createElement('select');
  select.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:900;padding:6px 10px;font:14px sans-serif;background:#1a1a2e;color:#fff;border:1px solid #5555aa;border-radius:6px;';
  const all = document.createElement('option');
  all.value = ''; all.textContent = 'All Characters';
  select.appendChild(all);
  CHARACTERS.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.id;
    select.appendChild(opt);
  });
  select.value = leaderboardCharacterFilter || '';
  select.addEventListener('change', () => {
    leaderboardCharacterFilter = select.value || null;
    leaderboardScrollY = 0;
    fetchGlobalLeaderboard();
  });
  document.body.appendChild(select);
  leaderboardFilterSelectEl = select;
}

function unmountLeaderboardFilterSelect() {
  if (!leaderboardFilterSelectEl) return;
  leaderboardFilterSelectEl.remove();
  leaderboardFilterSelectEl = null;
}
```

Call `mountLeaderboardFilterSelect()` at the end of `openLeaderboard()` (so the `<select>` reflects the pre-set filter from the card-back CTA path). Call `unmountLeaderboardFilterSelect()` in `closeLeaderboard()`. Adjust `listTop` to a small fixed offset since the dropdown is no longer drawn on canvas (it's a DOM overlay above):

```js
const listTop = bannerY + bannerH + pad;
```

(reverts to pre-pill-row positioning).

## Constraints

- Card flip is local UX only — does not change run state or reset selection.
- Flipped state persists only on the character-select screen; closing the screen (entering LEVEL_SELECT, etc.) clears `flippedCardId`.
- Top-5 cache TTL = 60 seconds; recently-set scores by the same player may not appear immediately.
- DOM `<select>` is uncontrolled by canvas scaling — keep it small and top-centered to avoid layout battles.
- `topN()` signature unchanged from prior shipped version.

## Edge Cases

- User flips two cards in quick succession before the first fetch completes: latest `fetchCardTop5` wins (status overwritten); abort logic not needed at this scale.
- Character has no scores yet: back side renders "No scores yet"; `Leaderboard ›` button still works (filtered view also empty).
- Grid scroll while a card is flipped: front-side coords still scroll normally; back side moves with the tile.
- Tap on flipped card's body (not the back-leaderboard button, not the "×" close) does nothing — no selection, no toggle. To close, tap the corner "×" again. Acceptable.
- Pre-filtered leaderboard from card-back: dropdown reflects the filter. Switching dropdown to "All Characters" clears the filter.

## Out of Scope

- Flip animation (CSS 3D transform style) — instant swap is fine.
- Showing the player's own rank on the back of the card.
- Persisting last-viewed dropdown selection across leaderboard opens.

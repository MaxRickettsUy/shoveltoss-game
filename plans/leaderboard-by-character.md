# Feature Plan: Per-Character Leaderboard

## Scope

Filter the leaderboard by character. Schema already stores `character_name`, so no migration is required. UI adds character pills above the leaderboard list.

## Files Touched

- `src/globalScores.js`
- `index.html`

## Implementation Steps

### Step 1 — Update `topN()` to accept optional `characterName` filter

In `src/globalScores.js`:

```js
async topN(n = 100, opts = {}) {
  let query = getClient()
    .from('high_scores')
    .select('id, name, character_name, score, created_at');
  if (opts.characterName) {
    query = query.eq('character_name', opts.characterName);
  }
  const { data, error } = await query
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(n);
  if (error) throw error;
  return data || [];
}
```

(Use an options object so future filters — level, etc. — can compose without further signature churn.)

### Step 2 — Add filter state in `index.html`

Near other leaderboard state:

```js
let leaderboardCharacterFilter = null; // null = All, else exact CHARACTERS[i].id
let leaderboardCharacterFilterRects = [];
```

### Step 3 — Pass filter from `fetchGlobalLeaderboard()`

Around index.html:361:

```js
leaderboard.globalRows = await window.globalScores.topN(
  GLOBAL_SCORE_LIMIT,
  { characterName: leaderboardCharacterFilter }
);
```

### Step 4 — Draw filter pills above the list

In `drawLeaderboard()` (around index.html:1340), draw a horizontally-scrollable row of pills above the list:
- First pill: `All` (active when `leaderboardCharacterFilter === null`).
- Remaining pills: one per `CHARACTERS[i].id`.

Use existing `drawButton(rect, label, active)`. Wrap pill row in a clipped horizontal-scroll region (mirror the character-select grid scroll pattern at index.html ~1300+ if landscape overflow; for the typical case the pill row fits with smaller font).

Push hit rects into `leaderboardCharacterFilterRects` with shape `{ x, y, w, h, value }`.

When the filter is active, shrink the list region accordingly:

```js
const listTop = pillRow.bottom + pad;
```

### Step 5 — Wire pill click handler

In `onPressStart()` LEADERBOARD branch (around index.html:568), before the back-button check:

```js
for (const pill of leaderboardCharacterFilterRects) {
  if (lastPointerX >= pill.x && lastPointerX <= pill.x + pill.w &&
      lastPointerY >= pill.y && lastPointerY <= pill.y + pill.h) {
    leaderboardCharacterFilter = pill.value; // null or character id
    leaderboardScrollY = 0;
    fetchGlobalLeaderboard();
    return;
  }
}
```

### Step 6 — Reset filter on open/close

In `openLeaderboard()` (index.html:348) and `closeLeaderboard()` (index.html:357), set `leaderboardCharacterFilter = null;` so each open starts on "All".

### Step 7 — Horizontal-scroll the pill row (only if needed)

With the current roster (~12 characters), the pill row likely overflows on portrait phone. Apply the existing horizontal-scroll pattern: clip a pill-row region, track `pillRowScrollX`, handle wheel (`deltaX`) and drag — same approach as `charSelectScrollY` in `drawCharacterSelect()` but on the X axis. If the row fits, `maxScroll === 0` → no-op.

## Constraints

- No schema changes.
- Single client-side filter; submission unchanged.
- `topN()` signature change uses an options object — only one external caller (`fetchGlobalLeaderboard`); update accordingly.

## Edge Cases

- Filter applied to a character with zero scores: existing "No scores yet" path renders.
- Character later removed from the roster but still present in DB: pill list is built from current `CHARACTERS`, so the character won't appear as a pill — its rows are still visible under "All".
- Rank message after submit: existing `submitGlobalScore` continues to query `topN(100)` unfiltered — the rank is global. If per-character rank is desired, that's a separate change.

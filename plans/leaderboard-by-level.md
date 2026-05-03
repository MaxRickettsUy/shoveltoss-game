# Feature Plan: Per-Level Leaderboard

## Scope

Track which level a score was set on, and let users filter the leaderboard by level (`house`, `lil-italy`) or view all. Requires a schema migration since `level` is not currently stored.

## Files Touched / Added

- `supabase/migrations/<new-timestamp>_add_level_to_high_scores.sql` (new)
- `src/globalScores.js`
- `index.html`

## Implementation Steps

### Step 1 — Migration: add `level` column with backfill

New file `supabase/migrations/20260504000000_add_level_to_high_scores.sql`:

```sql
alter table public.high_scores
  add column if not exists level text not null default 'house'
  check (level in ('house', 'lil-italy'));

drop policy if exists "Anyone can insert valid high scores" on public.high_scores;
create policy "Anyone can insert valid high scores"
  on public.high_scores
  for insert
  with check (
    char_length(name) between 1 and 20
    and char_length(character_name) between 1 and 20
    and score > 0
    and level in ('house', 'lil-italy')
  );

create index if not exists high_scores_level_score_idx
  on public.high_scores (level, score desc, created_at asc, id asc);
```

Existing rows backfill to `'house'` via the column default. Apply via Supabase CLI / dashboard.

### Step 2 — Update `submit()` to accept and send `level`

In `src/globalScores.js`:

```js
async submit(name, score, characterName, levelId) {
  // ... prod gate unchanged ...
  const { data, error } = await getClient()
    .from('high_scores')
    .insert({
      name: cleanName(name),
      score,
      character_name: cleanCharacterName(characterName),
      level: cleanLevel(levelId)
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
},
```

Add helper at top of file:

```js
const VALID_LEVELS = new Set(['house', 'lil-italy']);
function cleanLevel(levelId) {
  return VALID_LEVELS.has(levelId) ? levelId : 'house';
}
```

### Step 3 — Update `topN()` to accept optional `levelId` filter

In `src/globalScores.js`:

```js
async topN(n = 100, levelId = null) {
  let query = getClient()
    .from('high_scores')
    .select('id, name, character_name, score, created_at, level');
  if (levelId && VALID_LEVELS.has(levelId)) {
    query = query.eq('level', levelId);
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

### Step 4 — Pass `selectedLevelId` from submit site

In `index.html` `submitGlobalScore()` (around index.html:402), pass the level:

```js
const insertedId = await window.globalScores.submit(name, score, characterName, selectedLevelId);
```

### Step 5 — Add level filter state + pills to leaderboard view

In `index.html`, add module state near other leaderboard state:

```js
let leaderboardLevelFilter = null; // null = All, otherwise 'house' | 'lil-italy'
let leaderboardLevelFilterRects = [];
```

Update `fetchGlobalLeaderboard()` (around index.html:361) to pass the filter:

```js
leaderboard.globalRows = await window.globalScores.topN(GLOBAL_SCORE_LIMIT, leaderboardLevelFilter);
```

In `drawLeaderboard()` (around index.html:1340), draw three pills above the list — `All`, `The House`, `Lil Italy`. Use the same `drawButton(rect, label, active)` helper used elsewhere. Push hit rects into `leaderboardLevelFilterRects`.

### Step 6 — Wire pill click handler

In `onPressStart()` LEADERBOARD branch (around index.html:568, before the existing back-button check), iterate `leaderboardLevelFilterRects`. On hit:

```js
leaderboardLevelFilter = pill.value; // null | 'house' | 'lil-italy'
leaderboardScrollY = 0;
fetchGlobalLeaderboard();
return;
```

### Step 7 — Reset filter on close

In `closeLeaderboard()` (around index.html:357) and `openLeaderboard()` (index.html:348), reset `leaderboardLevelFilter = null;` so each leaderboard open starts on "All".

## Constraints

- Single migration; backfill via column default.
- Filter is purely client-driven; submission always records the actual level.
- `submit()` signature is now positional `(name, score, characterName, levelId)`. Only one caller exists.

## Edge Cases

- Pre-migration rows: backfilled to `'house'` — they will appear under that filter, not under "Lil Italy". Acceptable (no info to disambiguate).
- Unknown level passed to `submit()`: `cleanLevel()` defaults to `'house'`. Defensive.
- Filter applied with zero matching rows: existing "No scores yet" path renders.
- Post-submit rank message: `topN(100, null)` is what populates `leaderboard.globalRows` — but the filter passed to `submit()` is the ACTIVE level; the rank shown reflects the user's position in the unfiltered top 100 (existing behavior). If per-level rank is desired, refetch with `topN(100, selectedLevelId)` in `submitGlobalScore()` and compute rank in that result instead.

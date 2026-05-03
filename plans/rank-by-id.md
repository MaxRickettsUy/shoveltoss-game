# Feature Plan: Honest Leaderboard Rank After Submit

## Problem

`submitGlobalScore()` reports rank using `rows.findIndex(row => score >= row.score)`. With ties (`order by score desc, created_at asc`), this returns the FIRST tied row's index, not the user's actual position — overstating rank when the user's score ties with older entries. It also can't tell when the user's row was pushed out of the top 100 by tie-break.

## Scope

Look up the user's actual position in the refetched top 100 by the inserted row's `id`. If not found, report "outside top 100" honestly. No schema change required (`id uuid` already exists).

## Files Touched

- `src/globalScores.js`
- `index.html`

## Implementation Steps

### Step 1 — Return the inserted row's `id` from `submit()`

In `src/globalScores.js`, change `submit()` to chain `.select('id').single()`:

```js
async submit(name, score, characterName) {
  if (!isProductionHost()) {
    const err = new Error('disabled-non-prod');
    err.code = 'disabled-non-prod';
    throw err;
  }
  const { data, error } = await getClient()
    .from('high_scores')
    .insert({ name: cleanName(name), score, character_name: cleanCharacterName(characterName) })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
},
```

### Step 2 — Include `id` in `topN()` projection

In `src/globalScores.js`, update the select list:

```js
.select('id, name, character_name, score, created_at')
```

### Step 3 — Compute rank by `id` in `submitGlobalScore()`

In `index.html` (around index.html:398–410), replace the rank calc:

```js
const insertedId = await window.globalScores.submit(name, score, characterName);
const rows = await window.globalScores.topN(GLOBAL_SCORE_LIMIT);
leaderboard.globalRows = rows;
leaderboard.globalStatus = 'ready';
const rank = rows.findIndex(row => row.id === insertedId);
gameOverSave.globalStatus = 'ready';
gameOverSave.globalMessage = rank === -1
  ? 'Global: outside top 100'
  : `Global rank: #${rank + 1}`;
```

The error/disabled-non-prod branches are unchanged.

### Step 4 — (Optional) Deterministic tie-break in `topN`

To make the order stable across refetches even when many rows share `score` and `created_at` (rare but possible), append `id` as a final tie-breaker in `src/globalScores.js`:

```js
.order('score', { ascending: false })
.order('created_at', { ascending: true })
.order('id', { ascending: true })
```

## Constraints

- No schema changes (column already exists).
- No new files, no new dependencies.
- `topN` reads remain ungated.

## Edge Cases

- Insert succeeds but the row is at rank 101+ → `findIndex` returns `-1` → "outside top 100" message.
- RLS prevents the post-insert `.select('id')` (shouldn't, the existing policy allows public select) → `submit()` throws → caught, status = 'error' (existing behavior).
- Race: another row inserts between `submit()` and `topN()` and bumps the user out → handled by the same `-1` path.
- Older callers expecting `submit()` to return `void`: only `submitGlobalScore()` calls it; safe to change the contract.

## Verification

- Submit a score that ties existing entries; confirm the rank shown matches the user's actual row in the leaderboard view.
- Submit a score below the current 100th place; confirm "outside top 100" message.
- Submit a top-1 score; confirm "Rank #1".

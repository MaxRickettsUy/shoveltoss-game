# Plan: Rework All-Time Leaderboard — Top Per Player with Global Rank

## Scope
Only the **All Time** tab in the leaderboard view (`drawLeaderboard` / `fetchGlobalLeaderboard`). The **Today** tab is unchanged. Character filter, if set, applies before deduping/ranking.

## Behavior
- Show one row per player (their single highest score).
- The rank number displayed for each row is that score's rank in the full ordered list of ALL scores (not the deduped list).
- Order rows by displayed rank ascending (i.e., highest score first; ties broken by `created_at` asc, then `id` asc — same tiebreak as `topN`).
- Target list size: top 100 unique players.
- Player identity = `cleanName(name)` (matches existing aggregation in `mostTotalPointsLeader` / `mostGamesLeader`).

## Implementation Steps

### 1. Add `topNPerPlayer` in `src/globalScores.js`
Add a new method on `window.globalScores`:

```js
async topNPerPlayer(n = 100, opts = {}) { ... }
```

- Build the same base query as `topN` (apply `opts.characterName` and `opts.sinceISO` if present), ordered by `score desc, created_at asc, id asc`.
- Page through results in chunks of 1000 (`.range(from, from + 999)`), tracking a running global rank counter starting at 1.
- Maintain a `Set<string>` of seen cleaned names and an output array.
- For each row: if `cleanName(row.name)` not seen, push `{ ...row, rank: globalRankCounter }` and add to set.
- Increment `globalRankCounter` for every row processed (seen or not).
- Stop paging once output length >= `n` OR a page returns fewer rows than the page size OR total rows scanned exceeds 10,000 (safety cap).
- Return output sliced to `n`.

### 2. Update `fetchGlobalLeaderboard` in `index.html` (~line 567)
Replace the `topN` call with branching:
- If `leaderboardScope === 'all'`: call `window.globalScores.topNPerPlayer(GLOBAL_SCORE_LIMIT, { characterName: leaderboardCharacterFilter })`.
- Else (daily): keep existing `topN` call unchanged.

Store result in `leaderboard.globalRows` as before. Each row in the all-time case will now carry an explicit `rank` field; daily rows will not.

### 3. Update row rendering in `drawLeaderboard` (~line 2320)
Where the row index is currently used as the displayed rank number:
- If row has a `rank` field, render that number.
- Else, fall back to `index + 1` (preserves Today behavior).

No other UI changes (subtitle "Top 100 — All Time" stays).

### 4. Update the duplicated topN fetch site (~line 824)
The fetch at line 824 (`const rows = await window.globalScores.topN(GLOBAL_SCORE_LIMIT);`) — verify whether it runs while the all-time scope is active. If yes, route through the same scope branch so it stays consistent. If it's a separate code path, leave it alone.

### 5. Manual verification
- Open All Time tab: each player appears at most once; rank numbers may skip (e.g., 1, 3, 4, 7…) when a player has multiple scores in the global top.
- Open Today tab: behavior unchanged (consecutive 1..N, duplicates allowed).
- Apply a character filter on All Time: dedupe + ranks reflect filtered ordering.

## Constraints / Edge Cases
- Names are deduped using `cleanName` (reuse existing logic — do not introduce a different normalization).
- If there are fewer than `n` unique players in the DB, return what's available.
- Hard cap pagination at 10,000 rows scanned to avoid runaway loops on a sparse top-100.

## Out of Scope
- No DB schema changes, no new RPCs.
- No changes to Today scope, Hall of Fame, or per-character mini-leaderboards.
- No caching layer.

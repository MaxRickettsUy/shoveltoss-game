# Feature Plan: Player Stats Screen

## Scope

A new screen showing every player who's submitted a score, sorted by total points scored across all their entries. Each row shows: rank, name, total points, total games (= row count for that player). Reachable from the landing screen's `Player Stats` button.

Aggregation is done client-side from a single bulk fetch — fine at current scale (hundreds to low thousands of rows). Migration to a Postgres view/RPC is noted as a future step if the table grows past ~10k rows.

Depends on the HOME state existing (`plans/landing-screen.md`).

## Files Touched

- `src/globalScores.js`
- `index.html`

## Implementation Steps

### Step 1 — Add `allScores()` bulk fetcher

In `src/globalScores.js`, add to `window.globalScores`:

```js
async allScores(maxRows = 5000) {
  const { data, error } = await getClient()
    .from('high_scores')
    .select('name, score')
    .order('id', { ascending: true })
    .limit(maxRows);
  if (error) throw error;
  return data || [];
}
```

Projects only the columns needed for aggregation. `maxRows` cap is defensive — current scale is far below it. Revisit if/when the table grows past this.

### Step 2 — Add player-stats state + aggregator

In `index.html`:

```js
let playerStatsRows = [];        // [{ name, totalPoints, gamesPlayed }] sorted by totalPoints desc
let playerStatsStatus = 'idle';  // 'loading' | 'ready' | 'error'
let playerStatsScrollY = 0;
let playerStatsBackRect = null;
let playerStatsListTop = 0;
let playerStatsListBottom = 0;

function aggregatePlayerStats(rawRows) {
  const byName = new Map();
  for (const r of rawRows) {
    const key = String(r.name || '').trim();
    if (!key) continue;
    const cur = byName.get(key) || { name: key, totalPoints: 0, gamesPlayed: 0 };
    cur.totalPoints += Number(r.score) || 0;
    cur.gamesPlayed += 1;
    byName.set(key, cur);
  }
  return Array.from(byName.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return b.gamesPlayed - a.gamesPlayed; // tiebreak: more games > fewer
  });
}

async function fetchPlayerStats() {
  playerStatsStatus = 'loading';
  try {
    const raw = await window.globalScores.allScores();
    playerStatsRows = aggregatePlayerStats(raw);
    playerStatsStatus = 'ready';
  } catch {
    playerStatsRows = [];
    playerStatsStatus = 'error';
  }
}
```

### Step 3 — Draw the screen

Add `drawPlayerStats(timestamp)` modeled on `drawLeaderboard`:

- Title: `PLAYER STATS` (centered, top).
- Subtitle: `Sorted by total points`.
- Header row (sticky, above scroll region): `#` | `Player` | `Total` | `Games`.
- Rows: numbered (1..N), one per player. Each row:
  - `${index + 1}.` (left)
  - `${name}` (left, after rank)
  - `${totalPoints}` (right-aligned)
  - `${gamesPlayed}` (right-aligned, smaller column)
- `Back` button at bottom → HOME.

Reuse the existing scroll + clip pattern (`playerStatsScrollY`, list-region clip + `playerStatsListTop` / `playerStatsListBottom`) — list will likely overflow viewport for any non-trivial player count.

### Step 4 — Wire input + scroll

In `onPressStart()`, add a PLAYER_STATS branch:

```js
if (run.state === RUN_STATE.PLAYER_STATS) {
  if (playerStatsBackRect && pointerInRect(playerStatsBackRect)) {
    run.state = RUN_STATE.HOME;
    return;
  }
  return;
}
```

Extend the existing wheel + drag handlers' state-check to include PLAYER_STATS, gated to the list region (mirror the leaderboard pattern: `isInPlayerStatsList(y)` helper that checks `[playerStatsListTop, playerStatsListBottom]`).

### Step 5 — Trigger fetch on screen entry

In the HOME button handler (per landing-screen plan):

```js
case 'stats':
  fetchPlayerStats();
  playerStatsScrollY = 0;
  run.state = RUN_STATE.PLAYER_STATS;
  break;
```

### Step 6 — Game-loop dispatch

If the landing-screen plan didn't already wire it, replace the stub `drawPlayerStats` call in the dispatch with the real one.

### Step 7 — Empty / loading / error states

Inside `drawPlayerStats`:

- `playerStatsStatus === 'loading'` → centered "Loading…".
- `playerStatsStatus === 'error'` → centered "Offline" in red.
- `playerStatsStatus === 'ready' && playerStatsRows.length === 0` → centered "No players yet".
- Otherwise → render the list.

## Constraints

- Aggregation is client-side. Acceptable while the `high_scores` table stays under a few thousand rows.
- `name` is the join key — same display name from different humans count as one player (the app has no auth; this is an existing ambiguity, not a regression).
- No schema changes.

## Edge Cases

- Duplicate names from different humans → merged into one player entry. Documented limitation.
- Trimmed-empty `name` → skipped (defensive against historical bad data).
- Cap hit: if `allScores()` returns exactly 5000 rows, the actual player count may be larger and totals truncated. Scale ceiling — surface a "showing first 5000 scores" footnote if/when this fires (not needed today).
- Network error mid-fetch → status `'error'`, screen shows "Offline" with Back functional.

## Out of Scope

- Filter/search by name.
- Per-character or per-level breakdowns inside the player view.
- Drill-in to a single player's score history (covered conceptually by `plans/leaderboard-by-player.md`).
- Pagination (bump the cap when needed instead).

## Future Migration

When the table grows past ~10k rows, replace `aggregatePlayerStats` + `allScores` with a Postgres view or RPC:

```sql
create or replace view public.player_stats as
select name, sum(score)::bigint as total_points, count(*)::bigint as games_played
from public.high_scores
group by name
order by total_points desc;
```

Then `fetchPlayerStats` becomes a single `select` from the view. No client changes beyond the fetch source.

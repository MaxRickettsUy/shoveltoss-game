# Plan: Individual player detail screen

## Scope
A new state reachable from the existing Player Stats list (index.html:3251–3337). Each row gets a small "view detail" icon next to the player's name; tapping it opens a per-player screen showing top characters, summary stats, and top 10 scores.

## Behavior target
- Player Stats list now renders an icon button (e.g., a profile / chevron-right glyph) immediately to the right of each player's name. Tapping it opens the new screen for that player.
- Tapping anywhere else on the row keeps existing behavior (no-op for now — same as today).
- New screen ("Player Detail") shows three sections, top to bottom:
  1. Header: player name and a back button to return to Player Stats.
  2. Summary stats: total points, games played, average points (same three numbers shown in the list row).
  3. Top 3 characters: ranked by games played (ties broken by total points), each row showing rank, character ID, games, and total points for that character.
  4. Top 10 scores: rank, score, character used, date.
- Back button returns to Player Stats with the previous scroll position preserved.

Character thumbnail rendering inside Top 3 is out of scope for the first cut — text-only rows.

## Data needs
The existing `aggregatePlayerStats` consumes `globalScores.allScores()`, which fetches only `name` and `score`. Per-character and top-10 breakdowns need `character_name` and `created_at` for the player.

Add a per-player query to `src/globalScores.js`:
```js
async playerScores(name, maxRows = 1000) {
  const cleaned = cleanName(name);
  const { data, error } = await getClient()
    .from('high_scores')
    .select('id, name, character_name, score, created_at')
    .eq('name', cleaned)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(maxRows);
  if (error) throw error;
  return data || [];
}
```

A second sort pass on the client gives top-N by score and groups by `character_name` for the top 3 characters.

## Implementation Steps

### 1. New state and module-level vars (~index.html:485, 735)
- Add `PLAYER_DETAIL: 'player_detail'` to `RUN_STATE`.
- Add:
  ```js
  let playerDetailName = null;
  let playerDetailRows = [];
  let playerDetailStatus = 'idle';
  let playerDetailError = '';
  let playerDetailBackRect = null;
  let playerDetailScrollY = 0;
  let playerStatsRowHitRects = []; // [{ name, rect }]
  ```
- Track previous scroll position on the list so we can restore it on back: `let playerStatsReturnScrollY = 0`.

### 2. Per-row icon in `drawPlayerStats` (~index.html:3312–3331)
Inside the row-rendering forEach:
- Compute an icon hit-rect immediately after the player name:
  ```js
  const iconSize = Math.max(16, Math.floor(rowSize * 1.0));
  const nameW = ctx.measureText(truncatedName).width;
  const iconX = playerX + nameW + 8;
  const iconY = y - rowSize / 2;
  ```
- Draw the icon:
  - Font Awesome `fa-circle-user` (or `fa-chevron-right`) at `iconSize * 0.85`, color `THEME.textMute`.
  - Fallback `'›'` if `!faReady`.
- Push `{ name: row.name, rect: { x: iconX - 4, y: iconY - 4, w: iconSize + 8, h: iconSize + 8 } }` into `playerStatsRowHitRects`.
- Reset `playerStatsRowHitRects = []` at the top of `drawPlayerStats` so it doesn't leak across frames.

Truncation: shorten `nameMaxW` slightly so long names don't push past the totals column when the icon is present.

### 3. Click handler for the icon (~index.html:1928, the `RUN_STATE.PLAYER_STATS` branch)
Before any other row handling:
```js
for (let i = 0; i < playerStatsRowHitRects.length; i++) {
  const hit = playerStatsRowHitRects[i];
  if (pointerInRect(hit.rect)) {
    playerStatsReturnScrollY = playerStatsScrollY;
    openPlayerDetail(hit.name);
    return;
  }
}
```

### 4. `openPlayerDetail(name)` and fetch
- Set `run.state = RUN_STATE.PLAYER_DETAIL`, `playerDetailName = name`, `playerDetailStatus = 'loading'`, `playerDetailRows = []`, `playerDetailScrollY = 0`.
- Call `await window.globalScores.playerScores(name)` (with the same offline-error fallback used elsewhere). On success, set `playerDetailRows = data` and status `'ready'`. On failure, status `'error'`.

### 5. Aggregation helper
```js
function aggregateTopCharacters(rows, n = 3) {
  const map = new Map();
  for (const r of rows) {
    const c = String(r.character_name || 'Unknown');
    const cur = map.get(c) || { character: c, games: 0, totalPoints: 0, bestScore: 0 };
    cur.games += 1;
    cur.totalPoints += Number(r.score) || 0;
    cur.bestScore = Math.max(cur.bestScore, Number(r.score) || 0);
    map.set(c, cur);
  }
  return Array.from(map.values())
    .sort((a, b) => b.games - a.games || b.totalPoints - a.totalPoints || b.bestScore - a.bestScore)
    .slice(0, n);
}
```

### 6. `drawPlayerDetail(timestamp)` (~near `drawPlayerStats`)
Layout, top to bottom, mirroring the styling used in `drawPlayerStats`:
1. Title `playerDetailName` at `titleSize`.
2. Subtitle `'Player profile'` at `subtitleSize`, `THEME.textMute`.
3. **Summary band**: three labelled values across one line — `Total`, `Avg`, `Games` — values in `THEME.accent` (Total) and `THEME.text` (others). Compute from `playerDetailRows` (sum, mean, count).
4. **Top 3 characters** section header, then up to 3 rows:
   - Rank, character name (truncated to fit), games, total points.
   - Same row striping/header styling as Player Stats.
5. **Top 10 scores** section header, then up to 10 rows:
   - Rank, score (`THEME.accent`), character (truncated), date (formatted via existing date helper or `new Date(...).toLocaleDateString()`).
6. Loading / error / empty states using the existing patterns (`'Loading...'`, `'Offline'`, `'No scores yet'`).
7. Back button at the bottom, full-width like Player Stats. Hit-rect → `playerDetailBackRect`.

Scrolling: only needed if both sections combined exceed the viewport. Add a single vertical scroll like Player Stats (`playerDetailScrollY`, listTop/listBottom clipping). Header summary stays pinned above the scrollable region.

### 7. Pointer / wheel / draw routing
- In the click handler (~index.html:1928 area), add a `RUN_STATE.PLAYER_DETAIL` branch:
  - If `pointerInRect(playerDetailBackRect)`: `run.state = RUN_STATE.PLAYER_STATS; playerStatsScrollY = playerStatsReturnScrollY;` and return.
- Add the new state to the wheel/pan scroll switches alongside the existing PLAYER_STATS branches.
- In the main draw switch (~index.html:2184), add:
  ```js
  } else if (run.state === RUN_STATE.PLAYER_DETAIL) {
    hideLanding();
    drawPlayerDetail(timestamp);
  }
  ```

### 8. Verify
- Tap icon next to any player on Player Stats → screen loads, shows their summary, top 3 characters, top 10 scores.
- Back returns to Player Stats with prior scroll preserved.
- Highlight on current user (`isCurrentUserRow`) still works on Player Stats; on the detail screen the heading itself is the user identifier, so no row highlight is needed.
- Long names truncate cleanly in both list and detail.
- Offline: detail screen shows the `'Offline'` state.
- Tap on row outside the icon does nothing (parity with current behavior).

## Out of Scope
- Character thumbnails / hero images on the detail screen.
- Character-filtered views, score histograms, or trend charts.
- Caching of `playerScores` results between visits.
- Linking from Hall of Fame or Leaderboard rows (icon only added to Player Stats for this pass).
- Pagination beyond `maxRows = 1000`.

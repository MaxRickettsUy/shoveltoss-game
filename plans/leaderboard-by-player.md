# Feature Plan: Per-Player Leaderboard (Top 10 per Player)

## Scope

A new view inside the leaderboard screen: list distinct players (ranked by their best score) and let the user drill into any player to see that player's top 10 scores. Existing "global" leaderboard view stays as the default.

## Files Touched

- `src/globalScores.js`
- `index.html`

## Implementation Steps

### Step 1 — Add `topPlayers()` query

In `src/globalScores.js`, add to `window.globalScores`:

```js
async topPlayers(n = 100) {
  const { data, error } = await getClient()
    .from('high_scores')
    .select('id, name, character_name, score, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1000); // cap server pull; dedupe client-side
  if (error) throw error;
  const seen = new Map();
  for (const row of (data || [])) {
    if (!seen.has(row.name)) seen.set(row.name, row);
    if (seen.size >= n) break;
  }
  return Array.from(seen.values());
}
```

Client-side dedupe-by-name keeps the implementation simple without a SQL view. Cap at 1000 rows fetched to bound bandwidth; if fewer than `n` distinct players exist in the first 1000, that's the full list.

### Step 2 — Add `topNForPlayer()` query

Also in `src/globalScores.js`:

```js
async topNForPlayer(name, n = 10) {
  const { data, error } = await getClient()
    .from('high_scores')
    .select('id, name, character_name, score, created_at')
    .eq('name', name)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(n);
  if (error) throw error;
  return data || [];
}
```

### Step 3 — Add view-mode + player-detail state

In `index.html`, near other leaderboard state:

```js
let leaderboardView = 'global'; // 'global' | 'players' | 'player-detail'
let leaderboardPlayers = [];     // rows for 'players' view
let leaderboardPlayerDetail = null; // { name, rows } for 'player-detail' view
let leaderboardViewToggleRects = []; // tab pills
let leaderboardPlayerRowRects = [];  // hit rects for player-list rows
let leaderboardPlayerBackRect = null;
```

### Step 4 — Add fetchers + view switchers

In `index.html`, add:

```js
async function fetchPlayersLeaderboard() {
  leaderboard.globalStatus = 'loading';
  try {
    leaderboardPlayers = await window.globalScores.topPlayers(GLOBAL_SCORE_LIMIT);
    leaderboard.globalStatus = 'ready';
  } catch {
    leaderboardPlayers = [];
    leaderboard.globalStatus = 'error';
  }
}

async function openPlayerDetail(name) {
  leaderboardView = 'player-detail';
  leaderboardScrollY = 0;
  leaderboard.globalStatus = 'loading';
  try {
    const rows = await window.globalScores.topNForPlayer(name, 10);
    leaderboardPlayerDetail = { name, rows };
    leaderboard.globalStatus = 'ready';
  } catch {
    leaderboardPlayerDetail = { name, rows: [] };
    leaderboard.globalStatus = 'error';
  }
}

function setLeaderboardView(view) {
  leaderboardView = view;
  leaderboardScrollY = 0;
  if (view === 'global') fetchGlobalLeaderboard();
  else if (view === 'players') fetchPlayersLeaderboard();
}
```

Reset on open/close (index.html:348 / 357):

```js
leaderboardView = 'global';
leaderboardPlayerDetail = null;
```

### Step 5 — Draw view tabs + dispatch render

In `drawLeaderboard()` (around index.html:1340), draw two tab pills above the existing banner: `Top Scores` and `Top Players`. Push to `leaderboardViewToggleRects`. Then dispatch:

```js
if (leaderboardView === 'global') drawGlobalLeaderboardList(...);
else if (leaderboardView === 'players') drawPlayersList(...);
else if (leaderboardView === 'player-detail') drawPlayerDetail(...);
```

`drawPlayersList` renders rows of `${rank}. ${name} — ${bestScore} (${characterName})`, push each row's hit rect to `leaderboardPlayerRowRects` with `{ x, y, w, h, name }`.

`drawPlayerDetail` renders:
- Title: `Top 10 — ${name}`.
- A `‹ Back` button (push to `leaderboardPlayerBackRect`).
- Numbered list (1–10) of `${rank}. ${score} — ${character_name} — ${formatScoreDate(created_at)}`.

Both views reuse existing scroll + clip pattern.

### Step 6 — Wire input

In `onPressStart()` LEADERBOARD branch (around index.html:568), before existing back-button check:

```js
for (const tab of leaderboardViewToggleRects) {
  if (pointerInRect(tab)) { setLeaderboardView(tab.value); return; }
}
if (leaderboardView === 'players') {
  for (const r of leaderboardPlayerRowRects) {
    if (pointerInRect(r)) { openPlayerDetail(r.name); return; }
  }
}
if (leaderboardView === 'player-detail') {
  if (leaderboardPlayerBackRect && pointerInRect(leaderboardPlayerBackRect)) {
    setLeaderboardView('players');
    return;
  }
}
```

(`pointerInRect` is shorthand — inline the existing rect-check style used elsewhere.)

### Step 7 — Hardware back / leaderboard-back behavior

The existing leaderboard `Back` button (index.html ~1335) should:
- From `player-detail` → go to `players` view (not close).
- From `players` → close leaderboard (existing `closeLeaderboard()`).
- From `global` → close leaderboard (existing).

Update its handler accordingly inside `onPressStart()` LEADERBOARD branch.

## Constraints

- No schema changes.
- All aggregation done client-side from the existing `high_scores` rows.
- `topPlayers` caps at 1000 fetched rows — sufficient until the table has many thousands of entries from the same handful of players. Revisit (SQL view / RPC) only if that ceiling is hit.

## Edge Cases

- Same `name` used by different humans: treated as one player (this app has no auth; the leaderboard already has this ambiguity).
- Player with zero scores: not possible — players only appear via score insert.
- 1000-row cap reached before `n` distinct players seen: returned list is shorter than requested. Acceptable; show what we have.
- Network error during drill-in: status flips to `'error'`, `Back` returns to player list (which is still cached).

## Out of Scope

- Filtering player view by level or character (combine with the other plans only if explicitly requested).
- Player profile beyond top 10 (avatar, total runs, average score, etc.).

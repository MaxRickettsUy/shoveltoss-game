# Feature Plan: Hall of Fame Screen

## Scope

A new screen listing milestone "firsts" — the first player to ever score, the first to reach 10 points, 20 points, etc. Read-only, sourced from the existing `high_scores` table. Reachable from the landing screen's `Hall of Fame` button.

Depends on the HOME state existing (`plans/landing-screen.md`), but can ship independently as long as that state is reachable.

## Files Touched

- `src/globalScores.js`
- `index.html`

## Implementation Steps

### Step 1 — Define milestones

In `index.html` near other scoring constants:

```js
const HOF_MILESTONES = [
  { key: 'first',    label: 'First Player Ever',    threshold: 1 },
  { key: 'ten',      label: 'First to 10 Points',   threshold: 10 },
  { key: 'twenty',   label: 'First to 20 Points',   threshold: 20 },
  { key: 'thirty',   label: 'First to 30 Points',   threshold: 30 },
  { key: 'fifty',    label: 'First to 50 Points',   threshold: 50 },
  { key: 'seventy5', label: 'First to 75 Points',   threshold: 75 },
  { key: 'hundred',  label: 'First to 100 Points',  threshold: 100 },
  { key: 'oneFifty', label: 'First to 150 Points',  threshold: 150 },
  { key: 'twoHund',  label: 'First to 200 Points',  threshold: 200 },
];
```

Adjust thresholds to match observed score range. Easy to extend.

### Step 2 — Add `firstAtMilestone()` query

In `src/globalScores.js`, add to `window.globalScores`:

```js
async firstAtMilestone(threshold) {
  const { data, error } = await getClient()
    .from('high_scores')
    .select('id, name, character_name, score, created_at')
    .gte('score', threshold)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1);
  if (error) throw error;
  return (data && data[0]) || null;
}
```

Returns the oldest row that meets `score >= threshold`, or `null` if no one has hit it yet.

### Step 3 — Add HOF state + fetcher in `index.html`

```js
let hallOfFameRows = [];        // parallel to HOF_MILESTONES; each element is { milestone, row|null }
let hallOfFameStatus = 'idle';  // 'loading' | 'ready' | 'error'
let hallOfFameScrollY = 0;
let hallOfFameBackRect = null;

async function fetchHallOfFame() {
  hallOfFameStatus = 'loading';
  try {
    const results = await Promise.all(
      HOF_MILESTONES.map(m => window.globalScores.firstAtMilestone(m.threshold))
    );
    hallOfFameRows = HOF_MILESTONES.map((m, i) => ({ milestone: m, row: results[i] }));
    hallOfFameStatus = 'ready';
  } catch {
    hallOfFameRows = [];
    hallOfFameStatus = 'error';
  }
}
```

Call `fetchHallOfFame()` from a new `openHallOfFame()` helper (or directly when HOME's `Hall of Fame` button fires); reset `hallOfFameScrollY = 0`.

### Step 4 — Draw the screen

Add `drawHallOfFame(timestamp)` modeled on `drawLeaderboard`:

- Title: `HALL OF FAME` (centered, top).
- Subtitle: `Milestone firsts` or similar.
- Rows: one per milestone, vertically stacked. Each row:
  - Left: `milestone.label`
  - Right: if `row` exists → `${row.name} (${row.character_name}) — ${row.score} — ${formatScoreDate(row.created_at)}`
  - If `row === null` → `— unclaimed —` in muted color.
- `Back` button at bottom → returns to HOME (mirror leaderboard back-button pattern).

Reuse the existing scroll + clip pattern (`hallOfFameScrollY`, list-region clip) for cases where milestone count exceeds viewport height.

### Step 5 — Wire input

In `onPressStart()`, add a HALL_OF_FAME branch:

```js
if (run.state === RUN_STATE.HALL_OF_FAME) {
  if (hallOfFameBackRect && pointerInRect(hallOfFameBackRect)) {
    run.state = RUN_STATE.HOME;
    return;
  }
  return;
}
```

Wire scroll: extend the existing wheel + drag handlers' state-check to include HALL_OF_FAME (same shape as leaderboard scroll — single Y-axis).

### Step 6 — Game-loop dispatch

If the landing-screen plan didn't already wire it, replace the stub `drawHallOfFame` call in the dispatch with the real one.

### Step 7 — Trigger fetch on screen entry

In the HOME button handler (per landing-screen plan), call `fetchHallOfFame()` immediately before / alongside the state transition:

```js
case 'hall':
  fetchHallOfFame();
  run.state = RUN_STATE.HALL_OF_FAME;
  break;
```

Optionally cache the result for the session (HOF data is monotonic — first-evers don't un-claim) by adding a simple `hallOfFameLoadedAt` timestamp and skipping refetch if loaded within the last 5 minutes.

## Constraints

- All milestones queried in parallel (`Promise.all`) — N small queries instead of one large fetch + client-side filter. N is bounded by `HOF_MILESTONES.length` (<20).
- No schema changes; uses existing `high_scores` table.
- Adding/removing milestones is a one-line edit to `HOF_MILESTONES`.

## Edge Cases

- No one has hit a milestone yet → row shows `— unclaimed —`.
- Multiple rows with the same `created_at` AND same score → tie broken by `id ASC`. Deterministic.
- Network error → `hallOfFameStatus = 'error'`, screen shows "Offline" with the Back button still functional.
- Re-entering the screen → refetch (or use cache if Step 7's optional cache is added).

## Out of Scope

- Per-character hall of fame ("first Buck to score 10").
- Per-level hall of fame.
- Animations / unlock-style reveals.
- Stat about WHEN each milestone was hit (already shown via `formatScoreDate`).

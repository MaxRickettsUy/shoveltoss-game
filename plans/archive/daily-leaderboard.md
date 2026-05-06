# Feature Plan: Daily Leaderboard Toggle

## Scope

On the leaderboard screen, add a two-state toggle ("All Time" / "Today") that switches the displayed top-100 between all-time scores and scores submitted since local midnight. Default = All Time. Toggle resets to All Time when the leaderboard is closed (mirrors existing character-filter reset).

Out of scope: weekly/monthly/custom ranges, per-level daily boards, daily-best banners, pushing today's badges to other screens.

## Files Touched

- `index.html`
- `src/globalScores.js`

## Design Notes

- **"Today" = local midnight to now.** Compute `sinceISO` client-side: `const d = new Date(); d.setHours(0,0,0,0); sinceISO = d.toISOString();`. Server filter is just `.gte('created_at', sinceISO)`. UTC-vs-local is a real call; local is friendlier for a casual game.
- **State variable**: add `let leaderboardScope = 'all';` next to `leaderboardCharacterFilter` (index.html:151). Resets in `closeLeaderboard()` (index.html:462).
- **Fetch**: extend `globalScores.topN` to accept `{ characterName, sinceISO }`. Existing call sites (index.html:485 for the screen, 619 for post-submit rank) keep working unchanged because `sinceISO` is optional.
- **UI**: canvas-drawn two-pill segmented control, drawn under the subtitle and above the character `<select>`. Canvas — not DOM — because we already manage one DOM element here, and adding a second makes top-of-screen layout fragile. Hit-tested in `onPressStart()` like other canvas buttons.
- **Subtitle copy** updates to reflect scope: `"Top 100 — All Time"` / `"Top 100 — Today"`.
- **Post-submit rank** (`submitGlobalScore`, index.html:619) keeps using all-time top 100. Rank message semantics ("Global rank: #N") shouldn't change based on UI state at submit time.

## Implementation Steps

### Step 1 — `topN` accepts a date floor

In `src/globalScores.js:59–73`, add `sinceISO` to opts:

```js
async topN(n = 100, opts = {}) {
  let query = getClient()
    .from('high_scores')
    .select('id, name, character_name, score, created_at');
  if (opts.characterName) {
    query = query.eq('character_name', opts.characterName);
  }
  if (opts.sinceISO) {
    query = query.gte('created_at', opts.sinceISO);
  }
  const { data, error } = await query
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(n);
  if (error) throw error;
  return data || [];
},
```

### Step 2 — Scope state + helper

Add next to `leaderboardCharacterFilter` (index.html:151):

```js
let leaderboardScope = 'all'; // 'all' | 'daily'
let leaderboardScopeRects = { all: null, daily: null };
```

Add helper near other utilities:

```js
function dailySinceISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
```

Reset in `closeLeaderboard()` (index.html:462) — add `leaderboardScope = 'all';` next to the character-filter reset.

### Step 3 — Pass scope to fetch

In `fetchGlobalLeaderboard()` (index.html:480–495), replace the `topN` call:

```js
leaderboard.globalRows = await window.globalScores.topN(
  GLOBAL_SCORE_LIMIT,
  {
    characterName: leaderboardCharacterFilter,
    sinceISO: leaderboardScope === 'daily' ? dailySinceISO() : undefined,
  }
);
```

### Step 4 — Render scope toggle in `drawLeaderboard()`

In `drawLeaderboard()` (index.html:1852), between the subtitle (line 1888) and `positionLeaderboardFilterSelect` (line 1893), insert:

```js
// Scope toggle (All Time / Today)
const toggleH = isPhoneLandscape ? 24 : 30;
const toggleFont = isPhoneLandscape ? 11 : 13;
const toggleGap = 6;
const toggleW = Math.min(260, canvas.width - pad * 2);
const toggleY = subtitleY + 10;
const toggleX = cx - toggleW / 2;
const halfW = (toggleW - toggleGap) / 2;
const allRect   = { x: toggleX,                     y: toggleY, w: halfW, h: toggleH };
const dailyRect = { x: toggleX + halfW + toggleGap, y: toggleY, w: halfW, h: toggleH };
leaderboardScopeRects.all = allRect;
leaderboardScopeRects.daily = dailyRect;
drawButton({ ...allRect,   fontSize: toggleFont, fillStyle: leaderboardScope === 'all'   ? '#ffe600' : '#2a2a4a', textColor: leaderboardScope === 'all'   ? '#1a1a2e' : '#ffffff' }, 'All Time');
drawButton({ ...dailyRect, fontSize: toggleFont, fillStyle: leaderboardScope === 'daily' ? '#ffe600' : '#2a2a4a', textColor: leaderboardScope === 'daily' ? '#1a1a2e' : '#ffffff' }, 'Today');
```

Then shift the existing `selectTop` (line 1891) to sit below the toggle:

```js
const selectFontSize = isPhoneLandscape ? 12 : 14;
const selectTop = toggleY + toggleH + 8;
```

Update the subtitle text (line 1888):

```js
const subtitleText = leaderboardScope === 'daily' ? 'Top 100 — Today' : 'Top 100 — All Time';
drawText(subtitleText, cx, subtitleY, subtitleSize, 'rgba(255,255,255,0.65)', 'center', false);
```

### Step 5 — Hit-test the toggle

In `onPressStart()`, in the `RUN_STATE.LEADERBOARD` branch (around index.html:1106, before the back-button check), add:

```js
if (leaderboardScopeRects.all && pointerInRect(leaderboardScopeRects.all)) {
  if (leaderboardScope !== 'all') {
    leaderboardScope = 'all';
    leaderboardScrollY = 0;
    fetchGlobalLeaderboard();
  }
  return;
}
if (leaderboardScopeRects.daily && pointerInRect(leaderboardScopeRects.daily)) {
  if (leaderboardScope !== 'daily') {
    leaderboardScope = 'daily';
    leaderboardScrollY = 0;
    fetchGlobalLeaderboard();
  }
  return;
}
```

### Step 6 — Manual test plan

- Open Leaderboard from Home → "All Time" pill is highlighted, list = top 100 all-time.
- Tap "Today" → list refetches, subtitle reads "Top 100 — Today", only rows with `created_at >= local midnight` appear.
- Tap "All Time" → list refetches with full top 100.
- Toggle interacts correctly with character filter: switching characters preserves scope; switching scope preserves character filter.
- Empty daily list (no scores today) shows "No scores yet" via existing path.
- Close + reopen leaderboard → resets to "All Time" (matches character-filter reset behavior).
- Post-game `submitGlobalScore` rank message remains based on all-time top 100 regardless of current scope.
- Phone-landscape layout: toggle, character `<select>`, and list don't overlap.

### Step 7 — Release-checklist note

Bump `APP_VERSION_TAG` (index.html:221) and prepend a `releaseNotes.js` entry: "Daily leaderboard — toggle the leaderboard between All Time and Today's scores."

# Plan: Highlight Current-User Rows on Leaderboards

## Scope

Add a subtle background highlight on rows whose `name` matches the current username on:

1. Leaderboard (`drawLeaderboard`, `index.html:2154`)
2. Hall of Fame (`drawHallOfFame`, ~`index.html:2418`)
3. Player Stats (`drawPlayerStats`, ~`index.html:2546`)

Out of scope: highlighting on the character-card flip-side (top-5 scores), changing list ordering, adding a "jump to me" button, or adding an indicator on the home screen.

## Match Rule

```js
function isCurrentUserRow(rowName) {
  const me = sanitizeUsername(username.get());
  if (!me) return false;
  return sanitizeUsername(rowName) === me;
}
```

Place this helper next to `sanitizeUsername` (around `index.html:284`).

Comparison is case-sensitive by intent — usernames in this game are display names, and players who deliberately use mixed case should see only their own row highlighted, not someone else's similarly-spelled name. If you want case-insensitive matching, lowercase both sides — single-line change.

## Visual Treatment

Single style across all three screens:

```js
const HIGHLIGHT_FILL = 'rgba(255, 230, 0, 0.18)';
```

Add as a constant near other color constants (`HIGH_SCORE_BADGE`, etc., around `index.html:255`).

Painted as a full-row rectangle, replacing (not stacking on top of) the existing zebra stripe for matching rows. Zebra remains for non-matching rows.

## Implementation Steps

### 1. Helper + constant
Add at the indicated lines:
- Constant `HIGHLIGHT_FILL` near `HIGH_SCORE_BADGE`.
- Helper `isCurrentUserRow(name)` after `sanitizeUsername`.

### 2. Leaderboard (`drawLeaderboard`)
At `index.html:2228`, replace the zebra block:
```js
if (index % 2 === 1) {
  ctx.fillStyle = '#111126';
  ctx.fillRect(leftX - 8, y - rowSize - 4, scoreX - leftX + 16, lineH);
}
```
With:
```js
const isMine = isCurrentUserRow(row.name);
if (isMine) {
  ctx.fillStyle = HIGHLIGHT_FILL;
  ctx.fillRect(leftX - 8, y - rowSize - 4, scoreX - leftX + 16, lineH);
} else if (index % 2 === 1) {
  ctx.fillStyle = '#111126';
  ctx.fillRect(leftX - 8, y - rowSize - 4, scoreX - leftX + 16, lineH);
}
```

### 3. Hall of Fame (`drawHallOfFame`)
At `index.html:2428`, apply the same swap. The match field is `entry.row.name` (only when `entry.row` is non-null — unclaimed milestones cannot match):
```js
const isMine = entry.row && isCurrentUserRow(entry.row.name);
if (isMine) {
  ctx.fillStyle = HIGHLIGHT_FILL;
  ctx.fillRect(leftX - 8, y - milestoneSize - 5, rightX - leftX + 16, lineH);
} else if (index % 2 === 1) {
  ctx.fillStyle = '#111126';
  ctx.fillRect(leftX - 8, y - milestoneSize - 5, rightX - leftX + 16, lineH);
}
```

### 4. Player Stats (`drawPlayerStats`)
At `index.html:2549`, same pattern. Player Stats aggregates by name, so at most one row will highlight:
```js
const isMine = isCurrentUserRow(row.name);
if (isMine) {
  ctx.fillStyle = HIGHLIGHT_FILL;
  ctx.fillRect(rankX - 8, y - rowSize - 4, gamesX - rankX + 16, lineH);
} else if (index % 2 === 1) {
  ctx.fillStyle = '#111126';
  ctx.fillRect(rankX - 8, y - rowSize - 4, gamesX - rankX + 16, lineH);
}
```

### 5. Manual verification

- `npm run dev`. Set username to a value that exists on each leaderboard.
- Confirm matching row(s) show a yellow-tint background on Leaderboard, Hall of Fame, and Player Stats.
- Toggle Today / All Time on Leaderboard — highlight follows the visible rows.
- Switch the character filter — highlight still applies after rows refresh.
- Edit username to something that doesn't exist on the board — no highlight.
- Edit username to empty (overlay won't allow this, but the helper's empty-guard handles it) — no highlight.
- Scroll through a long list — clipping (`ctx.clip()`) still trims the highlight at list bounds.

## Constraints

- Do NOT modify the row-drawing text colors. Background change alone is sufficient signal.
- Do NOT add a separate "highlight" pass after the rows render — keep it inline so clipping and scroll math stay shared.
- Do NOT introduce a unique-player-id concept. Comparison is by display name (the game has no other identity).
- Do NOT alter the underlying data sort or filter behavior.

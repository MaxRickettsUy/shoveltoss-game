# Feature Plan: Landing Screen

## Scope

A new HOME screen that becomes the app's entry point. Four buttons: **Play Game** → character select, **Leaderboard**, **Hall of Fame**, **Player Stats**. Replaces the current direct-to-character-select flow. Username overlay still gates first-load.

This plan adds the screen and its navigation; the destination screens (Hall of Fame, Player Stats) are covered in separate plans. The two new buttons can ship as no-ops until those plans land — they should still navigate to a stub state.

## Files Touched

- `index.html`

## Implementation Steps

### Step 1 — Add HOME run state

In `RUN_STATE` (around index.html:172), add:

```js
const RUN_STATE = { USERNAME: 'username', HOME: 'home', SELECTING: 'selecting', LEVEL_SELECT: 'level_select', PLAYING: 'playing', GAME_OVER: 'game_over', LEADERBOARD: 'leaderboard', HALL_OF_FAME: 'hall_of_fame', PLAYER_STATS: 'player_stats' };
```

(`HALL_OF_FAME` and `PLAYER_STATS` declared here for shared use; their screens land in their own plans.)

### Step 2 — Set initial state to HOME

Around index.html:178 where the run state is initialized, change:

```js
state: username.get() ? RUN_STATE.HOME : RUN_STATE.USERNAME,
```

Update `openUsernameOverlay`'s default `returnState` to `RUN_STATE.HOME`. Update `closeLeaderboard` / `closeLevelSelect` etc. fallbacks to point at HOME instead of SELECTING where appropriate (specifically: `lastStateBeforeLeaderboard` default — leaderboard should return to HOME when opened from HOME).

### Step 3 — Add `drawHome(timestamp)`

New render function modeled on `drawCharacterSelect` minus the grid:

- Title: `SHOVEL TOSS` (same sizing logic).
- Subtitle / `Player: <name>` block (reuse existing pattern; tap edits username).
- Four buttons stacked vertically, centered:
  - `Play Game` → `run.state = RUN_STATE.SELECTING`
  - `Leaderboard` → `openLeaderboard(RUN_STATE.HOME)`
  - `Hall of Fame` → `run.state = RUN_STATE.HALL_OF_FAME`
  - `Player Stats` → `run.state = RUN_STATE.PLAYER_STATS`
- Version footer + "What's New" badge stay at the bottom (existing logic — move from `drawCharacterSelect` to `drawHome`).

Push hit rects into `homeButtonRects = []` with shape `{ x, y, w, h, action }`.

Adapt sizing for landscape vs portrait the same way other screens do.

### Step 4 — Add HOME input handling

In `onPressStart()`, add a new branch BEFORE the SELECTING branch:

```js
if (run.state === RUN_STATE.HOME) {
  // username edit hit-test (reuse usernameNameRect as drawn by drawHome)
  if (usernameNameRect && pointerInRect(usernameNameRect)) {
    openUsernameOverlay(RUN_STATE.HOME);
    return;
  }
  // What's-new badge (reuse existing whatsNewBadgeRect logic if present)
  for (const btn of homeButtonRects) {
    if (pointerInRect(btn)) {
      switch (btn.action) {
        case 'play':       run.state = RUN_STATE.SELECTING; break;
        case 'leaderboard': openLeaderboard(RUN_STATE.HOME); break;
        case 'hall':       run.state = RUN_STATE.HALL_OF_FAME; break;
        case 'stats':      run.state = RUN_STATE.PLAYER_STATS; break;
      }
      return;
    }
  }
  return;
}
```

(Inline the existing rect-check style — `pointerInRect` is shorthand.)

### Step 5 — Wire game loop dispatch

In the render dispatch (around index.html:1000), add:

```js
} else if (run.state === RUN_STATE.HOME) {
  drawHome(timestamp);
} else if (run.state === RUN_STATE.HALL_OF_FAME) {
  drawHallOfFame(timestamp);   // stub for now if hall-of-fame plan not yet shipped
} else if (run.state === RUN_STATE.PLAYER_STATS) {
  drawPlayerStats(timestamp);  // stub for now
```

Stub `drawHallOfFame` / `drawPlayerStats` with title + `Back` button if the destination plans haven't shipped yet — clicking Back returns to HOME via the same pattern as the leaderboard back button.

### Step 6 — Update existing back-navigation defaults

Audit existing back paths to send the user to HOME instead of SELECTING where the meaning is "go to the main menu":

- `closeLeaderboard` / `closeLevelSelect`: `run.state = run.lastStateBefore... || RUN_STATE.HOME;`
- Game-over `Change character` button → SELECTING (unchanged — that flow targets character pick directly).
- After a finished run + `Game Over` close → HOME (so the user sees the menu, not character select).

### Step 7 — Move version footer + What's New badge

The version footer + "What's New" pill currently live in `drawCharacterSelect` (around index.html:1606). Move both into `drawHome`. Character select keeps its own footer-less layout.

## Constraints

- HOME is the new "main menu". Username flow precedes HOME just as it currently precedes SELECTING.
- Hall of Fame and Player Stats screens can ship as stubs first; their full behavior is in separate plans.
- No new assets, no schema changes.

## Edge Cases

- First-ever visitor: USERNAME → set name → HOME (not SELECTING, per Step 2 update).
- Returning visitor with username set: load goes straight to HOME.
- Game-over close: returns to HOME, not SELECTING (so stats/HOF discoverable mid-session).
- Pressed back from leaderboard opened via HOME → returns to HOME (existing `lastStateBeforeLeaderboard` mechanism handles this).

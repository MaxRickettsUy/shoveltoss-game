# Plan: High Scores CRUD (localStorage)

**Target system:** scoring-system / persistence / ui

**User feedback:**
- Players want their best scores saved across tab refreshes
- Need a leaderboard view and the ability to clear scores

**Hypothesis:**
A localStorage-backed leaderboard with create / read / delete (and optional name edit) gives players persistence and replay motivation without introducing backend infrastructure.

## 1. GOAL
Persist player high scores in localStorage with create, read, update (name only), and delete operations. Display a top-N leaderboard.

## 2. CHANGE DESCRIPTION
- Storage key: `shoveltoss.highScores` — array of `{ id: string, name: string, score: number, createdAt: number }`.
- **Create:** on game-over, prompt for player name (default to last-used name), save entry.
- **Read:** leaderboard view shows top 10 by score descending; surfaced from main menu and game-over screen.
- **Update:** edit name on an existing entry (tap entry → rename).
- **Delete:** remove single entry; "Clear All" action with confirmation.
- Supersedes the in-memory high score behavior from the lives-system plan.

## 3. EXPECTED EFFECT
- Scores persist across tab refreshes.
- Players see their ranking after each run.
- No backend dependency; works fully offline.

## 4. IMPLEMENTATION STEPS
1. Add a `highScores` module with `list()`, `add(name, score)`, `rename(id, name)`, `remove(id)`, `clear()` — all reading/writing the `shoveltoss.highScores` key. Cap stored entries at 50; sort + slice top 10 for display.
2. On game-over, show a name-entry prompt (prefill from `localStorage.shoveltoss.lastName`); on submit, call `add()` and persist `lastName`.
3. Add a Leaderboard view (top 10, score desc) accessible from main menu and game-over screen. Each row supports rename and delete; include a "Clear All" button with a confirm step.
4. Remove the in-memory `highScore` from game state; replace any reads with `highScores.list()[0]?.score`.

## 5. ROLLBACK STRATEGY
Revert the commit. Restore the in-memory `highScore`. Stale localStorage data is harmless and ignored without the reader code.

## 6. NON-GOALS
- No backend, accounts, or cloud sync.
- No social features (sharing, friends, global leaderboard).
- No score validation / anti-cheat.
- No filtering, search, or pagination beyond top 10.
- No score-edit (only name-edit) — score is immutable once recorded.
- No migration of pre-existing in-memory scores (none exist persistently).
- No analytics or telemetry on score events.

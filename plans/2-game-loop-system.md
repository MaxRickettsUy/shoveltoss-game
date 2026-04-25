# Feature Plan: Game Loop System

---

## 1. GOAL

Add run-level game states (ready, playing, game over) on top of the existing per-throw state machine. Provide a touch-friendly restart flow and ensure the loop handles mobile frame variability gracefully.

---

## 2. SYSTEM CONSTRAINTS

- Build on existing `index.html` — do not restructure into multiple files
- Existing throw states (`IDLE`, `CHARGING`, `FLYING`, `RESETTING`) remain unchanged
- No scoring logic, no difficulty logic, no UI system
- Must handle mobile browser throttling (background tabs, battery saver)
- All transitions triggered by touch (no keyboard-only paths)

---

## 3. GAME STATE MODEL

Two layers of state:

### Run state (new)
| State | Description |
|---|---|
| `READY` | Title/start screen. Waiting for player tap to begin. |
| `PLAYING` | Active run. Throw cycle loops until run ends. |
| `GAME_OVER` | Run ended. Shows result. Waiting for tap to restart. |

### Throw state (existing, unchanged)
`IDLE` → `CHARGING` → `FLYING` → `RESETTING` → `IDLE`

Throw state only advances while run state is `PLAYING`.

---

## 4. LOOP STRUCTURE

The existing `requestAnimationFrame` loop stays. Add run-state awareness:

```
gameLoop(timestamp):
  dt = clamp((timestamp - last) / 1000, 0, 0.05)   // already exists
  last = timestamp

  if runState == READY:
    drawReadyScreen()
  else if runState == PLAYING:
    update(dt, timestamp)   // existing throw update
    draw()                  // existing throw draw
  else if runState == GAME_OVER:
    draw()                  // freeze last frame
    drawGameOverOverlay()
```

The `update` function is only called during `PLAYING`. Drawing always runs.

---

## 5. STATE TRANSITIONS

| From | Trigger | To | Action |
|---|---|---|---|
| `READY` | `touchstart`/`mousedown` | `PLAYING` | Initialize run variables, set throw state to `IDLE` |
| `PLAYING` | Run-end condition met | `GAME_OVER` | Freeze throw state, record run data |
| `GAME_OVER` | `touchstart`/`mousedown` (after 500ms guard) | `READY` | Reset all state |

### Run-end condition
The game loop system does not define *what* ends a run — it exposes a function `endRun()` that other systems (scoring, difficulty) can call. For now, wire a temporary rule: run ends after 5 throws. This is a placeholder constant (`THROWS_PER_RUN = 5`).

### Input guard on GAME_OVER
Prevent accidental restart by ignoring input for 500ms after entering `GAME_OVER`. Use the same timestamp-based guard pattern as the existing `RESETTING` state.

---

## 6. RESET / RESTART LOGIC

`resetRun()` is called when transitioning from `GAME_OVER` → `READY`:

```
resetRun():
  throwCount = 0
  runState = READY
  throwState = IDLE
  meterFill = 0
  meterDir = 1
  power = 0
```

No animation or transition effect. Instant reset to ready screen.

### Mobile considerations
- Tap anywhere to start/restart (no small button targets)
- Ready and game-over screens use large, centered text readable on phone screens
- `visibilitychange` listener: if tab goes hidden during `PLAYING`, pause is not required for MVP but `lastTimestamp` must be reset to `null` to prevent a massive `dt` spike on return

---

## 7. IMPLEMENTATION STEPS

### Step 1: Add run state and throw counter
- Add `runState` variable (`READY`, `PLAYING`, `GAME_OVER`)
- Add `throwCount` variable, increment in `onThrowResult`
- Add `THROWS_PER_RUN = 5` constant
- Initialize `runState = READY`

### Step 2: Gate update/draw on run state
- Wrap existing `update()` call so it only runs during `PLAYING`
- Add `drawReadyScreen()` — centered text: "Tap to Start"
- Add `drawGameOverOverlay()` — overlay text: "Game Over" + "Tap to Restart"
- Existing `draw()` renders the game scene during `PLAYING` and `GAME_OVER`

### Step 3: Wire input to run state transitions
- Modify `onPressStart`: if `READY`, transition to `PLAYING` and return (don't also start charging)
- Modify `onPressStart`: if `GAME_OVER` and past input guard time, call `resetRun()` and return
- Existing throw input logic only executes when `runState === PLAYING`

### Step 4: Implement endRun and resetRun
- `endRun()`: set `runState = GAME_OVER`, record `gameOverTime = timestamp` for input guard
- In `onThrowResult`: increment `throwCount`, if `throwCount >= THROWS_PER_RUN` call `endRun()`
- `resetRun()`: reset `throwCount`, `meterFill`, `power`, set `throwState = IDLE`, `runState = READY`

### Step 5: Handle visibility change
- Add `visibilitychange` listener
- On hidden→visible: set `lastTimestamp = null` to prevent dt spike

---

## 8. NON-GOALS

- Scoring display or score tracking
- Pause menu or pause state
- Difficulty scaling per run
- Animated transitions between states
- Run history or persistence
- Sound or haptic feedback on state change

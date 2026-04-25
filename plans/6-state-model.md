# Feature Plan: Game State Model

---

## 1. GOAL

Consolidate all game state from scattered `let` variables into organized state objects grouped by domain. This is a structural refactor — no behavior changes. The result is a clear, readable state model that makes reset logic reliable and state dependencies explicit.

---

## 2. SYSTEM CONSTRAINTS

- No behavior changes — all existing logic must produce identical results
- No rendering changes
- No new features or gameplay changes
- All state access is direct property access (no getters/setters/classes)
- Maintain single-file `index.html` structure

---

## 3. STATE STRUCTURE

Consolidate into four state objects:

### `run` — run-level state
```js
const run = {
  state: 'ready',       // 'ready' | 'playing' | 'game_over'
  throwCount: 0,
  gameOverTime: 0        // timestamp for input guard
};
```

### `throw_` — per-throw state (underscore to avoid reserved word conflicts)
```js
const throw_ = {
  state: 'idle',         // 'idle' | 'charging' | 'flying' | 'resetting'
  meterFill: 0,
  meterDir: 1,
  power: 0,
  shovelX: 0,
  shovelY: 0,
  flightTime: 0,
  launchVX: 0,
  launchVY: 0,
  originX: 0,
  originY: 0,
  resetEndTime: 0
};
```

### `scoring` — score and feedback state
```js
const scoring = {
  score: 0,
  combo: 0,
  hitsInRun: 0,
  lastThrowPoints: 0,
  lastThrowZone: '',
  feedbackTimer: 0
};
```

### `difficulty` — difficulty scaling state
```js
const difficulty = {
  meterCycleTime: 1.2,   // current (interpolated) value
  pitWidth: 0.26          // current (interpolated) value
};
```

### Not grouped (stay as-is)
- `lastTimestamp` — loop-level, not game state
- Layout variables (`groundY`, `playerX`, etc.) — derived from viewport, not game state
- Constants — unchanged

---

## 4. STATE TRANSITIONS

No transition logic changes. All existing `if` checks and assignments are rewritten to use the new property paths:

| Before | After |
|---|---|
| `runState` | `run.state` |
| `throwCount` | `run.throwCount` |
| `state` | `throw_.state` |
| `meterFill` | `throw_.meterFill` |
| `score` | `scoring.score` |
| `combo` | `scoring.combo` |
| `currentMeterCycleTime` | `difficulty.meterCycleTime` |
| `currentPitWidth` | `difficulty.pitWidth` |

All enum constants (`RUN_STATE`, `STATE`) remain unchanged.

---

## 5. EVENT FLOW

No changes to event flow. The same functions are called in the same order:

```
onPressStart() → checks run.state, then throw_.state
onPressEnd()   → checks throw_.state, sets throw_ properties
update()       → reads/writes throw_, scoring, difficulty
onThrowResult() → writes scoring, run.throwCount, calls endRun/updateDifficulty
resetRun()     → resets run, throw_, scoring, calls updateDifficulty()
```

---

## 6. INTEGRATION POINTS

### `resetRun()` becomes clearer
Instead of resetting 12 individual variables, reset by reassigning object properties in logical groups:

```js
function resetRun() {
  run.throwCount = 0;
  run.state = RUN_STATE.READY;
  throw_.state = STATE.IDLE;
  throw_.meterFill = 0;
  throw_.meterDir = 1;
  throw_.power = 0;
  scoring.score = 0;
  scoring.combo = 0;
  scoring.hitsInRun = 0;
  scoring.lastThrowPoints = 0;
  scoring.lastThrowZone = '';
  scoring.feedbackTimer = 0;
  updateDifficulty();
}
```

### `updateDifficulty()` reads from `run.throwCount`
No logic change, just property path update.

---

## 7. IMPLEMENTATION STEPS

### Step 1: Create state objects
- Declare `run`, `throw_`, `scoring`, `difficulty` objects at the top of the script (after constants, before functions)
- Initialize with the same default values currently used
- Remove the individual `let` declarations they replace

### Step 2: Update all state reads in update/draw
- Find-and-replace all references in `update()`, `draw()`, `drawMeter()`, `drawReadyScreen()`, `drawGameOverOverlay()`
- e.g. `state === STATE.CHARGING` → `throw_.state === STATE.CHARGING`
- e.g. `meterFill` → `throw_.meterFill`
- e.g. `score` → `scoring.score`

### Step 3: Update all state writes in input handlers and hooks
- Update `onPressStart()`, `onPressEnd()`, `onThrowResult()`, `endRun()`, `resetRun()`
- All assignments use new property paths

### Step 4: Update updateDifficulty and updateLayout
- `updateDifficulty()`: read `run.throwCount`, write `difficulty.meterCycleTime`, `difficulty.pitWidth`
- `updateLayout()`: no state object references needed (layout vars stay as-is)

### Step 5: Verify enum constants unchanged
- `RUN_STATE` and `STATE` enums remain as top-level constants
- Comparisons like `run.state === RUN_STATE.READY` work identically
- Remove old `runState` and `state` variable names entirely — no aliases

---

## 8. NON-GOALS

- State management library or framework
- Immutable state or state history
- Event emitter or pub/sub system
- Separating into multiple files or modules
- Adding new state properties
- Changing any game behavior

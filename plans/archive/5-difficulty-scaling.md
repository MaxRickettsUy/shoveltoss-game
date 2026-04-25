# Feature Plan: Difficulty Scaling

---

## 1. GOAL

Gradually increase difficulty within a run by speeding up the throw meter and narrowing the pit width as the player progresses through throws. The first few throws should feel easy and rewarding; later throws demand tighter timing.

---

## 2. SYSTEM CONSTRAINTS

- No physics changes (gravity, angle, velocity range stay the same)
- No scoring rule changes (point values and zones unchanged)
- No UI changes beyond what the pit/meter already render
- Difficulty resets fully on `resetRun()`
- Progression is per-throw within a run, not across runs
- All scaling is linear interpolation between start and end values

---

## 3. DIFFICULTY VARIABLES

Two variables scale with throw progression:

| Variable | Start (throw 1) | End (final throw) | Effect |
|---|---|---|---|
| Meter speed | `METER_CYCLE_TIME` (1.2s) | `METER_CYCLE_TIME_END` (0.6s) | Meter oscillates faster, harder to time |
| Pit width | `PIT_WIDTH_START` (0.26 of canvas) | `PIT_WIDTH_END` (0.16 of canvas) | Smaller landing target |

Both use the same progression factor `t` derived from throw index.

---

## 4. PROGRESSION MODEL

### Progression factor
```
t = throwCount / (THROWS_PER_RUN - 1)
```
- Throw 0 (first): `t = 0` (easiest)
- Final throw: `t = 1` (hardest)
- When `THROWS_PER_RUN === 1`, `t = 0` (no scaling)

### Interpolation
```
currentMeterCycleTime = METER_CYCLE_TIME + t * (METER_CYCLE_TIME_END - METER_CYCLE_TIME)
currentPitWidth = PIT_WIDTH_START + t * (PIT_WIDTH_END - PIT_WIDTH_START)
```

### When scaling applies
- Meter speed: applied each frame during `CHARGING` state, using `currentMeterCycleTime` instead of the constant
- Pit width: applied at the start of each throw cycle (when transitioning to `IDLE`), recalculating `pitLeft` and `pitRight` centered on `pitCenterX`

---

## 5. TUNING RULES

- Meter cycle time must not go below 0.4s (would feel unfair on mobile touch latency)
- Pit width must not go below 0.10 of canvas width (must remain tappable/visible on small screens)
- First throw (throw 0) always uses base difficulty — player's first interaction must feel achievable
- Scaling is linear, not exponential — avoids sudden frustration spikes
- All tuning values are top-level constants for easy adjustment

---

## 6. MOBILE SESSION DESIGN NOTES

- With 5 throws per run at ~5–10s per throw, a full run is 25–50s — fits mobile session length
- Throws 1–2 should feel easy (builds confidence on a new session)
- Throws 3–4 introduce noticeable but fair challenge
- Throw 5 is the hardest — player should feel they earned it
- The narrowing pit provides clear visual feedback that difficulty increased (no hidden mechanics)

---

## 7. IMPLEMENTATION STEPS

### Step 1: Add difficulty constants
- Add `METER_CYCLE_TIME_END = 0.6` (fastest meter speed)
- Add `PIT_WIDTH_START = 0.26` (initial pit as fraction of canvas width)
- Add `PIT_WIDTH_END = 0.16` (final pit as fraction of canvas width)
- Keep existing `METER_CYCLE_TIME = 1.2` as the start value

### Step 2: Add difficulty state and progression function
- Add `currentMeterCycleTime` variable, initialized to `METER_CYCLE_TIME`
- Add `currentPitWidth` variable, initialized to `PIT_WIDTH_START`
- Add `updateDifficulty()` function that calculates `t` from `throwCount` and interpolates both values
- Call `updateDifficulty()` in `resetRun()` to reset to base values

### Step 3: Wire meter speed to difficulty
- In the `CHARGING` update block, replace `METER_CYCLE_TIME` with `currentMeterCycleTime`
- No other meter logic changes

### Step 4: Wire pit width to difficulty
- In `updateDifficulty()`, recalculate `pitLeft` and `pitRight` from `currentPitWidth` centered on `pitCenterX`
- `pitCenterX` stays fixed (center of canvas * existing ratio)
- Call `updateDifficulty()` after each throw completes (in the `RESETTING → IDLE` transition) so the pit narrows for the next throw

### Step 5: Reset difficulty on run reset
- In `resetRun()`, call `updateDifficulty()` which will use `throwCount = 0` to restore base values
- Ensure `updateLayout()` recalculates `pitCenterX` but does not override difficulty-adjusted `pitLeft`/`pitRight`

---

## 8. NON-GOALS

- Cross-run difficulty persistence
- Player-selectable difficulty levels
- Visual indicators or warnings about difficulty changes
- Gravity or angle changes
- Scoring multiplier changes based on difficulty
- Adaptive difficulty (adjusting based on player performance)

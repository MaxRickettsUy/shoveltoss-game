# Feature Plan: Constant Meter Speed

---

## 1. GOAL

Drop the per-throw meter-speed ramp and run the meter at a single tuned cycle time for the entire run. Sweet-spot narrowing and pit width are out of scope and remain unchanged.

---

## 2. CHANGE DESCRIPTION

### Speed
- Remove `METER_CYCLE_TIME_END`.
- `METER_CYCLE_TIME` becomes the single, fixed cycle time, retuned to `0.85` seconds — moderately challenging, between the prior easy (`1.2`) and hard (`0.45`) endpoints.

### `updateDifficulty()`
- The meter-speed lerp + `Math.max(0.4, ...)` clamp is replaced with a single assignment: `difficulty.meterCycleTime = METER_CYCLE_TIME;`.
- The progression factor `t` remains in use for sweet-spot narrowing (unchanged).
- Pit width assignment (`difficulty.pitWidth = PIT_WIDTH;`) remains unchanged.

### Out of scope (unchanged)
- Sweet-spot narrowing (`SWEET_SPOT_*` constants and `difficulty.sweetMin / sweetMax`).
- Pit width and pit position.
- `update()` charging math, `onPressEnd()`, scoring zones, combo rules.
- Physics (`V_MIN`, `V_MAX`, `G`, `throwAngle`).
- Layout, HUD, wall, deflection.

---

## 3. EXPECTED EFFECT

- Meter cycle feels identical on throw 1 and throw 5 — no speed surprise mid-run.
- Players can build a stable mental model for release timing, supporting skill development.
- Difficulty curve within a run still exists via the existing sweet-spot narrowing, but it's a target-size change, not a speed change.

---

## 4. IMPLEMENTATION STEPS

### Step 1: Collapse the two speed constants into one
- Remove `const METER_CYCLE_TIME_END = 0.45;`.
- Change `const METER_CYCLE_TIME = 1.2;` to `const METER_CYCLE_TIME = 0.85;`.

### Step 2: Simplify `updateDifficulty()`
- Replace this line:
  ```
  difficulty.meterCycleTime = Math.max(0.4, METER_CYCLE_TIME + t * (METER_CYCLE_TIME_END - METER_CYCLE_TIME));
  ```
  with:
  ```
  difficulty.meterCycleTime = METER_CYCLE_TIME;
  ```
- Leave the `t` calculation and the rest of the function (pit width, sweet-spot lerp, `pitLeft` / `pitRight`, `wallX`) unchanged.

### Step 3: Manual playtest
- Throw 1 and throw 5 meter cycles should feel identical in speed.
- Confirm sweet-spot still visibly narrows across throws (separate system, must be untouched).
- If `0.85` feels too easy or too punishing, adjust the single `METER_CYCLE_TIME` constant — no other code changes required.

---

## 5. ROLLBACK STRATEGY

- Restore `const METER_CYCLE_TIME = 1.2;` and re-add `const METER_CYCLE_TIME_END = 0.45;`.
- Restore the lerp + `Math.max(0.4, ...)` line in `updateDifficulty()`.

A single revert of the feature commit fully restores prior dynamic-speed behavior. No other system is touched.

---

## 6. NON-GOALS

- No changes to sweet-spot scaling, pit width, pit position, or wall.
- No changes to physics, scoring, combos, or input handling.
- No removal of the `difficulty.meterCycleTime` field or the `t` progression factor (still used by the sweet-spot lerp).
- No new player-selectable difficulty or run-length controls.
- No tuning of `V_MIN`, `V_MAX`, or `G`.

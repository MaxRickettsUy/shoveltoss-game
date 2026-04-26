# Feature Plan: Meter → Power Rebalance

---

## 1. GOAL

Reduce overshoot on sweet-spot releases by remapping meter fill to throw power so that the sweet-spot center yields a power suitable for landing in the pit, rather than the launch velocity that currently overshoots the wall. Mapping is the only thing that changes — meter UI, sweet-spot position, physics, and `V_MIN` / `V_MAX` are all left alone.

---

## 2. CHANGE DESCRIPTION

### Today
- `onPressEnd()` does `throw_.power = throw_.meterFill;` — a 1:1 linear mapping.
- A perfect sweet-spot release (`meterFill ≈ 0.80`) produces `power = 0.80` → `V = 300 + 0.80 * 500 = 700` px/s, which overshoots the pit and frequently the wall.

### After
- A piecewise-linear remap with two segments anchored at `SWEET_SPOT_CENTER`:
  - Below the sweet-spot center, fill maps proportionally to `[0, POWER_AT_SWEET]`.
  - Above the sweet-spot center, fill maps proportionally to `[POWER_AT_SWEET, 1]`.
- `POWER_AT_SWEET = 0.55` is calibrated so a perfect sweet-spot release yields `V ≈ 575` px/s, which lands comfortably inside the pit at typical canvas sizes.
- Full meter (`fill = 1.0`) still produces `power = 1.0` → `V = 800` px/s, so high-power throws can still reach and bounce off the wall.

### Out of scope (unchanged)
- Meter rendering (`drawMeter()`, sweet-spot band, fill direction, color).
- `SWEET_SPOT_CENTER`, `SWEET_SPOT_HALF_*` and the existing sweet-spot narrowing.
- `V_MIN`, `V_MAX`, `G`, `throwAngle`, projectile integration.
- Scoring, combos, pit / wall layout, deflection rule.
- Result struct shape — `result.power` continues to carry the post-mapped value.

---

## 3. EXPECTED EFFECT

- A clean sweet-spot release reliably lands the shovel inside the pit instead of overshooting.
- Releases below the sweet-spot still fall short proportionally — no surprise dead zone at low fill.
- Releases above the sweet-spot ramp steeply toward `V_MAX`, preserving the option to deliberately overshoot for a wall bounce.
- The visible meter, sweet-spot band, and oscillation behavior look identical to before.

---

## 4. IMPLEMENTATION STEPS

### Step 1: Add the new mapping constant
- Beside the existing `SWEET_SPOT_*` constants, add:
  ```
  const POWER_AT_SWEET = 0.55;
  ```

### Step 2: Replace the meter→power assignment in `onPressEnd()`
- Replace the current line:
  ```
  throw_.power = throw_.meterFill;
  ```
  with:
  ```
  const f = throw_.meterFill;
  if (f < SWEET_SPOT_CENTER) {
    throw_.power = (f / SWEET_SPOT_CENTER) * POWER_AT_SWEET;
  } else {
    throw_.power = POWER_AT_SWEET
      + ((f - SWEET_SPOT_CENTER) / (1 - SWEET_SPOT_CENTER)) * (1 - POWER_AT_SWEET);
  }
  ```
- No other lines in `onPressEnd()` change. The downstream `V = V_MIN + throw_.power * (V_MAX - V_MIN)` continues to work because `throw_.power` is still in `[0, 1]`.

### Step 3: Manual playtest pass
- Release exactly at the sweet-spot center: shovel lands inside the pit (no overshoot to wall).
- Release at the top of the sweet-spot band (just past `SWEET_SPOT_CENTER`): shovel still lands in or near the pit; should not consistently overshoot.
- Release at full fill (`~1.0`): shovel reaches the wall and deflects, confirming `V_MAX` is still attainable.
- Release at low fill (`~0.20`): shovel falls well short, confirming the low-end mapping is not dead-zoned.
- If overshoot persists, drop `POWER_AT_SWEET` to `0.50`; if sweet-spot now undershoots the pit, raise it to `0.58`. No other code edits needed for tuning.

---

## 5. ROLLBACK STRATEGY

- Restore the single line `throw_.power = throw_.meterFill;` in `onPressEnd()`.
- Remove the `POWER_AT_SWEET` constant.

A single revert of the feature commit fully restores prior linear behavior. No physics, scoring, layout, or UI paths are touched.

---

## 6. NON-GOALS

- No changes to `V_MIN`, `V_MAX`, `G`, or `throwAngle`.
- No changes to meter rendering, sweet-spot band visual, or fill direction.
- No changes to `SWEET_SPOT_CENTER`, `SWEET_SPOT_HALF_START`, `SWEET_SPOT_HALF_END`, or the per-throw narrowing.
- No changes to scoring, combos, or pit / wall geometry.
- No nonlinear curves beyond the two-segment piecewise linear (no exponentials, sigmoids, or splines).
- No retuning of pit position or wall to compensate.

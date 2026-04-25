# Feature Plan: Shift Difficulty From Pit Width To Meter

---

## 1. GOAL

Hold the pit width constant across an entire run and move all difficulty progression into the throw meter (cycle speed + a narrowing sweet-spot band). Scoring rules and physics remain untouched.

---

## 2. CHANGE DESCRIPTION

### Pit
- `PIT_WIDTH_START` and `PIT_WIDTH_END` are replaced with a single `PIT_WIDTH = 0.22` (midpoint of the prior range).
- `difficulty.pitWidth` is set directly from `PIT_WIDTH` — no interpolation, no per-throw recompute beyond the existing centered `pitLeft` / `pitRight` math.

### Meter cycle time
- `METER_CYCLE_TIME_END` is tightened from `0.6` → `0.45` so timing pressure ramps harder over a run, compensating for the removal of pit narrowing. The existing `0.4` clamp floor stays.

### Sweet-spot band (visual + aim guide)
- Sweet-spot becomes a narrowing band centered on a fixed power.
- New constants:
  - `SWEET_SPOT_CENTER = 0.80`
  - `SWEET_SPOT_HALF_START = 0.10` (band of width 0.20 at throw 0)
  - `SWEET_SPOT_HALF_END = 0.05` (band of width 0.10 at final throw)
- Old `SWEET_SPOT_MIN` / `SWEET_SPOT_MAX` constants are removed.
- New per-run state on `difficulty`: `sweetMin`, `sweetMax`, recomputed in `updateDifficulty()` from the same progression factor `t` already used for cycle time.

### Out of scope (unchanged)
- Scoring zones, point values, combo rules.
- Physics constants (`V_MIN`, `V_MAX`, `G`, `ANGLE`).
- Wall, pit position, layout, HUD.

---

## 3. EXPECTED EFFECT

- Pit visibly stays the same size for the whole run — spatial target is stable and predictable.
- Meter feels like the source of difficulty: it cycles faster *and* its target band shrinks visually as throws progress.
- One-thumb playability is preserved (no new inputs, no new states).

---

## 4. IMPLEMENTATION STEPS

### Step 1: Constantize pit width
- Replace `PIT_WIDTH_START = 0.26` and `PIT_WIDTH_END = 0.16` with a single `PIT_WIDTH = 0.22`.
- In `updateDifficulty()`, replace the pit-width interpolation line with `difficulty.pitWidth = PIT_WIDTH;` and remove the `Math.max(0.10, ...)` floor for pit width (not needed for a constant).
- Leave `pitLeft` / `pitRight` recompute logic intact — it now produces the same result every throw.

### Step 2: Tighten meter cycle time scaling
- Change `METER_CYCLE_TIME_END` from `0.6` to `0.45`.
- No other meter-speed code changes; the existing `Math.max(0.4, ...)` floor remains.

### Step 3: Replace fixed sweet-spot with narrowing band
- Remove `SWEET_SPOT_MIN` and `SWEET_SPOT_MAX`.
- Add `SWEET_SPOT_CENTER = 0.80`, `SWEET_SPOT_HALF_START = 0.10`, `SWEET_SPOT_HALF_END = 0.05`.
- Add `sweetMin: SWEET_SPOT_CENTER - SWEET_SPOT_HALF_START` and `sweetMax: SWEET_SPOT_CENTER + SWEET_SPOT_HALF_START` to the `difficulty` state object's initializer.
- In `updateDifficulty()`, after computing `t`, add:
  ```
  const half = SWEET_SPOT_HALF_START + t * (SWEET_SPOT_HALF_END - SWEET_SPOT_HALF_START);
  difficulty.sweetMin = SWEET_SPOT_CENTER - half;
  difficulty.sweetMax = SWEET_SPOT_CENTER + half;
  ```

### Step 4: Wire dynamic sweet-spot into rendering
- In `drawMeter()`, replace `SWEET_SPOT_MIN` / `SWEET_SPOT_MAX` references with `difficulty.sweetMin` / `difficulty.sweetMax` for the sweet-spot band rectangle.
- In `drawMeter()`'s `inSweet` calculation, use `difficulty.sweetMin` / `difficulty.sweetMax` instead of the removed constants.
- No `update()` / `onPressEnd()` / `onThrowResult()` changes required (those code paths do not reference sweet-spot).

---

## 5. ROLLBACK STRATEGY

Each change is a localized constant or single-line edit:
- **Pit**: restore `PIT_WIDTH_START = 0.26`, `PIT_WIDTH_END = 0.16`, restore the lerp + `Math.max(0.10, ...)` floor in `updateDifficulty()`.
- **Cycle time**: change `METER_CYCLE_TIME_END` back to `0.6`.
- **Sweet-spot**: restore `SWEET_SPOT_MIN = 0.7` and `SWEET_SPOT_MAX = 0.9`, remove the three new sweet-spot constants and the `difficulty.sweetMin/sweetMax` fields, revert `drawMeter()` to use the constants.

A single revert of the feature commit fully restores prior behavior. No scoring, physics, layout, or state-machine touch points.

---

## 6. NON-GOALS

- No changes to scoring zones, point values, or combo math.
- No changes to physics (`V_MIN`, `V_MAX`, `G`, `ANGLE`) or wall/deflection.
- No changes to pit position, layout, or HUD.
- No new state objects, state enums, or input handling.
- No tying sweet-spot to scoring (it remains a visual aim guide).
- No per-run player-selectable difficulty.

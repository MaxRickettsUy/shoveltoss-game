# Feature Plan: Orientation-Aware Arc Tuning

---

## 1. GOAL

Make the shovel arc feel visually consistent in portrait and landscape by computing the launch angle from the canvas aspect ratio. Physics integration (gravity, velocity range, projectile equations) is left alone — only the launch angle becomes a variable.

---

## 2. CHANGE DESCRIPTION

### Why angle (not gravity)
At a fixed 45° launch, peak height equals one-quarter of the range. On a tall portrait canvas the arc is geometrically the same shape but occupies a small fraction of canvas height, so it reads as "straight." Adjusting `G` does not change arc *shape* (peak/range ratio depends only on angle). Adapting the launch angle is the minimal lever that makes the arc taller in portrait and flatter in landscape without reworking physics.

### What changes
- The fixed `const ANGLE = Math.PI / 4;` becomes a `let throwAngle;` recomputed on every `updateLayout()` call (i.e., on resize / orientation change).
- `throwAngle` is linearly interpolated between a landscape angle and a portrait angle, keyed off `canvas.height / canvas.width`.
- `onPressEnd()` reads `throwAngle` instead of `ANGLE` when computing `launchVX` / `launchVY`.

### New constants
- `ANGLE_LANDSCAPE = Math.PI * 35 / 180` (flatter arc on wide screens)
- `ANGLE_PORTRAIT  = Math.PI * 65 / 180` (taller arc on tall screens)
- `ASPECT_LANDSCAPE = 0.6` (aspect at/below which we use full landscape angle)
- `ASPECT_PORTRAIT  = 1.5` (aspect at/above which we use full portrait angle)

### Out of scope (unchanged)
- `V_MIN`, `V_MAX`, `G`, projectile integration in `update()`.
- Pit position, wall position, scoring, sweet-spot, meter behavior.
- Wall bounce condition.
- HUD, layout, rendering scale (no virtual-coordinate system introduced).

---

## 3. EXPECTED EFFECT

- Portrait throws read as a clearly arched lob — peak height becomes a noticeable fraction of canvas height instead of a near-flat line.
- Landscape throws stay relatively flat, matching the wider play field.
- Mid-orientation aspect ratios (e.g., tablets or split-screen) interpolate smoothly between the two angle anchors.
- Mid-flight rotation is safe: `launchVX` / `launchVY` are snapshotted at release; future throws pick up the new angle on the next release.

---

## 4. IMPLEMENTATION STEPS

### Step 1: Replace fixed angle constant with adaptive state
- Remove `const ANGLE = Math.PI / 4;`.
- Add the four new constants (`ANGLE_LANDSCAPE`, `ANGLE_PORTRAIT`, `ASPECT_LANDSCAPE`, `ASPECT_PORTRAIT`) alongside the other physics constants.
- Add `let throwAngle;` to the layout-let block (initialized in `updateLayout()`).

### Step 2: Compute `throwAngle` in `updateLayout()`
- After `safeTop` / `groundY` are computed, append:
  ```
  const aspect = canvas.height / canvas.width;
  const tA = Math.max(0, Math.min(1,
    (aspect - ASPECT_LANDSCAPE) / (ASPECT_PORTRAIT - ASPECT_LANDSCAPE)
  ));
  throwAngle = ANGLE_LANDSCAPE + tA * (ANGLE_PORTRAIT - ANGLE_LANDSCAPE);
  ```
- No other layout changes.

### Step 3: Use `throwAngle` at launch
- In `onPressEnd()`, replace:
  ```
  throw_.launchVX = V * Math.cos(ANGLE);
  throw_.launchVY = V * Math.sin(ANGLE);
  ```
  with:
  ```
  throw_.launchVX = V * Math.cos(throwAngle);
  throw_.launchVY = V * Math.sin(throwAngle);
  ```
- No other call sites reference `ANGLE`.

### Step 4: Manual orientation playtest
- Portrait phone: confirm arc visibly peaks well above the player; sweet-spot release still reaches the pit area.
- Landscape phone: confirm arc stays flatter and pit is reachable within the existing power range.
- Rotate device mid-run: confirm in-flight projectiles complete normally and the next throw uses the new angle.
- If portrait arc feels too floaty or landscape feels too flat, nudge `ANGLE_PORTRAIT` / `ANGLE_LANDSCAPE` by ±5°.

---

## 5. ROLLBACK STRATEGY

- Restore `const ANGLE = Math.PI / 4;` and remove the four new constants and `let throwAngle;`.
- Remove the `throwAngle` computation block from `updateLayout()`.
- Revert `onPressEnd()` to use `Math.cos(ANGLE)` / `Math.sin(ANGLE)`.

A single revert of the feature commit fully restores prior behavior. No other system is touched.

---

## 6. NON-GOALS

- No virtual coordinate system or world-units → pixel-units transform.
- No changes to `V_MIN`, `V_MAX`, `G`, or the projectile integration.
- No per-orientation pit-position, wall-position, or layout branching.
- No per-throw or per-difficulty angle changes — angle depends solely on canvas aspect.
- No charged-angle input (angle is not player-controlled).
- No animation or smoothing of `throwAngle` during a rotation event (instant snap is acceptable).

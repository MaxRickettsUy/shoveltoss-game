# Feature Plan: Shovel Rotation + Angle-Based Stick

---

## 1. GOAL

Give the shovel a visible handle/blade and a deterministic in-flight rotation, then upgrade the scoring system so that the existing `stick` outcome is gated by the shovel's landing orientation rather than its landing position. The shovel's two ends are rendered distinctly so the rotation is legible.

---

## 2. CHANGE DESCRIPTION

### Visual + state
- The shovel is no longer a single grey rect. It becomes a two-segment rendered shape: a brown handle and a silver blade, drawn rotated around the shovel's center.
- A new `throw_.angle` (radians) tracks the shovel's current rotation. It is initialized to `0` at launch, integrated each frame during `FLYING`, and **not** reset on a wall bounce (rotation is continuous through the bounce).

### Scoring integration (replaces positional stick gate)
- The existing positional `stick` zone (`norm ∈ [ZONE_STICK_MIN, ZONE_STICK_MAX]`) is removed.
- `stick` is now awarded when the landing orientation is near vertical ("parallel to the wall"), regardless of `norm` (so long as the shovel lands in the pit).
- Horizontal landings inside the pit fall through to the existing `front_wall` / `in_pit` / `back_wall` positional zones.
- `miss` (-2) remains purely positional (outside the pit).

### Constants
- `SHOVEL_ROT_RATE = 9` (rad/s, ~515°/s — about 1.4 turns/sec).
- `VERTICAL_BAND_DEG = 30` (half-width of the vertical-orientation window, in degrees).
- Removed: `ZONE_STICK_MIN`, `ZONE_STICK_MAX` (no longer referenced).

### Out of scope (unchanged)
- Projectile integration (`launchVX`, `launchVY`, gravity, `throwAngle`).
- Wall, deflection rule, pit position, layout, meter, sweet-spot.
- `PTS_*` values, combo formula, `hitsInRun` rule.
- `ZONE_FRONT_WALL_MAX`, `ZONE_BACK_WALL_MIN`.

---

## 3. EXPECTED EFFECT

- The shovel visibly tumbles end-over-end during flight; the player can see handle vs blade orientation at all times.
- Skilled timing: a player who releases such that landing time × `SHOVEL_ROT_RATE` lands within ±30° of vertical scores `stick` (3 pts).
- Off-vertical landings still score normally based on landing position — the new rule replaces, not stacks on, the old positional stick zone.
- Wall bounces preserve rotation (no visual snap) and angle classification still applies at the eventual ground landing.

---

## 4. ROTATION MODEL

- State: `throw_.angle` (radians).
- Lifecycle:
  - On `onPressEnd()` (launch): `throw_.angle = 0`.
  - In `update()` `STATE.FLYING` branch (and after the bounce block): `throw_.angle += SHOVEL_ROT_RATE * dt`.
  - On `resetRun()`: `throw_.angle = 0`.
  - **Not** reset by the wall-bounce block (rotation is continuous through the bounce).
- Render: in `draw()`, when `throw_.state === STATE.FLYING || STATE.RESETTING`, draw the shovel via:
  ```
  ctx.save();
  ctx.translate(throw_.shovelX, throw_.shovelY);
  ctx.rotate(throw_.angle);
  // Handle (brown), centered, extends left from origin
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(-14, -3, 20, 6);
  // Blade (silver), to the right of handle
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(6, -5, 8, 10);
  ctx.restore();
  ```
- Direction is fixed (always rotates the same way). Rate is independent of throw power — predictable per flight duration.

---

## 5. IMPACT CLASSIFICATION MODEL

At landing (inside `onThrowResult()`), compute orientation modulo 180° (handle-up vs handle-down are treated the same):

```
const orientationDeg = ((throw_.angle * 180 / Math.PI) % 180 + 180) % 180;  // [0, 180)
const isVertical = Math.abs(orientationDeg - 90) <= VERTICAL_BAND_DEG;       // within ±30° of vertical
```

Decision table (replaces the prior in-pit branch):

| `inPit` | Orientation | `norm`                       | Zone id      | Base points |
|---------|-------------|------------------------------|--------------|-------------|
| no      | —           | —                            | `miss`       | -2          |
| yes     | vertical    | any                          | `stick`      | 3           |
| yes     | horizontal  | `< ZONE_FRONT_WALL_MAX`      | `front_wall` | 0           |
| yes     | horizontal  | `> ZONE_BACK_WALL_MIN`       | `back_wall`  | 2           |
| yes     | horizontal  | otherwise                    | `in_pit`     | 1           |

Combo / `hitsInRun` rules from plan 13 are unchanged.

---

## 6. IMPLEMENTATION STEPS

### Step 1: Add rotation constants and state
- Add `const SHOVEL_ROT_RATE = 9;` and `const VERTICAL_BAND_DEG = 30;` alongside the other physics constants.
- Add `angle: 0` to the `throw_` state object's initializer.
- Remove the now-unused `ZONE_STICK_MIN` and `ZONE_STICK_MAX` constants.

### Step 2: Drive rotation each frame
- In `onPressEnd()`, set `throw_.angle = 0;` immediately after `throw_.flightTime = 0;`.
- In `resetRun()`, add `throw_.angle = 0;` near the other `throw_` resets.
- In `update()`'s `STATE.FLYING` branch, after the existing bounce block (so it runs every frame, including the post-bounce frame), add:
  ```
  throw_.angle += SHOVEL_ROT_RATE * dt;
  ```
- Do **not** reset `throw_.angle` inside the bounce block — rotation must be continuous across the bounce.

### Step 3: Render the rotated handle/blade shovel
- In `draw()`, replace the existing single-rect shovel block (the `if (throw_.state === STATE.FLYING || ... === STATE.RESETTING)` body) with the `ctx.save()` / `translate` / `rotate` / two-rect / `restore()` sequence from section 4.
- No other draw-order changes; the new shovel still draws between the player and the meter.

### Step 4: Apply angle to scoring in `onThrowResult()`
- At the top of the in-pit branch (where `norm` is already computed), compute `orientationDeg` and `isVertical` per section 5.
- Replace the stick / back_wall / in_pit / front_wall conditional with the section-5 decision table:
  ```
  if (isVertical) {
    zone = 'stick';      basePoints = PTS_STICK;
  } else if (norm < ZONE_FRONT_WALL_MAX) {
    zone = 'front_wall'; basePoints = PTS_FRONT_WALL;
  } else if (norm > ZONE_BACK_WALL_MIN) {
    zone = 'back_wall';  basePoints = PTS_BACK_WALL;
  } else {
    zone = 'in_pit';     basePoints = PTS_IN_PIT;
  }
  ```
- The combo / `hitsInRun` / `score` block below this branch is unchanged.

---

## 7. ROLLBACK STRATEGY

- Remove `SHOVEL_ROT_RATE`, `VERTICAL_BAND_DEG`, and the `throw_.angle` field (and its three reset/integration sites in `onPressEnd()`, `resetRun()`, and `update()`).
- Restore the original single-rect shovel render block in `draw()`.
- Restore the prior in-pit branch in `onThrowResult()` (with `ZONE_STICK_MIN` / `ZONE_STICK_MAX` constants re-added) so that stick is again positional.

A single revert of the feature commit fully restores prior behavior. No physics, layout, meter, or wall paths are touched.

---

## 8. NON-GOALS

- No rigid-body simulation, torque, air drag, or angular friction.
- No power-dependent or angle-dependent rotation rate (rate is a fixed constant).
- No bounce-induced spin change (rotation rate and direction are unchanged by the wall hit).
- No new scoring values; existing `PTS_*` constants and combo math are unchanged.
- No new feedback text, particle effect, sprite asset, or sound for orientation outcomes.
- No change to the wall-deflection condition or bounce body.
- No persistence or display of landing angle in the HUD or game-over screen.

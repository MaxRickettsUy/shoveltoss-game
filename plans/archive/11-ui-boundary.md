# Feature Plan: Shorter Wall + Open Sky

---

## 1. GOAL

Shrink the visible wall further and remove the invisible ceiling that currently lets any shovel crossing `wallX` deflect regardless of altitude. After this change, the bounce zone matches the visible wall — shovels arcing above the wall top fly past it and land (or miss) freely off-screen.

---

## 2. CHANGE DESCRIPTION

### Wall visual
- `WALL_HEIGHT_FRACTION` drops from `0.50` to `0.30` of canvas height.
- `wallTopY` is recomputed in `updateLayout()` from the new fraction (no other layout change).

### Bounce-collision now matches the visible wall
- The bounce condition in `update()` gains a vertical bound:
  ```
  !throw_.bounced
    && throw_.shovelX >= wallX
    && throw_.shovelY >= wallTopY
    && throw_.shovelY < groundY
  ```
- Shovels at altitude (`shovelY < wallTopY`) clear the wall and continue along their parabola.

### Off-screen flight
- Existing landing detection (`shovelY >= groundY`) is altitude-only and already resolves at any `shovelX`; a shovel that clears the wall still terminates when gravity brings it back to ground, with `result.inPit = false`, `combo = 0`, `lastThrowZone = 'miss'`.
- Canvas clipping handles rendering the shovel off-screen; no draw guards needed.

### Out of scope (unchanged)
- `wallX` placement, `WALL_GAP`, `WALL_THICKNESS`.
- Pit position, pit width, sweet-spot, scoring zones, point values.
- Projectile integration, `V_MIN`, `V_MAX`, `G`, `throwAngle`.
- HUD, meter, ready/game-over screens.

---

## 3. EXPECTED EFFECT

- Wall reads as a small backstop rather than a corridor wall.
- High-arc throws now visibly fly *over* the wall and miss (no more invisible-ceiling bounce). Low-arc overshoots still deflect off the wall as before.
- Scoring system is unaffected: off-screen landings register as misses through the existing `inPit` check.

---

## 4. IMPLEMENTATION STEPS

### Step 1: Lower the wall visual
- Change `const WALL_HEIGHT_FRACTION = 0.50;` to `const WALL_HEIGHT_FRACTION = 0.30;`.
- No `updateLayout()` body change required — `wallTopY` already derives from this constant.

### Step 2: Add altitude bound to the bounce check
- In `update()`, inside the `STATE.FLYING` branch, change the existing bounce condition from:
  ```
  if (!throw_.bounced && throw_.shovelX >= wallX && throw_.shovelY < groundY) {
  ```
  to:
  ```
  if (!throw_.bounced
      && throw_.shovelX >= wallX
      && throw_.shovelY >= wallTopY
      && throw_.shovelY < groundY) {
  ```
- Body of the bounce block is unchanged.

### Step 3: Manual verification
- Low-power overshoot: shovel deflects off wall as before.
- Mid/high-power throw whose arc peaks above `wallTopY`: shovel passes over the wall, descends past it, lands off-screen → scored as `miss`, combo resets, no score added.
- Confirm `RESETTING → IDLE` transition still fires after off-screen landing (the existing `RESET_DELAY` timer does not depend on shovel position).

---

## 5. ROLLBACK STRATEGY

- Restore `const WALL_HEIGHT_FRACTION = 0.50;`.
- Remove the `&& throw_.shovelY >= wallTopY` clause from the bounce condition in `update()`.

A single revert of the feature commit fully restores prior behavior. No scoring, layout, meter, or physics paths are touched.

---

## 6. NON-GOALS

- No changes to scoring, miss detection, or combo reset rules.
- No changes to pit, meter, HUD, or other UI elements.
- No changes to physics integration or projectile equations.
- No multi-bounce or angled deflection — the single-bounce horizontal-flip rule is preserved.
- No max-flight-time cap or off-screen kill timer (gravity still resolves all throws within bounded time).
- No new feedback text or particle effects for "flew over" outcomes.

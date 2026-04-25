# Feature Plan: Top Meter, Far Pit, Wall Deflection

---

## 1. GOAL

Reposition the throw meter to a horizontal bar at the top of the screen, move the dirt pit to the far end of the play field, add a vertical wall behind the pit, and allow the shovel to deflect off the wall back toward the pit so overshoots can still score.

---

## 2. CHANGE DESCRIPTION

### Layout
- Throw meter becomes a horizontal bar spanning the top of the canvas; fills left-to-right; sweet-spot rendered as a horizontal band.
- Score, throw counter, and combo HUD elements reflow to render *below* the meter band.
- `pitCenterX` moves from `canvas.width * 0.55` to `canvas.width * 0.80`.

### Wall
- A vertical wall is rendered just past `pitRight`, extending from `y = 0` down to `groundY`.
- `wallX = pitRight + WALL_GAP`, recomputed inside `updateDifficulty()` because `pitRight` shifts with difficulty.

### Deflection
- While `throw_.state === FLYING`, if the shovel crosses `wallX` and has not yet bounced this throw:
  - Clamp `shovelX` to `wallX`.
  - Reverse horizontal velocity with `BOUNCE_DAMPING`.
  - Preserve current vertical velocity.
  - Rebase the arc origin to the bounce point and reset `flightTime`.
  - Mark the throw as bounced (max 1 bounce per throw).
- Standard landing detection (`shovelY >= groundY`) continues to drive scoring; `result.inPit` is unchanged.

### New constants
- `BOUNCE_DAMPING = 0.6`
- `WALL_GAP = 12` (px between pit edge and wall)
- `WALL_THICKNESS = 8`
- `METER_HEIGHT_FRACTION = 0.06` (top meter band height as fraction of canvas height)

---

## 3. EXPECTED EFFECT

- Horizontal top meter is more readable on portrait mobile and matches user expectation.
- Pit at the far end clarifies the spatial goal of the throw.
- Wall deflection converts some overshoots into recoverable hits, adding "near-miss recovery" satisfaction without changing core timing or scoring rules.

---

## 4. IMPLEMENTATION STEPS

### Step 1: Reposition meter and reflow HUD
- In `updateLayout()`, replace meter coordinates with:
  - `meterX = HUD_PAD`
  - `meterWidth = canvas.width - HUD_PAD * 2`
  - `meterY = safeTop`
  - `meterHeight = Math.max(36, canvas.height * METER_HEIGHT_FRACTION)`
- Rewrite `drawMeter()` for horizontal layout:
  - Fill grows left-to-right: `fillW = meterWidth * throw_.meterFill`
  - Sweet-spot band: `sweetX = meterX + meterWidth * SWEET_SPOT_MIN`, `sweetW = meterWidth * (SWEET_SPOT_MAX - SWEET_SPOT_MIN)`
  - `'POWER'` label rendered centered above or below the bar
- In `draw()`, set HUD Y baseline below the meter: `hudY = meterY + meterHeight + HUD_PAD + hudFontSize`. Combo badge offsets from this new `hudY`.

### Step 2: Move pit and add wall geometry + render
- In `updateLayout()`, change `pitCenterX = canvas.width * 0.80`.
- In `updateDifficulty()`, after `pitLeft` / `pitRight` are computed, add:
  - `wallX = Math.min(pitRight + WALL_GAP, canvas.width - WALL_THICKNESS)`
- In `draw()`, after the pit zone renders, draw the wall rectangle from `(wallX, 0)` to `(wallX + WALL_THICKNESS, groundY)` using a contrasting fill (e.g. `#3a3a4a`) with a 2px stroke for definition.

### Step 3: Implement single-bounce deflection in flight update
- Add `bounced: false` to the `throw_` state object.
- Reset `throw_.bounced = false` in `onPressEnd()` (when transitioning to `FLYING`) and in `resetRun()`.
- In `update()`, inside the `STATE.FLYING` branch, after computing `shovelX` / `shovelY` and **before** the landing check, insert:
  ```
  if (!throw_.bounced && throw_.shovelX >= wallX && throw_.shovelY < groundY) {
    const vy = throw_.launchVY - G * throw_.flightTime;
    throw_.shovelX  = wallX;
    throw_.originX  = throw_.shovelX;
    throw_.originY  = throw_.shovelY;
    throw_.launchVX = -Math.abs(throw_.launchVX) * BOUNCE_DAMPING;
    throw_.launchVY = vy;
    throw_.flightTime = 0;
    throw_.bounced  = true;
  }
  ```

### Step 4: Manual playtest verification
- Sweet-spot throws land in pit directly (no bounce).
- High-power overshoots strike the wall, deflect leftward, and have a chance to land in the pit.
- A bounced shovel cannot bounce again (verify by inspecting `throw_.bounced` after one bounce).
- Resetting a run clears `throw_.bounced` so the next throw starts fresh.

---

## 5. ROLLBACK STRATEGY

Each change is localized; revert the feature commit to fully restore prior behavior. Manual rollback per concern:
- **Meter / HUD**: restore previous `meterX/Y/Width/Height` block in `updateLayout()` and the original vertical `drawMeter()` body; restore `hudY = safeTop + hudFontSize`.
- **Pit / Wall**: restore `pitCenterX = canvas.width * 0.55`; remove the `wallX` line in `updateDifficulty()` and the wall draw block in `draw()`.
- **Deflection**: remove the bounce block in `update()` and delete the `bounced` field from `throw_` plus its resets.

No external state, scoring, or run-lifecycle code is touched.

---

## 6. NON-GOALS

- No retuning of `V_MIN`, `V_MAX`, `G`, or `ANGLE`.
- No multi-bounce, spin, or angular ricochet (single horizontal flip only).
- No wall collision with player or ground objects.
- No sound, particles, or visual effects on bounce.
- No new scoring zones, multipliers, or badges for "bounce-in" hits.
- No DOM or HTML UI; canvas-only rendering.
- No landscape-specific layout pass.

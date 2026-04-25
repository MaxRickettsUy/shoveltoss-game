# Feature Plan: UI Layout Refinement

---

## 1. GOAL

Tighten the on-screen layout: stack score + throw count + combo together on the left, narrow and center the throw meter so it no longer spans the full canvas, and shrink the visible wall to ~50% of the canvas height. Presentation-only — gameplay rules unchanged.

---

## 2. CHANGE DESCRIPTION

### HUD grouping (left stack)
- Score, throw counter, and combo badge all render top-left, in a vertical stack.
- Reading order top → bottom: `SCORE` → `n / N` → `xK COMBO`.
- The right-side throw counter render is removed.

### Meter
- Meter no longer spans full width.
- New `METER_WIDTH_FRACTION = 0.55` of canvas width.
- Meter is horizontally centered: `meterX = (canvas.width - meterWidth) / 2`.
- Meter Y position and height are unchanged.

### Wall (visual only)
- New `WALL_HEIGHT_FRACTION = 0.50` of canvas height.
- Wall renders from `wallTopY = groundY - canvas.height * WALL_HEIGHT_FRACTION` down to `groundY`.
- **Bounce/collision logic is NOT changed** — `shovelX >= wallX && shovelY < groundY` still triggers a deflection regardless of `wallTopY`. The wall stays a full-arc reflector mechanically; only its rendering shrinks.

### Out of scope (unchanged)
- Pit position / pit width / pit rendering.
- Throw meter cycle time, sweet-spot, oscillation behavior.
- Physics, scoring, state machine, input handling.

---

## 3. EXPECTED EFFECT

- HUD becomes a single, scannable column at the thumb-far corner — less visual clutter.
- A narrower meter feels more like a focused gauge instead of a top banner; works in both portrait and landscape.
- A shorter wall is less visually dominant; the play field reads as a pit with a backstop, not a sealed corridor.

---

## 4. IMPLEMENTATION STEPS

### Step 1: Stack HUD on the left
- In `draw()`, remove the right-aligned `${run.throwCount} / ${THROWS_PER_RUN}` `drawText(...)` call.
- Below the existing score `drawText`, render the throw count left-aligned at `HUD_PAD`:
  - Font size: `const subFontSize = Math.max(16, Math.floor(canvas.width * 0.045));`
  - Y: `hudY + subFontSize + 6`
  - Color: `#ffffff`, not bold
- Move the combo badge below the throw counter:
  - Y: `hudY + subFontSize + 6 + comboFontSize + 6`
  - Keep existing color `#ffe600` and font sizing
- No HUD draws on the right side after this step.

### Step 2: Narrow and center the meter
- Add constant: `const METER_WIDTH_FRACTION = 0.55;`
- In `updateLayout()`, replace the meter coordinate block with:
  - `meterWidth = Math.max(220, canvas.width * METER_WIDTH_FRACTION);`
  - `meterX = (canvas.width - meterWidth) / 2;`
  - `meterY = safeTop;` (unchanged)
  - `meterHeight = Math.max(36, canvas.height * METER_HEIGHT_FRACTION);` (unchanged)
- No `drawMeter()` changes; it already derives positions from `meterX` / `meterWidth`.

### Step 3: Shrink wall visual to 50% canvas height
- Add constant: `const WALL_HEIGHT_FRACTION = 0.50;`
- Add `let wallTopY;` to the layout-let block.
- In `updateLayout()`, after `groundY` is set, add:
  - `wallTopY = groundY - canvas.height * WALL_HEIGHT_FRACTION;`
- In `draw()`, replace the wall fill + stroke rects:
  - `ctx.fillRect(wallX, wallTopY, WALL_THICKNESS, groundY - wallTopY);`
  - `ctx.strokeRect(wallX, wallTopY, WALL_THICKNESS, groundY - wallTopY);`
- Do **not** touch the bounce condition in `update()`.

---

## 5. ROLLBACK STRATEGY

Each change is localized:
- **HUD**: restore the right-aligned `${run.throwCount} / ${THROWS_PER_RUN}` `drawText` call; revert combo Y offset to `hudY + comboFontSize + 6`; remove the new left-stacked throws render.
- **Meter**: restore `meterX = HUD_PAD;` and `meterWidth = canvas.width - HUD_PAD * 2;` in `updateLayout()`; remove `METER_WIDTH_FRACTION`.
- **Wall**: restore the wall rects to `(wallX, 0, WALL_THICKNESS, groundY)`; remove `wallTopY` and `WALL_HEIGHT_FRACTION`.

A single revert of the feature commit fully restores prior layout. No gameplay, scoring, or physics paths are touched.

---

## 6. NON-GOALS

- No changes to bounce/collision logic, pit, or throw mechanics.
- No new fonts, font families, or asset loading.
- No animations or transitions on HUD or meter.
- No landscape-specific layout branching beyond what the existing fractional sizing already provides.
- No DOM/HTML overlays — canvas-only rendering preserved.
- No relocation of feedback text, idle hint, ready screen, or game-over screen.

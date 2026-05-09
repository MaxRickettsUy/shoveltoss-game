# Plan: Ornate wooden picture-frame around character images

## Scope
The front face of each character tile in `drawCharacterSelect` (index.html:3158–3245). Card back, NEW/champion badges, label, and flip button are unchanged. All drawing is done procedurally on canvas — no new image assets.

## Visual target
A carved-wood picture frame surrounding the hero image. The frame should read as a real molded frame rather than a flat border:

- **Layered moldings** — three concentric bands instead of one flat strip:
  1. Outer rim (slightly darker wood)
  2. Mid molding (main wood tone, with a vertical light→dark gradient to suggest a rounded profile)
  3. Inner lip (slightly lighter wood, narrow)
- **Bevels** between each band — 1px highlight and 1px shadow lines so each molding looks like a separate carved step.
- **Wood grain** — a few faint long stripes painted across the mid-molding bands using low-alpha dark/light streaks (not random noise — short axis-aligned strokes).
- **Corner ornaments** — small carved-corner blocks at the four corners of the frame: a filled diamond/rosette shape on top of the molding so the corners look like joined miters with a decorative inlay. Skip on very small tiles where they would clutter.

The image fits inside the innermost lip and is clipped to its rounded rect.

## Implementation Steps

### 1. Add tunable constants near the other character constants
```js
const FRAME_THICKNESS_RATIO = 0.10;     // fraction of min(tileW, tileH) — bigger so moldings have room
const FRAME_MIN_THICKNESS   = 10;
const FRAME_WOOD_DARK   = '#3e2614';
const FRAME_WOOD_MID    = '#6a4226';
const FRAME_WOOD_LIGHT  = '#8a5a33';
const FRAME_HIGHLIGHT   = 'rgba(255, 220, 170, 0.35)';
const FRAME_SHADOW      = 'rgba(0, 0, 0, 0.55)';
const FRAME_GRAIN       = 'rgba(255, 220, 170, 0.06)';
const FRAME_ORNAMENT    = '#caa05a';     // brass/gold accent for corner inlays
const FRAME_ORNAMENT_MIN_TILE_W = 110;   // hide ornaments below this tile width
```

### 2. New helper: `drawWoodFrame(ctx, x, y, w, h, t)`
Add near the other tile drawing helpers. `t` is total frame thickness. Splits `t` into three bands:

```
tOuter = floor(t * 0.30)
tMid   = t - tOuter - tInner
tInner = max(2, floor(t * 0.20))
```

Render order, top-down:
1. Fill outer band with `FRAME_WOOD_DARK` (rounded rect minus inset rect).
2. Fill mid band with a vertical linear gradient: `FRAME_WOOD_LIGHT` at top → `FRAME_WOOD_MID` at middle → `FRAME_WOOD_DARK` at bottom (suggests rounded molding).
3. Paint wood grain on the mid band: 3–5 thin horizontal strokes at jittered y-offsets, color `FRAME_GRAIN`, length spans the mid band, 1px line width. Use a deterministic offset based on the tile id hash so each character has a stable grain pattern.
4. Fill inner band with `FRAME_WOOD_LIGHT`.
5. Bevel strokes (1px each):
   - Outer edge of outer band: `FRAME_HIGHLIGHT`
   - Outer/mid seam: `FRAME_SHADOW`
   - Mid/inner seam: `FRAME_HIGHLIGHT`
   - Inner edge (around image opening): `FRAME_SHADOW`
6. Corner ornaments (only when `tileW >= FRAME_ORNAMENT_MIN_TILE_W`):
   - For each corner, draw a diamond with side `~ t * 0.55` centered on the corner of the mid band.
   - Fill `FRAME_ORNAMENT`, stroke 1px `FRAME_SHADOW`.
   - Add a 1px highlight line on the top-left edge of each diamond (`FRAME_HIGHLIGHT`).

Keep all drawing inside `ctx.save() / ctx.restore()`.

### 3. Replace the front-face image render block (~index.html:3196–3217)
After the existing tile background+border draw, before label/badges:

1. `const t = Math.max(FRAME_MIN_THICKNESS, Math.floor(Math.min(tileW, tileH) * FRAME_THICKNESS_RATIO));`
2. Inner opening: `innerX = x + t`, `innerY = y + t`, `innerW = tileW - 2*t`, `innerH = tileH - 2*t`.
3. Call `drawWoodFrame(ctx, x, y, tileW, tileH, t)`.
4. Draw the hero image scaled to fit inside the opening (replace existing `-8` insets with the inner rect dimensions). Clip to a rounded rect of radius `max(2, 6 - Math.floor(t / 4))`.

### 4. Adjust overlapping elements
- Move the label so it sits inside the inner opening (top-left of the image area), not on the frame: change `x + 8, y + labelSize + 6` to `innerX + 6, innerY + labelSize + 4`. Keep current color.
- NEW badge: position relative to `innerX + innerW` / `innerY` instead of tile edges, so it sits inside the opening.
- Champion badge: keep at the bottom of the tile so it overlaps the lower frame like a mounted plaque — no change.

### 5. Verify
- Frame reads as carved wood at common viewport sizes (portrait phone, desktop).
- Bevels are visible but not harsh.
- Card flip animation still scales the frame correctly via `flipScale`.
- Ornament corners hide cleanly on phone-landscape's smaller tiles.
- Card back unchanged.

## Tuning knobs (for the experiment)
- `FRAME_THICKNESS_RATIO`: 0.08 (slim) → 0.12 (chunky).
- Wood palette: warm walnut (`#3e2614 / #6a4226 / #8a5a33`), cool oak (`#4a3a22 / #806244 / #a98762`), gilt (`#5a3a14 / #b08a3e / #e0c684`).
- Grain count and alpha — keep alpha low (≤ 0.08) to avoid stripey distraction.
- Corner ornament shape: diamond, rosette (8-point starburst), or small shield. Diamond is the simplest first pass.

## Out of Scope
- No new image/texture assets.
- No changes to card back, level select, in-game character rendering.
- No drop shadows under the tile itself.
- No animated frame effects (shimmer, hover lift) in this pass.

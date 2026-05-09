# Plan: Polished metal name plaque on character frames

## Related
Builds on `plans/character-picture-frame.md` (the wooden frame). The plaque sits on top of the frame's top band; this plan assumes that frame work has landed (or lands together).

## Visual target
A small horizontal name plaque mounted on the top of each character's wooden frame, reading like polished metal (silver or brass). The character ID is engraved into the plaque so it replaces the current top-left ID label.

- Rectangular plaque with subtle rounded ends, centered on the top band of the frame.
- Polished metal surface: vertical gradient cycling light → bright → mid → dark to suggest a brushed/specular finish.
- Tiny screw/rivet dots near the left and right ends.
- Engraved name: character ID in a dark tone with a 1px lighter shadow underneath for depth.
- Crisp 1px highlight along the top edge and 1px shadow along the bottom edge.

## Implementation Steps

### 1. Add tunable constants near the frame constants
```js
const PLAQUE_WIDTH_RATIO   = 0.62;        // fraction of tileW
const PLAQUE_HEIGHT_RATIO  = 0.16;        // fraction of frame thickness t (so it sits on the top band)
const PLAQUE_MIN_HEIGHT    = 14;
const PLAQUE_RADIUS        = 4;
const PLAQUE_METAL_LIGHT   = '#f4f1e8';   // top sheen
const PLAQUE_METAL_BRIGHT  = '#d8d4c4';   // upper-mid
const PLAQUE_METAL_MID     = '#9d9788';   // lower-mid
const PLAQUE_METAL_DARK    = '#5a5448';   // bottom shade
const PLAQUE_RIVET         = '#3a3528';
const PLAQUE_ENGRAVE_DARK  = '#1f1a12';
const PLAQUE_ENGRAVE_LIGHT = 'rgba(255, 245, 220, 0.55)';
const PLAQUE_HIGHLIGHT     = 'rgba(255, 255, 255, 0.55)';
const PLAQUE_SHADOW        = 'rgba(0, 0, 0, 0.55)';
const PLAQUE_MIN_TILE_W    = 90;          // hide plaque below this width
```

(Optional brass variant — same names with a swapped palette: `#fff2c4 / #e7c878 / #a8842c / #4a3812`. Pick one default; keep the other as a tuning option.)

### 2. New helper: `drawNamePlaque(ctx, cx, topY, w, h, label)`
- `cx` = horizontal center; plaque is drawn from `cx - w/2` to `cx + w/2`, with its top at `topY`.
- Draw rounded-rect base.
- Fill with a vertical 4-stop linear gradient: `0 → PLAQUE_METAL_LIGHT`, `0.35 → PLAQUE_METAL_BRIGHT`, `0.65 → PLAQUE_METAL_MID`, `1 → PLAQUE_METAL_DARK`.
- Stroke 1px along the top edge with `PLAQUE_HIGHLIGHT`, 1px along the bottom edge with `PLAQUE_SHADOW` (use clipped sub-paths so the strokes don't run all the way around).
- Two rivets: small filled circles `r ≈ h * 0.14` in `PLAQUE_RIVET`, inset `h * 0.45` from each end. Add a 1px highlight pip on top-left of each rivet.
- Engraved label:
  - Font size ≈ `h * 0.62`, bold.
  - Truncate to fit `w - h * 1.6` (leave room for rivets) using `truncateText`.
  - Draw the label twice for the engraved look:
    1. At `(cx, plaqueCenterY + 1)` in `PLAQUE_ENGRAVE_LIGHT` — the lower bevel.
    2. At `(cx, plaqueCenterY)` in `PLAQUE_ENGRAVE_DARK` — the engraved letterforms.

All inside `ctx.save() / ctx.restore()`.

### 3. Hook into the front-face render (~after frame draw)
In `drawCharacterSelect`, immediately after `drawWoodFrame(...)` and before drawing the hero image:
1. Skip if `tileW < PLAQUE_MIN_TILE_W`.
2. Compute:
   - `plaqueW = Math.floor(tileW * PLAQUE_WIDTH_RATIO)`
   - `plaqueH = Math.max(PLAQUE_MIN_HEIGHT, Math.floor(t * PLAQUE_HEIGHT_RATIO * 6))` — sized so it sits comfortably on the top frame band.
   - `plaqueTopY = y + Math.max(2, Math.floor((t - plaqueH) / 2))` — vertically centered within the top band.
3. Call `drawNamePlaque(ctx, x + tileW / 2, plaqueTopY, plaqueW, plaqueH, character.id)`.

### 4. Remove the redundant top-left character ID
The existing `drawText(character.id, x + 8, y + labelSize + 6, ...)` (inside the picture-frame plan it moves to the inner opening) is now replaced by the plaque on the front face. Drop that label call only when the plaque is drawn (i.e., not below `PLAQUE_MIN_TILE_W`); below the threshold, fall back to the existing label so very small tiles still show the name.

### 5. Verify
- Each character tile shows a polished plaque mounted on the top wooden band, with the character ID engraved.
- Card flip: plaque scales with `flipScale` because it's drawn inside the same translate/scale block.
- Long names truncate with an ellipsis instead of overflowing past the rivets.
- Phone-landscape (small tiles): plaque hides cleanly below the threshold and the original label takes over.
- NEW badge still anchors to the inner opening corner; no overlap with the plaque since the badge sits inside the opening.

## Tuning knobs
- Metal palette: cool silver vs warm brass (swap the four `PLAQUE_METAL_*` constants).
- `PLAQUE_WIDTH_RATIO`: 0.55 (slim) → 0.7 (wide).
- Number of rivets: 2 (default), or 4 for a chunkier look.
- Engraving style: dark-only (drop `PLAQUE_ENGRAVE_LIGHT` second pass) for a flatter etched look.

## Out of Scope
- No new image/texture assets.
- No animated shimmer or hover effects.
- No plaques on the card back, level select, or in-game character renders.
- No changes to the loading-placeholder behavior (`plans/character-image-placeholders.md`).

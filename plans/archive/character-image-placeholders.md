# Plan: Loading placeholders for character frames

## Related
Builds on `plans/character-picture-frame.md` (the wooden frame around each hero image). This plan covers what to draw inside the frame's inner opening while the hero image is still loading.

## Problem
Hero images lazy-load when the character-select screen opens (see `loadHeroImages()`). Each tile currently draws nothing in the image area until the bitmap finishes decoding, then the image pops in. With the picture frame in place, this becomes more visible: the frame is drawn either way, and the empty opening reads as broken.

## Behavior target
- While a hero image is unavailable (`!heroImg || !heroImg.complete || heroImg.naturalWidth === 0`), fill the inner opening with a neutral placeholder.
- When the image finishes loading, the next animation frame draws it normally — no fade, no layout shift.
- Card back, frame draw, label, and badges are unchanged.

## Visual target
Inside the frame's inner opening:
- Solid fill in `THEME.surface2` (slightly darker than the tile surface so the placeholder reads as an empty matte board).
- Centered character ID text in `THEME.textMute`, sized like the existing tile label, weight not-bold. Truncate to fit the opening width.
- Optional second line below the ID: a small "Loading…" caption in `THEME.textFaint` at ~70% of the ID size. Skip on phone-landscape where vertical room is tight.

No spinner, no animation — keeps it cheap and avoids extra rAF work.

## Implementation Steps

### 1. Locate the hero image draw block
After the picture-frame work, the front-face render block in `drawCharacterSelect` (~index.html:3196–3217) will look roughly like:
```js
const heroImg = heroImages[character.id];
if (heroImg && heroImg.complete && heroImg.naturalWidth > 0) {
  // ... draw image clipped to inner opening ...
}
```

### 2. Add the placeholder branch
Replace the `if (...)` with `if/else`:
- `if (heroReady)` — current image-draw path.
- `else` — placeholder draw path:
  1. `ctx.save()`, clip to the inner-opening rounded rect (same radius the image uses).
  2. Fill the opening with `THEME.surface2`.
  3. Compute `idSize` matching the existing label size formula.
  4. `drawText(character.id, innerX + innerW / 2, innerY + innerH / 2 + idSize * 0.35, idSize, THEME.textMute, 'center', false)` — truncate via `truncateText` against `innerW - 12`.
  5. If `!isPhoneLandscape`, draw `'Loading…'` one line below at `idSize * 0.7` in `THEME.textFaint`.
  6. `ctx.restore()`.

### 3. Verify
- Cold load with throttled network (DevTools → Slow 3G): every tile shows the framed placeholder with its ID; tiles flip to the real image as each finishes loading, with no layout jump.
- Fast load: placeholder may be invisible (single frame) — acceptable.
- Card flip animation: placeholder scales with `flipScale` because it draws inside the same translate/scale block. No extra work needed.
- Phone-landscape: only the ID line shows; no caption.

## Out of Scope
- No fade/cross-fade between placeholder and loaded image.
- No retry UI for failed loads (existing behavior — no image — is fine).
- No skeleton-shimmer animation.
- No changes to character data, asset paths, or `loadHeroImages` itself.

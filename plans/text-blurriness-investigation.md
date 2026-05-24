# Text Blurriness Investigation

## Context

Text throughout the Phaser version of the game appeared blurry on an iPhone 16e. Earlier UI text clipping fixes were unrelated; those addressed glyph texture bounds, not sharpness.

## Attempts

### 1. Higher-resolution Phaser text textures

Added a `src/game/sharpText.ts` helper that monkey-patched `Phaser.GameObjects.GameObjectFactory.prototype.text` so all `this.add.text(...)` calls received a default `resolution` based on `window.devicePixelRatio`.

Tried caps of:

- `2x`
- `3x`
- `2.25x`

Also briefly enabled `render.roundPixels`.

Result:

- `2x` looked somewhat sharper but still blurry on iPhone.
- `3x` made edges sharper but the text appeared pixelated/crunchy.
- `2.25x` did not produce a visible enough difference.
- `roundPixels` likely made edges harsher and was removed.

Conclusion:

Changing the internal text texture resolution alone was not enough. It improved glyph texture quality but did not solve the final presentation blur.

### 2. Font stack change

Changed the shared UI font from bundled Archivo to the native system stack:

```ts
-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
```

Also updated hardcoded `Archivo, system-ui, sans-serif` usage in:

- `src/scenes/BootScene.ts`
- `src/scenes/GameScene.ts`
- `src/scenes/HUDScene.ts`
- `src/scenes/VersusGameScene.ts`
- `src/ui/Meter.ts`

Result:

- Edges looked cleaner/sharper.
- Text still appeared blurry overall.

Conclusion:

The font affected glyph shape and edge quality, but did not resolve the underlying blur.

### 3. High-DPI canvas backing buffer experiment

Tried a `src/game/highDpi.ts` helper to make the canvas backing buffer larger than its CSS size:

- CSS canvas size remained logical game size.
- Canvas `width` / `height` attributes were multiplied by `devicePixelRatio`, capped at `3`.
- Renderer resize was called with the larger pixel dimensions.
- Active scene cameras were zoomed by DPR to preserve logical coordinates.

Desktop smoke test confirmed the canvas backing buffer changed from:

```text
1280 x 720 CSS/display
1280 x 720 backing buffer
```

to:

```text
1280 x 720 CSS/display
2560 x 1440 backing buffer
```

Result:

- The backing buffer became high-DPI.
- Scene framing broke in Phaser's current `Scale.RESIZE` setup; content rendered partially offscreen.

Conclusion:

This is probably the correct class of fix, but it needs a more deliberate Phaser scale/render architecture pass. The quick hook was too risky to keep.

## Current Assessment

The remaining blur is probably not primarily a font problem. It is likely caused by the Phaser canvas being rendered at CSS-pixel resolution on high-DPI mobile screens, then composited/scaled by the browser.

A real fix should focus on high-DPI canvas rendering while preserving:

- logical scene coordinates
- input coordinate mapping
- camera viewport sizing
- Phaser `Scale.RESIZE` behavior
- DOM input alignment
- mobile safe-area layout

## Recommendation

Table this for now, as requested. When revisiting, treat it as a dedicated high-DPI rendering slice rather than another font tweak.

Suggested future approach:

1. Prototype high-DPI canvas support in a small branch.
2. Decide whether to use Phaser's built-in scale modes differently or wrap resize behavior manually.
3. Verify canvas backing size, camera viewport, pointer coordinates, DOM inputs, and scene framing on desktop and iPhone.
4. Only then tune font resolution if needed.

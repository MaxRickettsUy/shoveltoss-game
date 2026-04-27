# Background Image

## 1. GOAL
Replace the flat `#1a1a2e` background fill with `assets/house.png` rendered behind all gameplay elements, scaling cleanly across portrait and landscape viewports.

## 2. CHANGE DESCRIPTION
- Load `assets/house.png` once at startup using an `Image` object pattern matching the existing `characterImg` loader.
- In `draw()` and `drawReadyScreen()`, replace the solid background `fillRect` with a `drawImage` call rendering the loaded image to fill the canvas.
- If the image is not yet ready, fall back to the current `#1a1a2e` solid fill.

## 3. EXPECTED EFFECT
- Game presentation shows the house artwork as the backdrop.
- No change to gameplay, physics, scoring, layout, or HUD.
- Ready screen and Game Over overlay still render their text on top of the new background.

## 4. RENDERING STRATEGY
- Single `Image` instance (`backgroundImg`) loaded at module init.
- Boolean `backgroundReady` flips true on `onload`.
- Drawn as the first paint operation inside `draw()` (replacing the current solid `fillRect` at lines 378–379) and `drawReadyScreen()` (replacing lines 519–520).
- Use `ctx.drawImage(backgroundImg, dx, dy, dW, dH)` with computed cover-fit destination rect (no source cropping — let the canvas clip overflow).

## 5. RESPONSIVE SCALING RULES
- Use a "cover" fit: scale image so it fully covers the canvas, preserving aspect ratio, cropping overflow.
- Compute scale = `Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)`.
- Destination width/height = `naturalWidth * scale`, `naturalHeight * scale`.
- Center the image: `dx = (canvas.width - dW) / 2`, `dy = (canvas.height - dH) / 2`.
- Recompute on every draw (canvas size already tracked via `updateLayout`).

## 6. IMPLEMENTATION STEPS (max 4)
1. After the `characterImg` block (around line 28), add:
   - `const backgroundImg = new Image();`
   - `let backgroundReady = false;`
   - `backgroundImg.onload = () => { backgroundReady = true; };`
   - `backgroundImg.src = 'assets/house.png';`
2. Add a `drawBackground()` helper that, if `backgroundReady`, computes cover-fit dx/dy/dW/dH and calls `ctx.drawImage`; otherwise fills `#1a1a2e`.
3. In `draw()`, replace lines 378–379 (`ctx.fillStyle = '#1a1a2e'; ctx.fillRect(...)`) with a call to `drawBackground()`.
4. In `drawReadyScreen()`, replace lines 519–520 with the same `drawBackground()` call (after the existing `clearRect`).

## 7. ROLLBACK STRATEGY
Revert the commit. The change is contained to the new image loader, the new `drawBackground()` helper, and two replaced fill calls — no state, layout, or physics is touched.

## 8. NON-GOALS
- No parallax, scrolling, or animated background.
- No tinting, dimming, or overlay effects on the image.
- No changes to ground, pit, wall, player, shovel, meter, HUD, or text rendering.
- No new asset loading framework or preload screen.
- No layout, gameplay, or physics changes.

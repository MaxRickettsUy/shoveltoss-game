# Pit Asset Integration

## 1. GOAL
Replace the placeholder pit rectangle (dark fill + gold stroke at `groundY`) with the `assets/pit.png` image, aligned exactly to the existing pit boundaries (`pitLeft`, `pitRight`, `groundY`).

## 2. CHANGE DESCRIPTION
- Load `assets/pit.png` once at startup (mirroring the existing image-loader pattern).
- In `draw()`, replace the current pit `fillRect`/`strokeRect` block with a single `drawImage` call sized to the pit's collision rect.
- If the image is not yet loaded, fall back to the current placeholder fill so collision boundaries remain visible.

## 3. EXPECTED EFFECT
- Pit is rendered as the artwork, occupying the same screen region the placeholder occupied.
- No change to `pitLeft`, `pitRight`, `pitCenterX`, `groundY`, scoring zones, collision, or physics.
- Visuals scale with the canvas because pit width is already a fraction of `canvas.width`.

## 4. RENDERING STRATEGY (positioning + scaling)
- Position: top-left at `(pitLeft, groundY)`.
- Width: `pitRight - pitLeft` (matches the scoring boundary exactly).
- Height: preserve the image aspect ratio relative to the drawn width:
  - `dW = pitRight - pitLeft`
  - `dH = dW * (pitImg.naturalHeight / pitImg.naturalWidth)`
- Draw with `ctx.drawImage(pitImg, pitLeft, groundY, dW, dH)`.
- Drawn after the ground fill/line and before the wall, player, and shovel — same z-order slot as the current placeholder.
- Recomputed every frame, so it tracks `updateLayout()` and `updateDifficulty()` on resize and difficulty changes automatically.

## 5. IMPLEMENTATION STEPS (max 3–4)
1. Near the existing image loaders (around the `characterImg` block), add:
   - `const pitImg = new Image();`
   - `let pitReady = false;`
   - `pitImg.onload = () => { pitReady = true; };`
   - `pitImg.src = 'assets/pit.png';`
2. In `draw()`, locate the pit block (`// Pit zone` — the `fillRect` + `strokeRect` at lines ~394–399). Replace it with:
   - If `pitReady`: compute `dW = pitRight - pitLeft`, `dH = dW * pitImg.naturalHeight / pitImg.naturalWidth`, then `ctx.drawImage(pitImg, pitLeft, groundY, dW, dH)`.
   - Else: keep the existing placeholder `fillRect`/`strokeRect` as fallback.
3. Leave all other draw operations, constants, and state untouched.

## 6. ROLLBACK STRATEGY
Revert the commit. Change is contained to one new image loader and one replaced block inside `draw()`.

## 7. NON-GOALS
- No change to `PIT_WIDTH`, `pitCenterX`, scoring zone math, sweet-spot logic, or wall placement.
- No change to landing detection or `inPit` test.
- No animation, lighting, particle, or shadow effects.
- No new asset preloader or loading screen.
- No changes to ground rendering, background, player, shovel, meter, or HUD.

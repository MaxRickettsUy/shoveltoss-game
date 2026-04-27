# Shovel Asset Integration

## 1. GOAL
Replace the placeholder shovel (two `fillRect` shapes inside the rotated transform) with the `assets/shovel.png` image, preserving the existing rotation behavior and pivot point at `(throw_.shovelX, throw_.shovelY)`.

## 2. CHANGE DESCRIPTION
- Load `assets/shovel.png` once at startup using the existing image-loader pattern.
- In the shovel draw block (currently inside the `STATE.FLYING || STATE.RESETTING` branch of `draw()`), replace the two `fillRect` calls with a single `drawImage` call drawn inside the existing `ctx.translate` + `ctx.rotate` transform.
- Fall back to the existing placeholder shapes if the image is not yet loaded.

## 3. EXPECTED EFFECT
- Shovel renders as the artwork during flight and the brief reset pause.
- Rotation continues to use `throw_.angle` (driven by `SHOVEL_ROT_RATE * dt`) — no change.
- Position, collision, bounce, and landing detection are unchanged.

## 4. RENDERING INTEGRATION (positioning + rotation anchor)
- Pivot: `(throw_.shovelX, throw_.shovelY)` via `ctx.translate(...)`, matching current code.
- Rotation: `ctx.rotate(throw_.angle)`, matching current code.
- Constant: `const SHOVEL_RENDER_W = 40;` (px). Height derived from image aspect: `dH = SHOVEL_RENDER_W * (shovelImg.naturalHeight / shovelImg.naturalWidth)`.
- Draw call (inside the rotated transform, centered on pivot):
  - `ctx.drawImage(shovelImg, -SHOVEL_RENDER_W / 2, -dH / 2, SHOVEL_RENDER_W, dH);`
- Asset orientation assumption: `shovel.png` is authored with the blade pointing right (matching the existing placeholder where the blade rectangle is on the +x side). If the source asset is oriented differently, only the offsets in the `drawImage` call change — physics and rotation math stay identical.

## 5. IMPLEMENTATION STEPS (max 3–4)
1. Near the existing image loaders, add:
   - `const shovelImg = new Image();`
   - `let shovelReady = false;`
   - `shovelImg.onload = () => { shovelReady = true; };`
   - `shovelImg.src = 'assets/shovel.png';`
2. Add `const SHOVEL_RENDER_W = 40;` near the other render-size constants (e.g., next to `CHARACTER_RENDER_H`).
3. In `draw()`, inside the existing `ctx.save() / translate / rotate ... ctx.restore()` block for the shovel, replace the two `fillRect` calls with:
   - If `shovelReady`: compute `dH = SHOVEL_RENDER_W * shovelImg.naturalHeight / shovelImg.naturalWidth`, then `ctx.drawImage(shovelImg, -SHOVEL_RENDER_W / 2, -dH / 2, SHOVEL_RENDER_W, dH);`.
   - Else: keep the existing two placeholder `fillRect` calls as fallback.

## 6. ROLLBACK STRATEGY
Revert the commit. Change is contained to one new image loader, one new size constant, and one replaced block inside the shovel transform in `draw()`.

## 7. NON-GOALS
- No change to `SHOVEL_ROT_RATE`, `throw_.angle` accumulation, gravity, launch math, or bounce.
- No change to wall collision, landing detection, or scoring.
- No multi-frame animation, motion trail, or shadow.
- No per-character shovel variants.
- No changes to player, pit, ground, background, meter, or HUD.

# Feature Plan: Character Sprite Integration

---

## 1. GOAL

Replace the placeholder orange rectangle that represents the player with the existing Chuggo sprite sheet, and pick one of the sheet's three frames each draw call based on the current `throw_.state` (idle / wind-up / release). No animation system is introduced — frame choice is a direct lookup from game state.

---

## 2. CHANGE DESCRIPTION

### Asset
- Use `assets/character/chuggo/sprite-sheet.png` as-is. Single horizontal strip, 3 equal-size frames (assumed 64×64 each).
- Frame layout (left → right):
  - Frame 0 — idle
  - Frame 1 — wind-up
  - Frame 2 — release

### Loading
- Load the sheet once at script init via a single `Image()` and a `characterReady` flag set in its `onload`.
- No preload manager, no async/await, no asset registry.

### Render
- The current player rect block in `draw()` (`const pW = 28, pH = 50; ctx.fillStyle = '#e07b39'; ctx.fillRect(...)`) is replaced with a `ctx.drawImage` call that reads the correct source slice from the sheet based on the current `throw_.state`:
  - `STATE.CHARGING` → frame 1
  - `STATE.FLYING`   → frame 2
  - `STATE.IDLE` / `STATE.RESETTING` → frame 0
- If `characterReady === false` (image still loading on first paint), fall back to the existing rect render so the player is never invisible.
- Anchor: bottom-center at `(playerX, playerY)`, same as today. Rendered size matches the current `pH = 50` height; width is computed to preserve the source aspect ratio.

### Out of scope (unchanged)
- `throw_` / `run` / `scoring` / `difficulty` state, projectile physics, scoring, meter, layout.
- `playerX` / `playerY` positioning.
- Shovel rendering, HUD, ready/game-over screens.

---

## 3. EXPECTED EFFECT

- The player visibly transitions across the three frames as the throw lifecycle progresses: idle → wind-up while charging → release during flight → back to idle once the shovel resets.
- No gameplay change. No layout shift (footprint matches the old 28×50 rect closely enough that pit/wall positions and meter alignment are unaffected).
- On first frame after page load (before sprite finishes decoding), the rect fallback renders so the player is never missing.

---

## 4. IMPLEMENTATION STEPS

### Step 1: Add constants and load the sprite sheet
- Alongside the other constants near the top of the script, add:
  ```
  const CHARACTER_FRAME_W = 64;
  const CHARACTER_FRAME_H = 64;
  const CHARACTER_RENDER_H = 64;
  const CHARACTER_RENDER_W = CHARACTER_RENDER_H * (CHARACTER_FRAME_W / CHARACTER_FRAME_H);
  ```
- Right after `const ctx = canvas.getContext('2d');`, add:
  ```
  const characterImg = new Image();
  let characterReady = false;
  characterImg.onload = () => { characterReady = true; };
  characterImg.src = 'assets/character/chuggo/sprite-sheet.png';
  ```

### Step 2: Replace the player rect with a sprite frame
- In `draw()`, replace the existing player block:
  ```
  // Player placeholder (rectangle)
  const pW = 28, pH = 50;
  ctx.fillStyle = '#e07b39';
  ctx.fillRect(playerX - pW / 2, playerY - pH, pW, pH);
  ```
  with:
  ```
  if (characterReady) {
    const frame = throw_.state === STATE.CHARGING ? 1
               : throw_.state === STATE.FLYING   ? 2
               : 0;
    ctx.drawImage(
      characterImg,
      frame * CHARACTER_FRAME_W, 0, CHARACTER_FRAME_W, CHARACTER_FRAME_H,
      playerX - CHARACTER_RENDER_W / 2, playerY - CHARACTER_RENDER_H,
      CHARACTER_RENDER_W, CHARACTER_RENDER_H
    );
  } else {
    const pW = 28, pH = 50;
    ctx.fillStyle = '#e07b39';
    ctx.fillRect(playerX - pW / 2, playerY - pH, pW, pH);
  }
  ```
- No other call sites change. Frame selection is computed each `draw()` call — there is no per-frame timer or counter.

### Step 3: Manual playtest pass
- Confirm idle frame shows on the ready screen transitioning into PLAYING and during the post-throw `RESETTING` pause.
- Confirm wind-up frame shows for the full duration of `CHARGING` (hold).
- Confirm release frame shows during `FLYING` (from launch through landing).
- Confirm no layout shift: pit, wall, and meter positions look identical to before.
- Reload the page and confirm the rect fallback briefly appears (or not at all, if the sprite is cached) and the sprite swaps in cleanly without flicker.

---

## 5. ROLLBACK STRATEGY

- Remove the four `CHARACTER_*` constants.
- Remove the `characterImg` / `characterReady` loader block.
- Restore the original player rect block in `draw()`.

A single revert of the feature commit fully restores prior behavior. No physics, scoring, layout, meter, or shovel paths are touched.

---

## 6. NON-GOALS

- No animation system, no per-state frame cycling, no time-based interpolation between frames.
- No asset preloader, asset registry, or loading screen.
- No additional sprite variants (princess sheet, hero portrait, etc.).
- No horizontal flipping, tinting, or scaling per state.
- No change to player hitbox, position, or game logic.
- No retry / error handling beyond the `characterReady` flag.
- No CSS / DOM changes; rendering stays inside the existing `draw()` canvas pass.

# Plan: Shovel-In-Pit Landing Illusion

**Target system:** rendering / pit / shovel-throw

**User feedback:**
- Shovel currently lands flat against the pit, breaking the illusion of depth
- Want the shovel to look like it drops *into* the pit, not onto it

**Hypothesis:**
Splitting the pit into front-rim and back-interior layers, drawing the shovel between them, and adding a small dust puff on impact will sell the depth illusion with minimal asset and code changes.

## 1. GOAL
Make the shovel visually appear to land inside the pit by rendering it between two pit layers and adding a brief dust puff on impact.

## 2. CHANGE DESCRIPTION
- Split `pit.png` into two assets:
  - `pit-back.png` — interior shadow / hole bottom (drawn behind shovel)
  - `pit-front.png` — front rim / lip (drawn in front of shovel)
- Render order during a throw: background → `pit-back` → shovel → `pit-front` → HUD.
- On shovel landing (stick or miss within pit bounds), spawn a 2–3 frame dust puff sprite at the landing point; despawn after ~250ms.
- Misses outside the pit do not trigger the dust puff (or use a different impact effect — not in scope here).

## 3. EXPECTED EFFECT
- Shovel reads as descending into the pit, not stopping on top of it.
- Impact moment feels punchy via dust feedback.
- No physics or hitbox changes.

## 4. IMPLEMENTATION STEPS
1. Edit `assets/pit.png` into `assets/pit-back.png` and `assets/pit-front.png`. Keep identical canvas size and origin so positioning code doesn't change. Commit both; leave the original `pit.png` in place until step 4.
2. In the render loop, replace the single pit draw call with two draw calls: `pit-back` before the shovel, `pit-front` after the shovel. Confirm visually that a stationary shovel placed at the pit's center renders between the layers.
3. Add a `dust-puff.png` sprite sheet (2–3 frames) and a small `DustPuff` object with position, frame index, and lifetime. On stick / pit-bounds landing, spawn one at the impact point. Render above `pit-front`.
4. Once verified, remove the now-unused `pit.png` import. Update any docs/prompts that reference it.

## 5. ROLLBACK STRATEGY
Revert the commit. Restore the single `pit.png` draw call. Delete `pit-back.png`, `pit-front.png`, and `dust-puff.png` assets.

## 6. NON-GOALS
- No shovel scale-down on descent (deferred — try without first).
- No sprite masking / clipping.
- No new sound effects.
- No particle system or generalized FX framework — `DustPuff` is a one-off.
- No miss-outside-pit visual effect.
- No camera shake or screen flash on impact.
- No changes to throw arc, physics, or hit detection.

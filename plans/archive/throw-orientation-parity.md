# Plan: Throw Parity Between Portrait and Landscape

**Target system:** throw-system / physics

**User feedback:**
- Same meter stop produces different outcomes in portrait vs. landscape
- Portrait throws overshoot the pit; landscape throws hit the wall and bounce in
- Over-throws should still be possible, but equivalent meter stops should produce equivalent results across orientations

**Hypothesis:**
Throw force is currently expressed in raw pixels, so a fixed velocity covers different *relative* distances depending on viewport width. Re-expressing throw range as a multiple of the live player→pit distance, and animating the arc over a fixed duration instead of by gravity, will make the same meter stop produce the same outcome in both orientations.

## 1. GOAL
Make the same meter stop produce the same scoring outcome (stick / wall-bounce / overthrow) in both portrait and landscape on mobile, while preserving the existing over-throw and under-throw failure modes.

## 2. CHANGE DESCRIPTION
- Compute `pitDistance` each throw from the live player and pit positions in current viewport coords.
- Map meter value to a `throwMultiplier` in a fixed range (e.g., `0.5` to `1.5`) where the hot-spot center maps to `1.0` (lands in pit).
- Landing X = `playerX + pitDistance × throwMultiplier`. Same meter → same multiplier → same proportional outcome across orientations.
- Animate the arc as a parabola interpolated over a **fixed duration** (e.g., 600ms) from launch to landing, with a peak height proportional to `pitDistance` (e.g., `pitDistance × 0.4`). This removes the orientation-dependence of pixel-based gravity.
- Wall collision and pit hitbox detection continue to use the rendered pit geometry as-is, so over-throws and wall-bounces still occur naturally.

## 3. EXPECTED EFFECT
- Equivalent meter stops produce equivalent outcomes in both orientations.
- Arc visually scales with viewport so it always looks consistent.
- Over-throws (multiplier > 1.0 by enough) still clear the pit; under-throws (multiplier < 1.0 by enough) still hit the front wall.

## 4. IMPLEMENTATION STEPS
1. In throw resolution, compute `pitDistance = pit.x - player.x` from current rendered positions. Map meter value → `throwMultiplier ∈ [MIN_MULT, MAX_MULT]` (start with `0.5`–`1.5`; tune later). Hot-spot center must map to `1.0`.
2. Replace the existing velocity/gravity arc with a fixed-duration tween: each frame, `t = elapsed / DURATION`; `x = lerp(playerX, landingX, t)`; `y = launchY - peakHeight × 4 × t × (1 - t)` (parabola). `peakHeight = pitDistance × 0.4`.
3. On tween end (or earlier collision with wall geometry), run the existing hit-detection against the pit/wall hitboxes to determine stick / bounce / miss.
4. Verify in both orientations: a meter stop at the hot-spot center sticks; a stop ~10% past it lands behind the pit; a stop ~10% before it hits the wall. Tune `MIN_MULT` / `MAX_MULT` only if the failure-mode bands feel wrong.

## 5. ROLLBACK STRATEGY
Revert the commit. Restore the previous pixel-velocity + gravity arc code. No asset or schema changes were made.

## 6. NON-GOALS
- No new throw mechanics (charge, curve, wind).
- No changes to meter behavior, hot-spot size, or scoring.
- No changes to player or pit positions / sprites.
- No camera, zoom, or layout changes.
- No physics engine introduction — keep the simple parabolic tween.
- No per-orientation tuning constants — both orientations use the same multiplier range.
- No desktop-specific tuning (parity should hold there too as a side effect).

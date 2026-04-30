# Plan: Randomized Sweet-Spot + Sweet-Spot-Centric Scoring

**Target system:** throw-system / meter / scoring

**User feedback:**
- Fast-press is too rewarding because non-sweet throws still score (in-pit = 1, back-wall = 2)
- Want players to actually try for the sweet spot, not just lob the shovel toward the pit
- Constraint: single meter, no new mechanics

**Hypothesis:**
Two paired changes — randomizing the sweet-spot position each throw, and dropping the non-sweet scoring rewards — make the sweet spot the *only* path to meaningful points. Players must read the cursor every throw instead of memorizing one timing.

## 1. GOAL
Randomize the sweet-spot center per throw and reduce non-sweet scoring so that hitting the sweet spot becomes the actual goal of every throw.

## 2. CHANGE DESCRIPTION
- Per throw, pick a random sweet-spot center in `[SWEET_CENTER_MIN, SWEET_CENTER_MAX]` (e.g., `[0.30, 0.85]`). Width stays at `SWEET_SPOT_HALF_START` (0.10).
- Store the current throw's center on `throw_` (e.g., `throw_.sweetCenter`) so the power curve, sweet-spot bounds, and rendering all use the same value.
- Update the power curve in `onPressEnd` to use `throw_.sweetCenter` instead of the `SWEET_SPOT_CENTER` constant so a sweet-spot hit always lands in the pit regardless of position.
- Update meter rendering to draw the sweet-spot band at `throw_.sweetCenter ± SWEET_SPOT_HALF_START`.
- Tighten scoring:
  - `PTS_STICK` = 3 (unchanged)
  - `PTS_BACK_WALL` = 1 (was 2)
  - `PTS_IN_PIT` = 0 (was 1)
  - `PTS_FRONT_WALL` = 0 (unchanged)
  - `PTS_MISS` = -2 (unchanged)

## 3. EXPECTED EFFECT
- Memorized timing stops working — players must visually read the sweet-spot position each throw.
- Lobbing into the pit without a sweet-spot stick yields zero points; the sweet spot is now *the* goal.
- Skilled players still score well; casual mashing yields little.
- Existing bouncing meter, charge-and-release input, and physics are unchanged.

## 4. IMPLEMENTATION STEPS
1. Add `SWEET_CENTER_MIN = 0.30` and `SWEET_CENTER_MAX = 0.85` constants. Add `sweetCenter` field to `throw_`. In `onPressStart`, when transitioning IDLE→CHARGING, set `throw_.sweetCenter = SWEET_CENTER_MIN + Math.random() * (SWEET_CENTER_MAX - SWEET_CENTER_MIN)` and update `difficulty.sweetMin / sweetMax` from it.
2. In `onPressEnd`, replace the two references to `SWEET_SPOT_CENTER` in the power curve with `throw_.sweetCenter`. Verify a sweet-spot hit still produces a clean pit landing in both portrait and landscape.
3. In meter rendering, draw the sweet-spot band using `difficulty.sweetMin / sweetMax` (or `throw_.sweetCenter`) so the visual matches the active band each throw.
4. Update `PTS_BACK_WALL` to `1` and `PTS_IN_PIT` to `0`. Run a few throws of each outcome type and confirm scoring matches the new table.

## 5. ROLLBACK STRATEGY
Revert the commit. Restore the `SWEET_SPOT_CENTER` constant references in the power curve and rendering. Restore `PTS_BACK_WALL = 2` and `PTS_IN_PIT = 1`. Remove `throw_.sweetCenter` and the `SWEET_CENTER_MIN/MAX` constants.

## 6. NON-GOALS
- No second meter or new input mechanic.
- No change to meter cycle time, bounce behavior, or sweet-spot width.
- No directional-only sweet spot (deferred — try randomized position alone first).
- No hidden / fading sweet-spot visuals.
- No combo or streak bonuses.
- No change to throw physics, arc, or pit/wall geometry.
- No removal of the per-stick shrink behavior covered in [meter-difficulty-ramp.md](meter-difficulty-ramp.md) — that plan still applies on top.
- No per-character or per-difficulty tuning of the random range.

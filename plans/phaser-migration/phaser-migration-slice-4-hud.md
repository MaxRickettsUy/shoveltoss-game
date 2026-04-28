# Plan: Phaser Migration — Slice 4 (HUD)

**Target system:** ui-system / hud

**User feedback:**
- Slices 1–3 are landed
- HUD (score, lives, high score) should render inside Phaser so the legacy renderer can be removed

**Hypothesis:**
Rendering HUD elements as Phaser text objects — reading from the same game state — completes the visual migration and unblocks legacy renderer removal in Slice 5.

## 1. GOAL
Render score, lives remaining, and session high score as Phaser text objects inside the scene. Read from existing game state.

## 2. CHANGE DESCRIPTION
- Add Phaser `Text` objects for score (top-left), lives, and high score.
- Position them respecting the existing HUD safe-area logic (top-left for score, no character overlap on landscape).
- Subscribe / read from the same game state that legacy HUD uses; update text on state change.
- Hide legacy HUD DOM when `USE_PHASER` flag is on.

## 3. EXPECTED EFFECT
- HUD renders correctly in Phaser, with parity to legacy.
- Score/lives/high score update in real time.
- No overlap with character on phone landscape.

## 4. IMPLEMENTATION STEPS
1. Add Phaser `Text` objects for score, lives, high score in the scene. Apply safe-area offsets matching the HUD plan.
2. Wire updates: on game-state change, set `.text` on the corresponding Phaser object.
3. Hide legacy HUD elements when `USE_PHASER` is on. Verify visual parity at portrait, landscape, and desktop sizes.
4. Test at 844×390 and 932×430; confirm no character overlap.

## 5. ROLLBACK STRATEGY
Revert the commit. Remove Phaser HUD text objects. Legacy HUD resumes via flag-off.

## 6. NON-GOALS
- No new HUD elements (timers, multipliers, badges).
- No HUD restyling beyond matching legacy fonts/colors.
- No animation on score changes.
- No removal of legacy HUD code.
- No game-over screen migration (handled separately if needed).

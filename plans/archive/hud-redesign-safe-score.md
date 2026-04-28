# Plan: HUD Redesign — Safe Score Placement

**Target system:** ui-system / hud

**User feedback:**
- Score should remain in the top-left
- On phone landscape mode, score currently overlaps character art

**Hypothesis:**
Constraining the HUD score to a safe zone in the top-left that respects the landscape character bounds will eliminate overlap without moving the score from its expected location.

## 1. GOAL
Keep the score in the top-left and ensure it never overlaps character sprites in phone landscape orientation.

## 2. CHANGE DESCRIPTION
- Score remains anchored top-left.
- Add safe-area padding/offset so the score sits clear of the character's rendered bounds in landscape.
- Verify on a representative phone landscape viewport (e.g., 844×390, 932×430).

## 3. EXPECTED EFFECT
- Score is fully readable on phone landscape.
- No regression on portrait or desktop layouts.

## 4. IMPLEMENTATION STEPS
1. Identify current score element CSS/render position; measure overlap region against character bounds in landscape.
2. Adjust top-left offset (or add max-width / responsive padding) so the score's bounding box does not intersect the character's bounding box at landscape aspect ratios.
3. Test at 844×390 and 932×430 viewport sizes; confirm no overlap and no portrait regression.

## 5. ROLLBACK STRATEGY
Revert the commit. Restore prior HUD positioning styles.

## 6. NON-GOALS
- No HUD restyling (fonts, colors, background).
- No relocation of other HUD elements (lives, high score placement handled separately if needed).
- No new responsive breakpoints beyond what's required to fix overlap.
- No changes to character sprite size or position.

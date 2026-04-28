# Plan: Character UI Improvements

**Target system:** ui-system / character-select

**User feedback:**
- Character selection grid items are too small on mobile landscape
- After game over, players can't change their character without a hard refresh

**Hypothesis:**
Resizing grid items for landscape and exposing a character-change action on the game-over screen will improve mobile usability and let players experiment between runs without reloading.

## 1. GOAL
Fix undersized character grid items on mobile landscape, and allow character re-selection from the game-over screen.

## 2. CHANGE DESCRIPTION
- Adjust the character-select grid CSS so items render at a usable size in mobile landscape (target similar visual size to portrait).
- Add a "Change Character" action on the game-over screen that returns the player to the character-select view.
- Selecting a character there starts a new run with the chosen character.

## 3. EXPECTED EFFECT
- Characters are tappable and visible on phone landscape.
- Players can swap characters between runs without refreshing.

## 4. IMPLEMENTATION STEPS
1. In the character-select grid CSS, add a landscape-specific rule (e.g., `@media (orientation: landscape) and (max-height: 500px)`) that increases item size and/or reduces column count to fit landscape height.
2. Test on representative landscape viewports (844×390, 932×430); confirm items are tappable and not clipped.
3. On the game-over screen, add a "Change Character" button alongside the existing restart action; on click, route back to the character-select view.
4. Confirm the selected character flows into the next run identically to first-time selection.

## 5. ROLLBACK STRATEGY
Revert the commit. Restore prior grid CSS and remove the "Change Character" button from the game-over screen.

## 6. NON-GOALS
- No restyling of character art, cards, or grid visuals beyond sizing.
- No new characters, unlocks, or selection metadata.
- No persistence of last-selected character across tab refreshes.
- No changes to portrait or desktop character-select layout beyond what landscape rules require.

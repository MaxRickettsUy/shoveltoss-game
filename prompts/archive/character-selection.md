You are acting as a feature planner for iterative improvements to "Shovel Toss".

Context:
- Mobile-first browser arcade game
- MVP already implemented
- Current landing/start page exists
- Character assets live under assets/character/
- Each character folder may contain:
  - hero image for selection display
  - sprite sheet for in-game rendering

Target systems:
- Start / landing UI
- Character selection state
- Character sprite loading

User feedback:
- Replace the current landing/start page with a tiled character selector
- Each tile should show the hero image for each character in assets/character
- Selecting a character should use the corresponding character’s sprite sheet in-game
- Selected character should persist only until page refresh

Hypothesis:
A tiled character selector will make the game feel more polished while keeping character choice simple and session-scoped.

Task:
Generate a SMALL, ISOLATED implementation plan.

Constraints:
- Mobile-first tiled layout
- Do NOT add persistent storage/localStorage
- Do NOT add backend support
- Do NOT introduce a full character customization system
- Do NOT redesign the game loop
- Character choice should live only in runtime state
- Keep asset loading simple and explicit
- Maintain compatibility with the existing canvas rendering system

Output:
1. GOAL
2. CHANGE DESCRIPTION
3. EXPECTED EFFECT
4. ASSET DISCOVERY / CHARACTER DATA MODEL
5. SELECTION FLOW
6. GAME INTEGRATION POINTS
7. IMPLEMENTATION STEPS (max 5)
8. ROLLBACK STRATEGY
9. NON-GOALS
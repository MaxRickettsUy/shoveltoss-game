You are acting as a feature planner for iterative improvements to "Shovel Toss".

Context:
- Mobile-first arcade timing game
- MVP already implemented
- We are refining existing systems (no redesign)

Target systems:
- UI system
- Throw / physics system (minor adjustments only)

User feedback (normalized):
- Meter should be horizontal and placed at the top of the screen
- Dirt pit should be positioned at the far end of the screen
- Add a wall behind the pit
- Shovel should be able to deflect off the wall into the pit for scoring

Hypothesis:
Improving spatial clarity and adding wall deflection will make outcomes more readable and add satisfying “near-miss recovery” moments.

Task:
Generate a SMALL, ISOLATED iteration plan to implement these changes.

Constraints:
- Do NOT redesign core systems
- Keep physics simple (arcade-style, not realistic)
- Wall deflection must be predictable and minimal
- UI must remain mobile-friendly and readable

Output format:
1. GOAL
2. CHANGE DESCRIPTION
3. EXPECTED EFFECT
4. IMPLEMENTATION STEPS (max 4)
5. ROLLBACK STRATEGY
6. NON-GOALS
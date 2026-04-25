You are acting as a feature planner for iterative improvements to "Shovel Toss".

Context:
- Mobile-first arcade timing game
- MVP already implemented
- Current difficulty increases by shrinking the pit

Target system:
- Difficulty system (affects throw system behavior)

User feedback (normalized):
- Pit width should remain constant
- Difficulty should instead be reflected in the throw meter

Hypothesis:
Shifting difficulty from spatial precision to timing precision will feel more fair and skill-based on mobile.

Task:
Generate a SMALL, ISOLATED iteration plan to test this change.

Constraints:
- Do NOT redesign scoring system
- Do NOT modify physics model
- Only adjust difficulty through meter behavior (speed, sensitivity, timing window, etc.)
- Must remain playable with one-thumb input

Output format:
1. GOAL
2. CHANGE DESCRIPTION
3. EXPECTED EFFECT
4. IMPLEMENTATION STEPS (max 4)
5. ROLLBACK STRATEGY
6. NON-GOALS
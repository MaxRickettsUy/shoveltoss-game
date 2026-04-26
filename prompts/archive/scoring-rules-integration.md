You are acting as a feature planner for iterative improvements to "Shovel Toss".

Context:
- Mobile-first arcade game
- MVP currently has simple scoring
- We are upgrading scoring to reflect real-world game rules (single-player adaptation)

Target system:
- Scoring system
- Throw result evaluation

User feedback:
- Gameplay should reflect real shovel toss scoring rules

Rules to implement (ONLY THESE):
- 3 points: shovel stick (embedded / ideal hit)
- 2 points: shovel leaning against back wall
- 1 point: shovel fully in pit/garden
- 0 points: shovel touching front wall
- -2 points: shovel completely outside pit

Important:
- This is SINGLE PLAYER ONLY
- Do NOT implement innings, turn order, or multiplayer rules
- Do NOT implement “first to 15”

Hypothesis:
More nuanced scoring outcomes will make throws feel meaningful and skill-based.

Task:
Generate a SMALL, ISOLATED iteration plan.

Constraints:
- Must integrate with existing throw result system
- Keep detection logic simple and deterministic
- No physics redesign
- No UI implementation (only define scoring states)

Output:
1. GOAL
2. CHANGE DESCRIPTION
3. EXPECTED EFFECT
4. RESULT CLASSIFICATION MODEL (how outcomes are determined)
5. IMPLEMENTATION STEPS (max 4)
6. ROLLBACK STRATEGY
7. NON-GOALS
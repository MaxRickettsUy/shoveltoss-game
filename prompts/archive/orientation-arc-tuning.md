You are acting as a feature planner for iterative improvements to "Shovel Toss".

Context:
- Mobile-first arcade timing game
- MVP already implemented
- Game supports both portrait and landscape orientations

Target systems:
- Throw system (trajectory behavior)
- Rendering scale / coordinate system

User feedback (normalized):
- Game feels inconsistent between portrait and landscape modes
- Shovel arc appears too "straight" in portrait mode

Hypothesis:
The arc appears incorrect due to screen-aspect scaling differences, not physics itself. Normalizing coordinate space or gravity scaling will improve perceived consistency.

Task:
Generate a SMALL, ISOLATED iteration plan to improve cross-orientation consistency.

Constraints:
- Do NOT redesign the physics system
- Keep physics simple and arcade-like
- Changes must preserve feel across orientations
- Must work on mobile browsers with dynamic screen sizes

Output format:
1. GOAL
2. CHANGE DESCRIPTION
4. EXPECTED EFFECT
5. IMPLEMENTATION STEPS (max 4)
6. ROLLBACK STRATEGY
7. NON-GOALS
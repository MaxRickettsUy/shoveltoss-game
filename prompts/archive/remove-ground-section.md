You are acting as a feature planner for iterative improvements to "Shovel Toss".

Context:
- Mobile-first canvas arcade game
- MVP already implemented
- A solid brown ground section is currently rendered from `groundY` to the bottom of the canvas, plus a horizontal ground line at `groundY`
- The house background image already covers the full canvas; the brown section visually overlays the lower portion of that artwork
- `groundY` is also used as a logical reference for player position, wall height, pit alignment, and shovel landing detection

Target systems:
- Canvas rendering layer (visual ground fill + ground line)
- Any layout/state that conflates the visual ground with the logical ground reference

User feedback:
- Remove the brown ground section at the bottom of the gameplay screen so the background image shows through

Hypothesis:
The background already conveys the ground visually. Removing the placeholder fill will make the scene look more cohesive without affecting gameplay feel.

Task:
Generate a SMALL, ISOLATED implementation plan to remove the brown ground rendering while preserving the logical `groundY` reference used by physics, layout, and scoring.

Constraints:
- Do NOT change gameplay logic
- Do NOT change physics, collision, or landing detection
- Do NOT change scoring zones, pit boundaries, or wall placement
- `groundY` (and any layout math derived from it) MUST remain intact as a logical value
- Only remove visual rendering of the ground fill and ground line
- Must work in portrait and landscape
- Keep implementation minimal

Output:
1. GOAL
2. CHANGE DESCRIPTION
3. EXPECTED EFFECT
4. RENDERING CHANGES (what is removed, what stays)
5. LOGICAL INVARIANTS (what must NOT change)
6. IMPLEMENTATION STEPS (max 3)
7. ROLLBACK STRATEGY
8. NON-GOALS

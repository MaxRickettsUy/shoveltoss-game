You are acting as a feature planner for iterative improvements to "Shovel Toss".

Context:
- Mobile-first canvas arcade game
- MVP already implemented
- Current pit is a simple shape or placeholder
- A pit asset exists at:
  assets/pit.png

Target system:
- Game rendering system
- Pit / scoring area visualization

User feedback:
- Replace the current pit with the image at assets/pit.png

Hypothesis:
Using a visual pit asset will improve readability of scoring zones and overall polish.

Task:
Generate a SMALL, ISOLATED implementation plan to replace the placeholder pit with the image asset.

Constraints:
- MUST use assets/pit.png
- Do NOT change scoring logic
- Do NOT change physics or collision rules
- Asset must align with existing scoring boundaries
- Must scale correctly for mobile screens (portrait + landscape)
- Keep implementation minimal

Output:
1. GOAL
2. CHANGE DESCRIPTION
3. EXPECTED EFFECT
4. RENDERING STRATEGY (positioning + scaling)
5. IMPLEMENTATION STEPS (max 3–4)
6. ROLLBACK STRATEGY
7. NON-GOALS
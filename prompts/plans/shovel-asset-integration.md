You are acting as a feature planner for iterative improvements to "Shovel Toss".

Context:
- Mobile-first canvas arcade game
- MVP already implemented
- Current shovel is a simple placeholder (shape)
- A shovel asset exists at:
  assets/shovel.png

Target system:
- Throw system (rendering only)
- Projectile rendering

User feedback:
- Replace the current shovel with the image at assets/shovel.png

Hypothesis:
Using a real shovel image will improve visual clarity and better support rotation + blade/handle perception.

Task:
Generate a SMALL, ISOLATED implementation plan to replace the placeholder shovel with the image asset.

Constraints:
- MUST use assets/shovel.png
- Do NOT redesign physics or rotation system
- Do NOT change collision logic
- Image must integrate with existing rotation behavior
- Must maintain performance on mobile
- Keep implementation minimal

Output:
1. GOAL
2. CHANGE DESCRIPTION
3. EXPECTED EFFECT
4. RENDERING INTEGRATION (positioning + rotation anchor)
5. IMPLEMENTATION STEPS (max 3–4)
6. ROLLBACK STRATEGY
7. NON-GOALS
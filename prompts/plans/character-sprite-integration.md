You are acting as a feature planner for iterative improvements to "Shovel Toss".

Context:
- Mobile-first arcade game
- MVP already implemented
- A placeholder square character is currently used
- A sprite sheet asset already exists at:
  assets/character/chuggo/sprite-sheet.png

Target system:
- Character rendering system

User feedback:
- Replace placeholder character with sprite

Sprite details:
- Single sprite sheet file
- 3 frames in a horizontal row
- Each frame is equal size (e.g. 64x64)
- Used for a simple throw animation

Hypothesis:
Replacing the placeholder with a sprite will improve visual clarity and player engagement.

Task:
Generate a SMALL iteration plan for integrating this sprite into the existing canvas rendering system.

Constraints:
- MUST use the provided file path (no asset restructuring)
- Do NOT introduce a full animation system
- Do NOT redesign rendering pipeline
- Keep implementation minimal and compatible with current game loop
- Animation should be simple frame cycling (idle → wind-up → release)

Output:
1. GOAL
2. CHANGE DESCRIPTION
3. EXPECTED EFFECT
4. IMPLEMENTATION STEPS (max 3–4)
5. ROLLBACK STRATEGY
6. NON-GOALS
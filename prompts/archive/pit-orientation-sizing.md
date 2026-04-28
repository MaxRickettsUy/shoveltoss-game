You are acting as a feature planner for iterative improvements to "Shovel Toss".

Context:
- Mobile-first canvas arcade game
- MVP already implemented
- The pit asset (assets/pit.png) is rendered using `pitLeft`/`pitRight` as its on-screen width, with height derived from the image aspect ratio
- `pitLeft`/`pitRight` are computed from `canvas.width * PIT_WIDTH` where `PIT_WIDTH = 0.22`
- In landscape, `canvas.width` is large, so the pit reads at a good size
- In portrait (mobile), `canvas.width` is small, so the pit (and its derived height) appears too small relative to the scene

Target systems:
- Pit sizing / layout math
- Pit rendering scale

User feedback:
- The pit looks correctly sized in landscape but too small in portrait

Hypothesis:
The pit is sized purely off `canvas.width`, which under-scales it in portrait. Tying pit size to an orientation-aware reference (or interpolating `PIT_WIDTH` between portrait and landscape values, mirroring how `throwAngle` already interpolates) will produce a consistent on-screen pit size across orientations without affecting gameplay rules.

Task:
Generate a SMALL, ISOLATED implementation plan to rebalance pit sizing so the pit reads at a similar relative size in both portrait and landscape.

Constraints:
- Do NOT change scoring logic, scoring zones, or sweet-spot math
- Do NOT change physics, collision, landing detection, or wall placement rules
- `pitCenterX` placement (currently `canvas.width * 0.80`) MUST remain unchanged
- The wall and pit boundaries must stay aligned (wall is computed from `pitRight`)
- Must work cleanly across the existing portrait/landscape aspect range
- Keep the change localized to layout/sizing math — no rewrite of `updateLayout` or `updateDifficulty`
- Keep implementation minimal

Output:
1. GOAL
2. CHANGE DESCRIPTION
3. EXPECTED EFFECT
4. SIZING STRATEGY (chosen approach + formula)
5. ORIENTATION INTERPOLATION RULES
6. IMPLEMENTATION STEPS (max 3)
7. ROLLBACK STRATEGY
8. NON-GOALS

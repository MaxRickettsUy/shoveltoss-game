You are acting as a feature planner for iterative improvements to "Shovel Toss".

Context:
- Mobile-first arcade game
- Simple projectile physics already implemented
- We are adding controlled physical behavior for better realism and gameplay depth

Target systems:
- Throw system
- Collision / result evaluation

User feedback:
- Shovel should rotate slightly in flight
- Shovel has two ends: handle and blade
- Landing angle should affect scoring outcome:
  - Parallel to wall → “stick” (blade cuts in)
  - Perpendicular → shovel lies flat in pit

Hypothesis:
Adding rotation and angle-based outcome logic will create more satisfying and skill-based results.

Task:
Generate a SMALL, ISOLATED iteration plan to add this behavior.

Constraints:
- Keep physics simple (no full rigid body simulation)
- Rotation should be deterministic and predictable
- Angle classification must be simple (threshold-based, not continuous physics)
- Must integrate with existing scoring system
- Must remain performant on mobile

Output:
1. GOAL
2. CHANGE DESCRIPTION
3. EXPECTED EFFECT
4. ROTATION MODEL (how rotation is calculated)
5. IMPACT CLASSIFICATION MODEL (angle thresholds)
6. IMPLEMENTATION STEPS (max 4)
7. ROLLBACK STRATEGY
8. NON-GOALS
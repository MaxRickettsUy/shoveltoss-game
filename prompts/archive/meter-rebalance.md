You are acting as a feature planner for iterative improvements to "Shovel Toss".

Context:
- Mobile-first arcade timing game
- Throw system already implemented
- Current meter has a “sweet spot” that often produces too much power

Target system:
- Throw system (meter → power mapping)

User feedback:
- The sweet spot produces throws that are too strong, often going out of bounds

Hypothesis:
The power curve is too steep near the optimal timing zone. Adjusting the mapping will improve control and consistency.

Task:
Generate a SMALL iteration plan to rebalance meter power.

Constraints:
- Do NOT redesign the meter UI
- Do NOT change physics model
- Only adjust how meter timing maps to power
- Must remain intuitive for one-thumb input

Output:
1. GOAL
2. CHANGE DESCRIPTION
3. EXPECTED EFFECT
4. IMPLEMENTATION STEPS (max 3–4)
5. ROLLBACK STRATEGY
6. NON-GOALS
Generate a SINGLE-FEATURE IMPLEMENTATION PLAN for the GAME LOOP SYSTEM for a MOBILE-FIRST version of "Shovel Toss".

# CONTEXT
- Mobile-first canvas game
- One-thumb interaction design
- Single-player run-based arcade loop

# SCOPE
Defines:
- requestAnimationFrame loop structure
- update/render cycle
- game state transitions (idle → throwing → resolving → reset)
- restart flow optimized for mobile UX

# MOBILE-FIRST REQUIREMENTS
- Must handle touch input events cleanly
- Must assume mobile frame variability (battery saving, browser throttling)
- UI state transitions must feel immediate on touch devices

# CONSTRAINTS
- no feature logic (no scoring, no physics design)
- no UI system design
- no architecture over-design
- keep minimal and implementable

# OUTPUT FORMAT
1. GOAL
2. SYSTEM CONSTRAINTS
3. GAME STATE MODEL
4. LOOP STRUCTURE
5. STATE TRANSITIONS (mobile UX aware)
6. RESET / RESTART LOGIC (touch-friendly)
7. IMPLEMENTATION STEPS (max 5)
8. NON-GOALS
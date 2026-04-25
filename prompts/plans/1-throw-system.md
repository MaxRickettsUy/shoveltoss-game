You are a feature planner for a mobile-first browser game called "Shovel Toss".

Generate a SINGLE-FEATURE IMPLEMENTATION PLAN for the THROW SYSTEM.

# CONTEXT
Read app-seed.md:
- Mobile-first 2D side-view arcade timing game
- Player does NOT move
- One-thumb touch interaction is primary input
- Core mechanic is timing-based shovel throwing into a pit

# MOBILE-FIRST REQUIREMENTS
- Input must be designed for touch (tap / hold / release)
- Meter must be usable on a phone screen with one hand
- Interaction latency must feel responsive on mobile browsers

# SCOPE
This system includes:
- touch-based timing meter (NOT keyboard-based)
- conversion of touch input → throw power
- projectile launch logic
- simple arc physics
- event hook for scoring system (do NOT implement scoring)

# CONSTRAINTS
- vanilla JavaScript + Canvas
- no external libraries
- no architecture design
- no desktop-first assumptions

# OUTPUT FORMAT
1. GOAL
2. SYSTEM CONSTRAINTS
3. INPUT / OUTPUT MODEL (MUST BE TOUCH-FIRST)
4. THROW METER DESIGN (MOBILE UX FOCUSED)
5. PHYSICS MODEL
6. HIT / RESULT HOOKS
7. IMPLEMENTATION STEPS (max 5)
8. NON-GOALS
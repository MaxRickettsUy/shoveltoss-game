# Plan: Meter Redesign — Smaller Hot Spot, Guaranteed Stick

**Target system:** throw-system / meter

**User feedback:**
- Sticks happen too often → low difficulty, low reward feel
- Players want precision to matter

**Hypothesis:**
Shrinking the hot zone but making any landing inside it a guaranteed stick will increase challenge and make successful sticks feel earned. This concentrates reward on precision rather than volume.

## 1. GOAL
Reduce the size of the meter's "hot spot" zone and make any hit within it produce a stick outcome.

## 2. CHANGE DESCRIPTION
- Shrink the hot-spot width (e.g., from current size to ~30–40% of previous width — exact value tunable).
- Any meter stop within the hot-spot bounds = guaranteed stick (100%).
- Outside the hot spot = miss (or existing non-stick outcome).
- Remove any probabilistic stick logic tied to proximity if it currently exists.

## 3. EXPECTED EFFECT
- Sticks become rarer and feel skill-based.
- Difficulty curve sharpens; misses become the default outcome.
- Combined with the 3-miss lives system, this creates meaningful tension per throw.

## 4. IMPLEMENTATION STEPS
1. In meter config, reduce `hotSpotWidth` to a smaller value (start with ~35% of current; expose for tuning).
2. In throw-resolution logic, simplify to: if meter-stop position ∈ hot-spot range → stick; else → miss.
3. Remove any partial-stick / near-miss probability code if present.

## 5. ROLLBACK STRATEGY
Revert the commit. Restore previous `hotSpotWidth` value and prior outcome logic.

## 6. NON-GOALS
- No new visual indicators for the hot spot (use existing rendering).
- No variable hot-spot size based on difficulty/score.
- No new outcome categories (just stick / miss).
- No changes to meter speed or oscillation behavior.

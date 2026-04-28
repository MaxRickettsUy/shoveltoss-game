# Plan: Meter Difficulty Ramp

**Target system:** throw-system / meter

**User feedback:**
- Overall meter feels too wide
- Difficulty doesn't escalate during a run
- Hot-spot shrink should be earned, not automatic

**Hypothesis:**
A narrower base meter, per-throw speed ramp, and per-stick hot-spot shrink will create an escalating challenge curve where each successful stick raises the bar for the next throw.

## 1. GOAL
Make the meter narrower overall, increase meter speed on every throw, and shrink the hot spot only on each successful stick.

## 2. CHANGE DESCRIPTION
- Reduce the overall meter `width` (start at ~70% of current; expose for tuning).
- On every throw (stick OR miss), increment meter `speed` by a fixed delta.
- On every successful stick, decrement `hotSpotWidth` by a fixed delta down to a floor value.
- A miss does NOT shrink the hot spot.
- All ramp values reset on game-over / new run.

## 3. EXPECTED EFFECT
- Tighter visual meter feels more focused and precise.
- Speed escalates predictably each throw, increasing tension over a run.
- Hot-spot shrink is a "reward penalty" — better players face a harder target.

## 4. IMPLEMENTATION STEPS
1. In meter config, reduce base `width` (~70% of current). Add tunable constants: `speedIncrementPerThrow`, `hotSpotShrinkPerStick`, `hotSpotMinWidth`.
2. In throw-resolution logic, after every throw apply `speed += speedIncrementPerThrow`.
3. On stick outcome, apply `hotSpotWidth = max(hotSpotWidth - hotSpotShrinkPerStick, hotSpotMinWidth)`.
4. On game-over / new run, reset `speed` and `hotSpotWidth` to their base values.

## 5. ROLLBACK STRATEGY
Revert the commit. Restore prior meter `width`, remove ramp constants and per-throw/per-stick mutation logic.

## 6. NON-GOALS
- No new visual indicators for speed or hot-spot changes.
- No score-based or time-based ramping (only per-throw / per-stick).
- No difficulty curves, easing, or non-linear ramps — flat increments only.
- No persistence of difficulty state across runs.

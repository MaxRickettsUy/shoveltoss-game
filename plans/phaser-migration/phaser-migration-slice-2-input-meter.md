# Plan: Phaser Migration — Slice 2 (Input + Meter)

**Target system:** throw-system / meter / input

**User feedback:**
- Slice 1 (scaffold + static scene) is landed
- Need input and meter running inside Phaser before porting throw logic

**Hypothesis:**
Porting input handling and the meter into the Phaser scene — while keeping throw resolution and scoring in the legacy code — proves Phaser's input + render loop works for our timing mechanic without breaking gameplay.

## 1. GOAL
Move tap/click input handling and meter rendering + oscillation into the Phaser scene. Throw outcome, scoring, and HUD remain in legacy code.

## 2. CHANGE DESCRIPTION
- Add a meter Game Object (Phaser `Graphics` or `Container`) to the scene.
- Drive meter oscillation using Phaser's update loop.
- Capture pointer/tap input via Phaser's input system.
- On tap, read meter position and emit it to the existing throw-resolution function (legacy code).
- Legacy meter rendering is hidden when `USE_PHASER` flag is on.

## 3. EXPECTED EFFECT
- Meter renders and oscillates in the Phaser scene.
- Tapping triggers a throw with correct meter position.
- Existing throw outcome / scoring / HUD continue to work unchanged.

## 4. IMPLEMENTATION STEPS
1. Add a `Meter` class or scene method that draws the meter bar + hot-spot using Phaser `Graphics`. Read width/speed/hot-spot config from the same source the legacy meter uses.
2. In the scene's `update`, advance meter position; clamp/reverse at bounds matching legacy behavior.
3. Register a Phaser pointerdown handler. On tap, capture meter position and call the existing `resolveThrow(position)` function.
4. Hide legacy meter DOM when `USE_PHASER` is on. Verify throw outcome and HUD still update correctly.

## 5. ROLLBACK STRATEGY
Revert the commit. Remove the Phaser meter code and pointer handler. Legacy meter resumes via flag-off.

## 6. NON-GOALS
- No migration of throw animation/physics.
- No migration of HUD or score rendering.
- No new input modes (keyboard, gamepad).
- No changes to throw-resolution logic or meter constants.
- No removal of legacy meter code.

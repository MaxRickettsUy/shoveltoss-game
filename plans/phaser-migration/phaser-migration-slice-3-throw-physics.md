# Plan: Phaser Migration — Slice 3 (Throw Animation / Physics)

**Target system:** throw-system / animation

**User feedback:**
- Slices 1 & 2 are landed
- Throw arc and stick/miss animation should run inside Phaser

**Hypothesis:**
Porting the shovel's flight + landing animation into Phaser — using tweens or simple kinematics — replaces the legacy animation path and lets us delete a significant chunk of custom rendering code in the next slice.

## 1. GOAL
Render the shovel throw arc and stick/miss landing animation inside the Phaser scene, driven by the existing throw-resolution outcome.

## 2. CHANGE DESCRIPTION
- Add a `Shovel` Game Object to the scene.
- On throw resolution, animate the shovel from origin to landing position using Phaser tweens (or arcade physics for an arc, if simpler).
- Stick outcome: shovel sticks at the pit position; miss outcome: shovel lands past/short of pit.
- Trigger animation completion callback that signals the legacy code to update score/lives.

## 3. EXPECTED EFFECT
- Throw animation runs in Phaser with the same arc/feel as legacy.
- Stick and miss visuals are correct.
- Score/lives update at end of animation, matching legacy timing.

## 4. IMPLEMENTATION STEPS
1. Add a `Shovel` sprite/Game Object positioned at the throw origin. Hide legacy shovel rendering when `USE_PHASER` is on.
2. On `resolveThrow` outcome, kick off a Phaser tween (or physics arc) to the appropriate landing position. Match legacy duration/easing.
3. On tween complete, invoke the legacy callback that finalizes score/lives state.
4. Verify timing parity: throw → animation → score update happens in the same order as legacy.

## 5. ROLLBACK STRATEGY
Revert the commit. Remove the Phaser shovel object and tween logic. Legacy animation resumes via flag-off.

## 6. NON-GOALS
- No migration of HUD or score rendering.
- No new throw mechanics, charge meters, or curve physics.
- No particle effects, screen shake, or polish beyond legacy parity.
- No changes to throw-resolution math.
- No removal of legacy animation code.

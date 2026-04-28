# Plan: Phaser Migration — Slice 5 (Remove Legacy Renderer + Flag)

**Target system:** rendering / cleanup

**User feedback:**
- Slices 1–4 are landed and verified
- Legacy renderer is now dead code; the feature flag is no longer useful

**Hypothesis:**
With all visual systems running in Phaser, removing the legacy renderer and the `USE_PHASER` flag simplifies the codebase and locks in Phaser as the rendering engine.

## 1. GOAL
Delete the legacy renderer code and the `USE_PHASER` feature flag. Phaser becomes the only render path.

## 2. CHANGE DESCRIPTION
- Remove legacy DOM/canvas rendering modules (background, character, pit, meter, shovel, HUD).
- Remove the `USE_PHASER` flag and any conditional branches it controlled.
- Phaser scene runs unconditionally on app boot.

## 3. EXPECTED EFFECT
- Single render path through Phaser.
- Reduced code surface and dependencies.
- No visual or behavioral regression — Slice 4 already verified parity.

## 4. IMPLEMENTATION STEPS
1. Delete legacy renderer files and any imports/exports that reference them.
2. Remove `USE_PHASER` flag reads and the conditional that switched between renderers; Phaser boots unconditionally.
3. Run the app; verify all gameplay flows (start, throw, stick, miss, game-over, change character) work identically to flagged-on behavior.

## 5. ROLLBACK STRATEGY
Revert the commit. Legacy renderer and flag are restored from git history.

## 6. NON-GOALS
- No new features or polish.
- No further refactoring of the Phaser code.
- No dependency cleanup beyond what the legacy renderer required (handled separately if needed).
- No build config changes.

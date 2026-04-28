# Plan: Phaser Migration — Slice 1 (Scaffold + Static Scene)

**Target system:** rendering / engine

**User feedback:**
- Custom rendering / loop is limiting future feature work
- Phaser would give us a proper game engine baseline (scenes, input, asset pipeline, physics)

**Hypothesis:**
Migrating in slices — starting with a Phaser scaffold that renders only the static scene (background, character, pit) — proves the engine works in our build setup and gives us a foundation to migrate one system at a time without breaking gameplay.

## 1. GOAL
Add Phaser to the project, boot a Phaser Game instance, and render the static scene (background, character, pit) using Phaser. Game logic remains in the existing code, untouched.

## 2. CHANGE DESCRIPTION
- Install `phaser` as a dependency.
- Create a single Phaser `Scene` (e.g., `BootScene` or `MainScene`) that loads existing assets and renders the static layout.
- Mount the Phaser canvas in the existing app container.
- Behind a feature flag / dev toggle, render the Phaser scene instead of the current renderer.
- No game logic, input, or interactivity is migrated in this slice.

## 3. EXPECTED EFFECT
- Phaser builds and runs in the project's bundler.
- Static scene renders identically (or close enough) to the current version.
- Existing gameplay still works when the flag is off.
- Foundation is ready for next slice (input + meter, then throw, then HUD, then scoring).

## 4. IMPLEMENTATION STEPS
1. Add `phaser` to `package.json`; verify it builds with the existing bundler.
2. Create `src/phaser/MainScene.ts` (or equivalent) with a `preload` that loads existing character/pit/background assets and a `create` that places them at matching positions.
3. Create `src/phaser/game.ts` that constructs `new Phaser.Game(...)` with config (size, parent element, scene). Mount inside the current app's root element.
4. Add a dev-only flag (`USE_PHASER` env var or query param) that renders the Phaser canvas in place of the current renderer. Default off.

## 5. ROLLBACK STRATEGY
Revert the commit. Remove the `phaser` dependency, the `src/phaser/` folder, and the feature flag wiring.

## 6. NON-GOALS
- No migration of meter, throw, scoring, or HUD logic.
- No input handling in Phaser.
- No removal of the existing renderer (runs in parallel behind a flag).
- No physics, tweens, or animations.
- No asset re-export or sprite-sheet conversion.
- No changes to gameplay constants or balance.

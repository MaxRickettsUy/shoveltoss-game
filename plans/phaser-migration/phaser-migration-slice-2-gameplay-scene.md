# Feature Plan: Phaser Migration — Slice 2 (Gameplay Scene)

> Authoritative architecture is in `phaser-migration-overview.md`. Do not deviate from version, tooling, or scene topology decisions made there.

## Problem

After Slice 1 the Phaser app boots but doesn't do anything. This slice implements the full throw loop end-to-end in Phaser — meter, charge, release, flight, stick/miss, scoring — with no menus around it. Once this lands, the game is playable in Phaser for one character on one level. All later slices wrap menus, multiplayer, and leaderboards around this core scene.

## Scope

**In:**
- `GameScene` running the full throw lifecycle (`IDLE → CHARGING → FLYING → RESETTING → IDLE`).
- `HUDScene` running in parallel, showing score and lives remaining.
- `Meter` UI component with oscillation, charge, and release.
- Throw arc rendered via Phaser tweens.
- Pit hit-detection and stick/miss outcome.
- Score accumulation and `MISSES_PER_RUN` enforcement.
- `GameOverScene` placeholder that displays final score and a "Play again" button (no leaderboard submission yet).
- A temporary "Play" button on `HomeScene` that starts `GameScene` with hard-coded default character + level (no character/level selection yet).

**Out:**
- Username, character select, level select, leaderboards, hall of fame, player stats, versus.
- `high_scores` submission (Slice 3).
- Settings (meter position toggle, etc.) — Slice 3.
- Visual polish beyond legacy parity.

## Tech Choices

- **Throw arc**: Phaser tweens, not arcade physics. Reason: the legacy arc is deterministic and parameterized by `THROW_DURATION` + power + accuracy, not gravity-simulated. Tweens give exact parity; arcade physics would force re-tuning.
- **Meter**: a `Phaser.GameObjects.Container` containing `Graphics` for the bar, hot-spot, and ticker, plus a `Text` for label. Lives in `src/ui/Meter.ts`. Not a `Graphics`-only object so we can position and tween the container as a whole.
- **Input**: `this.input.on('pointerdown', ...)` at the scene level. No keyboard or gamepad. Touch and mouse both go through pointer events.
- **State machine**: throw lifecycle is scene-local (a `this.throwState` enum on `GameScene`), not in the registry. Cross-scene state stays in the registry per the overview.

## Files Touched

New:
- `src/scenes/GameScene.ts`
- `src/scenes/HUDScene.ts`
- `src/scenes/GameOverScene.ts`
- `src/ui/Meter.ts`
- `src/game/throw.ts` — pure functions: `computeOutcome({ power, accuracy, levelId, characterId })` → `{ outcome: 'stick' | 'miss', landingX, landingY, score }`.

Modified:
- `src/main.ts` — add `GameScene`, `HUDScene`, `GameOverScene` to the scene list.
- `src/scenes/HomeScene.ts` — add a temporary "Play" button that calls `this.scene.start('GameScene', { characterId, levelId, mode: 'solo' })`.
- `src/game/types.ts` — add `ThrowInput`, `ThrowOutcome`, `GameSceneData` interfaces.

Unchanged:
- All Slice 1 files except `HomeScene.ts` and `main.ts`.
- `legacy.html`, `src/globalScores.ts`, `src/config.ts`, `src/releaseNotes.ts`.

## Implementation Steps

### Step 1 — Types in `src/game/types.ts`

```ts
import type { CharacterId, LevelId, GameMode } from './types';

export interface ThrowInput {
  power: number;              // 0..1
  accuracy: number;           // 0..1; SWEET_SPOT_CENTER = 0.50 is perfect
  characterId: CharacterId;
  levelId: LevelId;
}

export interface ThrowOutcome {
  outcome: 'stick' | 'miss';
  landingX: number;
  landingY: number;
  score: number;
  sweetSpot: boolean;
}

export interface GameSceneData {
  mode: GameMode;
  characterId: CharacterId;
  levelId: LevelId;
  throwsRemaining?: number;   // overrides Infinity for versus
  matchId?: string;
}

export type ThrowState = 'IDLE' | 'CHARGING' | 'FLYING' | 'RESETTING';
```

### Step 2 — `src/game/throw.ts` (pure outcome calculator)

Port the throw math from `legacy.html` as a pure function. No DOM, no canvas, no Phaser imports.

```ts
import type { ThrowInput, ThrowOutcome } from './types';

export function computeOutcome(input: ThrowInput): ThrowOutcome {
  // Copy legacy math verbatim. No rebalancing, no rewriting "for clarity."
}
```

### Step 3 — `src/ui/Meter.ts`

Reusable component.

```ts
import Phaser from 'phaser';

export interface MeterOptions {
  x: number;
  y: number;
  width: number;
  hotSpotCenter: number;       // 0..1
  hotSpotWidth: number;        // 0..1
  speed: number;               // cycles per second
}

export interface MeterRelease {
  accuracy: number;            // 0..1
  inSweetSpot: boolean;
}

export default class Meter extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, opts: MeterOptions) { /* ... */ }
  start(): void { /* ... */ }
  stop(): MeterRelease { /* ... */ }
  tick(delta: number): void { /* ... */ }
}
```

Internally a `Container` holding three `Graphics` layers (bar background, sweet-spot region, ticker) and a `Text` label. Oscillation advances via `tick(delta)` called from the parent scene's `update(time, delta)`, **not** a Phaser tween — the parent owns the clock.

### Step 4 — `src/scenes/GameScene.ts`

Scene-local state:

```ts
import Phaser from 'phaser';
import type { GameSceneData, ThrowState } from '../game/types';

export default class GameScene extends Phaser.Scene {
  private throwState: ThrowState = 'IDLE';
  private score = 0;
  private misses = 0;
  private chargeStartTime = 0;
  private mode!: GameSceneData['mode'];
  private characterId!: GameSceneData['characterId'];
  private levelId!: GameSceneData['levelId'];
  private throwsRemaining = Infinity;
  private meter!: Meter;

  init(data: GameSceneData): void {
    this.mode = data.mode;
    this.characterId = data.characterId;
    this.levelId = data.levelId;
    this.throwsRemaining = data.throwsRemaining ?? (data.mode === 'versus' ? VERSUS_THROWS_PER_PLAYER : Infinity);
  }
  // ...
}
```

`init(data)` reads scene parameters (signature shown above). `create()` does:
1. Add level image (`level:${this.levelId}`) as background.
2. Add pit image (`pit` or `pit-left` based on level metadata).
3. Add character sprite from `character:${this.characterId}:sheet` at the legacy starting position. Use `flipX` for left-facing levels (e.g. Lil Italy).
4. Construct `this.meter = new Meter(this, ...)`.
5. Launch HUD: `this.scene.launch('HUDScene', { source: this })`.
6. Bind `this.input.on('pointerdown', this.onPointerDown, this)`.
7. Set `this.throwState = 'IDLE'`, call `this.meter.start()`.

`update(time, delta)` ticks the meter while `throwState === 'IDLE' || 'CHARGING'`. Arc tween advances in `FLYING`. `RESETTING` waits a short cooldown then returns to `IDLE` (or transitions to `GameOverScene` if `misses >= MISSES_PER_RUN` or `throwsRemaining === 0`).

`onPointerDown()`:
- `IDLE` → `CHARGING`, record `this.chargeStartTime`, switch character sprite frame to "charging".
- `CHARGING` → `FLYING`, compute `power = (now - chargeStartTime) / MAX_CHARGE_MS` (clamp 0..1), call `this.meter.stop()` → `{ accuracy }`, call `computeOutcome({ power, accuracy, characterId, levelId })`, switch sprite to "throwing", start arc tween.
- `FLYING` / `RESETTING`: ignore.

Arc tween: animate a `Shovel` sprite or rectangle from origin to `{ landingX, landingY }` over `THROW_DURATION` seconds. `onComplete` →
- `outcome === 'stick'`: `this.score += outcomeScore`, transition `RESETTING`.
- `outcome === 'miss'`: `this.misses += 1`, transition `RESETTING`.
- Game over: `this.scene.stop('HUDScene'); this.scene.start('GameOverScene', { score: this.score })`.

Score and miss changes are written to the registry (`setState(this.game, 'score', this.score)`, etc.) so `HUDScene` updates reactively.

### Step 5 — `src/scenes/HUDScene.ts`

Parallel scene. `create()`:
- Two `Text` objects: score (top-left), lives-remaining-as-shovel-icons (top-right). Positions match legacy.
- Subscribe to registry changes:

```ts
this.unsubScore = onStateChange(this.game, 'score', v => this.scoreText.setText(String(v)));
this.unsubMisses = onStateChange(this.game, 'misses', v => this.renderLives(v));
```

- `renderLives(misses: number)` shows `MISSES_PER_RUN - misses` shovel-icon images.

In `shutdown()`, call the unsubscribe functions returned by `onStateChange` and listen for `GameScene` shutdown via `this.scene.get('GameScene').events.on('shutdown', ...)`.

### Step 6 — `src/scenes/GameOverScene.ts` (placeholder)

`init(data)`: `this.finalScore = data.score`.
`create()`:
- Dim background overlay (a black rectangle at 60% alpha covering the screen — `GameScene` is stopped, so this is the only visible scene).
- "Game Over" text in Bungee.
- "Final score: N" in Archivo.
- "Play again" button that calls `this.scene.start('GameScene', { characterId, levelId, mode: 'solo' })` with the same parameters.
- "Home" button that calls `this.scene.start('HomeScene')`.

No leaderboard submission. No score history. Slice 3 adds those.

### Step 7 — Temporary "Play" button on `HomeScene`

Add a single button that calls:

```ts
this.scene.start('GameScene', {
  characterId: CHARACTERS[0].id,
  levelId: LEVELS[0].id,
  mode: 'solo'
} satisfies GameSceneData);
```

Slice 3 removes this and wires the real menu flow.

### Step 8 — Update `src/main.ts`

Add `GameScene`, `HUDScene`, `GameOverScene` to the scene array (in that order — Phaser starts the first scene in the array if `scene.start` is not called, but `BootScene` already handles boot routing).

## Data / Schema Changes

None. `score` and `misses` are scene-local; only mirrored to the registry for HUD reactivity. No `localStorage` writes (high scores are Slice 3).

## Constraints

- The throw outcome math in `src/game/throw.ts` must match legacy bit-for-bit. If the developer cannot reproduce legacy outcomes for a given `(power, accuracy)` pair, stop and surface to the architect.
- No new gameplay tuning or balance changes.
- No new assets.
- No edits to `legacy.html`, `globalScores.ts`, `config.ts`, `releaseNotes.ts`.

## Edge Cases

- **Pointer down during `FLYING` or `RESETTING`**: ignore (do not queue, do not advance).
- **Pointer cancel** (e.g. browser focus loss mid-charge): treat as a release with current power and current meter position. Matches legacy "best-effort" behavior; if legacy explicitly cancels the throw, mirror that instead.
- **Tween still running when scene shuts down**: kill tweens in `shutdown()` to avoid leaks.
- **Lil Italy mirror**: character sprite gets `setFlipX(true)`; pit uses `pit-left` asset; landing X math mirrors horizontally. Levels carry an `isMirrored: boolean` in `src/game/levels.ts`.
- **Browser tab backgrounded**: Phaser pauses the game loop by default; resume cleanly without leftover charge state.

## Verification

1. Click "Play" on `HomeScene`. `GameScene` loads with default character + level. Background, character, pit, meter all visible.
2. Tap once: charge animation begins, sprite frame changes to "charging".
3. Tap again at sweet spot: throw arcs to the pit, sticks, score increments by the legacy-correct sweet-spot amount.
4. Tap with bad timing: shovel lands short or past pit, lives decrement.
5. After 3 misses: `GameOverScene` shows with final score. "Play again" returns to a fresh `GameScene`.
6. HUD shows score (top-left) and lives (top-right) updating live.
7. Browser console: no errors. No leftover tweens after scene shutdown (check via `this.tweens.getAll().length === 0` in a `shutdown` hook during testing).
8. `/legacy.html` still works unchanged.
9. `npm run typecheck` passes.

## Rollback

Revert the commit. No schema, no `localStorage`, no asset changes.

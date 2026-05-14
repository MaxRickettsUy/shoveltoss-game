# Feature Plan: Phaser Migration — Slice 1 (Bootstrap)

> Authoritative architecture is in `phaser-migration-overview.md`. Do not deviate from version, tooling, or scene topology decisions made there.

## Problem

The game is a single static `index.html` with no engine, no scene system, and ad-hoc rendering. Before any gameplay can move to Phaser, the project needs a working Phaser 4 + Vite scaffold with a scene structure, an asset preloader, and a way to run both the new and legacy games side-by-side during the rest of the migration.

## Scope

**In:**
- Install Phaser 4 and Vite. Switch `npm run dev` to Vite.
- Preserve the current game as `legacy.html` so it remains reachable during the migration.
- Create the new Phaser entry at `index.html` + `src/main.ts` with `BootScene` and a placeholder `HomeScene`.
- Preload all existing assets through Phaser's Loader, keyed as defined in the overview.
- Establish `src/game/state.ts` (registry wrapper) and `src/game/storage.ts` (`localStorage` helpers).
- Move `APP_VERSION_TAG`, character lists, and gameplay constants into `src/game/constants.ts` / `src/game/characters.ts` / `src/game/levels.ts`. **Read-only re-export** — values are unchanged.
- Convert `src/config.js`, `src/globalScores.js`, `src/releaseNotes.js` to TypeScript. Add types throughout. Update `legacy.html`'s `<script>` references to point at the new `.ts` paths (Vite transpiles on the fly).

**Out:**
- Any gameplay logic (no meter, no throw, no scoring).
- Any menus, leaderboards, or versus screens.
- Any deletion of legacy code.
- Any change to assets, Supabase schema, or `localStorage` contract.
- Any API change to `globalScores` — the conversion adds types only; function names, signatures (apart from added type annotations), and behavior are identical.

## Tech Choices

- **Phaser 4 (`phaser@^4`)** consumed as ESM from `node_modules` via Vite. No CDN, no vendored copy.
- **Vite** is the dev server and build tool. Chosen because Phaser 4's official templates use Vite and `npm run dev` already exists with the same semantics. Vite transpiles `.ts` files for both `index.html` and `legacy.html` transparently — that's why we can rename the existing `.js` files without breaking the legacy page.
- **TypeScript (strict)** for all source. The three existing `.js` files are converted as part of this slice. Phaser 4 ships its own types; no `@types/phaser` is needed.
- **Escape valve for the `.js → .ts` conversion**: if a function in `globalScores.ts` has a Supabase return shape that's too tangled to type cleanly within this slice, the developer may annotate it as `Promise<any>` with a `// TODO(types): tighten <reason>` comment. This is bounded: ≤3 such escape hatches total. More than that → stop and surface to the architect.
- Type-checking runs via `tsc --noEmit` as a separate `npm run typecheck` script. Vite uses esbuild to transpile; it does not type-check.
- **No new test runner, linter, or formatter.**
- If Phaser 4 stable is not available at implementation time, stop and surface this — do not silently install Phaser 3.

## Files Touched

New:
- `package.json` (add dependencies + scripts)
- `tsconfig.json`
- `vite.config.ts`
- `src/main.ts`
- `src/scenes/BootScene.ts`
- `src/scenes/HomeScene.ts`
- `src/game/constants.ts`
- `src/game/characters.ts`
- `src/game/levels.ts`
- `src/game/state.ts`
- `src/game/storage.ts`
- `src/game/types.ts`

Renamed (verbatim move, contents preserved in the rename commit; TypeScript work happens in follow-up commits inside the same slice):
- `index.html` → `legacy.html`
- `src/config.js` → `src/config.ts`
- `src/globalScores.js` → `src/globalScores.ts`
- `src/releaseNotes.js` → `src/releaseNotes.ts`

Replaced:
- `index.html` (new — Vite entry, mounts `<div id="game-root"></div>`)

Modified:
- `legacy.html` — only the `<script>` `src` attributes that referenced `./src/*.js` are updated to `./src/*.ts`. No other edits.

Unchanged:
- `assets/**`
- `supabase/**`

## Implementation Steps

### Step 1 — Preserve the legacy game

Run `git mv index.html legacy.html`. Do not modify the file's contents. Verify it still serves at `/legacy.html` after Step 4.

### Step 2 — Install Phaser 4 + Vite + TypeScript

Update `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "phaser": "^4.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.4.0"
  }
}
```

Run `npm install`. Confirm Phaser 4 resolves; if only a pre-release is published, stop and ask the architect.

### Step 3 — `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src/**/*", "vite.config.ts"]
}
```

No `allowJs` / `checkJs` — every file under `src/` is `.ts` by the end of this slice.

### Step 4 — Vite config

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 3000 },
  build: { target: 'es2020', outDir: 'dist' }
});
```

`legacy.html` is automatically picked up by Vite as a multi-page entry because it sits at the project root.

### Step 5 — New `index.html`

Replace the (now renamed) `index.html` with a minimal Vite entry. Copy the `@font-face` declarations for Bungee and Archivo from `legacy.html` verbatim so font loading behaves identically.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Shovel Toss</title>
    <style>
      /* @font-face declarations copied verbatim from legacy.html */
      html, body { margin: 0; padding: 0; background: #000; }
      #game-root { width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <div id="game-root"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### Step 6 — `src/main.ts`

```ts
import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import HomeScene from './scenes/HomeScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  scene: [BootScene, HomeScene]
};

new Phaser.Game(config);
```

`width`/`height` mirror the legacy canvas dimensions. If legacy uses different values, copy them.

### Step 7 — `src/game/types.ts`

Central place for shared types. Initial contents:

```ts
export type CharacterId = string;
export type LevelId = string;
export type GameMode = 'solo' | 'versus';

export interface RegistryState {
  username: string | null;
  selectedCharacterId: CharacterId | null;
  selectedLevelId: LevelId | null;
  settings: Settings;
  activeMatch: MatchSnapshot | null;
  score: number;
  misses: number;
}

export interface Settings {
  meterPosition?: 'left' | 'right';
  hideHowToPlay?: boolean;
  hideVersusHowToPlay?: boolean;
}

export interface MatchSnapshot {
  matchId: string;
  inviteCode: string;
  challengerName: string;
  recipientName: string;
  challengerScore: number | null;
  recipientScore: number | null;
  status: 'pending' | 'playing' | 'complete';
  expiresAt: string;
  levelId: LevelId;
  challengerCharacterId: CharacterId | null;
  recipientCharacterId: CharacterId | null;
}
```

`MatchSnapshot` shape is locked in here so versus scenes in Slice 4 can rely on it.

### Step 8 — `src/scenes/BootScene.ts`

Preloads every asset under the keys defined in the overview, then transitions to `HomeScene` after `document.fonts.ready`.

```ts
import Phaser from 'phaser';
import { CHARACTERS } from '../game/characters';
import { LEVELS } from '../game/levels';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload(): void {
    this.load.image('pit', 'assets/pit.png');
    this.load.image('pit-left', 'assets/pit-left.png');
    for (const level of LEVELS) {
      this.load.image(`level:${level.id}`, `assets/level/${level.id}.png`);
    }
    for (const char of CHARACTERS) {
      this.load.image(`character:${char.id}:hero`, `assets/character/${char.id}/hero.png`);
      this.load.spritesheet(`character:${char.id}:sheet`, `assets/character/${char.id}/sprite-sheet.png`, {
        frameWidth: char.frameWidth,
        frameHeight: char.frameHeight
      });
    }
  }

  async create(): Promise<void> {
    await document.fonts.ready;
    this.scene.start('HomeScene');
  }
}
```

Note: `frameWidth`/`frameHeight` need to be set per character in `src/game/characters.ts` (Phaser 4 needs them at load time). Derive from each sheet's natural dimensions: `frameWidth = naturalWidth / 3`, `frameHeight = naturalHeight`.

### Step 9 — `src/scenes/HomeScene.ts` (placeholder)

A bare scene that proves Phaser is running. Black background, a `Phaser.GameObjects.Text` reading "Shovel Toss — Phaser build" in Bungee font, centered, with the version tag below in Archivo. No interactivity. Slice 3 replaces it.

```ts
import Phaser from 'phaser';
import { APP_VERSION_TAG } from '../game/constants';

export default class HomeScene extends Phaser.Scene {
  constructor() { super('HomeScene'); }

  create(): void {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'Shovel Toss — Phaser build', {
      fontFamily: 'Bungee, sans-serif', fontSize: '48px', color: '#ffffff'
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 60, APP_VERSION_TAG, {
      fontFamily: 'Archivo, sans-serif', fontSize: '20px', color: '#888888'
    }).setOrigin(0.5);
  }
}
```

### Step 10 — `src/game/constants.ts`

Extract gameplay constants from `legacy.html` to a module. Values must match legacy exactly.

```ts
export const APP_VERSION_TAG = '...';            // copy from legacy.html
export const MISSES_PER_RUN = 3;
export const VERSUS_THROWS_PER_PLAYER = 9;
export const THROW_DURATION = 0.6;
export const SWEET_SPOT_CENTER = 0.50;

export const STORAGE_KEYS = {
  username: 'shoveltoss.username',
  settings: 'shoveltoss.settings',
  challengesSentToday: 'shoveltoss.challengesSentToday'
} as const;
```

### Step 11 — `src/game/characters.ts` and `src/game/levels.ts`

Move `CHARACTERS[]`, `CHAMPION_IDS`, `NEW_CHARACTER_IDS`, `LADY_CHARACTER_IDS` into `characters.ts`. Add `frameWidth` and `frameHeight` per character. Move level metadata into `levels.ts`. Define `Character` and `Level` interfaces for the array element types.

```ts
// characters.ts
export interface Character {
  id: string;
  name: string;
  frameWidth: number;
  frameHeight: number;
}

export const CHARACTERS: readonly Character[] = [ /* ... */ ];
export const CHAMPION_IDS: ReadonlySet<string> = new Set([ /* ... */ ]);
export const NEW_CHARACTER_IDS: ReadonlySet<string> = new Set([ /* ... */ ]);
export const LADY_CHARACTER_IDS: ReadonlySet<string> = new Set([ /* ... */ ]);
```

```ts
// levels.ts
export interface Level {
  id: string;
  name: string;
  isMirrored: boolean;       // Lil Italy etc.
}

export const LEVELS: readonly Level[] = [ /* ... */ ];
```

`legacy.html` continues to define its own copies inline — do **not** share these between the two builds.

### Step 12 — `src/game/state.ts`

Typed wrapper over `Phaser.Game.registry`:

```ts
import type Phaser from 'phaser';
import type { RegistryState } from './types';

export function getState<K extends keyof RegistryState>(
  game: Phaser.Game,
  key: K
): RegistryState[K] {
  return game.registry.get(key) as RegistryState[K];
}

export function setState<K extends keyof RegistryState>(
  game: Phaser.Game,
  key: K,
  value: RegistryState[K]
): void {
  game.registry.set(key, value);
}

export function onStateChange<K extends keyof RegistryState>(
  game: Phaser.Game,
  key: K,
  fn: (value: RegistryState[K]) => void
): () => void {
  const handler = (_parent: unknown, value: RegistryState[K]) => fn(value);
  game.registry.events.on(`changedata-${key}`, handler);
  return () => game.registry.events.off(`changedata-${key}`, handler);
}
```

`onStateChange` returns an unsubscribe function so scenes can clean up in `shutdown()`.

### Step 13 — Convert existing `.js` modules to TypeScript

This is the only step that touches code outside `src/main.ts`, `src/scenes/`, `src/game/`, and `legacy.html`. Do it as a separate commit inside this slice so the diff is reviewable independently.

**Substep 13a — Rename**

```sh
git mv src/config.js src/config.ts
git mv src/globalScores.js src/globalScores.ts
git mv src/releaseNotes.js src/releaseNotes.ts
```

Update `legacy.html`'s `<script>` references in the same commit so the legacy page keeps loading. Find each `<script type="module" src="./src/*.js">` (and any `<script src="./src/*.js">`) and change the extension to `.ts`. No other edits to `legacy.html`.

**Substep 13b — Type `config.ts`**

Smallest of the three. Type the exported constants and the production-host check.

```ts
export const SUPABASE_URL: string = /* host-dependent */;
export const SUPABASE_KEY: string = /* host-dependent */;
export function isProductionHost(): boolean { /* ... */ }
```

**Substep 13c — Type `releaseNotes.ts`**

Add an interface, type the exported array.

```ts
export interface ReleaseNote {
  version: string;
  date: string;          // ISO YYYY-MM-DD
  title: string;
  body: string;
}

export const releaseNotes: readonly ReleaseNote[] = [ /* ... */ ];
```

Remove the `window.releaseNotes = ...` line if it exists — Phaser scenes import directly, and `legacy.html` is the only place that needs the global. If legacy still needs it, keep the assignment but type it: `(window as Window & { releaseNotes: readonly ReleaseNote[] }).releaseNotes = releaseNotes;`.

**Substep 13d — Type `globalScores.ts`**

The bulk of the work. Add types in this order:

1. Define and export shared row/match types at the top of the file (or import them from `src/game/types.ts` if already defined there):
   ```ts
   export interface HighScoreRow {
     id: string;
     name: string;
     character_name: string;
     score: number;
     created_at: string;
   }
   // MatchSnapshot already lives in src/game/types.ts; import it.
   ```
2. Type the Supabase client singleton (`getClient(): SupabaseClient`).
3. Annotate every exported function's parameters and return type.
4. Where a Supabase response shape is awkward (e.g. an `rpc()` with a loose return), type the return as `Promise<any>` and add `// TODO(types): tighten <reason>` per the escape valve in Tech Choices. Hard cap: 3 such annotations across the file.
5. Keep `window.globalScores = api` if `legacy.html` still uses it. Type the assignment: `(window as Window & { globalScores: typeof api }).globalScores = api;`.

API surface must be unchanged. The developer should not rename functions, change argument order, or alter behavior.

**Substep 13e — Verify**

After Substep 13d:
- `npm run typecheck` passes.
- `legacy.html` loads in `npm run dev` and the legacy game is still fully playable, including a full throw → score submission round-trip on production-host emulation or a manual sanity check on `127.0.0.1`.
- Phaser entry `index.html` (still just `BootScene` + `HomeScene` placeholder) is unaffected.

### Step 14 — `src/game/storage.ts`

Read/write helpers for the three `localStorage` keys defined in `STORAGE_KEYS`. Same JSON shape the legacy code uses for `settings`. No migration logic — keys are unchanged.

```ts
import { STORAGE_KEYS } from './constants';
import type { Settings } from './types';

export function loadUsername(): string | null {
  return localStorage.getItem(STORAGE_KEYS.username);
}

export function saveUsername(name: string): void {
  localStorage.setItem(STORAGE_KEYS.username, name);
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? (JSON.parse(raw) as Settings) : {};
  } catch {
    return {};
  }
}

export function saveSettings(value: Settings): void {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(value));
}
```

## Data / Schema Changes

None. No Supabase changes. `localStorage` keys are unchanged.

## Constraints

- No edits to `legacy.html` after the rename other than the `<script>` `src` attribute updates in Step 13.
- No API changes to `globalScores`, `config`, or `releaseNotes` during the `.js → .ts` conversion. Type annotations only.
- No assets touched.
- No gameplay logic in any new file — only scaffolding.
- The legacy game must remain fully playable at `/legacy.html` after this slice.

## Edge Cases

- **Phaser 4 not yet stable** at implementation time → stop and surface to architect.
- **Font load race**: `BootScene.create()` awaits `document.fonts.ready` before transitioning so `HomeScene` text uses the correct font.
- **Vite multi-page**: confirm `vite build` emits both `index.html` and `legacy.html` to `dist/`.
- **Non-uniform sprite layouts**: if any character sheet doesn't fit the 3-frame horizontal convention, load it as a single image instead and note the exception in `characters.ts`.

## Verification

1. `npm install` succeeds; `phaser@4.x` and `typescript@5.x` are in `node_modules`.
2. `npm run typecheck` passes with no errors.
3. `npm run dev` starts Vite on port 3000.
4. `http://localhost:3000/` shows a black canvas with "Shovel Toss — Phaser build" centered in Bungee, version tag below in Archivo.
5. `http://localhost:3000/legacy.html` shows the existing game, fully playable.
6. Browser console: no errors, no failed asset requests.
7. `npm run build` produces `dist/index.html` + `dist/legacy.html` + asset hashes; `npm run preview` serves both.

## Rollback

Revert the commit. No schema, no `localStorage`, no asset changes — rollback is purely git.

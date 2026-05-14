# Feature Plan: Phaser Migration — Slice 3 (Meta Screens & Leaderboards)

> Authoritative architecture is in `phaser-migration-overview.md`. Do not deviate from version, tooling, or scene topology decisions made there.

## Problem

After Slice 2 the throw loop is playable but only via a temporary debug button — no name capture, no character or level select, no real game-over flow, no leaderboards. This slice builds the single-player meta around `GameScene`: username capture, home, character select, level select, full game over (with score submission), global leaderboard, hall of fame, and per-player stats screens. After this slice the entire single-player experience runs on Phaser.

## Scope

**In:**
- `UsernameScene`, `HomeScene` (real version, replacing Slice 2 placeholder), `CharacterSelectScene`, `LevelSelectScene`.
- `GameOverScene` (real version, replacing Slice 2 placeholder) — submits to `high_scores`, shows global rank.
- `LeaderboardScene`, `HallOfFameScene`, `PlayerStatsScene`, `PlayerDetailScene`.
- `OverlayScene` for the "What's New" release notes (always-on-top).
- `Button` and `List` reusable UI components.
- Settings: meter position toggle, "hide how to play" toggles, stored in `localStorage` per existing `STORAGE_KEYS.settings` contract.

**Out:**
- Versus mode (Slice 4).
- Cutover and legacy code deletion (Slice 5).
- Any new gameplay features or rebalancing.
- Any change to Supabase schema or `globalScores.ts` semantics.

## Tech Choices

- **Buttons**: `src/ui/Button.ts` wraps a `Container` with a `Graphics` background and `Text` label. Built-in `pointerover`/`pointerout`/`pointerdown` hover and press states. Reused everywhere.
- **Scrollable list**: `src/ui/List.ts` is a `Container` with a scrollable `Mask` and a column of row items. Used by leaderboard, hall of fame, player stats, player detail. Touch-drag scroll via `Phaser.Input.Pointer` deltas (no plugin).
- **Release notes overlay**: rendered as a Phaser scene with its own `Container`, **not** a DOM popup. Source data is `src/releaseNotes.ts`.
- **Scene transitions**: `scene.start(name, data)` for hard transitions; `scene.launch('OverlayScene', { kind: 'whatsNew' })` for the always-on-top overlay.
- **`globalScores.ts` consumption**: imported as an ES module directly in scenes that need it. The `window.globalScores` global is retained for `legacy.html`'s benefit but not used by Phaser scenes.

## Files Touched

New:
- `src/scenes/UsernameScene.ts`
- `src/scenes/CharacterSelectScene.ts`
- `src/scenes/LevelSelectScene.ts`
- `src/scenes/LeaderboardScene.ts`
- `src/scenes/HallOfFameScene.ts`
- `src/scenes/PlayerStatsScene.ts`
- `src/scenes/PlayerDetailScene.ts`
- `src/scenes/OverlayScene.ts`
- `src/ui/Button.ts`
- `src/ui/List.ts`
- `src/ui/theme.ts`

Modified:
- `src/scenes/HomeScene.ts` — replaces Slice 2 placeholder with real home UI (Play, Versus, Leaderboard, Hall of Fame, Settings, What's New).
- `src/scenes/GameOverScene.ts` — submits score via `submitGlobalScore`, shows rank, "View leaderboard" button.
- `src/scenes/BootScene.ts` — after asset preload, route to `UsernameScene` if no username, else `HomeScene`.
- `src/main.ts` — register all new scenes.
- `src/game/types.ts` — add `OverlayKind`, `LeaderboardRow`, `PlayerStat` interfaces.

Unchanged:
- `src/globalScores.ts`, `src/config.ts`, `src/releaseNotes.ts`.
- `legacy.html`.
- All Slice 1–2 game-state and gameplay-scene logic.

## Implementation Steps

### Step 1 — `src/ui/Button.ts`

```ts
import Phaser from 'phaser';

export interface ButtonOptions {
  label: string;
  width?: number;
  height?: number;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export default class Button extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, x, y);
    // Graphics background (rounded rect), Text label, hover/press states.
    // Calls onClick on pointerup if pointer is still inside.
  }
}
```

Pulls colors and corner radius from a shared `src/ui/theme.ts` (also new). Theme values copied from legacy CSS.

### Step 2 — `src/ui/List.ts`

```ts
export interface ListOptions<T> {
  width: number;
  height: number;
  rowHeight: number;
  renderRow: (container: Phaser.GameObjects.Container, data: T, index: number) => void;
}

export default class List<T> extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: ListOptions<T>) { /* ... */ }
  setData(items: readonly T[]): void { /* ... */ }
}
```

Implementation:
- A `Container` at `(x, y)` containing a `Graphics` mask covering `(width, height)`.
- A child `Container` (`content`) holds the rows.
- Pointer-down/move computes a `dragDeltaY`; `content.y` is clamped between `-(totalHeight - height)` and `0`.
- Each row is the user's `renderRow` return value, positioned at `index * rowHeight`.

### Step 3 — `src/scenes/UsernameScene.ts`

- Title: "Choose your name"
- Input: implemented via Phaser's DOM Element (`this.add.dom`) wrapping a simple `<input>` — Phaser 4 supports DOM elements within scenes. Style to match the canvas font/colors. (Reason for using DOM here: replicating an IME-friendly text input in pure Phaser is more work than it's worth.)
- "Continue" button: validates non-empty + max length (same rules as legacy), saves to `localStorage` via `saveUsername`, sets registry `username`, transitions to `HomeScene`.

### Step 4 — `src/scenes/HomeScene.ts` (real)

Layout (top-down):
- Title "Shovel Toss" (Bungee).
- Username display with edit affordance (tap → `UsernameScene`).
- Primary buttons: `Play`, `Versus`.
- Secondary buttons: `Leaderboard`, `Hall of Fame`, `Player Stats`, `Settings`, `What's New`.

Wiring:
- `Play` → `CharacterSelectScene` with `{ next: 'LevelSelectScene' }`.
- `Versus` → temporary toast "Coming in next slice" (real wiring in Slice 4).
- `Leaderboard` → `LeaderboardScene`.
- `Hall of Fame` → `HallOfFameScene`.
- `Player Stats` → `PlayerStatsScene`.
- `Settings` → `OverlayScene` with `{ kind: 'settings' }`.
- `What's New` → `OverlayScene` with `{ kind: 'whatsNew' }`.

The `#landing` DOM overlay from `legacy.html` is **not** ported — its content is recreated as `HomeScene`.

### Step 5 — `src/scenes/CharacterSelectScene.ts`

- Horizontal carousel of `hero.png` portraits. Swipe / pointer-drag changes selection; tap centers and selects.
- Use `CHARACTERS`, `CHAMPION_IDS`, `NEW_CHARACTER_IDS`, `LADY_CHARACTER_IDS` from `src/game/characters.ts` for badge rendering (NEW / CHAMPION / LADY tags) matching legacy.
- "Confirm" button writes `selectedCharacterId` to registry + saves to `localStorage` (under the same settings key legacy uses), then transitions to `init.next` (`LevelSelectScene` for solo, `VersusHomeScene` for versus — wired in Slice 4).

### Step 6 — `src/scenes/LevelSelectScene.ts`

- Vertical list of levels (`assets/level/<id>.png` thumbnails + name).
- Tap a level → writes `selectedLevelId` to registry, transitions to `GameScene` with `{ characterId, levelId, mode: 'solo' }`.

### Step 7 — `src/scenes/GameOverScene.ts` (real)

Replace the Slice 2 placeholder. New flow:

```ts
async create(): Promise<void> {
  // ... existing dim + "Game Over" + score text from Slice 2 ...
  this.add.text(/* ... */, 'Submitting...');
  try {
    const { rank } = await submitGlobalScore({
      name: getState(this.game, 'username')!,
      score: this.finalScore,
      characterName: characterById(getState(this.game, 'selectedCharacterId')!).name
    });
    // show "Global rank: #N" or "Outside top 100"
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'disabled-non-prod') { /* show "Score not saved (local dev)" */ }
    else { /* show "Couldn't submit score" with retry */ }
  }
  // buttons: "Play again", "View leaderboard", "Home"
}
```

Reuses the rank logic already in `src/globalScores.ts`. No new Supabase calls. `submitGlobalScore` is imported with its proper types from `globalScores.ts` (typed in Slice 1).

### Step 8 — `src/scenes/LeaderboardScene.ts`

- Header with "Global Leaderboard" + back button.
- Loads via `globalScores.topN(100)`.
- Loading state: "Loading..." text. Error state: "Couldn't load" + retry button.
- Renders rows via `List`: rank, name, character, score, date.
- No filtering, no level-specific filtering, no character filter — matches current legacy leaderboard.

### Step 9 — `src/scenes/HallOfFameScene.ts`

Same shape as `LeaderboardScene` but queries the hall-of-fame view from `globalScores.ts`. Reuse `List`. Add the row-rendering function the hall of fame needs (champion icon, etc.).

### Step 10 — `src/scenes/PlayerStatsScene.ts`

- Search/sort by name (use a DOM `<input>` like `UsernameScene` did).
- List of players with summary stats. Tap → `PlayerDetailScene` with `{ playerName }`.

### Step 11 — `src/scenes/PlayerDetailScene.ts`

- Header: player name, total score, best score, characters used.
- List of recent runs.
- Back button to `PlayerStatsScene`.

### Step 12 — `src/scenes/OverlayScene.ts`

Single overlay scene routed by `init({ kind })`:
- `kind: 'whatsNew'` → vertical list of `releaseNotes` entries.
- `kind: 'settings'` → toggles for `meterPosition` (left/right), `hideHowToPlay`, `hideVersusHowToPlay`. Writes through `saveSettings`.

Launched via `scene.launch`, runs in parallel above the source scene. Tapping outside the panel (or the `Close` button) stops the overlay.

### Step 13 — `src/scenes/BootScene.ts` update

After asset preload + fonts ready:

```ts
const username = loadUsername();
this.scene.start(username ? 'HomeScene' : 'UsernameScene');
```

Also hydrate the registry from `localStorage` (`username`, `settings`) before transitioning so all scenes see consistent state.

### Step 14 — `src/main.ts` update

Register all new scenes (order doesn't matter for routing because every scene uses `scene.start` by name; only `BootScene` is the entry).

## Data / Schema Changes

None. Supabase schema unchanged. `localStorage` keys unchanged.

## Constraints

- No edits to `src/globalScores.ts`, `src/config.ts`, `src/releaseNotes.ts`.
- No edits to `legacy.html`.
- No changes to `high_scores` schema or queries.
- No new gameplay features. UI parity with legacy is the bar.
- Don't reintroduce "unseen" / `lastSeen` / badge logic on the "What's New" button — it's intentionally always-visible (see `feedback_whats_new_dialog.md` in memory).

## Edge Cases

- **No username, user hits back from `UsernameScene`**: there's no "back" — username is required to proceed.
- **Score submission fails** (network, `disabled-non-prod`): `GameOverScene` shows the appropriate message and the "Play again" / "Home" buttons remain functional.
- **Empty leaderboard / hall of fame / player list**: each scene shows a non-error empty state ("No scores yet").
- **Local dev (non-prod host)**: `submitGlobalScore` throws `disabled-non-prod`. `GameOverScene` shows "Score not saved (local dev)" instead of an error.
- **Long usernames**: clamp/truncate display in lists. Storage limit matches legacy (length cap already enforced by `globalScores.ts`).
- **Lil Italy mirror** still works via the `isMirrored` flag from `LEVELS` in Slice 2.

## Verification

1. Fresh browser (clear `localStorage`): `BootScene` → `UsernameScene`. Enter name. → `HomeScene`.
2. Tap `Play` → `CharacterSelectScene` → pick character → `LevelSelectScene` → pick level → `GameScene` runs as in Slice 2.
3. Finish a run: `GameOverScene` shows score + rank (on production) or "local dev" message (local).
4. `Leaderboard`, `Hall of Fame`, `Player Stats`, `Player Detail` all render real data without errors.
5. `What's New` overlay shows release notes in order. Tap outside → closes.
6. `Settings` overlay toggles persist after reload.
7. `/legacy.html` still works.
8. Browser console clean.
9. `npm run typecheck` passes.

## Rollback

Revert the commit. No schema, no `localStorage` changes.

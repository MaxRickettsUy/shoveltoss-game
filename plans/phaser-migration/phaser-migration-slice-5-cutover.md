# Feature Plan: Phaser Migration — Slice 5 (Cutover & Cleanup)

> Authoritative architecture is in `phaser-migration-overview.md`. Do not deviate from version, tooling, or scene topology decisions made there.

## Problem

After Slices 1–4 the Phaser build is feature-complete: single-player loop, all menus, leaderboards, hall of fame, player stats, full versus flow. `legacy.html` still exists alongside it as the original game. This slice retires the legacy build, makes the Phaser build the only production entry, and removes now-dead legacy code.

## Scope

**In:**
- Delete `legacy.html`.
- Delete legacy-only modules that the Phaser build no longer consumes.
- Remove the `window.globalScores` global; `src/globalScores.ts` is now imported as an ES module only.
- Confirm production deploy serves the Vite build from `dist/`.
- Bump `APP_VERSION_TAG` and add a "What's New" entry noting the Phaser rebuild.

**Out:**
- Any new features or polish.
- Refactoring `src/globalScores.ts` beyond removing the `window` assignment.
- Capacitor packaging (separate post-migration project).
- Asset re-export / sprite sheet changes.

## Tech Choices

This is a deletion slice. The only choices are which files are safe to delete.

- Anything in the repo that is **only referenced from `legacy.html`** is deletable.
- Anything referenced from both is **not** touched by this slice.
- `src/globalScores.ts`, `src/config.ts`, `src/releaseNotes.ts` are retained verbatim (consumed by Phaser scenes).

## Files Touched

Deleted:
- `legacy.html`
- Any CSS/JS files referenced only by `legacy.html` (the developer must verify each via grep before deletion).

Modified:
- `src/globalScores.ts` — remove the `window.globalScores = ...` line at the bottom. All Phaser scenes use the ES module import.
- `src/scenes/*.ts`, `src/game/*.ts` — any usage of `window.globalScores.X` (introduced as a temporary shim in Slices 3–4) is replaced with the direct import. Grep-and-replace.
- `src/game/constants.ts` — bump `APP_VERSION_TAG`.
- `src/releaseNotes.ts` — prepend a new release note ("Rebuilt on Phaser — same game, faster and ready for new features").
- `vite.config.ts` — remove `legacy.html` from any multi-page input config if it was explicitly listed.

Unchanged:
- All Phaser scene logic from Slices 1–4.
- All assets.
- Supabase schema.
- `localStorage` contract.

## Implementation Steps

### Step 1 — Audit references to `legacy.html`

```sh
git grep -n 'legacy.html'
git grep -n 'window.globalScores'
```

Make a list of every reference. Any reference outside `legacy.html` itself must be removed in a later step.

### Step 2 — Identify legacy-only files

For each file in the repo (excluding `legacy.html`, `src/scenes/`, `src/game/`, `src/ui/`, `src/main.ts`, `src/config.ts`, `src/globalScores.ts`, `src/releaseNotes.ts`, `assets/`, `supabase/`), check whether it is imported or referenced by the Phaser build. If not, it is legacy-only and can be deleted.

Specifically check (these are candidates, not a fixed list):
- Any CSS files at the project root.
- Any JS files at the project root.
- Any in-line `<script>` blocks in `legacy.html` that reference helper files.

### Step 3 — Delete legacy-only files

```sh
git rm legacy.html
git rm <each-legacy-only-file>
```

If unsure about a file, leave it. Do not be aggressive with deletions in a single slice.

### Step 4 — Remove the `window.globalScores` shim

In `src/globalScores.ts`, delete the trailing assignment:

```js
// DELETE:
// if (typeof window !== 'undefined') window.globalScores = api;
```

(Exact line varies; grep for `window.globalScores`.)

### Step 5 — Replace `window.globalScores` callsites in Phaser scenes

Grep for `window.globalScores` inside `src/scenes/` and `src/game/`. For each:

```ts
// before
const matches = await window.globalScores.listMatchesForPlayer(name);

// after
import { listMatchesForPlayer } from '../globalScores';
// ...
const matches = await listMatchesForPlayer(name);
```

`src/globalScores.ts` already exports named functions (verified during the Slice 1 conversion). If only a default object is exported, prefer `import * as globalScores from '../globalScores'` for minimal churn.

### Step 6 — Version bump and release note

In `src/game/constants.ts`, bump `APP_VERSION_TAG` to `1.1.0` (this is the user-visible Phaser cutover release; pre-Phaser legacy was tagged `v1.0.0`, and Slices 1–4 used internal `v1.1.0-alpha.*` tags — see the overview's "Versioning & branching" section).

In `src/releaseNotes.ts`, prepend:

```ts
{
  version: '1.1.0',
  date: '2026-MM-DD',  // implementation date
  title: 'Rebuilt on Phaser',
  body: 'Same game, same look — now running on Phaser 4 for a smoother experience and faster feature work.'
}
```

After the slice merges to `main`, tag the merge commit `v1.1.0` and flip the production deploy entry from `legacy.html` to `index.html`.

### Step 7 — Verify Vite build and types

```sh
npm run typecheck
npm run build
npm run preview
```

- `dist/index.html` exists and loads the Phaser game.
- `dist/legacy.html` does **not** exist.
- All gameplay paths work in preview.

### Step 8 — Deploy verification (manual / outside this plan)

Production deploy serves `dist/`. The architect or repo owner verifies the production deploy still resolves at `shoveltoss.ing` and serves the Phaser build after this commit is merged.

## Data / Schema Changes

None. Supabase schema unchanged. `localStorage` unchanged.

## Constraints

- Do not delete a file unless you have proven via grep that nothing in `src/`, `index.html`, `vite.config.ts`, or `package.json` references it.
- Do not refactor `src/globalScores.ts` semantics. Only remove the `window` shim and ensure named exports exist.
- Do not change Supabase schema, RLS policies, asset files, or `localStorage` keys.
- If any verification step in Slices 1–4 regresses, stop and fix in those slices rather than papering over here.

## Edge Cases

- **A file looks legacy-only but is actually shared** (e.g. a CSS file imported by both `legacy.html` and `index.html`): grep first, delete second. If shared, leave it.
- **`window.globalScores` is referenced from a script the developer didn't realize was in use** (e.g. an analytics snippet): grep `window.globalScores` globally. Migrate or leave the shim depending on use.
- **Old bookmarks point at `/legacy.html`**: acceptable to break — there is no redirect requirement, and the URL was internal-only.
- **A deploy pipeline references `legacy.html` explicitly**: update the pipeline config in the same commit, or call it out in the PR description.

## Verification

1. `git grep -n 'legacy.html'` returns no results.
2. `git grep -n 'window.globalScores'` returns no results inside `src/` (and the shim is gone from `src/globalScores.ts`).
3. `npm run build && npm run preview` serves the Phaser build at `/`. No `/legacy.html` route.
4. Manual smoke test of every Phaser scene from Slice 3 + Slice 4 in preview build.
5. Production deploy (after merge) loads correctly at `shoveltoss.ing`.
6. Version tag in the UI matches the bump in `constants.ts`.
7. "What's New" overlay shows the new release note at the top.

## Rollback

Revert the commit. `legacy.html` and any deleted files are restored from git history. Production redeploy falls back to the Phaser build with the prior version tag.

Beyond this slice the migration is done. No further slices are planned.

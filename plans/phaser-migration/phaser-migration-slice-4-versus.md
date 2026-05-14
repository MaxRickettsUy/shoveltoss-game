# Feature Plan: Phaser Migration — Slice 4 (Versus Mode)

> Authoritative architecture is in `phaser-migration-overview.md`. Do not deviate from version, tooling, or scene topology decisions made there.

## Problem

After Slice 3 the Phaser build has a complete single-player loop. Versus mode — the async multiplayer feature backed by the Supabase `matches` table — still only exists in `legacy.html`. This slice ports the versus flow to Phaser scenes, reusing `GameScene` from Slice 2 (which was already built with `mode: 'versus'` in mind).

## Scope

**In:**
- `VersusHomeScene` — see pending challenges, create new challenge, view history.
- `VersusGameScene` — wraps/extends `GameScene` for the 9-throw fixed-throw-count versus run.
- `VersusWaitingScene` — shown after the challenger submits their score, waiting for the recipient.
- `VersusResultScene` — final result after both sides have played.
- `VersusHistoryScene` — list of past matches.
- Direct challenge creation (`globalScores.createDirectChallenge`), score submission (`submitMatchScore`), polling (`startVersusPolling`).
- Daily challenge rate-limiting using `shoveltoss.challengesSentToday` localStorage key.
- "How to play versus" overlay (`OverlayScene` `kind: 'versusHowTo'`), gated by `settings.hideVersusHowToPlay`.

**Out:**
- Cutover / legacy deletion (Slice 5).
- Real-time matchmaking, queue, or randoms (versus is invite-code only, same as legacy).
- New versus features beyond legacy parity.

## Tech Choices

- **`GameScene` reuse**: rather than duplicating throw logic into `VersusGameScene`, the latter is a thin wrapper that launches `GameScene` with `{ mode: 'versus', throwsPerPlayer: VERSUS_THROWS_PER_PLAYER, matchId, role }` and listens for the `runComplete` event on `GameScene`. `GameScene` already supports finite-throws termination from Slice 2.
- **Polling**: a single `VersusPoller` singleton (`src/game/versusPoller.ts`) wraps `globalScores.startVersusPolling` so all versus scenes share one timer. Mounted on first versus scene entry, torn down on home return.
- **Match state**: stored in registry under `activeMatch` (object) so all versus scenes read the same source.
- **`GameScene` extension point**: `GameScene` already emits `runComplete` events at end-of-run (added in Slice 2). `VersusGameScene` listens and calls `submitMatchScore`.

## Files Touched

New:
- `src/scenes/VersusHomeScene.ts`
- `src/scenes/VersusGameScene.ts`
- `src/scenes/VersusWaitingScene.ts`
- `src/scenes/VersusResultScene.ts`
- `src/scenes/VersusHistoryScene.ts`
- `src/game/versusPoller.ts`

Modified:
- `src/scenes/HomeScene.ts` — `Versus` button now navigates to `VersusHomeScene` (replacing Slice 3 placeholder toast).
- `src/scenes/GameScene.ts` — confirm `mode: 'versus'` paths and the `runComplete` event emit. If Slice 2 already covered this, no changes needed; otherwise extend the existing logic without changing solo behavior.
- `src/scenes/OverlayScene.ts` — add `kind: 'versusHowTo'` rendering branch.
- `src/main.ts` — register new scenes.
- `src/game/types.ts` — add `VersusRole`, `VersusGameSceneData` interfaces.

Unchanged:
- `src/globalScores.ts`, `src/config.ts`, `src/releaseNotes.ts`.
- `legacy.html`.
- All Slice 1–3 single-player UI and gameplay.

## Implementation Steps

### Step 1 — `src/game/versusPoller.ts`

```ts
import type { MatchSnapshot } from './types';

type Listener = (match: MatchSnapshot) => void;

let handle: { stop?: () => void } | null = null;
const listeners = new Set<Listener>();

export function start(matchId: string): void {
  stop();
  handle = window.globalScores.startVersusPolling(matchId, (match: MatchSnapshot) => {
    for (const fn of listeners) fn(match);
  });
}

export function stop(): void {
  handle?.stop?.();
  handle = null;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
```

Reuses the existing 30-second polling cadence in `globalScores.ts`. The poller writes the latest match snapshot to the registry (`setState(game, 'activeMatch', match)`) so any visible scene gets it via `onStateChange`.

### Step 2 — `src/scenes/VersusHomeScene.ts`

Layout:
- "Versus" title.
- "How it works" link → `OverlayScene` `kind: 'versusHowTo'` (unless `settings.hideVersusHowToPlay`).
- Section: "Your turn" — list of matches where you're the recipient and `status: 'playing'` and you haven't submitted. Tap → `CharacterSelectScene` with `next: 'VersusGameScene'` and `init: { matchId, role: 'recipient' }`.
- Section: "Awaiting opponent" — list of matches you've completed but the opponent hasn't. Tap → `VersusWaitingScene`.
- Section: "Recent results" — completed matches (last 10). Tap → `VersusResultScene`.
- Footer: "New challenge" button → opens an input dialog (Phaser DOM `<input>`) for opponent name; on submit, calls `globalScores.createDirectChallenge` then routes to `CharacterSelectScene` with `next: 'LevelSelectScene'` → `VersusGameScene` `{ matchId, role: 'challenger' }`.
- Footer: "All history" button → `VersusHistoryScene`.

On mount, query `globalScores.listMatchesForPlayer(username)` (or whatever helper exists; if none, add a thin wrapper inside `versusPoller.ts` rather than editing `globalScores.ts`).

### Step 3 — `src/scenes/VersusGameScene.ts`

```ts
import Phaser from 'phaser';
import type { CharacterId, LevelId, MatchSnapshot } from '../game/types';
import { VERSUS_THROWS_PER_PLAYER } from '../game/constants';

export type VersusRole = 'challenger' | 'recipient';

export interface VersusGameSceneData {
  matchId: string;
  role: VersusRole;
  characterId: CharacterId;
  levelId: LevelId;
}

export default class VersusGameScene extends Phaser.Scene {
  private matchId!: string;
  private role!: VersusRole;
  private characterId!: CharacterId;
  private levelId!: LevelId;

  init(data: VersusGameSceneData): void {
    this.matchId = data.matchId;
    this.role = data.role;
    this.characterId = data.characterId;
    this.levelId = data.levelId;
  }

  create(): void {
    this.scene.launch('GameScene', {
      mode: 'versus',
      characterId: this.characterId,
      levelId: this.levelId,
      throwsRemaining: VERSUS_THROWS_PER_PLAYER
    });
    const gameScene = this.scene.get('GameScene');
    gameScene.events.once('runComplete', this.onRunComplete, this);
  }

  private async onRunComplete({ score }: { score: number }): Promise<void> {
    await window.globalScores.submitMatchScore(this.matchId, this.role, score);
    this.scene.stop('GameScene');
    const updated: MatchSnapshot = await window.globalScores.getMatch(this.matchId);
    if (updated.status === 'complete') {
      this.scene.start('VersusResultScene', { matchId: this.matchId });
    } else {
      this.scene.start('VersusWaitingScene', { matchId: this.matchId });
    }
  }
}
```

Note: this is a "host" scene that owns the match lifecycle while `GameScene` does the gameplay. The two run in parallel via `scene.launch`. `VersusGameScene` itself renders no visuals.

### Step 4 — `src/scenes/VersusWaitingScene.ts`

- "Waiting for {opponent}..." text.
- Show your score + character.
- Polling subscription: when `activeMatch.status === 'complete'`, navigate to `VersusResultScene`.
- Buttons: `Home`, `Share challenge` (copy invite code to clipboard).

`onShutdown` unsubscribes from the poller.

### Step 5 — `src/scenes/VersusResultScene.ts`

- Both players, their characters, their scores.
- Winner banner ("You won!" / "You lost" / "Tie").
- Buttons: `Home`, `Rematch` (creates a new direct challenge with the same opponent, daily-rate-limit-permitting).

Rate limit: read `shoveltoss.challengesSentToday`, increment on send, reset on date change. Logic exists in legacy — port the helper into `src/game/versusRateLimit.ts` if not already pulled out.

### Step 6 — `src/scenes/VersusHistoryScene.ts`

- `List` of all past matches for the current player (latest first).
- Row: date, opponent, both scores, who won. Tap → `VersusResultScene`.

### Step 7 — `OverlayScene` `kind: 'versusHowTo'`

Same shape as `whatsNew` overlay but content is the static "how versus works" copy from legacy. Add a "Don't show again" toggle that writes `settings.hideVersusHowToPlay = true`.

### Step 8 — `src/scenes/HomeScene.ts` update

Replace the placeholder toast on the `Versus` button with `this.scene.start('VersusHomeScene')`.

## Data / Schema Changes

None. `matches` table is unchanged. `localStorage` `shoveltoss.challengesSentToday` is unchanged.

## Constraints

- No edits to `src/globalScores.ts`, `src/config.ts`, `src/releaseNotes.ts`.
- Polling cadence stays at 30 s (`VERSUS_POLL_MS`).
- No new Supabase queries beyond what `globalScores.ts` already exposes. If a helper isn't there, add the new helper inside `src/game/versusPoller.ts` rather than editing `globalScores.ts`.
- Match writes work on local; `high_scores` writes remain production-only (unchanged).

## Edge Cases

- **Match expires while you're in the lobby**: `expires_at` passed → scene shows "Expired" and disables play. Detect on poll.
- **You and opponent submit simultaneously**: `submitMatchScore` is idempotent on the server; `getMatch` after submit returns the latest state. Use that, not optimistic local merging.
- **Player has zero matches**: each versus scene renders an empty state, no errors.
- **Daily rate limit hit**: "Rematch" / "New challenge" buttons show a disabled state with tooltip "Daily limit reached, try again tomorrow."
- **Recipient plays the match without the challenger setting a level**: if legacy stores `level_id` on the challenger's first submit, mirror that — the recipient's `VersusGameScene` reads `level_id` from the match record, not from a fresh `LevelSelectScene`.
- **Browser closed mid-versus run**: nothing to do; partial score is not submitted (matches legacy).

## Verification

1. Local Supabase running. Create user A in one browser, user B in another.
2. As A, "Versus" → "New challenge" → opponent: B → character + level select → play 9 throws → score submitted, `VersusWaitingScene` appears.
3. As B, "Versus" → "Your turn" shows A's match → tap → character select (B's choice) → play 9 throws → `VersusResultScene` shows both scores and the winner.
4. As A, refresh: `VersusHomeScene` shows the match under "Recent results"; tap → `VersusResultScene` matches what B saw.
5. `VersusHistoryScene` shows the match in both accounts.
6. Daily rate limit: send 10 challenges as A in one session; 11th shows the disabled state.
7. "How versus works" overlay: tap "Don't show again", reload `VersusHomeScene` — overlay does not auto-show.
8. Production submission to `high_scores` is unaffected (versus runs don't write to `high_scores`).
9. `/legacy.html` versus still works.
10. `npm run typecheck` passes.

## Rollback

Revert the commit. No schema, no `localStorage` changes.

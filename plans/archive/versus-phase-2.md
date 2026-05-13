# Plan: Versus Phase 2 — Records, Score Display, Character + Level Selection

## Goal

The async-versus MVP shipped (May 10, 2026). Three follow-ups validated as the
next slice of polish before continuing toward 1.0:

1. **Persistent per-player versus records** (W / L / T) computed from the
   `matches` table.
2. **Show the current player's versus score (record) on the Versus home page.**
3. **Both players select a character before their throws; the *initiator*
   (challenger or invite-link creator) picks the level for the match.**

Keep scope tight — versus code will still be rewritten in the Phaser era.
Re-use the existing solo character/level selectors and the existing
`matches` table. Avoid auth, avoid new dependencies, avoid Realtime.

---

## Scope decisions (locked)

- **Records are derived, not stored.** No new aggregate table. We compute
  W/L/T client-side from a `matches` query for the current username. A
  Postgres view is overkill for the player base size and would require a
  migration we don't need.
- **Level is per-match, chosen by the initiator only.** The recipient plays
  the same level as the challenger. This is the simplest model and matches
  what the user asked for ("initializing player chooses the level").
- **Character is per-player, per-match.** Each side picks their own; their
  pick is recorded on the match row so the result screen can show portraits.
- **Selection happens at match creation (challenger) and at accept time
  (recipient).** Reuse the existing `RUN_STATE.SELECTING` character grid and
  the existing solo level chooser. No new full-screen UIs.
- **Backfill: existing in-flight matches have null character/level.** Treat
  null level as the challenger's last solo level if recorded; otherwise
  default to `lil-italy`. Null character on result screen falls back to the
  generic shovel silhouette already used pre-pick in solo.

---

## Data model

### Migration: `supabase/migrations/20260512000000_match_character_level.sql`

```sql
alter table public.matches
  add column if not exists level_id text
    check (level_id is null or char_length(level_id) between 1 and 32),
  add column if not exists challenger_character_id text
    check (challenger_character_id is null or char_length(challenger_character_id) between 1 and 32),
  add column if not exists recipient_character_id text
    check (recipient_character_id is null or char_length(recipient_character_id) between 1 and 32);

-- Allow these fields to be filled in by the same RLS update policy that
-- already lets the matching side fill its score. We piggyback on the
-- existing "Anyone can update unfilled match fields" policy — the trigger
-- in 20260510000000_prevent_match_score_overwrite.sql already prevents
-- score overwrites; extend it to cover the new columns.
```

### Update the score-overwrite trigger

`supabase/migrations/20260512000001_extend_overwrite_trigger.sql`:

Extend `prevent_match_score_overwrite()` to also reject overwrites of
`level_id`, `challenger_character_id`, `recipient_character_id` once set.
Same pattern as the score columns — null → value is OK, value → different
value raises an exception.

> No new RLS policies. The existing UPDATE policy already restricts updates
> to matches in `pending` / `playing` status.

### Why no `player_records` table

A `select` over `matches` filtered by `(challenger_name = me or
recipient_name = me) and status = 'complete'` returns at most ~hundreds of
rows per player for the foreseeable future. We compute W/L/T in JS. Adding
an aggregate table means a write path on every match finalize, RLS for it,
and a backfill — not worth it pre-auth.

If volume grows past a few thousand matches per player we can add a SQL
view (`player_versus_records`) without changing the client surface.

---

## Client API additions: `src/globalScores.js`

```js
async fetchVersusRecord(name) {
  // All complete matches where this name is on either side.
  const cleaned = cleanName(name);
  const { data, error } = await getClient()
    .from('matches')
    .select('challenger_name,recipient_name,challenger_score,recipient_score')
    .or(`challenger_name.eq.${cleaned},recipient_name.eq.${cleaned}`)
    .eq('status', 'complete');
  if (error) throw error;
  let wins = 0, losses = 0, ties = 0;
  for (const m of data || []) {
    const mine = m.challenger_name === cleaned ? m.challenger_score : m.recipient_score;
    const theirs = m.challenger_name === cleaned ? m.recipient_score : m.challenger_score;
    if (mine == null || theirs == null) continue;
    if (mine > theirs) wins++;
    else if (mine < theirs) losses++;
    else ties++;
  }
  return { wins, losses, ties, total: wins + losses + ties };
},
```

Extend `createInviteMatch` and `createDirectChallenge` to accept and persist
`levelId` and `challengerCharacterId`. Extend `joinMatch` to accept and
persist `recipientCharacterId`. All three default to `null` so existing
callers don't break during the rollout (we update the call sites in the
same change).

```js
async createDirectChallenge(challengerName, recipientName, { levelId, characterId } = {}) {
  // ...insert with level_id: levelId ?? null, challenger_character_id: characterId ?? null
},
async createInviteMatch(challengerName, { levelId, characterId } = {}) { /* same */ },
async joinMatch(matchId, recipientName, { characterId } = {}) { /* set recipient_character_id */ },
```

---

## Client implementation

### 1. Versus record on Versus home (≈30 min)

- Add `versusRecord = { wins: 0, losses: 0, ties: 0 }` to the module-level
  versus state (near `versusRows`, `index.html:520`).
- `fetchVersusHome(force)` (`index.html:1145`) also kicks off
  `window.globalScores.fetchVersusRecord(username.get())` when the username
  is set; cache for the same 60s as the pending list. Failures are silent
  (display falls back to last known value or `0–0`).
- In `drawVersusHome` (`index.html:3693`), under the title row, draw one
  line of mute-color text:

  > `Record: 12W · 4L · 1T`  (omit the `· 1T` segment if `ties === 0`)

  If `total === 0`, show `Record: no matches yet` instead, same style. This
  keeps the line present so the layout doesn't jump when the first match
  completes.
- Reuse `THEME.textMute`, `smallSize`. Right-align under the back button or
  left-align under the title — pick whichever sits cleanly with the
  existing three action buttons; no new layout primitives.

### 2. Character + level selection at match creation (≈75 min)

The challenger picks **both** their character and the match level before
the row is inserted. Re-use the existing solo flows.

**Trigger points (challenger side):**

- "Generate invite link" button → instead of immediately calling
  `createInviteMatch`, open a small overlay that asks the user to confirm
  level + character, then create the match with those fields populated.
- "Challenge by username" overlay (added 2026-05-10) and the leaderboard-row
  "Challenge" button: same pattern. After typing the name (or tapping the
  row) → confirm step that pre-fills with the current `selectedCharacterId`
  and `selectedLevelId` (so a player who just played solo doesn't need to
  pick again).

**UI for the confirm step:**

A single overlay (`makeOverlayCard`, same primitive used by the other
versus overlays) with:

- "Level" row — three tappable level tiles (reuse `LEVELS` from
  `index.html:356`; render as labeled rects using the same look as the
  existing solo level picker). Selected tile highlights.
- "Your character" row — a horizontally scrollable strip of all
  `CHARACTERS` hero portraits. Selected one highlights. Defaults to
  `selectedCharacterId` if set.
- Send / Cancel buttons.

This is cheaper than launching the full-screen `RUN_STATE.SELECTING` and
then trying to thread "what to do after pick" through that state machine.
For Phase 2 the overlay is acceptable; the full-screen selector stays the
solo entry point.

> Implementation note: factor the level-tile and character-strip rendering
> as two small helpers (`drawLevelStrip(ctx, rect, selectedId)`,
> `drawCharacterStrip(ctx, rect, selectedId)`) so the same code can render
> them in the recipient's accept overlay (step 3).

**On submit:** call `createDirectChallenge(me, them, { levelId, characterId })`
or `createInviteMatch(me, { levelId, characterId })`. Existing success / error
toasts unchanged.

### 3. Recipient picks a character on accept (≈30 min)

When a recipient taps an incoming pending row in `drawVersusHome` or opens
an invite link, today the code transitions straight into
`VERSUS_PLAYING` (`enterVersusMatch`, `index.html:1172`). Insert a confirm
overlay before that transition:

- Header: `{challenger} challenged you on {level label}`
- Character strip (reuse `drawCharacterStrip` from step 2), default to
  `selectedCharacterId`.
- Buttons: **Play** (primary) and **Decline** (secondary).

On Play:
1. Call `joinMatch(match.id, me, { characterId })` (only meaningful for
   invite-link rows where `recipient_name` was null; for direct challenges
   it's a no-op-with-character-id update — see "Edge cases" below).
2. Set the local `selectedLevelId` to `match.level_id` so the renderer uses
   the right background.
3. Set `selectedCharacterId` to the chosen one so the existing throw
   renderer picks up sprite + champion shovel logic at
   `index.html:2856` / `index.html:3007`.
4. Call `enterVersusMatch(match)` exactly as today.

On Decline: existing decline path (close overlay, no state change).

### 4. Direct-challenge recipient: also persist character (≈20 min)

For **direct** challenges, today `joinMatch` is only invoked on invite-link
matches (the row already has `recipient_name`). To capture the recipient's
character we need to update the row when a direct-challenge recipient
accepts.

Add a sibling method:

```js
async setRecipientCharacter(matchId, characterId) {
  const { data, error } = await getClient()
    .from('matches').update({ recipient_character_id: characterId })
    .eq('id', matchId)
    .is('recipient_character_id', null)
    .select('*').single();
  if (error) throw error;
  return data;
},
```

The existing UPDATE RLS policy + the trigger guarantee this can only set
a previously-null value. Failure is non-fatal — show toast but proceed
into the match (character still drives the local render via
`selectedCharacterId`).

### 5. Apply the level to gameplay (≈15 min)

`startVersusMatch` (`index.html:1187`) needs one extra line: set the
module-level `selectedLevelId` from `match.level_id` before transitioning
to `VERSUS_PLAYING`, and trigger `loadLevelImages()` if not already done.
The rest of the renderer already keys off `selectedLevelId`.

For null `level_id` on legacy matches: fall back to whatever
`selectedLevelId` already is (i.e., the player's last solo level), or
`lil-italy` if unset.

### 6. Result screen shows opponent character (≈15 min)

`drawVersusResult` (`index.html:3764`) currently lists both names + scores.
Add a small portrait (40–48 px hero crop) next to each side's name when the
character id is present on the match row. Use the same hero image lookup
the solo selector does. Null character → skip the portrait (no fallback
placeholder needed).

---

## Edge cases & open questions

1. **A player declines after the challenger picked a level/character.** No
   change needed — the match stays `pending` until expiry. No fields were
   ever set on the recipient side.
2. **Old in-flight matches (created before this ships)** have null
   level/character. Result screen handles null character (skip portrait);
   gameplay handles null level (fall back to last local level). No
   migration backfill required.
3. **Level-id validation server-side.** The CHECK only enforces length, not
   that the id is one of the three known levels. Acceptable — the client
   only ever submits known ids, and a malicious submission would only
   affect that match's render (no DB-wide impact). Revisit if levels
   become unlock-gated.
4. **Record fairness pre-fix.** Wins/losses computed from existing
   completed matches will count toward the new record even though those
   matches predate the feature. Acceptable — the user wanted "keep PvP
   records", not "start fresh from this release".
5. **Caching the record.** 60s cache mirrors `fetchVersusHome`. After
   `submitMatchScore` resolves with `complete` status, invalidate by
   re-fetching once so the home screen reflects the new record without
   waiting for the cache to expire.

---

## Implementation steps (ordered)

1. **Migrations** (10 min) — add the two SQL files, run locally against the
   Supabase dev setup, verify the trigger rejects overwrites of the new
   columns.
2. **Client API** (20 min) — extend `createInviteMatch`,
   `createDirectChallenge`, `joinMatch`; add `fetchVersusRecord` and
   `setRecipientCharacter`.
3. **Versus record display** (30 min) — wire `fetchVersusRecord` into
   `fetchVersusHome` and render the line in `drawVersusHome`.
4. **Challenger pick overlay** (60 min) — build the level + character
   confirm overlay; route the three existing entry points through it.
5. **Recipient accept overlay** (45 min) — insert before `enterVersusMatch`
   for both pending-row taps and invite-link auto-join.
6. **Hook level into gameplay** (15 min) — set `selectedLevelId` in
   `startVersusMatch`.
7. **Result-screen portraits** (15 min) — render both characters next to
   names.
8. **Record cache invalidation** (5 min) — refetch record on transition
   to `VERSUS_RESULT`.
9. **Manual verification** (45 min) — see acceptance below.
10. **CHANGELOG + release notes** (10 min) — bump version, headline:
    "Versus mode now tracks W/L records and lets each player pick their
    character." Mention the level pick if it stands out.

---

## Acceptance

- Two browser sessions (`TestA`, `TestB`):
  - From `TestA`: tap Versus → "Challenge by username" → type `TestB` →
    confirm overlay shows level tiles + character strip pre-filled with
    `TestA`'s last picks → submit.
  - From `TestB`: open Versus, see incoming row, tap → accept overlay
    shows `TestA`'s chosen level in the header + a character strip →
    pick a different character than `TestA` → Play.
  - Both play 9 throws on `TestA`'s chosen level (visually verify
    background matches).
  - Result screen shows both names, both scores, and both character
    portraits.
  - Versus home for both players now shows `Record: 1W · 0L` (winner)
    and `Record: 0W · 1L` (loser), or a tie line if scores match.
- Trigger test: open Supabase SQL editor, attempt to UPDATE a complete
  match's `level_id` from one value to another → rejected by trigger.
- Backwards compat: a match created pre-migration (manually inserted
  with null level/character) is playable end-to-end with no console
  errors; result screen renders without portraits.
- Daily soft-cap (10 challenges) still applies; clicking confirm in the
  overlay counts as one challenge sent.

---

## Out of scope (still deferred)

- Auth / unique IDs.
- ELO or rating system — only raw W/L/T counts.
- Win/loss filtering / sorting on the leaderboard.
- Per-character versus records.
- Per-level versus records.
- Re-match button.
- Recipient overriding the level.
- Push notifications.

## Constraints

- DO NOT add a `player_records` table or any aggregate write path.
- DO NOT introduce a new full-screen RUN_STATE for the versus picker;
  overlays only.
- DO NOT modify solo selection flows (`RUN_STATE.SELECTING`, the level
  chooser, or `selectedCharacterId` semantics) beyond reading them as
  defaults.
- DO NOT block on Supabase errors in the record-fetch path — display
  stale or zero, never error.
- DO NOT regress the existing MVP — gate any risky changes behind the
  same `VERSUS_ENABLED` flag during local verification.

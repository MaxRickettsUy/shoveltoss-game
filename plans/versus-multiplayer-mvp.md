# Plan: Versus Multiplayer MVP (Async)

## Goal

Ship an async head-to-head mode that lets friends play matches without coordinating timing. Validate the social loop before the Phaser migration. Acknowledge that this code will be replaced in Phaser — keep scope tight.

## Format (locked)

- **9 throws per player.** No "innings" framing in the UI.
- **Hidden opponent score** until both have completed all 9 throws.
- **Reuse solo difficulty ramp** — same `METER_SPEED_INCREMENT_PER_THROW`, same starting speed. No new tuning.
- **Same scoring zones** as solo (`STICK +3`, `BIG_STICK +6` if/when added, `BACK_WALL +1`, `IN_PIT 0`, `FRONT_WALL +1`, `MISS -2`). No `MISSES_PER_RUN` cap — versus runs always reach 9 throws (a "miss" still costs a throw but doesn't end the run).
- **No "lives."** Versus mode is fixed-length; lives are a solo-only mechanic.
- **Highest score wins.** Ties = tie (no overtime/sudden death — out of scope for MVP).

## Two ways to start a match

1. **In-game invite** (primary): on the leaderboard, every row gets a "Challenge" button. Tap → confirms → creates a pending match for that name.
2. **Invite link** (secondary): in the Versus home, a "Generate invite link" button creates an open match (no recipient pre-set) and yields a URL like `https://shoveltoss.ing/?match=<code>`. First person to open it and accept is the recipient.

## Accepted risks for MVP

These are real, unsolved, and **deliberately deferred** to keep scope sane. Document them in the Versus screen UI so testers don't think they're bugs.

| Risk | Why deferred | Mitigation in MVP |
|---|---|---|
| Name collisions (two players named "Buck") | Identity needs auth; auth is a Phaser-era concern | Warn at challenge time: "There are 2 players named Buck — the first to open the app gets the challenge" |
| Spam (anyone can challenge anyone) | Real fix needs an Edge Function | Postgres CHECK: at most 1 open challenge per (challenger, recipient) pair. Client-side soft cap of 10 challenges sent per day per device |
| Score tampering | No auth, anyone with the API endpoint can submit any score | Same risk as the leaderboard. Live with it. Postgres CHECK caps each player's match score at 54 (9 throws × max 6) |
| Match hijacking (third party submits a score for someone else's match) | No way to prove identity | Postgres RLS: an UPDATE can only fill a `null` score field, never overwrite. Once submitted, locked. |
| No push notifications | Capacitor wrap doesn't have a push backend; FCM/APNs need server infra | Polling on app open. "1 challenge waiting" badge surfaces it on landing. Document in release notes that push comes with v2. |

---

## Data Model

### Migration: `supabase/migrations/20260508000000_create_matches.sql`

```sql
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  challenger_name text not null check (char_length(challenger_name) between 1 and 20),
  recipient_name text check (recipient_name is null or char_length(recipient_name) between 1 and 20),
  challenger_score integer check (challenger_score is null or challenger_score between -18 and 54),
  recipient_score integer check (recipient_score is null or recipient_score between -18 and 54),
  challenger_finished_at timestamptz,
  recipient_finished_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  status text not null default 'pending' check (status in ('pending', 'playing', 'complete', 'expired'))
);

create index if not exists matches_recipient_pending_idx
  on public.matches (recipient_name, status)
  where status in ('pending', 'playing');

create index if not exists matches_challenger_pending_idx
  on public.matches (challenger_name, status)
  where status in ('pending', 'playing');

create unique index if not exists matches_one_open_per_pair_idx
  on public.matches (challenger_name, recipient_name)
  where status = 'pending' and recipient_name is not null;

alter table public.matches enable row level security;

drop policy if exists "Anyone can read matches" on public.matches;
create policy "Anyone can read matches"
  on public.matches for select
  using (true);

drop policy if exists "Anyone can create matches" on public.matches;
create policy "Anyone can create matches"
  on public.matches for insert
  with check (
    challenger_score is null
    and recipient_score is null
    and challenger_finished_at is null
    and recipient_finished_at is null
    and status = 'pending'
    and expires_at <= (now() + interval '14 days')
  );

drop policy if exists "Anyone can update unfilled match fields" on public.matches;
create policy "Anyone can update unfilled match fields"
  on public.matches for update
  using (status in ('pending', 'playing'))
  with check (
    -- Cannot overwrite a populated score field
    (challenger_score is null or challenger_score = (select challenger_score from public.matches m where m.id = matches.id))
    and (recipient_score is null or recipient_score = (select recipient_score from public.matches m where m.id = matches.id))
    -- New status must be one of: playing (joining), complete (both submitted), expired
    and status in ('playing', 'complete', 'expired')
  );
```

Run in Supabase SQL editor after the existing `high_scores` migration.

Score range: lower bound `-18` covers a worst-case run of 9 misses (`9 × -2`); upper bound `54` covers `9 × 6` (Big Stick).

---

## Client API additions: `src/globalScores.js`

Add these methods to the existing `window.globalScores` object. Reuse `getClient()` and `cleanName()`.

```js
async createInviteMatch(challengerName) {
  const code = generateInviteCode();
  const { data, error } = await getClient()
    .from('matches')
    .insert({ invite_code: code, challenger_name: cleanName(challengerName), recipient_name: null })
    .select('*').single();
  if (error) throw error;
  return data;
},

async createDirectChallenge(challengerName, recipientName) {
  const code = generateInviteCode();
  const { data, error } = await getClient()
    .from('matches')
    .insert({
      invite_code: code,
      challenger_name: cleanName(challengerName),
      recipient_name: cleanName(recipientName),
    })
    .select('*').single();
  if (error) throw error;
  return data;
},

async fetchMatchByCode(code) {
  const { data, error } = await getClient()
    .from('matches').select('*').eq('invite_code', code).single();
  if (error) throw error;
  return data;
},

async fetchPendingForUser(name) {
  const { data, error } = await getClient()
    .from('matches').select('*')
    .or(`recipient_name.eq.${cleanName(name)},and(invite_code.neq.,recipient_name.is.null)`)
    .in('status', ['pending', 'playing'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
},

async joinMatch(matchId, recipientName) {
  const { data, error } = await getClient()
    .from('matches')
    .update({ recipient_name: cleanName(recipientName), status: 'playing' })
    .eq('id', matchId)
    .is('recipient_name', null)
    .select('*').single();
  if (error) throw error;
  return data;
},

async submitMatchScore(matchId, side, score) {
  const update = side === 'challenger'
    ? { challenger_score: score, challenger_finished_at: new Date().toISOString() }
    : { recipient_score: score, recipient_finished_at: new Date().toISOString() };
  // Read current row to decide if status flips to 'complete'
  const { data: row, error: readErr } = await getClient()
    .from('matches').select('*').eq('id', matchId).single();
  if (readErr) throw readErr;
  const otherDone = side === 'challenger' ? row.recipient_score != null : row.challenger_score != null;
  if (otherDone) update.status = 'complete';
  else update.status = 'playing';
  const { data, error } = await getClient()
    .from('matches').update(update).eq('id', matchId).select('*').single();
  if (error) throw error;
  return data;
},
```

`generateInviteCode()` lives near the top of `globalScores.js`:
```js
function generateInviteCode() {
  // 8-char base32 — collision-safe enough for the player base
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
```

---

## Implementation Steps

### 1. Migration + client API (45 min)
Run the migration. Add the 6 client functions above. Smoke-test from the browser console:
```js
await window.globalScores.createInviteMatch('TestChallenger');
await window.globalScores.fetchPendingForUser('TestChallenger');
```

### 2. State machine + Versus home screen (90 min)
Add new states to `RUN_STATE`:
- `VERSUS_HOME` — list of pending matches (incoming + outgoing) + send-challenge UI
- `VERSUS_PLAYING` — same as `PLAYING` but with `versusContext` set on `run`
- `VERSUS_RESULT` — both-finished result screen
- `VERSUS_WAITING` — your throws done, opponent still hasn't (shows your score privately + "waiting for {opponent}")

Add to `run` object:
```js
run.versusContext = null;  // { matchId, side: 'challenger'|'recipient', throwsRemaining: 9, scoreSoFar: 0 } when active
```

`drawVersusHome(timestamp)`: title, two-column or stacked list of matches. Each row shows opponent name, status (pending / their turn / your turn / waiting), age. Buttons: "Send challenge" + "Join via code".

### 3. Send-challenge flow (45 min)
- Add a "Challenge" button on each leaderboard row (`drawLeaderboard`, `index.html:2225`).
- On tap: open an HTML overlay (mirror `openSettingsOverlay` style) with the prompt:
  - If multiple leaderboard rows share that name: show warning "There are N players named X — the first to open the app gets it."
  - Confirm button → calls `createDirectChallenge`
  - On success: toast "Challenge sent to X" + return to leaderboard
- Client-side soft-cap: refuse to send more than 10 challenges in a 24-hour window from the same browser (track in `localStorage.shoveltoss.challengesSentToday` with a date stamp).

### 4. Invite-link flow (60 min)
On Versus home, a "Generate invite link" button:
- Calls `createInviteMatch(currentUsername)` → server returns row with `invite_code`
- Show the URL `${PROD_APEX}/?match=${code}` in a modal with a "Copy" button
- Use the existing `navigator.clipboard.writeText` API (no new dep)

On app boot, parse `?match=<code>` from URL:
- Fetch match by code via `fetchMatchByCode`
- If match has no recipient and challenger != me: show "Join match against {challenger}?" overlay with Accept / Decline. Accept → `joinMatch(matchId, currentUsername)` → enter `VERSUS_PLAYING`.
- If match has me as recipient: enter directly to play if not yet finished, else show result.
- If invalid/expired: dismiss with toast.

### 5. Versus gameplay (60 min)
Reuse `STATE` machine inside `run.state === RUN_STATE.VERSUS_PLAYING`. Differences from solo:
- Cap throws at 9 (`run.versusContext.throwsRemaining`)
- Lives icons not drawn
- A `MISS` does not end the run; it just consumes a throw
- After the 9th throw resolves: call `submitMatchScore(matchId, side, scoreSoFar)`, transition to `VERSUS_WAITING` (if opponent unfinished) or `VERSUS_RESULT` (if both done)

Reuse the existing meter, throw, and feedback system as-is. **Do not** modify difficulty ramp.

### 6. Versus result + waiting screens (30 min)
- `VERSUS_WAITING`: your final score (large), "waiting for {opponent}" copy, a "Back to home" button. On enter: poll the match every 30s (with `visibilitychange` listener to pause when tab hidden). When both scores present, transition to `VERSUS_RESULT`.
- `VERSUS_RESULT`: both names + scores side by side, "WIN" / "LOSS" / "TIE" headline, "Back to home" button. Mark match `complete` server-side if not already.

### 7. Landing badge + Versus button (20 min)
- On landing mount and on every `RUN_STATE.HOME` render entry: call `fetchPendingForUser(username)`. Cache result for 60s to avoid hammering Supabase.
- Add a 6th button to the landing: "Versus" with a "(N)" badge if pending count > 0. Action `'versus'` → set state to `VERSUS_HOME`.
- Updated landing layout may need `font-size` tweaks to fit 6 buttons; that's fine.

### 8. Polling + visibility hooks (15 min)
- Single shared `pollMatch(matchId)` helper that runs every 30s
- Wired into `VERSUS_WAITING` and the "your move" branch of `VERSUS_HOME`
- Stops polling on tab hide; resumes on show

### 9. Manual verification (45 min)
Open the app in two browsers with two different usernames:
- Browser A: send challenge from leaderboard to Browser B's username
- Browser B: open landing, see badge, tap Versus, see incoming, accept, play 9 throws
- Browser A: see "your turn" indicator, play 9 throws
- Both: see results screen with both scores
- Test invite-link path: A generates link, B opens URL, joins, plays
- Test name collision: create two browser sessions with the same username, send challenge to that name from a third, confirm only one gets it (race condition acceptable for MVP)
- Test expiry: insert a match with `expires_at = now() - interval '1 second'` directly via SQL editor → confirm it doesn't appear in pending list
- Test Postgres `unique index` on open pair: send two challenges to the same person back-to-back, second should fail at the API level

### 10. CHANGELOG + release notes (10 min)
Bump to `v0.26.0` (significant new feature). Release-note headline: "Versus mode (beta) — challenge friends to async matches."

---

## Out of Scope (deferred)

- Auth / unique IDs (Phaser/Capacitor era)
- Push notifications (needs server infra)
- Spectating in-progress matches
- Re-match button on results screen
- Per-throw replay (the schema supports it but the UI doesn't)
- Block / report
- Edge-Function-based rate limiting
- Tournaments / brackets
- Real-rules sim mode (going-over, redemption, OT, sudden death)
- Versus leaderboard / win-loss records / ELO

## Constraints

- DO NOT add a new third-party dependency.
- DO NOT introduce websockets / Supabase Realtime — polling is enough.
- DO NOT modify the solo gameplay loop (meter, scoring zones, difficulty ramp).
- DO NOT write a versus-specific renderer — reuse `drawHud`, `drawMeter`, the throw resolution path.
- DO NOT add auth shims (no anonymous IDs, no email signup) — that's a Phaser-era decision.
- DO NOT enable Versus by default in production until manual verification passes. Gate behind a `VERSUS_ENABLED` flag set to `true` only on `*.shoveltoss.ing` for now (lets you test pre-prod without exposing buggy state).

## Risks / Open Questions

1. **Postgres unique index on open pair** prevents back-to-back challenges, but the failure surfaces as a generic Supabase error. UX needs to translate it ("You already have an open challenge against this player"). Plan covers this in step 3.
2. **Invite link clipboard fallback**: `navigator.clipboard.writeText` requires HTTPS (works in prod). On localhost dev, fall back to selecting the URL text in a `<input>` for manual copy.
3. **Polling cost**: 30s interval × 100 active players × 30 days = ~8.6M reads/month. Within Supabase free tier but worth monitoring. If it gets close to limits, bump interval to 60s.
4. **Username changes mid-match**: if a player edits their username after sending a challenge, the recipient sees the old name. Acceptable — usernames are display-only identity. Pending matches use the snapshot at creation time.
5. **Layout**: 6 landing buttons may push the height past phone-portrait fold. Worth checking on iPhone Mini (375×667).

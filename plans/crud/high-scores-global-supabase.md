# Plan: Global High Scores (Supabase)

**Target system:** scoring-system / persistence / ui

**User feedback:**
- Local leaderboard is good but bragging rights need a global view
- Wants free / cheap managed backend

**Hypothesis:**
A Supabase-backed `high_scores` table with public read + anonymous insert (rate-limited via RLS) gives a global leaderboard with no custom backend, no accounts, and minimal code. The localStorage leaderboard remains for offline / personal-best use.

## 1. GOAL
Add a global leaderboard backed by Supabase. Players can submit a score with a name and view the top 100 worldwide. Local leaderboard from the prior plan remains unchanged.

## 2. CHANGE DESCRIPTION
- New Supabase project; one table `high_scores` with columns: `id` (uuid, default gen_random_uuid), `name` (text, length 1–20), `score` (int, > 0), `created_at` (timestamptz, default now()).
- RLS policies:
  - `select`: anyone can read.
  - `insert`: anyone can insert if name length 1–20 and score > 0. (Anti-abuse beyond this is a non-goal for v1.)
  - `update` / `delete`: disabled.
- Add `@supabase/supabase-js` client. Anon key in env / config.
- On game-over, after local save, attempt a global submit; show inline error on failure (do not block local flow).
- Add a "Global" tab to the leaderboard view that fetches top 100 by score desc.
- Show a player's local rank-vs-global indicator only if the request succeeded; otherwise show "offline".

## 3. EXPECTED EFFECT
- Players see a worldwide leaderboard.
- No backend code to maintain.
- Local leaderboard still works fully offline.

## 4. IMPLEMENTATION STEPS
1. Create Supabase project. Run migration SQL: create `high_scores` table, enable RLS, add the three policies above. Commit the SQL to the repo (`supabase/migrations/` or similar).
2. Add `@supabase/supabase-js` and a `globalScores` module exposing `submit(name, score)` and `topN(n=100)`. Read URL + anon key from env.
3. Wire the local game-over save path to also call `globalScores.submit()` (fire-and-forget with surfaced error). Add a "Global" tab to the leaderboard view that calls `topN(100)` on open.
4. Add a tiny keep-alive: a scheduled fetch of `topN(1)` once a week from a no-cost cron (GitHub Actions) to prevent free-tier project pause. Document in README.

## 5. ROLLBACK STRATEGY
Revert the commit. Remove the Supabase client and "Global" tab. Pause/delete the Supabase project (data is non-critical, no migration needed). Local leaderboard is unaffected.

## 6. NON-GOALS
- No accounts, sign-in, or claimed identities — names are free-text and not unique.
- No anti-cheat (signed scores, server-side validation, replay protection).
- No profanity filter.
- No pagination beyond top 100.
- No real-time subscriptions / live updates.
- No regional / per-character / time-windowed leaderboards.
- No migration of localStorage scores to global.
- No alternative backend choice (Firebase, etc.) — that's a separate plan if reconsidered.
- No rate limiting beyond what RLS column constraints provide.

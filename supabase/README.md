# Supabase

This project can run against a local Supabase stack for development. Localhost uses the local Supabase URL/key from `src/config.js`; production still uses the hosted Supabase project.

## Deploying To Production

Production migrations are applied with the Supabase CLI against the hosted project. Make sure you are logged in and the repo is linked to the prod project:

```sh
supabase login
supabase link --project-ref <PROD_PROJECT_REF>   # one-time per machine
```

Preview which migrations are missing on prod vs. local:

```sh
supabase migration list --linked
```

Apply all pending migrations to prod:

```sh
supabase db push --linked
```

### Migrations introduced on the `codex/versus-multiplayer-mvp` branch

These three migrations add the Versus / 1v1 Toss-Off feature and must be applied to prod before deploying this branch:

```text
supabase/migrations/20260508000000_create_matches.sql
supabase/migrations/20260510000000_fix_matches_score_updates.sql
supabase/migrations/20260512000000_match_character_level.sql
```

`supabase db push --linked` applies all three in order. After it finishes, verify in the Supabase dashboard (or via `psql` against the prod connection string) that `public.matches` exists and has columns `level_id`, `challenger_character_id`, `recipient_character_id`.

Quick sanity query against prod (replace with the prod connection string from the dashboard → Project Settings → Database):

```sh
psql "$PROD_DB_URL" -c "select column_name from information_schema.columns where table_schema='public' and table_name='matches' order by ordinal_position;"
```

Roll-forward only — there is no automatic down migration. If a prod push needs to be reverted, write a new migration that undoes it.

## Start Local Supabase

Requires Docker and the Supabase CLI.

```sh
supabase start
```

Useful URLs from `supabase status`:

```text
Studio:      http://127.0.0.1:54323
Project URL: http://127.0.0.1:54321
Database:    postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

The app uses the local Project URL and publishable key automatically on every non-production host. Only `shoveltoss.ing` and `*.shoveltoss.ing` use the production Supabase project.

When testing from another device on your network, open the game through your computer's LAN IP, for example:

```text
http://192.168.1.23:56800
```

The app will use that same host for local Supabase:

```text
http://192.168.1.23:54321
```

Do not use `127.0.0.1` from a phone. On the phone, `127.0.0.1` means the phone itself, not your computer.

## Rebuild The Local Database

Apply newly-added migrations to the running local database without wiping data:

```sh
supabase migration up
```

Run migrations from scratch:

```sh
supabase db reset
```

This applies everything in `supabase/migrations/`. It will wipe local data.

If you see:

```text
WARN: no files matched pattern: supabase/seed.sql
```

that is harmless unless you expected seed data.

## Check That Writes Work

Start the app:

```sh
npm run dev
```

In the app:

1. Open the local app URL.
2. Set username to `TestA`.
3. Go to `Versus`.
4. Click `Challenge by username`.
5. Enter `TestB`.
6. Submit.

Then open Studio:

```text
http://127.0.0.1:54323
```

Go to `Table Editor` -> `public` -> `matches`.

You should see a row like:

```text
challenger_name = TestA
recipient_name = TestB
status = pending
```

## Query From Terminal

With `psql`:

```sh
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -c "select challenger_name, recipient_name, status, created_at from public.matches order by created_at desc limit 10;"
```

With Supabase CLI:

```sh
supabase db query "select challenger_name, recipient_name, status, created_at from public.matches order by created_at desc limit 10;"
```

Leaderboard rows:

```sh
supabase db query "select name, score, character_name, created_at from public.high_scores order by created_at desc limit 10;"
```

## Helpful Local Tables

- `public.high_scores`: global leaderboard and player stats data.
- `public.matches`: Versus challenges, scores, and match status.

## Local Dev Notes

- Local Supabase runs only while Docker containers are running.
- `supabase stop` stops the local stack.
- `supabase status` prints the current local URLs and keys.
- `supabase migration up` applies new local migrations without wiping existing local data.
- `supabase db reset` is the fastest way to return to a clean local database.
- Local API traffic is separate from production, so local challenge/test rows will not appear on `shoveltoss.ing`.
- The local publishable key is safe to commit for this local stack, just like the production publishable key is public in this browser app. Database safety comes from RLS policies and constraints.

## Common Problems

If the app says Versus is offline locally:

1. Confirm Supabase is running:

   ```sh
   supabase status
   ```

2. Confirm the app is not opened from `shoveltoss.ing` or a `*.shoveltoss.ing` host.
3. Confirm `src/config.js` has the current local Project URL and publishable key from `supabase status`.
4. If testing from a phone, confirm the phone can open the local API URL using your computer's LAN IP:

   ```text
   http://YOUR_LAN_IP:54321/rest/v1/
   ```

   A JSON response or auth-style error means the phone can reach the local Supabase API. A browser/network error means the port is not reachable from the phone.

If duplicate direct challenges fail:

- That is expected when an open challenge already exists for the same challenger/recipient pair.
- The database enforces this through `matches_one_open_per_pair_idx`.

If local data looks stale:

- Refresh Supabase Studio.
- Or query directly from the terminal.
- Or reset local data with `supabase db reset`.

<p align="center">
  <img src="docs/buck-lil-italy.png" alt="Buck on Lil Italy">
</p>

# Shovel Toss

[![Deploy Pages](https://github.com/MaxRickettsUy/shoveltoss-game/actions/workflows/pages.yaml/badge.svg)](https://github.com/MaxRickettsUy/shoveltoss-game/actions/workflows/pages.yaml)
[![CodeQL](https://github.com/MaxRickettsUy/shoveltoss-game/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/MaxRickettsUy/shoveltoss-game/actions/workflows/github-code-scanning/codeql)

A mobile-first 2D arcade timing game. Hold to charge a power meter, release to launch a shovel into the pit.

## Local Development

No build step required — it's a single HTML file.

**Option 1 — Python (built-in, recommended)**
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**Option 2 — Node `serve` (via npm)**
```bash
npm install
npm run dev
```

**Option 3 — VS Code Live Server**
Right-click `index.html` → Open with Live Server.

## Testing on Mobile

1. Start a local server (Option 1 or 2 above).
2. Find your machine's local IP (e.g. `192.168.1.x`).
3. On your phone (same Wi-Fi), open the URL printed by the server (e.g. `http://192.168.1.x:3000` for `npm run dev`, port `8000` for Python).
4. Use one thumb — hold anywhere to charge, release to throw.

## How to Play

1. **First open** — enter a username (saved in `localStorage`, used for the global leaderboard).
2. **Home** — pick `Play Game`, `Leaderboard`, `Hall of Fame`, `Player Stats`, or `What's New`. Tap the username to edit it.
3. **Character select** — tap a tile to pick a character. Use the `NEW` / `LADIES` / `CHAMPS` filters to narrow the roster, or flip a card to preview that character's top-5 scores.
4. **Level select** — choose Lil Italy, The Swamp, or St Paul.
5. **Throw** — hold anywhere to start the power meter. The fill oscillates and the gold sweet-spot band appears at a random position each throw. Release while the fill is inside the sweet spot for a `STICK`.
6. **Lives** — three shovel icons in the HUD. Each `MISS` costs one life. The run ends when all three are gone.
7. **Settings** — tap the gear in the top-right HUD (between throws) to move the meter (top / middle / bottom). Persisted across sessions.
8. **Game over** — tap to restart, view the leaderboard, or change character.

## Scoring

| Result | Points | Condition |
|---|---|---|
| `STICK` | +3 | Released inside the sweet spot, landed in the pit |
| `BACK_WALL` | +1 | Landed in the back 10% of the pit |
| `IN_PIT` | 0 | Landed in the pit (no bonus) |
| `FRONT_WALL` | +1 | Landed in the front 10% of the pit |
| `MISS` | -2 | Landed outside the pit (costs a life) |

Each `STICK` increases meter speed for the rest of the run, tightening the timing window.

## Global Leaderboard

Global scores use Supabase. Run `supabase/migrations/20260428000000_create_high_scores.sql` in the Supabase SQL editor, then set the project URL and anon key in `src/config.js`. If the table already exists, run the SQL again to add `character_name`:

```js
export const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

The game imports `@supabase/supabase-js` from `https://esm.sh/@supabase/supabase-js@2`, so no bundler is required. If config is missing or the request fails, the global status shows offline. The current global #1 gets a crown badge next to their HUD name. The leaderboard screen toggles between `All Time` and `Today` (since local midnight) and can be filtered by character.

The Supabase anon key in `src/config.js` is intentionally public for this browser app. Access is gated by row-level security and database constraints in the migration.

The weekly keep-alive workflow in `.github/workflows/supabase-keepalive.yml` fetches one score every Monday. Add repository secrets named `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## Controls

| Action | Input |
|---|---|
| Charge meter | Touch hold / Mouse hold |
| Release throw | Touch release / Mouse release |

# Shovel Toss

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
npm start
```

**Option 3 — VS Code Live Server**
Right-click `index.html` → Open with Live Server.

## Testing on Mobile

1. Start a local server (Option 1 or 2 above).
2. Find your machine's local IP (e.g. `192.168.1.x`).
3. On your phone (same Wi-Fi), open the URL printed by the server (e.g. `http://192.168.1.x:3000` for `npm start`, port `8000` for Python).
4. Use one thumb — hold anywhere to charge, release to throw.

## How to Play

- Hold anywhere on the screen to start charging the power meter.
- The meter oscillates automatically. Release when the fill is in the **gold zone** (sweet spot) for the best throw.
- Watch the console (`F12 → Console`) to see throw result data until the scoring system is implemented.

## Global Leaderboard

Global scores use Supabase. Run `supabase/migrations/20260428000000_create_high_scores.sql` in the Supabase SQL editor, then set the project URL and anon key in `src/config.js`. If the table already exists, run the SQL again to add `character_name`:

```js
export const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

The game imports `@supabase/supabase-js` from `https://esm.sh/@supabase/supabase-js@2`, so no bundler is required. If config is missing or the request fails, the global status shows offline.

The weekly keep-alive workflow in `.github/workflows/supabase-keepalive.yml` fetches one score every Monday. Add repository secrets named `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## Controls

| Action | Input |
|---|---|
| Charge meter | Touch hold / Mouse hold |
| Release throw | Touch release / Mouse release |

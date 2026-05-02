# Feature Plan: Production-Only Score Saving

## Scope

Restrict `globalScores.submit()` writes to the production hosts (`shoveltoss.ing` and `www.shoveltoss.ing`). Reads (`topN`) remain enabled everywhere so the leaderboard is still viewable in dev. UI surfaces a clear "disabled in dev" state instead of an error.

## Files Touched

- `src/globalScores.js`
- `index.html`

## Implementation Steps

### Step 1 — Add production-host check in `globalScores.js`

At the top of `src/globalScores.js` (below imports), add:

```js
const PROD_HOSTS = new Set(['shoveltoss.ing', 'www.shoveltoss.ing']);
function isProductionHost() {
  return typeof window !== 'undefined' && PROD_HOSTS.has(window.location.hostname);
}
```

### Step 2 — Gate `submit()` with a sentinel error

Modify `submit()` (src/globalScores.js:28–33):

```js
async submit(name, score, characterName) {
  if (!isProductionHost()) {
    const err = new Error('disabled-non-prod');
    err.code = 'disabled-non-prod';
    throw err;
  }
  const { error } = await getClient()
    .from('high_scores')
    .insert({ name: cleanName(name), score, character_name: cleanCharacterName(characterName) });
  if (error) throw error;
}
```

`topN()` is untouched — leaderboard reads still work in dev.

### Step 3 — Surface a distinct UI state in `submitGlobalScore()`

In `index.html:378–394`, branch on the new error code:

```js
async function submitGlobalScore(name, score, characterName) {
  gameOverSave.globalStatus = 'loading';
  try {
    if (score <= 0) throw new Error('score');
    await window.globalScores.submit(name, score, characterName);
    const rows = await window.globalScores.topN(GLOBAL_SCORE_LIMIT);
    leaderboard.globalRows = rows;
    leaderboard.globalStatus = 'ready';
    const rank = rows.findIndex(row => score >= row.score);
    gameOverSave.globalStatus = 'ready';
    gameOverSave.globalMessage = rank === -1
      ? 'Global: outside top 100'
      : `Global rank: #${rank + 1}`;
  } catch (err) {
    if (err && err.code === 'disabled-non-prod') {
      gameOverSave.globalStatus = 'ready';
      gameOverSave.globalMessage = 'Global save disabled (dev)';
      return;
    }
    gameOverSave.globalStatus = 'error';
  }
}
```

### Step 4 — Skip the save call entirely on non-prod (optional micro-opt)

In `saveGameOverScore()` (index.html:404–410), short-circuit before the async call so `gameOverSave.completed` still flips and the dev message renders without going through the try/catch:

```js
const PROD_HOSTS = new Set(['shoveltoss.ing', 'www.shoveltoss.ing']);

function saveGameOverScore() {
  if (gameOverSave.completed) return;
  const name = username.get();
  if (!name) return;
  gameOverSave.completed = true;
  if (!PROD_HOSTS.has(window.location.hostname)) {
    gameOverSave.globalStatus = 'ready';
    gameOverSave.globalMessage = 'Global save disabled (dev)';
    return;
  }
  submitGlobalScore(name, scoring.score, selectedCharacterId);
}
```

If Step 4 is taken, Step 3's error-code branch is still kept as defense-in-depth (in case any other path calls `submit()`).

## Constraints

- Hostname is the single source of truth — no env vars, no build flags.
- `topN()` (reads) is never gated.
- No new files, no new dependencies.

## Edge Cases

- `localhost`, `127.0.0.1`, GitHub Pages preview URLs, and any other host fall through to the "disabled (dev)" path.
- Both apex (`shoveltoss.ing`) and `www.` subdomain are treated as production.
- Other subdomains (e.g. `staging.shoveltoss.ing`) are NOT production — add to `PROD_HOSTS` if that changes.
- SSR/no-window contexts return `false` from `isProductionHost()` — safe default (no writes).

## Out of Scope

- Server-side enforcement (RLS / Supabase policies). This plan is client-side gating only; harden with DB rules in a separate task if needed.

# Feature Plan: Prod-Host Check Hardening

## Scope

Tighten and de-duplicate the production-host check used to gate score submission. Single source of truth, accept any `*.shoveltoss.ing` subdomain, strip trailing dots. No behavior change for the apex or `www.` host.

## Files Touched

- `src/globalScores.js`
- `index.html`

## Implementation Steps

### Step 1 — Replace `PROD_HOSTS` Set with apex-suffix matcher in `globalScores.js`

In `src/globalScores.js`, replace the existing `PROD_HOSTS` + `isProductionHost()` block with:

```js
const PROD_APEX = 'shoveltoss.ing';

function normalizeHost(h) {
  return String(h || '').toLowerCase().replace(/\.$/, '');
}

function isProductionHost() {
  if (typeof window === 'undefined') return false;
  const host = normalizeHost(window.location.hostname);
  return host === PROD_APEX || host.endsWith('.' + PROD_APEX);
}
```

This matches `shoveltoss.ing`, `www.shoveltoss.ing`, `play.shoveltoss.ing`, `m.shoveltoss.ing`, etc., and tolerates a trailing-dot FQDN.

### Step 2 — Expose the check on `window.globalScores`

In `src/globalScores.js`, add to the `window.globalScores = { ... }` block:

```js
isProduction() {
  return isProductionHost();
},
```

### Step 3 — Replace the duplicated check in `index.html`

In `index.html`:
- Delete `const PROD_HOSTS = new Set(['shoveltoss.ing', 'www.shoveltoss.ing']);` (around index.html:176).
- In `saveGameOverScore()` (around index.html:432), replace `if (!PROD_HOSTS.has(window.location.hostname)) {` with:

```js
if (!window.globalScores.isProduction()) {
```

No other `index.html` change required — Step 3's error-code fallback in `submitGlobalScore()` stays as defense-in-depth.

### Step 4 — Verify load order

`globalScores.js` must be evaluated before any code path that calls `saveGameOverScore()`. The script is already loaded at the top of `index.html` and assigns `window.globalScores` synchronously on import — no ordering change needed. Confirm by skimming the existing `<script>` tag.

## Constraints

- Single source of truth lives in `src/globalScores.js`.
- `topN()` remains ungated.
- No new files, no new dependencies.

## Edge Cases

- `shoveltoss.ing.` (trailing-dot FQDN) → normalized, matches.
- `WWW.SHOVELTOSS.ING` (uppercase from some clients) → lowercased, matches. (Browsers already normalize, but cheap insurance.)
- `evil-shoveltoss.ing` → does NOT match (the `'.' + PROD_APEX` suffix check requires the literal dot).
- `shoveltoss.ingest.com` or any host where `shoveltoss.ing` appears mid-string → does NOT match.
- `localhost`, `127.0.0.1`, `*.github.io` previews → fall through to dev path.
- SSR / no `window` → returns `false` (safe).

## Out of Scope

- Server-side / RLS enforcement.
- Distinguishing staging subdomains from prod (current spec: any `*.shoveltoss.ing` is prod). If staging needs to be excluded later, add an explicit deny-list inside `isProductionHost()`.

# Feature Plan: Installable PWA

## Scope

Make Shovel Toss installable as a Progressive Web App on desktop and mobile. App shell + game assets are cached for offline launch. Global leaderboard still requires network (out of scope for offline play).

## Files Touched / Added

- `index.html` (head meta + service worker registration)
- `manifest.webmanifest` (new, repo root)
- `sw.js` (new, repo root — must be at root for full scope)
- `assets/icon-192.png` (new)
- `assets/icon-512.png` (new)
- `assets/icon-512-maskable.png` (new)

## Implementation Steps

### Step 1 — Generate icons

Produce three PNGs from the existing shovel artwork (or a derivative mark):
- `assets/icon-192.png` — 192×192, transparent or solid background.
- `assets/icon-512.png` — 512×512, same.
- `assets/icon-512-maskable.png` — 512×512, important content within the inner 80% safe zone (Android adaptive-icon spec).

Tooling: any image editor or `https://maskable.app` for the maskable variant. No build step.

### Step 2 — Add `manifest.webmanifest` at repo root

```json
{
  "name": "Shovel Toss",
  "short_name": "ShovelToss",
  "description": "Time your throw, fill the pit.",
  "start_url": "/",
  "scope": "/",
  "display": "fullscreen",
  "orientation": "any",
  "background_color": "#111111",
  "theme_color": "#1a1a2e",
  "icons": [
    { "src": "assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "assets/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Step 3 — Add `sw.js` at repo root

App-shell precache + network-first for HTML, cache-first for static assets. Bump `CACHE_VERSION` on each release to invalidate.

```js
const CACHE_VERSION = 'v0.19.0';
const CACHE_NAME = `shoveltoss-${CACHE_VERSION}`;
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/src/globalScores.js',
  '/src/config.js',
  '/assets/shovel.png',
  '/assets/champ-shovel.png',
  '/assets/champion.png',
  '/assets/house.png',
  '/assets/lil-italy.png',
  '/assets/pit.png',
  '/assets/pit-back.png',
  '/assets/pit-front.png',
  '/assets/pit-left.png',
  '/assets/dust-puff.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache Supabase or third-party module CDNs
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML so deploys roll out fast
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for everything else (assets, scripts)
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
```

Character sprite/hero PNGs are intentionally NOT precached (too many, large) — they fall through the fetch handler and get cached on first use.

### Step 4 — Wire manifest + meta tags + SW registration in `index.html`

Inside `<head>` (after the existing viewport meta), add:

```html
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#1a1a2e">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Shovel Toss">
<link rel="apple-touch-icon" href="/assets/icon-192.png">
<link rel="icon" type="image/png" href="/assets/icon-192.png">
```

At the bottom of the existing inline `<script>` block (or in a small dedicated script tag at end of body), register the SW:

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
```

### Step 5 — Bump cache version on every release

Add a one-line item to the release checklist (or to `WORKFLOW.md` if it exists): bump `CACHE_VERSION` in `sw.js` to match the new `APP_VERSION_TAG`. This is the activation trigger — without it, users get stale assets.

### Step 6 — Verify

- `chrome://inspect` → Application → Manifest: no errors, install icon appears.
- DevTools → Application → Service Workers: registered, activated.
- Lighthouse → PWA audit: installable.
- iOS Safari → Share → Add to Home Screen: launches fullscreen, correct icon, no Safari chrome.
- Toggle DevTools "Offline" → reload → game still loads (no leaderboard).

## Constraints

- All paths absolute (`/`-prefixed) so SW scope and precache match regardless of where the page is opened from.
- No build step, no bundler.
- Service worker must be served from repo root (GitHub Pages serves from `/`).
- Leaderboard reads/writes intentionally bypass cache (cross-origin Supabase + esm.sh).

## Edge Cases

- Local dev (`http://localhost:*`): SW registers and works; cached assets may mask file changes — instruct devs to "Update on reload" in DevTools.
- File:// — SW won't register (browsers block). Acceptable; PWA only matters on the deployed site.
- iOS PWA: no install prompt event; users must use Share → Add to Home Screen. Apple meta tags above cover the visual side.
- Stale cache after deploy: the network-first HTML handler ensures users see the new `index.html` immediately; the new HTML references the new `sw.js` which precaches the new asset set under a new `CACHE_VERSION`.

## Out of Scope

- Offline leaderboard (would require local cache + sync logic).
- Push notifications.
- Background sync.
- Install prompt UI ("Add to Home Screen" button inside the game).

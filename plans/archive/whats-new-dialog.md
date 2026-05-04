# Feature Plan: Non-Intrusive "What's New" Dialog

## Scope

Show a small, dismissible "What's New" badge on the home/landing screen when the user hasn't seen the current release. Tapping the badge (or the version footer) opens a DOM overlay listing user-friendly highlights for each unseen version. Closing it persists "last seen version" in `localStorage`.

User-facing notes are authored manually as part of each release — separate from `CHANGELOG.md`, which stays developer-focused.

> **Context note**: This plan was originally written when character-select was the app's first screen. A landing/HOME screen has since shipped (`drawHome`), and the version footer + `APP_VERSION_TAG` moved with it. The badge belongs on HOME now — that's the screen every returning user lands on, and it already hosts the version footer the badge sits next to.

## Files Touched / Added

- `src/releaseNotes.js` (new — data + helpers)
- `index.html` (badge draw, click hit-test, DOM overlay, `<script>` tag)

## Implementation Steps

### Step 1 — Create `src/releaseNotes.js`

```js
// Newest first. One entry per release that has user-visible changes.
// Skip releases that are pure refactors / dev-only.
const RELEASE_NOTES = [
  {
    version: 'v0.19.0',
    date: '2026-05-03',
    headline: 'Cleaner leaderboard',
    items: [
      'Fixed how your rank is shown after a run — ties now report your real spot.',
      'Leaderboard scores now save reliably from the live site.'
    ]
  }
  // Add a new entry here on each release with user-visible changes.
];

const STORAGE_KEY = 'shoveltoss.lastSeenVersion';

function compareSemver(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const ai = pa[i] || 0, bi = pb[i] || 0;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}

function getLastSeen() {
  try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
}

function setLastSeen(version) {
  try { localStorage.setItem(STORAGE_KEY, version); } catch {}
}

function getUnseenNotes() {
  const last = getLastSeen();
  if (!last) {
    // First-ever visit: don't spam — mark as seen up to current and show nothing.
    if (RELEASE_NOTES[0]) setLastSeen(RELEASE_NOTES[0].version);
    return [];
  }
  return RELEASE_NOTES.filter(n => compareSemver(n.version, last) > 0);
}

function markAllSeen() {
  if (RELEASE_NOTES[0]) setLastSeen(RELEASE_NOTES[0].version);
}

window.releaseNotes = { getUnseenNotes, markAllSeen };
```

### Step 2 — Load the script in `index.html`

In `<head>` (or alongside the existing `globalScores.js` script tag):

```html
<script src="src/releaseNotes.js"></script>
```

Plain script (not `type="module"`) so `window.releaseNotes` is available synchronously alongside other inline code.

### Step 3 — Cache unseen notes once per session

In `index.html` near other module state:

```js
let unseenReleaseNotes = window.releaseNotes ? window.releaseNotes.getUnseenNotes() : [];
let whatsNewBadgeRect = null;
let whatsNewOverlayEl = null;
```

### Step 4 — Draw "NEW" badge next to version footer

In `drawCharacterSelect()` (around index.html:1437–1443), after drawing `footerText`:

```js
whatsNewBadgeRect = null;
if (unseenReleaseNotes.length > 0) {
  const badgeLabel = 'NEW';
  ctx.font = `${Math.round(footerSize * 0.85)}px sans-serif`;
  const badgeW = ctx.measureText(badgeLabel).width + 14;
  const badgeH = footerSize + 6;
  const footerW = ctx.measureText(footerText).width;
  const badgeX = canvas.width / 2 + footerW / 2 + 10;
  const badgeY = footerY - footerSize;
  ctx.fillStyle = '#ffe600';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY - badgeH * 0.65, badgeW, badgeH, 4);
  ctx.fill();
  drawText(badgeLabel, badgeX + badgeW / 2, footerY, footerSize * 0.85, '#1a1a2e', 'center', true);
  // Hit rect spans both the version text AND the badge, so tapping either opens the panel.
  whatsNewBadgeRect = {
    x: canvas.width / 2 - footerW / 2 - 8,
    y: badgeY - badgeH * 0.65 - 4,
    w: footerW + badgeW + 30,
    h: badgeH + 8
  };
}
```

When `unseenReleaseNotes.length === 0`, no badge is drawn and the footer remains a plain inert label (existing behavior).

### Step 5 — Wire click handler in SELECTING state

In `onPressStart()` SELECTING branch (around index.html:545, before the existing `usernameNameRect` check):

```js
if (whatsNewBadgeRect &&
    lastPointerX >= whatsNewBadgeRect.x && lastPointerX <= whatsNewBadgeRect.x + whatsNewBadgeRect.w &&
    lastPointerY >= whatsNewBadgeRect.y && lastPointerY <= whatsNewBadgeRect.y + whatsNewBadgeRect.h) {
  openWhatsNewOverlay();
  return;
}
```

### Step 6 — DOM overlay (mirrors existing `openUsernameOverlay`)

Add to `index.html`:

```js
function openWhatsNewOverlay() {
  if (whatsNewOverlayEl) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;';
  const card = document.createElement('div');
  card.style.cssText = 'background:#1a1a2e;color:#fff;border:2px solid #5555aa;border-radius:10px;max-width:420px;width:100%;max-height:80vh;overflow-y:auto;padding:20px;';
  const title = document.createElement('h2');
  title.textContent = "What's New";
  title.style.cssText = 'margin:0 0 12px;font-size:22px;';
  card.appendChild(title);

  unseenReleaseNotes.forEach(note => {
    const h = document.createElement('h3');
    h.textContent = `${note.version}${note.headline ? ' — ' + note.headline : ''}`;
    h.style.cssText = 'margin:14px 0 6px;font-size:15px;color:#ffe600;';
    card.appendChild(h);
    const ul = document.createElement('ul');
    ul.style.cssText = 'margin:0 0 4px 20px;padding:0;font-size:14px;line-height:1.4;';
    note.items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      li.style.marginBottom = '4px';
      ul.appendChild(li);
    });
    card.appendChild(ul);
  });

  const btn = document.createElement('button');
  btn.textContent = 'Got it';
  btn.style.cssText = 'margin-top:18px;width:100%;padding:10px;background:#ffe600;color:#1a1a2e;border:none;border-radius:6px;font-weight:bold;font-size:15px;cursor:pointer;';
  btn.addEventListener('click', closeWhatsNewOverlay);
  card.appendChild(btn);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeWhatsNewOverlay(); });
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  whatsNewOverlayEl = overlay;
}

function closeWhatsNewOverlay() {
  if (!whatsNewOverlayEl) return;
  whatsNewOverlayEl.remove();
  whatsNewOverlayEl = null;
  if (window.releaseNotes) window.releaseNotes.markAllSeen();
  unseenReleaseNotes = [];
}
```

### Step 7 — Release-checklist note

Add a one-line item to the release ritual (in `WORKFLOW.md` or inline near `APP_VERSION_TAG` as a comment): "When releasing, prepend a new entry to `RELEASE_NOTES` in `src/releaseNotes.js` if there are user-visible changes — skip if the release is dev-only." This is what keeps the dialog meaningful.

## Constraints

- No build step, no dependencies.
- Notes are authored manually so they read for users, not developers — `CHANGELOG.md` stays untouched.
- Never auto-opens for first-time visitors; only fires when a returning user crosses a version boundary.
- Badge appears only on the character-select screen (not during gameplay) — non-intrusive by location.

## Edge Cases

- `localStorage` blocked / unavailable: `getLastSeen()` returns `null`, first-visit path marks current as seen → no badge shown ever for that user. Acceptable degradation.
- User refreshes mid-overlay: `unseenReleaseNotes` reloads on next visit; `markAllSeen` only fires on close. Safe.
- New release ships with no `RELEASE_NOTES` entry: `getUnseenNotes()` returns `[]` → no badge. Quiet release, by design.
- Release rolls back: `compareSemver` is monotonic; if `lastSeen` is *higher* than the deployed version, no badge. Safe.

## Out of Scope

- Markdown rendering inside the panel (plain text bullets are enough).
- Auto-translating `CHANGELOG.md` entries — the whole point is a human-curated user-facing summary.
- Per-release acknowledgement (e.g., "got it" on individual versions) — one global "mark all seen" is simpler.

# Feature Plan: In-Game Settings Menu (Meter Position)

## Scope

Add a small settings gear button to the game screen (PLAYING state) that opens a DOM-overlay menu. The menu's first and only setting is **Meter Position**: `top` (default), `middle`, or `bottom`. The menu UI is built so additional settings can be added later as new rows without restructuring.

Out of scope: settings entry points outside the game screen (home/character select), animated transitions, multiple meter cosmetic options.

## Files Touched

- `index.html`

## Design Notes

- **Meter is canvas-drawn**, positioned by `meterX` / `meterY` / `meterWidth` / `meterHeight` set in `updateLayout()` (index.html:361, meter block at 375–379). All position changes live in that one function. The `drawMeter()` function (index.html:1597) doesn't need to know about position — it draws wherever the layout vars say. Both labels under the bar (`POWER` at index.html:1630 and `SPEED ...` at index.html:1631) need to flip to *above* the bar when the meter is at the bottom of the canvas, otherwise they clip off-screen.
- **Settings button is canvas-drawn** (gear glyph) and hit-tested in `onPressStart()` — consistent with how leaderboard/back/game-over buttons work. A DOM button would float over the canvas inconsistently across orientations.
- **Menu is a DOM overlay**, mirroring `openUsernameOverlay()` (index.html:624) and `openWhatsNewOverlay()` (index.html:701). DOM gives us native scrolling and clean radio inputs for free.
- **Persistence** uses `localStorage` directly (no settings module yet). Co-locate the key with `USERNAME_KEY` at index.html:217. A wrapper `settings` object exposes get/set; future settings get added to that object, not scattered.
- **Gear is only tappable when `throw_.state === STATE.IDLE`** so a tap during charging doesn't accidentally open the menu mid-throw. Draw it dimmed during charging/flying to signal that.
- **HUD layout (current)**: in portrait/desktop, score and lives sit *below* the meter at `meterY + meterHeight + HUD_PAD + hudFontSize` (index.html:1565–1572); in phone landscape they sit at `safeTop + hudFontSize` (top-left). Username is always top-right with an optional `HIGH_SCORE_BADGE` prefix (index.html:1574–1575). The gear must avoid all three plus the meter itself.

## Implementation Steps

### Step 1 — Settings storage

Near `USERNAME_KEY` (index.html:217), add:

```js
const SETTINGS_KEY = 'shoveltoss.settings';
const METER_POSITIONS = ['top', 'middle', 'bottom'];
const DEFAULT_SETTINGS = { meterPosition: 'top' };

const settings = {
  _cache: null,
  _load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      this._cache = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      this._cache = { ...DEFAULT_SETTINGS };
    }
    return this._cache;
  },
  get(key) { return this._load()[key]; },
  set(key, value) {
    const s = this._load();
    s[key] = value;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
  },
};
```

The `_cache` matters: `updateLayout()` runs every resize, so we don't want to hit localStorage on each call.

### Step 2 — Meter position in `updateLayout()`

Replace the meter block at index.html:375–379 with:

```js
// Meter: narrowed and centered, position by setting
meterWidth  = Math.max(220, canvas.width * METER_WIDTH_FRACTION);
meterX      = (canvas.width - meterWidth) / 2;
meterHeight = Math.max(36, canvas.height * METER_HEIGHT_FRACTION);

const labelGap = 32; // room for POWER + SPEED below the bar
const pos = settings.get('meterPosition');
if (pos === 'middle') {
  meterY = (canvas.height - meterHeight) / 2;
} else if (pos === 'bottom') {
  meterY = canvas.height - meterHeight - labelGap - 12;
} else {
  meterY = safeTop;
}
```

### Step 3 — Flip both meter labels when at the bottom

Replace the two `drawText` calls in `drawMeter()` at index.html:1630–1631 with:

```js
const labelAbove = settings.get('meterPosition') === 'bottom';
const powerY = labelAbove ? meterY - 18 : meterY + meterHeight + 14;
const speedY = labelAbove ? meterY - 4  : meterY + meterHeight + 30;
drawText('POWER', meterX + meterWidth / 2, powerY, 14, '#ffffff', 'center', false);
drawText(`SPEED ${difficulty.meterSpeed.toFixed(2)}`, meterX + meterWidth / 2, speedY, 12, '#ffffff', 'center', false);
```

### Step 4 — Draw the settings gear on the game HUD

Place the gear at **top-left at `safeTop`**. The meter is centered with `METER_WIDTH_FRACTION = 0.385`, leaving the top-left corner free in both orientations. Conflict only exists in **phone landscape**, where score sits at the top-left at `safeTop + hudFontSize` (line 1565); shift `hudY` in that branch only by `gearSize + 6` so score sits below the gear.

After the HUD draws (after index.html:1575), add:

```js
// Settings gear — top-left, drawn on every PLAYING frame
const gearSize = Math.max(28, Math.floor(canvas.width * 0.06));
const gearX = HUD_PAD;
const gearY = safeTop;
const gearActive = throw_.state === STATE.IDLE;
ctx.globalAlpha = gearActive ? 1 : 0.35;
drawGearIcon(gearX, gearY, gearSize);
ctx.globalAlpha = 1;
settingsGearRect = { x: gearX, y: gearY, w: gearSize, h: gearSize, active: gearActive };
```

In the phone-landscape branch of the `hudY` computation at index.html:1565, change:

```js
const hudY = isPhoneLandscape
  ? safeTop + hudFontSize
  : meterY + meterHeight + HUD_PAD + hudFontSize;
```

to:

```js
const gearReserve = Math.max(28, Math.floor(canvas.width * 0.06)) + 6;
const hudY = isPhoneLandscape
  ? safeTop + gearReserve + hudFontSize
  : meterY + meterHeight + HUD_PAD + hudFontSize;
```

Declare `let settingsGearRect = null;` next to `usernameNameRect` at index.html:115.

#### `drawGearIcon` helper

Add near the other small draw helpers:

```js
function drawGearIcon(x, y, size) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const outer = size * 0.42;
  const inner = size * 0.22;
  const teeth = 8;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? outer : outer * 0.78;
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fill();
}
```

### Step 5 — Hit-test the gear in `onPressStart()`

In the PLAYING input branch, **before** the early return at index.html:1035 (`if (throw_.state !== STATE.IDLE) return;`), insert:

```js
if (settingsGearRect && settingsGearRect.active && pointerInRect(settingsGearRect)) {
  openSettingsOverlay();
  return;
}
```

`pointerInRect` is defined at index.html:897.

### Step 6 — DOM overlay menu

Add `let settingsOverlayEl = null;` next to `whatsNewOverlayEl` at index.html:122. Add:

```js
function openSettingsOverlay() {
  if (settingsOverlayEl) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;';
  const card = document.createElement('div');
  card.style.cssText = 'background:#1a1a2e;color:#fff;border:2px solid #5555aa;border-radius:10px;max-width:360px;width:100%;padding:20px;';

  const title = document.createElement('h2');
  title.textContent = 'Settings';
  title.style.cssText = 'margin:0 0 14px;font-size:22px;';
  card.appendChild(title);

  card.appendChild(buildMeterPositionRow());
  // Future settings: append more rows here.

  const close = document.createElement('button');
  close.textContent = 'Done';
  close.style.cssText = 'margin-top:18px;width:100%;padding:10px;background:#ffe600;color:#1a1a2e;border:none;border-radius:6px;font-weight:bold;font-size:15px;cursor:pointer;';
  close.addEventListener('click', closeSettingsOverlay);
  card.appendChild(close);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSettingsOverlay(); });
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  settingsOverlayEl = overlay;
}

function closeSettingsOverlay() {
  if (!settingsOverlayEl) return;
  settingsOverlayEl.remove();
  settingsOverlayEl = null;
}

function buildMeterPositionRow() {
  const row = document.createElement('div');
  row.style.cssText = 'margin:6px 0 4px;';
  const label = document.createElement('div');
  label.textContent = 'Meter Position';
  label.style.cssText = 'font-size:14px;margin-bottom:8px;color:#cfcfe6;';
  row.appendChild(label);

  const group = document.createElement('div');
  group.style.cssText = 'display:flex;gap:8px;';
  const current = settings.get('meterPosition');
  METER_POSITIONS.forEach(pos => {
    const btn = document.createElement('button');
    btn.textContent = pos[0].toUpperCase() + pos.slice(1);
    const isActive = pos === current;
    btn.style.cssText = `flex:1;padding:10px;border-radius:6px;border:2px solid ${isActive ? '#ffe600' : '#5555aa'};background:${isActive ? '#ffe600' : 'transparent'};color:${isActive ? '#1a1a2e' : '#fff'};font-weight:bold;font-size:14px;cursor:pointer;`;
    btn.addEventListener('click', () => {
      settings.set('meterPosition', pos);
      updateLayout();   // re-place meter immediately
      closeSettingsOverlay();
      openSettingsOverlay(); // re-render with new selection — simplest approach
    });
    group.appendChild(btn);
  });
  row.appendChild(group);
  return row;
}
```

The "close + reopen on selection" reflects the new active state without per-button state plumbing. Acceptable because the menu has no scroll position to preserve.

### Step 7 — Manual test plan

- Game screen shows gear at top-left; doesn't overlap score, lives, username (with or without HIGH_SCORE_BADGE), or feedback text.
- Tap gear during IDLE → menu opens. Tap during CHARGING/FLYING → no-op (gear visibly dimmed).
- Cycle meter position through Top / Middle / Bottom; meter snaps to new location immediately on close.
- `POWER` and `SPEED` labels both sit below the bar for Top/Middle and both above the bar for Bottom (no clipping).
- Reload page; meter position persists.
- Rotate device portrait ↔ landscape with each setting; meter stays in the configured band, no overflow.
- Phone landscape: score row sits below the gear (not overlapping); lives below score.
- Backdrop tap closes menu; "Done" button closes menu.
- Bottom setting in landscape on short phones (canvas.height ≤ 500): verify meter doesn't collide with `groundY` HUD elements.

### Step 8 — Release-checklist note

Bump `APP_VERSION_TAG` (index.html:221) and prepend a `releaseNotes.js` entry: "In-game settings menu — choose meter position (top/middle/bottom)."

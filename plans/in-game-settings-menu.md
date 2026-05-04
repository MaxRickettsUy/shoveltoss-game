# Feature Plan: In-Game Settings Menu (Meter Position)

## Scope

Add a small settings gear button to the game screen (PLAYING state) that opens a DOM-overlay menu. The menu's first and only setting is **Meter Position**: `top` (default), `middle`, or `bottom`. The menu UI is built so additional settings can be added later as new rows without restructuring.

Out of scope: settings entry points outside the game screen (home/character select), animated transitions, multiple meter cosmetic options.

## Files Touched

- `index.html`

## Design Notes

- **Meter is canvas-drawn**, positioned by `meterX` / `meterY` / `meterWidth` / `meterHeight` set in `updateLayout()` (index.html:301–320). All position changes live in that one function. The `drawMeter()` function (index.html:1356) doesn't need to know about position — it draws wherever the layout vars say. Only the `POWER` label (index.html:1389) needs to flip to *above* the bar when the meter is at the bottom of the canvas, otherwise it clips off-screen.
- **Settings button is canvas-drawn** (gear glyph) and hit-tested in `onPressStart()` — consistent with how leaderboard/back/game-over buttons work. A DOM button would float over the canvas inconsistently across orientations.
- **Menu is a DOM overlay**, mirroring `openUsernameOverlay()` (index.html:497–524) and the pattern in `plans/whats-new-dialog.md:140–186`. DOM gives us native scrolling and clean radio inputs for free.
- **Persistence** uses `localStorage` directly (no settings module yet). Co-locate the key with `USERNAME_KEY` at index.html:181. A wrapper `settings` object exposes get/set; future settings get added to that object, not scattered.
- **Gear is only tappable when `throw_.state === STATE.IDLE`** so a tap during charging doesn't accidentally open the menu mid-throw. Draw it dimmed during charging/flying to signal that.

## Implementation Steps

### Step 1 — Settings storage

Near `USERNAME_KEY` (index.html:181), add:

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

The `_cache` matters: `updateLayout()` runs every resize and every frame's worth of state changes, so we don't want to hit localStorage on each call.

### Step 2 — Meter position in `updateLayout()`

Replace the meter positioning block (index.html:315–319) with:

```js
meterWidth  = Math.max(220, canvas.width * METER_WIDTH_FRACTION);
meterX      = (canvas.width - meterWidth) / 2;
meterHeight = Math.max(36, canvas.height * METER_HEIGHT_FRACTION);

const labelGap = 18; // matches drawMeter label offset
const pos = settings.get('meterPosition');
if (pos === 'middle') {
  meterY = (canvas.height - meterHeight) / 2;
} else if (pos === 'bottom') {
  meterY = canvas.height - meterHeight - labelGap - 12;
} else {
  meterY = safeTop;
}
```

### Step 3 — Flip the meter label when at the bottom

In `drawMeter()` (around index.html:1389), replace:

```js
drawText('POWER', meterX + meterWidth / 2, meterY + meterHeight + 14, 14, '#ffffff', 'center', false);
```

with:

```js
const labelAbove = settings.get('meterPosition') === 'bottom';
const labelY = labelAbove ? meterY - 6 : meterY + meterHeight + 14;
drawText('POWER', meterX + meterWidth / 2, labelY, 14, '#ffffff', 'center', false);
```

### Step 4 — Draw the settings gear on the game HUD

After the HUD draws (index.html:1334, end of the right-side username block), draw the gear and stash its hit rect. Place it on the **left edge, opposite the username**, so it never collides with the meter (which is centered) regardless of meter position.

```js
// Settings gear — top-left, drawn on every PLAYING frame
const gearSize = Math.max(28, Math.floor(canvas.width * 0.06));
const gearX = HUD_PAD;
const gearY = safeTop;
const gearActive = throw_.state === STATE.IDLE;
ctx.globalAlpha = gearActive ? 1 : 0.35;
drawGearIcon(gearX, gearY, gearSize); // see helper below
ctx.globalAlpha = 1;
settingsGearRect = { x: gearX, y: gearY, w: gearSize, h: gearSize, active: gearActive };
```

Declare `let settingsGearRect = null;` near the other rect-tracking globals (search index.html for `usernameNameRect` to find a good neighbor).

Note: Score is currently drawn left-aligned at `HUD_PAD` (index.html:1330) and life icons sit below it (index.html:1331). The gear at top-left would overlap the score. Two options — pick one when implementing:

- **(a)** Move the gear to the **right edge** and shift the username down to `hudY + subFontSize + 8` (where lives currently sit on the left). Cleaner symmetry but pushes the username out of its current spot.
- **(b)** Keep the gear at the **left edge above the score**, shifting `hudY` down by `gearSize + HUD_PAD`. Preserves left/right HUD layout but eats vertical space — only an issue in landscape on short screens.

Recommend **(a)** for visual balance. Confirm with a quick test in both orientations.

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

In the PLAYING input branch (the block starting around index.html:821 where `throw_.state !== STATE.IDLE` early-returns), add **before** the early return:

```js
if (run.state === RUN_STATE.PLAYING && settingsGearRect && settingsGearRect.active && pointerInRect(settingsGearRect)) {
  openSettingsOverlay();
  return;
}
```

Use the same `pointerInRect` helper that other hit-tests use (search the file for one — there's an inline form in the leaderboard back-button handler).

### Step 6 — DOM overlay menu

Add `let settingsOverlayEl = null;` near the other overlay element refs. Add:

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

- Game screen shows gear in the chosen HUD corner; doesn't overlap score, lives, username, or feedback text.
- Tap gear during IDLE → menu opens. Tap during CHARGING/FLYING → no-op (gear visibly dimmed).
- Cycle meter position through Top / Middle / Bottom; meter snaps to new location immediately on close.
- "POWER" label sits below the bar for Top/Middle and above the bar for Bottom (no clipping).
- Reload page; meter position persists.
- Rotate device portrait ↔ landscape with each setting; meter stays in the configured band, no overflow.
- Backdrop tap closes menu; "Done" button closes menu.
- Bottom setting in landscape on short phones (canvas.height ≤ 500): verify meter doesn't collide with `groundY` HUD elements.

### Step 8 — Release-checklist note

Bump version, add CHANGELOG entry under the next release: "In-game settings menu — choose meter position (top/middle/bottom)."

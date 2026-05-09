# Plan: How to Play Dialog

## Goal

Show new players the rules before their first throw. Use a dismissible HTML overlay that surfaces on the gameplay screen with two clear actions: **Okay** (close for now) and **Don't show again** (close and persist).

## When it appears

Open the overlay on entry to `RUN_STATE.PLAYING` if `settings.get('hideHowToPlay') !== true`. That means:
- First-ever throw → shown.
- Every subsequent run → still shown until the user clicks "Don't show again".
- After "Don't show again" → never auto-opens.

Rationale: "Okay" is a low-friction dismiss for users who like the reminder; "Don't show again" is for users who internalize the rules. A single boolean in settings is enough — no per-version reset, no dismiss count.

The user can re-open it any time from the Settings overlay (new "Show how-to-play" toggle / button — see step 4).

## Pause behavior

The overlay must block gameplay input. Reuse the existing `position:fixed; z-index:1000` pattern used by Settings and What's New — those already capture pointer events because they cover the canvas. No new pause flag needed; the meter keeps animating but the player can't tap to throw because pointer events land on the overlay backdrop. (If this turns out to feel wrong, gate `handlePointerDown` early on `if (howToPlayOverlayEl) return;`)

## Content (locked)

Title: **How to Play**

Sections (short, mobile-readable):

1. **Tap to start the meter.** A bouncing bar runs across the power gauge.
2. **Tap again to throw.** Stop the bar in the green sweet spot for max power.
3. **Score zones**
   - Stick the shovel: **+3**
   - Back wall: **+1**
   - In the pit: **0**
   - Front wall: **+1**
   - Miss: **−2**
4. **You get 3 misses per run.** Use them wisely — 3 misses ends the run.
5. **The meter speeds up** every time you stick a throw.

Keep total height under ~520px so it fits on iPhone Mini portrait without scroll.

## Buttons

Two buttons, side by side at the bottom of the card:
- **Don't show again** (secondary style — same `#2a2a4a` muted treatment as the existing confirm dialog secondary button at index.html:1262). Sets `settings.set('hideHowToPlay', true)` then closes.
- **Okay** (primary yellow). Just closes.

Backdrop click also closes (treat as "Okay" — does not persist).

## Implementation Steps

### 1. Settings key + default (5 min)

`DEFAULT_SETTINGS` (around index.html:340–344): add `hideHowToPlay: false`.

No migration needed — `settings._load()` already merges defaults.

### 2. Overlay + open/close functions (30 min)

Mirror `openSettingsOverlay` / `openWhatsNewOverlay` (index.html:1160–1245). Add near them:

```js
let howToPlayOverlayEl = null;

function openHowToPlayOverlay() {
  if (howToPlayOverlayEl) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;';

  const card = document.createElement('div');
  card.style.cssText = 'background:#1a1a2e;color:#fff;border:2px solid #5555aa;border-radius:10px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;padding:20px;';

  // title, sections (h3 + ul, same pattern as What's New), button row
  // ...

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;margin-top:18px;';

  const dontShow = document.createElement('button');
  dontShow.textContent = "Don't show again";
  dontShow.style.cssText = 'flex:1;padding:10px;background:#2a2a4a;color:#fff;border:none;border-radius:6px;font-weight:bold;font-size:14px;cursor:pointer;';
  dontShow.addEventListener('click', () => {
    settings.set('hideHowToPlay', true);
    closeHowToPlayOverlay();
  });

  const okay = document.createElement('button');
  okay.textContent = 'Okay';
  okay.style.cssText = 'flex:1;padding:10px;background:#ffe600;color:#1a1a2e;border:none;border-radius:6px;font-weight:bold;font-size:15px;cursor:pointer;';
  okay.addEventListener('click', closeHowToPlayOverlay);

  btnRow.appendChild(dontShow);
  btnRow.appendChild(okay);
  card.appendChild(btnRow);

  overlay.addEventListener('click', e => { if (e.target === overlay) closeHowToPlayOverlay(); });
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  howToPlayOverlayEl = overlay;
}

function closeHowToPlayOverlay() {
  if (!howToPlayOverlayEl) return;
  howToPlayOverlayEl.remove();
  howToPlayOverlayEl = null;
}
```

Use `THEME.*` references rather than the hardcoded `#1a1a2e` / `#5555aa` / `#ffe600` palette **only if** the existing settings/whats-new overlays have been migrated. They haven't (those literals remain in the codebase per the most recent grep); match the existing overlay style for consistency. A separate cleanup pass can theme all three together.

### 3. Trigger on PLAYING entry (10 min)

In `resetRun()` (index.html:1449), after `run.state = RUN_STATE.PLAYING;`:

```js
if (!settings.get('hideHowToPlay')) {
  openHowToPlayOverlay();
}
```

Skip in versus mode — versus players are presumed to know the rules. Gate by checking `run.versusContext` or the upcoming `RUN_STATE.VERSUS_PLAYING`. Since `resetRun` is solo-only (versus has its own start path), check is unnecessary; verify during implementation.

### 4. Re-open from Settings (15 min)

In `openSettingsOverlay` (index.html:1214), append a row below the meter-position row:

```js
const helpRow = document.createElement('div');
helpRow.style.cssText = 'margin-top:14px;';
const helpBtn = document.createElement('button');
helpBtn.textContent = 'Show how to play';
helpBtn.style.cssText = 'width:100%;padding:10px;background:#2a2a4a;color:#fff;border:none;border-radius:6px;font-weight:bold;font-size:14px;cursor:pointer;';
helpBtn.addEventListener('click', () => {
  closeSettingsOverlay();
  openHowToPlayOverlay();
});
helpRow.appendChild(helpBtn);
card.appendChild(helpRow);
```

This gives users who clicked "Don't show again" a way to bring the rules back.

### 5. Manual verification (10 min)

- First boot in incognito → overlay opens on first tap of Play. Click Okay. Refresh, open Play again → overlay reopens.
- Click "Don't show again" → overlay closes. Refresh, open Play again → overlay does NOT open.
- Open Settings → "Show how to play" → overlay opens.
- During overlay open: tap-through to canvas does nothing (meter keeps animating but no throw triggers).
- Backdrop click closes without persisting.
- Visually fits on iPhone Mini portrait without scroll.

### 6. Changelog (5 min)

`CHANGELOG.md` Unreleased → Added: "How-to-play dialog on the gameplay screen with a 'Don't show again' option, reachable later from Settings."

Release notes (next bundled release): "First-time how-to-play tutorial — explains the meter, scoring zones, and lives. Hide it permanently from Settings."

---

## Out of Scope

- Animated tutorial / interactive walkthrough (just static text).
- Per-character tips.
- Versioned re-prompts when scoring changes (rules table is small enough that one explanation is enough; bigger changes can use the existing "What's New" channel).
- Localization (everything else is English-only).

## Constraints

- DO NOT add a third-party dialog/modal lib — match the existing `cssText` overlay pattern.
- DO NOT pause the game loop with a new flag — overlay z-index already blocks input.
- DO NOT auto-show on every state transition — only on `PLAYING` entry.
- DO NOT replicate the rules in canvas; the canvas HUD already shows scoring feedback in-flow. The dialog is text-only.

## Open Questions

1. Should the dialog show in versus mode? Default plan: no (versus is friend-driven; rules are the same; they'll learn solo first). Worth asking the user before shipping.
2. Should "Don't show again" fire telemetry (Umami event) so we can see how many users dismiss permanently? Trivial to add — one `umami.track('howtoplay_hide')` call. Default: skip; add later if curious.

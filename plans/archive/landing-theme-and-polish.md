# Plan: Landing Theme Switcher + Polish Pass

## Scope

Three changes bundled, all landing-only (canvas screens untouched):

1. CSS-variable theme system with three palettes (A/B/C from the prior conversation), persisted in `localStorage`, switchable via an on-landing picker.
2. Title revision — remove the white front layer.
3. Button revision — smaller corner radius, fill-driven (drop the heavy stroke), softer hover state.
4. Animate-on-first-visit-only — entrance animations stop replaying after the first time the landing is shown in a session.

**Out of scope:**
- Theming canvas screens (character select, leaderboard, HUD). That's a separate plan after a palette is chosen.
- Moving the theme picker into the Settings overlay — happens after a winner is picked.
- Color changes to anything outside `#landing`.

---

## Theme Definitions (locked)

```css
[data-theme="a"] { /* Backyard at golden hour */
  --bg-top:    #2b3530;
  --bg-bottom: #0d120f;
  --text:      #f4ebd0;
  --text-mute: rgba(244, 235, 208, 0.62);
  --accent:    #e89c4a;
  --accent-2:  #ffd180; /* lighter accent for hover */
  --secondary: #7c8862;
  --shadow:    rgba(0, 0, 0, 0.35);
}
[data-theme="b"] { /* Dive bar at night */
  --bg-top:    #22281f;
  --bg-bottom: #0a0d0a;
  --text:      #ede8d8;
  --text-mute: rgba(237, 232, 216, 0.6);
  --accent:    #d97a3c;
  --accent-2:  #f0a166;
  --secondary: #5e6b4a;
  --shadow:    rgba(0, 0, 0, 0.42);
}
[data-theme="c"] { /* Worn-in green */
  --bg-top:    #293330;
  --bg-bottom: #11161a;
  --text:      #eae3d2;
  --text-mute: rgba(234, 227, 210, 0.58);
  --accent:    #c9784a;
  --accent-2:  #e6976b;
  --secondary: #8b9474;
  --shadow:    rgba(0, 0, 0, 0.38);
}
```

Default theme on first load: **`a`** (warmest / brightest — easiest first impression). User pick overrides.

---

## File Changes

| File | Change |
|---|---|
| `index.html` (style block) | Add the three `[data-theme]` blocks. Refactor every landing style to use `var(--…)`. Replace title shadow stack. Soften button radius / strokes. Add `.landing--no-anim` killswitch. |
| `index.html` (HTML) | Add a small theme picker row above the title or below the footer (3 swatch buttons). Add `data-theme` attr on `#landing` (set by JS from localStorage). |
| `index.html` (JS) | Load/persist `shoveltoss.landingTheme` from localStorage. Wire picker clicks. Set `landingAnimatedOnce` flag and apply `.landing--no-anim` on subsequent shows. |

No new assets. No CSP change.

---

## Implementation Steps

### 1. Add CSS variables and three themes (15 min)
- Insert the three `[data-theme="..."]` blocks above existing landing styles.
- Add a `#landing` rule that sets default fallbacks for the same vars (using theme A values) so the page renders even if the `data-theme` attr is unset on the very first frame.

### 2. Refactor existing landing styles to use vars (30 min)
Replace hard-coded colors throughout the existing `#landing`, `.landing-*` rules:

| Find | Replace |
|---|---|
| `#1a1a2e`, `#0d0d1a`, `#2a2a4a` (in landing gradient) | `var(--bg-top)`, `var(--bg-bottom)` |
| `#ffffff` (text) | `var(--text)` |
| `#ffe600` (accent) | `var(--accent)` |
| `#5555aa` (secondary shadow / borders) | `var(--secondary)` |
| `rgba(255, 230, 0, 0.06)` (spotlight) | `color-mix(in oklab, var(--accent) 12%, transparent)` |
| `rgba(255, 255, 255, 0.45)` (footer) | `var(--text-mute)` |

Don't touch any color outside the `#landing` subtree.

### 3. Title revision (10 min)
Replace the existing `.landing-title` rule:
```css
.landing-title {
  font-family: 'Bungee', Impact, sans-serif;
  font-size: clamp(48px, 12vw, 120px);
  letter-spacing: 0.04em;
  line-height: 0.92;
  color: var(--accent);
  text-align: center;
  text-shadow:
    3px 3px 0 var(--secondary),
    6px 6px 0 var(--shadow);
  animation: landingTitleIn 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.landing-title span {
  display: block;
  color: var(--text);
  text-shadow:
    3px 3px 0 var(--secondary),
    6px 6px 0 var(--shadow);
}
```
Effect: "SHOVEL" in accent (warm orange family), "TOSS" in cream `var(--text)`, dual offset shadow in secondary + dark — no white plane, no neon yellow.

### 4. Button revision (15 min)
Replace the `.landing-btn` rules:
```css
.landing-btn {
  height: 54px;
  padding: 0 22px;
  border: 0;
  border-radius: 8px;
  background: color-mix(in oklab, var(--text) 8%, transparent);
  box-shadow: inset 0 -2px 0 var(--shadow);
  color: var(--text);
  cursor: pointer;
  font-family: 'Archivo', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: background 160ms ease, transform 160ms ease, color 160ms ease, box-shadow 160ms ease;
  animation: landingBtnIn 240ms var(--delay, 240ms) cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}
.landing-btn:hover {
  background: color-mix(in oklab, var(--text) 14%, transparent);
  transform: translateY(-1px);
  box-shadow: inset 0 -2px 0 var(--shadow), 0 6px 16px var(--shadow);
}
.landing-btn:active {
  transform: translateY(0);
  box-shadow: inset 0 2px 0 var(--shadow);
}
.landing-btn--primary {
  background: var(--accent);
  color: var(--bg-bottom);
  box-shadow: inset 0 -2px 0 color-mix(in oklab, var(--accent) 60%, black);
}
.landing-btn--primary:hover {
  background: var(--accent-2);
  box-shadow: inset 0 -2px 0 color-mix(in oklab, var(--accent) 60%, black), 0 6px 18px color-mix(in oklab, var(--accent) 40%, transparent);
}
.landing-btn--ghost {
  background: transparent;
  border: 1px solid color-mix(in oklab, var(--text) 18%, transparent);
  color: var(--text-mute);
  box-shadow: none;
}
.landing-btn--ghost:hover {
  background: color-mix(in oklab, var(--text) 6%, transparent);
  color: var(--text);
}
```
Effect: 8px corners (not pills), no heavy stroke, fill-driven with a subtle inset bottom-shadow giving tactile depth. Hover lifts 1px instead of scaling. Ghost variant for "What's New?" stays distinct via thin border + muted text.

### 5. Animate-on-first-visit-only (10 min)
Add a CSS killswitch:
```css
.landing--no-anim,
.landing--no-anim * {
  animation: none !important;
  transition: opacity 200ms ease;
}
```
JS: introduce `let landingAnimatedOnce = false;` near the existing `landingHideTimer`. In `showLanding()`, after the requestAnimationFrame block:
```js
if (landingAnimatedOnce) {
  landingEl.classList.add('landing--no-anim');
} else {
  landingEl.classList.remove('landing--no-anim');
  landingAnimatedOnce = true;
}
```
The opacity fade-in/out (which is on `#landing` itself, not on a child element) still runs for show/hide — that's the only motion that should persist.

### 6. Theme picker UI (15 min)
Add to the landing HTML, just inside `<main class="landing-content">` and **above** `<h1>`:
```html
<div class="landing-themes" role="group" aria-label="Color theme">
  <button class="landing-theme" data-set-theme="a" aria-label="Backyard"></button>
  <button class="landing-theme" data-set-theme="b" aria-label="Dive bar"></button>
  <button class="landing-theme" data-set-theme="c" aria-label="Worn-in"></button>
</div>
```
CSS:
```css
.landing-themes {
  display: flex;
  gap: 10px;
  margin-bottom: 4px;
  animation: landingFadeIn 240ms 60ms ease-out both;
}
.landing-theme {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, var(--text) 22%, transparent);
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease;
}
.landing-theme[data-set-theme="a"] { background: linear-gradient(135deg, #2b3530 0% 50%, #e89c4a 50% 100%); }
.landing-theme[data-set-theme="b"] { background: linear-gradient(135deg, #22281f 0% 50%, #d97a3c 50% 100%); }
.landing-theme[data-set-theme="c"] { background: linear-gradient(135deg, #293330 0% 50%, #c9784a 50% 100%); }
.landing-theme:hover { transform: scale(1.08); border-color: var(--text); }
.landing-theme[aria-pressed="true"] { border: 2px solid var(--text); }
```
The two-tone gradient previews each theme's bg + accent on the swatch.

### 7. JS wiring for theme persistence (15 min)
Near the existing landing JS:
```js
const LANDING_THEME_KEY = 'shoveltoss.landingTheme';
const VALID_THEMES = ['a', 'b', 'c'];

function getLandingTheme() {
  const t = localStorage.getItem(LANDING_THEME_KEY);
  return VALID_THEMES.includes(t) ? t : 'a';
}

function setLandingTheme(theme) {
  if (!VALID_THEMES.includes(theme)) return;
  try { localStorage.setItem(LANDING_THEME_KEY, theme); } catch {}
  if (landingEl) landingEl.dataset.theme = theme;
  if (landingEl) {
    landingEl.querySelectorAll('[data-set-theme]').forEach(btn => {
      btn.setAttribute('aria-pressed', btn.dataset.setTheme === theme ? 'true' : 'false');
    });
  }
}
```
On boot (alongside the other landing init at `:660`):
```js
setLandingTheme(getLandingTheme());
landingEl?.querySelectorAll('[data-set-theme]').forEach(btn => {
  btn.addEventListener('click', () => setLandingTheme(btn.dataset.setTheme));
});
```

### 8. Manual verification (15 min)
- Hard reload → landing renders in theme A by default with no white in the title.
- Click each swatch → palette swaps instantly across bg, title, buttons, footer; selection persists across reload.
- Tap Play, return Home → entrance animations do NOT replay; opacity fade still happens.
- Toggle `prefers-reduced-motion` → existing reduced-motion guard still applies.
- All three themes must look intentional, not generic. If one feels off, adjust its var values directly — the structural rules don't change.

---

## Constraints

- Do NOT touch any color outside the `#landing` subtree.
- Do NOT introduce a new dependency, framework, or build step.
- Do NOT replace the existing fonts (Bungee + Archivo carry across all three themes).
- Do NOT drop the title's offset shadow — only restructure the layers (no white plane).
- Default theme is `'a'`. Don't second-guess it during implementation.
- Theme persistence uses a NEW localStorage key (`shoveltoss.landingTheme`); do NOT reuse `shoveltoss.settings`.

## Follow-up (out of scope, capture in issue)

After you pick a winner:
1. Move the picker into the Settings overlay (or remove it entirely if you commit fully).
2. Apply the chosen palette to canvas-rendered screens (character select, leaderboard, HUD, game-over). Replace the hard-coded `#1a1a2e` and `#ffe600` literals with constants sourced from the same palette.

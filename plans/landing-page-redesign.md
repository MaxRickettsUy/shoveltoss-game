# Plan: HTML Landing Page Redesign + Cold-Load Slimming

## Scope

Replace the canvas-rendered home screen with a fast-painting HTML overlay that owns the landing experience. Bundle in the next obvious cold-load win (level backgrounds) since it ships in the same diff.

**In scope:**
1. New HTML+CSS landing overlay shown when `run.state === RUN_STATE.HOME` or `RUN_STATE.USERNAME`.
2. Self-hosted display webfont + Google Fonts body fallback chain.
3. Animated reveal on first paint, hover/press states on buttons, atmospheric background.
4. Lazy-load the three level background PNGs (~9MB) on transition into `RUN_STATE.LEVEL_SELECT`.
5. Wire all existing actions (Play / Leaderboard / Hall of Fame / Player Stats / What's New / username edit) to the new HTML controls.
6. Preserve the canvas-rendered home as a fallback only if the overlay fails to mount (single one-line guard, not a parallel implementation).

**Out of scope:**
- Game-screen visual changes (character select, leaderboard, gameplay HUD). Phaser migration owns those.
- Audio / SFX.
- Hero-image lazy-load — already done at `index.html:155`.
- New gameplay features.

---

## Aesthetic Direction (locked — do NOT redecide during implementation)

**Concept: "Arcade Trophy Room"** — chunky championship-banner typography, deep navy field, sharp yellow accents, subtle CRT/marquee atmosphere. Plays into the existing shovel + leaderboard + Hall of Fame identity without going retro-cute or generic SaaS.

| Decision | Value | Why |
|---|---|---|
| Display font | **Bungee** (Google Fonts, self-hosted WOFF2) | Chunky cast-shadow letterforms; reads as marquee/scoreboard; not in any AI-default list |
| Body font | **Archivo** weights 400/700 (Google Fonts, self-hosted WOFF2) | Geometric grotesque, neutral but characterful; pairs with Bungee without competing |
| Background | `#1a1a2e` (existing) | Keep continuity with canvas screens so the transition into Play feels seamless |
| Primary accent | `#ffe600` (existing) | Reuse the score/badge yellow as the brand color |
| Secondary accent | `#5555aa` (existing) | Subtle, used for borders and dividers |
| Atmosphere | SVG noise overlay (8% opacity) + radial-gradient vignette + 3 animated diagonal "spotlight" stripes drifting across the background at 40s/60s/80s | Adds depth without images; pure CSS/SVG keeps weight near zero |
| Title treatment | "SHOVEL TOSS" rendered with Bungee at clamp(48px, 12vw, 120px), letter-spacing 0.04em, hard yellow drop-shadow 4px 4px 0 #ffe600, animated entrance (slide + slight overshoot) | Distinctive championship-banner feel |
| Buttons | Pill-shaped, full-width (max 320px), 56px tall. Primary "Play Game" uses yellow fill + navy text + scale-on-hover. Others are navy-fill + 2px yellow border + invert on hover. All have a 1px inner highlight via `inset` shadow for depth. | Clear hierarchy, tactile on mobile |
| Player line | "PLAYER: NAME ✎" — Bungee at smaller size with the FA pencil icon, hover state underlines and reveals "tap to edit" tooltip on desktop | Reuses already-loaded FA |
| Footer | Version tag + flag in Archivo small-caps, subtle bottom-anchored | Preserved from existing |
| Motion | Page-load: title slides in from top (240ms, ease-out with overshoot); player line fades in at 120ms delay; buttons stagger in at 240ms + 80ms each. Background spotlights animate continuously. Button hover: 180ms transform scale 1.03 + shadow lift. Button press: scale 0.97. | Single orchestrated reveal beats scattered micro-interactions |
| Transition out | When user picks an action: overlay fades out 200ms while canvas content draws underneath. Then overlay sets `display:none`. | Hides any first-frame canvas pop |

**Constraint on the aesthetic:** the design must survive a future Phaser migration — keep the shell-style and game-canvas concerns separate. The HTML overlay does NOT bleed CSS into game-screen rendering.

---

## File Changes

| File | Change |
|---|---|
| `index.html` | Add `<div id="landing">…</div>` after `<canvas>`. Add `<style>` block (or extract to `assets/landing.css`). Add overlay show/hide logic. Wire button click handlers. Remove/skip the `drawHome()` call when overlay is mounted (leave the function for fallback). |
| `assets/fonts/bungee-regular.woff2` | New — self-hosted from Google Fonts (download once, ~30KB). |
| `assets/fonts/archivo-regular.woff2`, `archivo-bold.woff2` | New — self-hosted, ~25KB each. |
| `assets/landing-noise.svg` | New — small SVG with `<feTurbulence>` filter for the noise overlay (~1KB). |
| `index.html` (level lazy-load) | Wrap `LEVELS.forEach` block at `:104` in a `loadLevelImages()` function gated by a `levelsRequested` flag. Call from `RUN_STATE.LEVEL_SELECT` transition. |
| `.github/workflows/pages.yaml` | Add `cp -r assets _site/` already includes new font files — no change needed (verify after build). |

CSP: no change required. `font-src 'self'` already covers self-hosted woff2. `style-src 'self' 'unsafe-inline'` covers the inline animations.

---

## Implementation Steps

### Step 1 — Asset prep (15 min)
1. Download Bungee Regular WOFF2 from `https://fonts.google.com/specimen/Bungee` → save to `assets/fonts/bungee-regular.woff2`.
2. Download Archivo Regular (400) and Bold (700) WOFF2 → `assets/fonts/archivo-regular.woff2`, `assets/fonts/archivo-bold.woff2`.
3. Create `assets/landing-noise.svg`:
   ```xml
   <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
     <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/></filter>
     <rect width="100%" height="100%" filter="url(#n)" opacity="0.5"/>
   </svg>
   ```
4. Verify total new asset weight stays under 100KB.

### Step 2 — HTML overlay structure (45 min)
Insert after `<canvas id="gameCanvas">` in `index.html`:
```html
<div id="landing" data-state="hidden" aria-hidden="true">
  <div class="landing-bg" aria-hidden="true">
    <div class="landing-spot landing-spot--a"></div>
    <div class="landing-spot landing-spot--b"></div>
    <div class="landing-spot landing-spot--c"></div>
  </div>
  <main class="landing-content">
    <h1 class="landing-title">SHOVEL <span>TOSS</span></h1>
    <button class="landing-player" id="landing-player" type="button">
      <span class="label">PLAYER:</span>
      <span class="name" id="landing-player-name"></span>
      <i class="fa-solid fa-pen-to-square"></i>
    </button>
    <nav class="landing-actions">
      <button data-action="play" class="landing-btn landing-btn--primary">Play Game</button>
      <button data-action="leaderboard" class="landing-btn">Leaderboard</button>
      <button data-action="hall" class="landing-btn">Hall of Fame</button>
      <button data-action="stats" class="landing-btn">Player Stats</button>
      <button data-action="whatsNew" class="landing-btn landing-btn--ghost">What's New?</button>
    </nav>
    <footer class="landing-footer">
      <span id="landing-version"></span>
      <span class="landing-flag">🇺🇸</span>
    </footer>
  </main>
</div>
```

### Step 3 — CSS (90 min)
Add a single `<style>` block in `<head>` (keep inline for cache + CSP simplicity). Hand-write — no Tailwind / framework. Sketch:

```css
@font-face { font-family: 'Bungee'; src: url('assets/fonts/bungee-regular.woff2') format('woff2'); font-display: swap; }
@font-face { font-family: 'Archivo'; src: url('assets/fonts/archivo-regular.woff2') format('woff2'); font-weight: 400; font-display: swap; }
@font-face { font-family: 'Archivo'; src: url('assets/fonts/archivo-bold.woff2') format('woff2'); font-weight: 700; font-display: swap; }

#landing {
  position: fixed; inset: 0; z-index: 5;
  background: radial-gradient(120% 80% at 50% 0%, #2a2a4a 0%, #1a1a2e 60%, #0d0d1a 100%);
  font-family: 'Archivo', system-ui, sans-serif;
  color: #fff;
  display: grid; place-items: center;
  overflow: hidden;
  transition: opacity 200ms ease;
}
#landing[data-state="hidden"] { opacity: 0; pointer-events: none; }
#landing[data-state="visible"] { opacity: 1; }

.landing-bg::before {
  content: ''; position: absolute; inset: 0;
  background: url('assets/landing-noise.svg'); opacity: 0.08;
  mix-blend-mode: overlay; pointer-events: none;
}
.landing-spot {
  position: absolute; width: 60vmax; height: 30vmax;
  background: linear-gradient(75deg, transparent, rgba(255, 230, 0, 0.06), transparent);
  filter: blur(40px);
  animation: drift 60s linear infinite;
}
.landing-spot--a { top: -10%; left: -30%; animation-duration: 40s; }
.landing-spot--b { top: 30%; left: -50%; animation-duration: 80s; animation-delay: -20s; }
.landing-spot--c { bottom: -10%; left: -20%; animation-duration: 60s; animation-delay: -40s; }
@keyframes drift {
  0%   { transform: translateX(0)        rotate(-12deg); }
  100% { transform: translateX(180vw)    rotate(-12deg); }
}

.landing-content {
  position: relative; z-index: 1;
  display: grid; gap: clamp(18px, 3vh, 32px); justify-items: center;
  width: min(360px, calc(100vw - 32px));
  padding: 4vh 0;
}

.landing-title {
  font-family: 'Bungee', sans-serif;
  font-size: clamp(48px, 12vw, 120px);
  letter-spacing: 0.04em; line-height: 0.92;
  color: #fff;
  text-shadow: 4px 4px 0 #ffe600, 8px 8px 0 #5555aa;
  text-align: center;
  animation: titleIn 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.landing-title span { display: block; color: #ffe600; text-shadow: 4px 4px 0 #5555aa; }
@keyframes titleIn {
  from { opacity: 0; transform: translateY(-16px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)     scale(1); }
}

.landing-player {
  font-family: 'Archivo', sans-serif; font-size: 14px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  background: transparent; border: 0; color: rgba(255, 255, 255, 0.85);
  cursor: pointer; padding: 8px 12px;
  display: inline-flex; align-items: center; gap: 8px;
  animation: fadeIn 240ms 120ms ease-out both;
}
.landing-player .name { color: #ffe600; }
.landing-player:hover { color: #fff; text-decoration: underline; text-underline-offset: 4px; }

.landing-actions { display: grid; gap: 10px; width: 100%; }
.landing-btn {
  font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 16px;
  letter-spacing: 0.06em; text-transform: uppercase;
  height: 56px; border-radius: 999px;
  background: #1a1a2e; color: #fff;
  border: 2px solid #ffe600;
  cursor: pointer;
  transition: transform 180ms ease, background 180ms ease, color 180ms ease, box-shadow 180ms ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  animation: btnIn 240ms calc(240ms + var(--i, 0) * 80ms) cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}
.landing-btn:hover { transform: scale(1.03); background: #ffe600; color: #1a1a2e; box-shadow: 0 8px 24px rgba(255, 230, 0, 0.18); }
.landing-btn:active { transform: scale(0.97); }
.landing-btn--primary { background: #ffe600; color: #1a1a2e; }
.landing-btn--primary:hover { background: #fff; color: #1a1a2e; }
.landing-btn--ghost { border-color: rgba(255, 255, 255, 0.18); color: rgba(255, 255, 255, 0.7); }
@keyframes btnIn {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.landing-footer {
  position: absolute; bottom: 12px; left: 0; right: 0;
  display: flex; justify-content: center; gap: 10px; align-items: center;
  font-family: 'Archivo'; font-size: 12px; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

@media (prefers-reduced-motion: reduce) {
  .landing-spot, .landing-title, .landing-player, .landing-btn { animation: none; }
}
```
Set `--i` per button via inline style or `style="--i: ${index}"` so the stagger works.

### Step 4 — JS wiring (60 min)
After overlay is in the DOM, wire up:
1. `showLanding()` / `hideLanding()` helpers that toggle `data-state` and `aria-hidden`. Show on transitions to `RUN_STATE.HOME` and `RUN_STATE.USERNAME`. Hide on every other transition.
2. Replace the `drawHome()` call at `index.html:1597`–`:1600` with `showLanding()`. Leave `drawHome()` intact as a fallback (called only if `document.getElementById('landing')` is null).
3. Bind click handlers on `[data-action]` buttons to existing actions:
   - `play` → `run.state = RUN_STATE.SELECTING; loadHeroImages();` (mirrors `:1242–1245`)
   - `leaderboard` → `openLeaderboard(RUN_STATE.HOME)` (`:1249`)
   - `hall` → `openHallOfFame()` (existing handler)
   - `stats` → `openPlayerStats()`
   - `whatsNew` → `openWhatsNewOverlay()`
4. Bind `#landing-player` click → `openUsernameOverlay(RUN_STATE.HOME)`.
5. On username change or first paint: write `username.get()` to `#landing-player-name.textContent`. Hook into the existing `username.set` flow.
6. On boot: write `APP_VERSION_TAG` to `#landing-version.textContent`.
7. Remove the canvas-side `homeButtonRects` pointer dispatch in the click handler when the overlay owns input (guard with `if (document.getElementById('landing')?.dataset.state === 'visible') return;` near `:1240`).

### Step 5 — Lazy-load level backgrounds (15 min)
In `index.html`:
1. Wrap the `LEVELS.forEach` at `:104` in a `loadLevelImages()` function with `levelsRequested` flag (mirror the hero pattern at `:155`).
2. Call `loadLevelImages()` on transition into `RUN_STATE.LEVEL_SELECT` (find the existing transition site near `:1208`).
3. Verify: throttle to Slow 3G, hard reload, observe that `assets/level/*.png` requests do NOT fire on landing or character select — only after level select opens.

### Step 6 — Manual verification (30 min)

- Cold-boot on Slow 3G: landing renders within 500ms (HTML + CSS only at this point); webfonts swap in cleanly thanks to `font-display: swap`.
- DevTools Network tab on hard reload: confirm `assets/level/*.png` and `assets/character/*/hero.png` are NOT requested on landing.
- Tap each button: verify navigation matches existing behavior. Tap player line: verify username overlay opens.
- Username change reflects immediately in the landing.
- Resize window: title and buttons reflow correctly at 320px, 768px, 1440px widths.
- iOS Safari + Android Chrome smoke test (per pre-v1 plan).
- `prefers-reduced-motion`: confirm no spotlights / animations.
- Footer shows correct `APP_VERSION_TAG`.
- After picking Play and returning Home: overlay re-shows correctly.

### Step 7 — CHANGELOG + release notes (5 min)
Add a "Landing redesign + faster cold load" entry. New release will bump to `v0.25.0` (this is a user-visible feature, minor bump).

---

## Constraints

- **Do NOT** introduce a CSS framework, build step, or new package dependency.
- **Do NOT** restructure `index.html`'s top-level layout (canvas remains the gameplay surface).
- **Do NOT** delete `drawHome()` — it stays as a fallback for the unlikely case the overlay fails to mount.
- **Do NOT** load fonts or assets from external CDNs — self-host everything for both speed and CSP simplicity.
- **Do NOT** touch character-select, leaderboard, or any other screen's visuals. Phaser migration owns those.
- **Do** match the existing color palette (`#1a1a2e`, `#ffe600`, `#5555aa`) so the overlay → canvas transition feels seamless.

## Deferred / Maybe-Next

These were considered and explicitly cut from this plan to keep scope tight. Pull them into a follow-up plan if you want them:

- Cinematic title sequence (parallax shovel sprite drifting behind the title).
- Live leaderboard ticker on the landing showing the current global #1.
- Sound on hover / button-press.
- Pit-background lazy-load (smaller win than levels; ~3MB).
- Micro-interactions on the player-line edit icon.

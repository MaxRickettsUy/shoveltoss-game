# Plan: Replace Emoji UI Icons with FontAwesome

## Scope

Replace exactly two emoji icons rendered on the game canvas with FontAwesome glyphs:

1. Settings gear `⚙️` — `index.html:1884`
2. Edit pencil `✏️` — `index.html:2221` and `index.html:2522`

Out of scope: every other emoji/symbol in the UI (🪏 buttons, ×/i flip-card buttons, 💯/👑 confetti shapes, badges). Do not touch them.

## Library Choice

**Use `@fortawesome/fontawesome-free` via CDN webfont (no install).**

Reasoning (minimal viable):
- Project has no bundler (`package.json` only ships `serve`). SVG-core / React packages do not apply.
- Icons are drawn with `ctx.fillText`, so we need a glyph font, not inline SVG components.
- The Free webfont covers both target icons (`fa-gear` U+F013, `fa-pen-to-square` U+F044) in the **Solid** style, which is included in the free CDN.
- Single CSS link tag pulls the `@font-face` declarations + WOFF2 file. No JS dependency, no build step.

CDN URL (pin a specific version, do not use `latest`):
```
https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css
```
Font family for canvas: `"Font Awesome 6 Free"` with `font-weight: 900` (Solid).

## Glyph Mapping

| Current | Replacement | Codepoint |
|---|---|---|
| `⚙️` (settings gear) | `fa-gear` | `` |
| `✏️` (edit pencil)   | `fa-pen-to-square` | `` |

## Implementation Steps

### 1. Add CDN link in `<head>`
In `index.html` after the existing `<link rel="apple-touch-icon">` (around line 22), add:
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
```

### 2. Preload the FA Solid font before rendering
The canvas will draw blank glyphs if the font isn't loaded yet. Inside the existing top `<script>` block (where image preloads live, near line 50–80), add a flag and trigger a load:
```js
let faReady = false;
document.fonts.load('900 32px "Font Awesome 6 Free"').then(() => { faReady = true; });
```
No render-blocking required — the emoji fallback (see step 5) handles the brief pre-load window.

### 3. Replace gear glyph (`index.html:1881`–`1884`)
Change:
```js
ctx.font = `${Math.round(gearSize * 0.82)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
...
ctx.fillText('⚙️', gearX + gearSize / 2, gearY + gearSize / 2);
```
To:
```js
ctx.font = `900 ${Math.round(gearSize * 0.82)}px "Font Awesome 6 Free", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
...
ctx.fillText(faReady ? '' : '⚙️', gearX + gearSize / 2, gearY + gearSize / 2);
```
Keep the existing `ctx.fillStyle` (white, set elsewhere in HUD draw). FA glyphs render in the current `fillStyle`, so the gear will be solid white — confirm that contrasts on the HUD; if not, set `ctx.fillStyle = '#ffffff'` on the line before `fillText`.

### 4. Replace pencil glyph (two sites)
At `index.html:2221` and `index.html:2522`, both currently:
```js
drawText('✏️', iconX, nameY, iconSize, '#ffffff', 'center', false);
```
`drawText` hardcodes `sans-serif` (line 1641), so it cannot render FA. Inline-replace each call with a direct draw:
```js
ctx.save();
ctx.font = `900 ${Math.round(iconSize)}px "Font Awesome 6 Free", sans-serif`;
ctx.fillStyle = '#ffffff';
ctx.textAlign = 'center';
ctx.fillText(faReady ? '' : '✏️', iconX, nameY);
ctx.restore();
```
Do not modify `drawText` itself — keep change surface small.

### 5. Fallback during font load
The `faReady ? '' : '⚙️'` ternary in steps 3–4 ensures the original emoji shows for the ~50–200ms before the webfont resolves. No additional handling needed.

### 6. Manual verification
- `npm run dev`, open browser.
- Confirm gear renders as a FA solid gear (top-right HUD during PLAYING).
- Confirm pencil renders next to "Player: <name>" on the home screen and on the username edit screen.
- Tap gear → settings overlay still opens (hit-rect untouched).
- Tap pencil → username edit flow still triggers.
- Throttle network to Slow 3G in DevTools, hard reload: confirm emoji fallback shows briefly then swaps to FA glyph.

## Constraints

- **Do not** add `package.json` dependencies. Project is CDN-only.
- **Do not** change `drawText`'s signature or default font.
- **Do not** replace any icon not listed in Scope.
- **Do not** introduce an icon abstraction/helper — three call sites do not justify it.
- Pin the FA version (`6.5.2`); do not use `latest`.

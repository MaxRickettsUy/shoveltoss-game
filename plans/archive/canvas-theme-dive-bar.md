# Plan: Apply "Dive Bar at Night" Palette to Canvas Screens

## Scope

Replace the hard-coded navy/yellow/white chrome colors used across canvas-rendered screens with the palette already locked on the landing (theme B). Keep gameplay-feedback colors (zone signals, error states) untouched — they carry semantic meaning and recoloring them risks readability.

**In scope (chrome):**
- Character select
- Level select
- Leaderboard (and the existing current-user-row highlight)
- Hall of Fame
- Player Stats
- HUD (during PLAYING) — score, lives, settings gear, meter
- Game Over overlay
- Settings overlay (HTML, but currently styled to match canvas chrome)
- What's New overlay (HTML)
- DEV banner

**Out of scope:**
- Throw-zone feedback colors (`stick` yellow, `back_wall` green, `front_wall` orange, `miss` red, `in_pit` white). These signal success/failure during gameplay and re-coloring them weakens the signal. Keep as-is.
- Pit / shovel / character / level background images. These are art assets — they aren't going to be re-tinted on canvas.
- Confetti / celebration shape colors. They're meant to be polychrome.
- The landing — already done.

---

## Palette Reference (locked, mirrors theme B)

```js
const THEME = {
  bgTop:      '#22281f',
  bgBottom:   '#0a0d0a',
  surface:    '#2c3328',  // for buttons / cards (one shade lighter than bgTop)
  surface2:   '#171b15',  // for zebra-stripe rows (one shade darker than bgTop)
  text:       '#ede8d8',
  textMute:   'rgba(237, 232, 216, 0.62)',
  textFaint:  'rgba(237, 232, 216, 0.42)',
  accent:     '#d97a3c',
  accent2:    '#f0a166',
  secondary:  '#5e6b4a',
  shadow:     'rgba(0, 0, 0, 0.42)',
  // Highlight tint for current-user rows on leaderboards
  selfHighlight: 'rgba(217, 122, 60, 0.18)',
};
```

These two are NEW (`surface`, `surface2`) — derived shades of bgTop for layered UI elements (button fills and zebra-stripes). The rest mirror the landing's CSS variables exactly.

Define this object near the top of `index.html`'s main script block (above `RUN_STATE`).

---

## Color Mapping Rules

For every `ctx.fillStyle = '…'`, `drawText(..., '…')`, `drawButton({fillStyle: '…'})`, etc., apply this mapping:

| Old literal | Replace with | Why |
|---|---|---|
| `#1a1a2e` | `THEME.bgTop` | primary background |
| `#0d0d1a`, `#080812` | `THEME.bgBottom` | gradient bottoms / deepest dark |
| `#2a2a4a`, `#2f2f4f`, `#20203a` | `THEME.surface` | button fills, raised UI elements |
| `#111126`, `#10101e`, `#141426` | `THEME.surface2` | zebra stripes, pressed-in surfaces |
| `#ffe600` | `THEME.accent` | every UI accent — score numbers, primary buttons, badges, milestone fills, scope-toggle active state, "Today" pill, "All Time" pill, leaderboard score column |
| `#ffffff` / `#fff` | `THEME.text` | all chrome text (titles, labels, names, buttons) |
| `rgba(255,255,255,0.42)` | `THEME.textFaint` | dim hints |
| `rgba(255,255,255,0.55)`–`0.78)` | `THEME.textMute` | secondary text (subtitles, footer, headers, dates) |
| `#5555aa` | `THEME.secondary` | borders, divider lines, secondary accents |
| `#3f6f58` (active-button green) | `THEME.secondary` | active toggle backgrounds |
| `rgba(255,220,0,0.25)`, `rgba(255,230,0,0.18)` | `THEME.selfHighlight` | current-user row highlight on leaderboards |
| `#cfcfe6`, `#c0c0c0` | `THEME.textMute` | misc light-gray chrome |
| `rgba(20,20,38,0.72)` | `color-mix`-equivalent of bgTop at 0.72 alpha — write as `'rgba(34, 40, 31, 0.72)'` | overlay backdrops |
| `rgba(186, 147, 92, 0.7)` | `'rgba(94, 107, 74, 0.7)'` (secondary at same alpha) | misc tints |

**Do NOT replace** these (gameplay semantics):

| Color | Where | Keep because |
|---|---|---|
| `#44dd44` | back-wall zone feedback, success text | green = good outcome |
| `#ff4444` | miss zone feedback, error text | red = bad outcome |
| `#ff8888` | leaderboard "offline" / username error | red = error |
| `#ff6b35`, `#e07b39` | front-wall feedback, intermediate-zone signal | orange = neutral signal |
| `#2c1810`, `#8b5a2b`, `#8b6914` | pit interior shadow, brown wood-like ground details | art assets |
| `#d71920` | DEV banner background | intentionally jarring red — DEV mode signal |

---

## Implementation Steps

### 1. Add `THEME` constant block (5 min)
Insert near the top of the main `<script>` block (above `const RUN_STATE = ...` around `index.html:496`). Don't reuse the CSS-var names (`var(--accent)` won't work in canvas context — they need to be JS strings).

### 2. Bulk-replace literals using the mapping table (60 min)
Work through `index.html` top-to-bottom, replacing every hard-coded chrome color according to the table. Recommended order:

1. **HUD draw fns** (`drawLifeIcons`, score/name HUD lines around `:1875`, settings gear around `:1884`)
2. **Meter** (`drawMeter` around `:1980-2030`)
3. **Game-over overlay**
4. **Character select** (`drawCharacterSelect` ~`:2569`)
5. **Level select** (`drawLevelSelect` ~`:2665`)
6. **Leaderboard** (`drawLeaderboard` ~`:2154`) — confirm the current-user highlight stays distinct against the new bg
7. **Hall of Fame** (`drawHallOfFame` ~`:2390`)
8. **Player Stats** (`drawPlayerStats` ~`:2485`)
9. **DEV banner** mount fn (`:697-702`) — leave the red, but update text color and any surrounding chrome
10. **HTML overlays** — Settings (`openSettingsOverlay` ~`:964`), Username (`openUsernameOverlay` ~`:837`), What's New (`openWhatsNewOverlay` ~`:910`). These use inline `element.style.cssText` strings — replace literals there too.

Use grep liberally: `grep -nE "#1a1a2e|#ffe600|#ffffff|#5555aa|#0d0d1a|#2a2a4a|#111126|#3f6f58" index.html` should drop to zero by the end (excluding the gameplay-semantic colors and pit/level art).

### 3. Audit-grep at the end (5 min)
After all replacements:
```
grep -nE "#1a1a2e|#0d0d1a|#2a2a4a|#2f2f4f|#20203a|#ffe600|#5555aa|#3f6f58|#111126|#10101e|#141426|#cfcfe6|#c0c0c0" index.html
```
Should produce **zero matches**. Any remaining literal is either a missed mapping or an intentional gameplay color — verify each.

Also check inline `style.cssText` for `'#1a1a2e'` and `'#5555aa'` (the HTML overlays use these via concatenated strings).

### 4. Body bg one-liner (1 min)
`index.html:37` currently: `body { background: #1a1a2e; ... }`. Change to `#22281f` so the area outside `<canvas>` matches.

### 5. Manual verification (45 min)
Visit every screen and confirm visual coherence:

- Landing → Play: warm landing transitions into warm character select. No jarring color jump.
- Character select: filter buttons (NEW / LADIES / CHAMPS) read clearly. Champion plaques remain visible. Card flip back side is legible.
- Level select: tile borders, level names, back button.
- Gameplay HUD: score number readable in accent orange against the level backgrounds (the level art stays as-is — confirm contrast). Settings gear visible. Lives icons visible.
- Throw feedback: still shows yellow STICK / green BACK WALL / red MISS — confirm these ZONE colors are preserved against the orange accent for the score (so they don't blur together).
- Game-over: rank message and buttons.
- Leaderboard: current-user highlight (now an orange tint) clearly distinct from the zebra rows. Daily/All Time toggle. Character filter dropdown.
- Hall of Fame: milestone labels + claimant rows readable. Champion accents preserved.
- Player Stats: rank + totals + averages columns.
- Settings overlay: opens cleanly, meter-position selector still works.
- Username overlay: form inputs readable.
- What's New overlay: title + bullet list readable.

Pay special attention to:
- Score numbers (largest visual UI element) — orange `#d97a3c` against various level backgrounds. May need a darker drop-shadow if it disappears against bright level art.
- The `lavalamp` orange/amber spotlights on the landing → ensure character select doesn't have any leftover `#ffe600` glow.

### 6. Update CSS theme constants block in landing (3 min)
Optional polish: extract the eight CSS custom properties on `#landing` (`--bg-top`, `--text`, etc.) into a new `:root { --bg-top: ...; }` block at the top of the `<style>` block, then reference them from `#landing`. This makes the canvas+landing palette literally one source of truth (if you ever want to adjust later, edit one block). Skip if you'd rather not touch the working landing.

### 7. Bump version + write release notes (5 min)
This is a meaningful visual change — bump `APP_VERSION_TAG` to `v0.26.0`. Add a CHANGELOG entry under `### Changed`: "Repainted in-game UI to match the new landing palette." Add a What's New entry: "Comfy new look across the whole game."

---

## Constraints

- Do NOT change layout, sizing, font, or animation. Colors only.
- Do NOT touch the gameplay-feedback colors (the keep-list above).
- Do NOT touch art assets (pit, shovel, characters, level backgrounds, confetti).
- Do NOT introduce CSS custom properties INSIDE the canvas drawing code — canvas needs literal strings or JS constants.
- Do NOT add a "theme" abstraction (multi-palette switcher). One palette, locked.
- Score number contrast on level backgrounds is the most likely visual problem — if you can't read it on St Paul or The Swamp, add a stroke or shadow rather than changing the accent color.

## Risks / Open Questions

1. **Score readability on bright level art.** The current `#ffe600` reads on every level background. The new `#d97a3c` is darker and warmer — may blend into The Swamp's foliage greens. Verification step 5 calls this out specifically. Mitigation: add a 2px darker stroke around the score number if needed.
2. **Champion-tier highlight.** Champions currently get a gold-tinted plaque + crown. If the crown reads as redundant with the new accent, consider tweaking plaque tint — but defer to a follow-up.
3. **Front-wall feedback** uses orange (`#ff6b35`/`#e07b39`) which is now in the same color family as the accent. Could feel like a missed visual signal. If it bothers you in testing, shift front-wall feedback toward yellow (`#f4c430`) — but again, defer to a follow-up.

## Tag

After implementation + verification: tag `v0.26.0`. This is a visible enough change to deserve its own minor bump rather than rolling into a patch.

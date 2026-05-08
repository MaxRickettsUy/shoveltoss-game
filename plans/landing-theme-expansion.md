# Plan: Expand Landing Theme Options (A–L)

## Scope

Add nine new theme palettes (D–L) to the existing landing theme switcher. Three families:

- **Amber variants** of B (D, E, F)
- **Non-amber accents** (G, H, I)
- **Further-out alternates** (J, K, L)

Existing palettes A, B, C stay unchanged. Single-file change to `index.html` (CSS + a few JS lines + extra swatches).

**Out of scope:**
- Removing or renaming any existing palette.
- Theming canvas screens — still happens after a winner is picked.
- Visible labels on swatches (rely on `aria-label` + position; we want fast visual comparison, not text clutter).
- Categorizing/grouping swatches in the UI.

---

## Theme Definitions (locked)

Append these `[data-theme="…"]` blocks below the existing `[data-theme="c"]` rule. Use the existing CSS variable contract (`--bg-top`, `--bg-bottom`, `--text`, `--text-mute`, `--accent`, `--accent-2`, `--secondary`, `--shadow`).

```css
[data-theme="d"] { /* Campfire */
  --bg-top:    #21221c;
  --bg-bottom: #0c0e09;
  --text:      #f3e7c8;
  --text-mute: rgba(243, 231, 200, 0.6);
  --accent:    #e87a3a;
  --accent-2:  #f5a06d;
  --secondary: #6e7544;
  --shadow:    rgba(0, 0, 0, 0.4);
}
[data-theme="e"] { /* Cabin */
  --bg-top:    #241b15;
  --bg-bottom: #0e0905;
  --text:      #ecdcb6;
  --text-mute: rgba(236, 220, 182, 0.58);
  --accent:    #c4814a;
  --accent-2:  #dca070;
  --secondary: #8a5a3a;
  --shadow:    rgba(0, 0, 0, 0.45);
}
[data-theme="f"] { /* Hayfield */
  --bg-top:    #22221d;
  --bg-bottom: #0c0c09;
  --text:      #e3dac4;
  --text-mute: rgba(227, 218, 196, 0.55);
  --accent:    #b88154;
  --accent-2:  #d6a079;
  --secondary: #6a6f55;
  --shadow:    rgba(0, 0, 0, 0.38);
}
[data-theme="g"] { /* Crimson camp */
  --bg-top:    #1d231d;
  --bg-bottom: #0a0d0a;
  --text:      #e8e1cf;
  --text-mute: rgba(232, 225, 207, 0.6);
  --accent:    #a83a3a;
  --accent-2:  #c75a55;
  --secondary: #5a6149;
  --shadow:    rgba(0, 0, 0, 0.42);
}
[data-theme="h"] { /* Lake at dusk */
  --bg-top:    #1f2628;
  --bg-bottom: #0a0e10;
  --text:      #e0dccc;
  --text-mute: rgba(224, 220, 204, 0.58);
  --accent:    #5e9b9c;
  --accent-2:  #82bcbd;
  --secondary: #3f5a52;
  --shadow:    rgba(0, 0, 0, 0.42);
}
[data-theme="i"] { /* Sage forward */
  --bg-top:    #1d211b;
  --bg-bottom: #0a0d0a;
  --text:      #ece5d2;
  --text-mute: rgba(236, 229, 210, 0.58);
  --accent:    #9bb074;
  --accent-2:  #b9cf94;
  --secondary: #5e6a4f;
  --shadow:    rgba(0, 0, 0, 0.4);
}
[data-theme="j"] { /* Twilight peach */
  --bg-top:    #23202a;
  --bg-bottom: #0c0a10;
  --text:      #f0e0d6;
  --text-mute: rgba(240, 224, 214, 0.6);
  --accent:    #e8a48b;
  --accent-2:  #f3c1ac;
  --secondary: #6b5e75;
  --shadow:    rgba(0, 0, 0, 0.4);
}
[data-theme="k"] { /* Eggshell flip */
  --bg-top:    #1f1814;
  --bg-bottom: #0a0705;
  --text:      #d2c4a8;
  --text-mute: rgba(210, 196, 168, 0.55);
  --accent:    #f7ecd3;
  --accent-2:  #ffffff;
  --secondary: #665244;
  --shadow:    rgba(0, 0, 0, 0.5);
}
[data-theme="l"] { /* Olive grove */
  --bg-top:    #1c1d17;
  --bg-bottom: #0a0a07;
  --text:      #ebe6d2;
  --text-mute: rgba(235, 230, 210, 0.58);
  --accent:    #a89455;
  --accent-2:  #c4b075;
  --secondary: #6b6a4a;
  --shadow:    rgba(0, 0, 0, 0.4);
}
```

---

## Implementation Steps

### 1. Append theme CSS blocks (5 min)
Insert all nine `[data-theme="d"]` through `[data-theme="l"]` blocks immediately after the existing `[data-theme="c"]` rule. No other CSS changes.

### 2. Allow swatch row to wrap (3 min)
Update `.landing-themes`:
```css
.landing-themes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 220px;
  margin-bottom: 4px;
  animation: landingFadeIn 240ms 60ms ease-out both;
}
```
Reasoning: 12 swatches at 22px + 8px gap = 358px in a single row, too wide on phones. Wrapping into 2 rows of 6 (or 3 of 4) keeps the picker compact while fitting all options.

### 3. Add the nine new swatch buttons (10 min)
Append after the existing `data-set-theme="c"` button in the landing HTML:
```html
<button class="landing-theme" data-set-theme="d" aria-label="Campfire"></button>
<button class="landing-theme" data-set-theme="e" aria-label="Cabin"></button>
<button class="landing-theme" data-set-theme="f" aria-label="Hayfield"></button>
<button class="landing-theme" data-set-theme="g" aria-label="Crimson camp"></button>
<button class="landing-theme" data-set-theme="h" aria-label="Lake at dusk"></button>
<button class="landing-theme" data-set-theme="i" aria-label="Sage forward"></button>
<button class="landing-theme" data-set-theme="j" aria-label="Twilight peach"></button>
<button class="landing-theme" data-set-theme="k" aria-label="Eggshell flip"></button>
<button class="landing-theme" data-set-theme="l" aria-label="Olive grove"></button>
```

Add the corresponding two-tone gradient previews (bg-top → accent on the same diagonal as A/B/C):
```css
.landing-theme[data-set-theme="d"] { background: linear-gradient(135deg, #21221c 0% 50%, #e87a3a 50% 100%); }
.landing-theme[data-set-theme="e"] { background: linear-gradient(135deg, #241b15 0% 50%, #c4814a 50% 100%); }
.landing-theme[data-set-theme="f"] { background: linear-gradient(135deg, #22221d 0% 50%, #b88154 50% 100%); }
.landing-theme[data-set-theme="g"] { background: linear-gradient(135deg, #1d231d 0% 50%, #a83a3a 50% 100%); }
.landing-theme[data-set-theme="h"] { background: linear-gradient(135deg, #1f2628 0% 50%, #5e9b9c 50% 100%); }
.landing-theme[data-set-theme="i"] { background: linear-gradient(135deg, #1d211b 0% 50%, #9bb074 50% 100%); }
.landing-theme[data-set-theme="j"] { background: linear-gradient(135deg, #23202a 0% 50%, #e8a48b 50% 100%); }
.landing-theme[data-set-theme="k"] { background: linear-gradient(135deg, #1f1814 0% 50%, #f7ecd3 50% 100%); }
.landing-theme[data-set-theme="l"] { background: linear-gradient(135deg, #1c1d17 0% 50%, #a89455 50% 100%); }
```

### 4. Update `VALID_THEMES` in JS (1 min)
```js
const VALID_THEMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
```
The existing `getLandingTheme` / `setLandingTheme` functions need no other change — they iterate dynamically over the swatches in the DOM.

### 5. Manual verification (10 min)

- Hard reload → landing renders in default `'a'`.
- Click each of the 12 swatches in turn — palette should swap instantly across bg, title, buttons, footer. Selection persists across reload.
- On a 375px-wide viewport (iPhone), confirm the swatch row wraps cleanly (probably into 2 rows of 6) without overflowing the content column.
- Confirm the eggshell-flip palette (`k`) — where the title color is brighter than the body text — actually reads correctly. Title should pop, body should sit back. If it looks broken, that's a real signal that the palette doesn't suit the layout, not that the implementation is wrong.
- Verify the `landing--no-anim` killswitch still kicks in on second visit (separate plan still pending the `transition: opacity 200ms ease` removal — DO NOT touch that here).

---

## Constraints

- DO NOT modify A, B, or C.
- DO NOT change the existing `setLandingTheme`, `getLandingTheme`, swatch CSS structure, or animation rules — only add.
- DO NOT introduce per-theme custom typography or spacing. Theme = colors only. The point is to compare palettes against a fixed layout.
- DO NOT add visible text labels to swatches. Use `aria-label` only. Visual comparison should be palette-driven.
- DO NOT bundle the killswitch transition fix from the prior review here — keep that change separate so the diff stays scoped to "more themes."

## Follow-up

After picking a winner from the 12:
1. Remove all losing themes (CSS blocks + swatch buttons + VALID_THEMES entries).
2. Move the picker into Settings (or remove entirely if you commit fully).
3. Apply the chosen palette to canvas-rendered screens (separate plan).

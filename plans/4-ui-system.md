# Feature Plan: UI System

---

## 1. GOAL

Refine all existing canvas-rendered UI elements into a cohesive, mobile-first presentation layer. Improve readability on small screens, add a throw counter HUD element, ensure safe-area awareness for notched devices, and establish consistent sizing/spacing conventions.

---

## 2. SYSTEM CONSTRAINTS

- Canvas rendering only, no DOM elements
- No gameplay logic changes — purely visual
- All text must be readable at 320px viewport width minimum
- Touch targets and UI elements must respect thumb-reachable zones
- Portrait orientation is the primary layout
- Must not break existing state machine or scoring logic

---

## 3. UI COMPONENTS (mobile layout first)

### HUD (during PLAYING)
| Element | Position | Sizing |
|---|---|---|
| Score | Top-left, below safe area | `Math.max(24, canvas.width * 0.07)` bold |
| Throw counter | Top-right, below safe area | `"3 / 5"` format, same size as score |
| Combo badge | Below score, left-aligned | Shown only when `combo >= 2`, smaller font |

### Throw meter (during CHARGING / FLYING)
- Right side, vertically centered in the thumb-reachable zone
- Existing sizing is correct (min 48px wide, 60% height)
- Add rounded corners to meter track and fill for visual polish

### Feedback text (after each throw)
- Centered horizontally, positioned above pit area
- Zone label + points on two lines
- Existing fade logic is correct

### Ready screen
- Title: large centered text, upper-middle
- Subtitle: "Tap to Start", centered below title
- No other elements

### Game over screen
- Semi-transparent overlay on frozen game scene
- "GAME OVER" title
- Final score
- "Tap to Restart" prompt

---

## 4. RENDERING STRATEGY

### Safe area
Add a `safeTop` constant calculated in `updateLayout()`:
```
safeTop = Math.max(20, canvas.height * 0.04)
```
All top-edge HUD elements use `safeTop` as their Y offset baseline. This prevents text from hiding under phone notches/status bars.

### Font scaling
All font sizes use the pattern `Math.max(minPx, canvas.width * scale)` to ensure readability on small screens while scaling up on tablets.

### Draw order
All UI draws happen at the end of `draw()`, after the game scene, so they layer on top. The existing order is correct:
1. Background + ground
2. Pit, player, shovel
3. Meter
4. HUD (score, throws, combo)
5. Feedback text

---

## 5. SCREEN LAYOUT (portrait-first)

```
┌──────────────────────┐
│  safeTop padding     │
│  SCORE     THROWS    │  ← HUD bar
│  x3 COMBO            │
│                      │
│        [METER]  ─────│─ right edge, vertically centered
│                      │
│      PERFECT         │  ← feedback text (when active)
│       +150           │
│                      │
│  🧍     ___PIT___    │  ← game scene
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← ground
└──────────────────────┘
```

---

## 6. STATE BINDINGS

UI components render based on existing state — no new state is introduced.

| Component | Visible when |
|---|---|
| HUD (score, throws, combo) | `runState === PLAYING` or `runState === GAME_OVER` |
| Throw meter | `state === CHARGING` or `state === FLYING` |
| Feedback text | `feedbackTimer > 0` and `runState === PLAYING` |
| Idle hint | `state === IDLE` and `runState === PLAYING` |
| Ready screen | `runState === READY` |
| Game over overlay | `runState === GAME_OVER` |

---

## 7. IMPLEMENTATION STEPS

### Step 1: Add safe area and layout constants
- Add `safeTop` calculation in `updateLayout()`
- Define HUD padding constant: `HUD_PAD = 20`
- Update score Y position to use `safeTop + fontSize`

### Step 2: Add throw counter to HUD
- Draw `throwCount / THROWS_PER_RUN` in top-right corner during `PLAYING` and `GAME_OVER`
- Use same font size as score display
- Right-aligned text, mirroring score position

### Step 3: Refine meter visual
- Add rounded rectangle rendering for meter track, fill bar, and sweet-spot zone
- Use `ctx.roundRect()` (widely supported) or a helper using `arc` calls for rounded corners
- Radius: `4px`
- No other meter behavior changes

### Step 4: Polish screen overlays
- Ready screen: increase title size to `Math.max(36, canvas.width * 0.12)`, add subtle subtitle fade pulse using `Math.sin(timestamp)` for alpha between 0.5–1.0
- Game over screen: add throw stats line below score showing `"X / Y throws landed"` using hit count derived from final `combo` or a new `hitsInRun` counter incremented on `inPit`
- Both screens: ensure text uses `safeTop`-aware vertical centering

### Step 5: Consolidate draw helpers
- Extract a `drawText(text, x, y, fontSize, color, align, bold)` helper to reduce repetitive `ctx.font`/`ctx.fillStyle`/`ctx.textAlign` setup
- Refactor all existing `fillText` calls in HUD, feedback, ready screen, and game over to use this helper
- No visual change — purely code cleanup for consistency

---

## 8. NON-GOALS

- DOM-based UI or HTML overlays
- Animations beyond the existing fade and the subtitle pulse
- Settings or options menu
- Tutorial or onboarding flow
- Landscape-specific layout
- Custom fonts or asset loading
- Sound or haptic feedback

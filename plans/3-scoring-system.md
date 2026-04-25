# Feature Plan: Scoring System

---

## 1. GOAL

Implement scoring logic that consumes throw result events, awards points based on accuracy, tracks combo streaks, and maintains run-level score state. Render score and feedback text on the canvas, readable on mobile screens.

---

## 2. SYSTEM CONSTRAINTS

- Consumes the existing `onThrowResult(result)` hook — does not modify throw or physics logic
- Vanilla JavaScript, no libraries
- All score state resets when `resetRun()` is called
- Score display must be readable on small phone screens (large font, high contrast)
- No persistent storage (score exists only for the current run)

---

## 3. INPUT EVENTS

The scoring system receives the existing throw result object:

```js
{
  landed: true,
  x: finalX,
  inPit: boolean,
  distanceFromCenter: number,  // px, signed
  power: number                // 0.0–1.0
}
```

This is the only input. Scoring does not read throw state, meter state, or physics state directly.

---

## 4. SCORING RULES

### Miss (not in pit)
- `inPit === false`
- Points: **0**
- Combo resets to 0

### Hit (in pit)
Base points depend on accuracy — how close `x` landed to pit center.

| Zone | Condition | Base points |
|---|---|---|
| Perfect | `|distanceFromCenter| <= pitHalfWidth * 0.15` | 100 |
| Great | `|distanceFromCenter| <= pitHalfWidth * 0.45` | 75 |
| Good | `|distanceFromCenter| <= pitHalfWidth` (any hit) | 50 |

`pitHalfWidth = (pitRight - pitLeft) / 2`

Zone thresholds are constants for easy tuning.

### Final throw points
`throwPoints = basePoints * comboMultiplier`

---

## 5. COMBO / MULTIPLIER LOGIC

- `combo` increments by 1 on each consecutive hit (`inPit === true`)
- `combo` resets to 0 on any miss
- `comboMultiplier = 1 + (combo - 1) * 0.5` (capped at combo of 1 minimum for multiplier calculation)
  - combo 1: x1.0
  - combo 2: x1.5
  - combo 3: x2.0
  - combo 4: x2.5
  - etc.
- No upper cap on combo for MVP

---

## 6. STATE MODEL

```js
let score = 0;           // total run score
let combo = 0;           // consecutive hits
let lastThrowPoints = 0; // points from most recent throw (for feedback display)
let lastThrowZone = '';  // 'perfect' | 'great' | 'good' | 'miss'
let feedbackTimer = 0;   // ms remaining to show feedback text
```

### Reset (called from `resetRun()`)
```js
score = 0;
combo = 0;
lastThrowPoints = 0;
lastThrowZone = '';
feedbackTimer = 0;
```

---

## 7. FEEDBACK TIMING

On each throw result:
- Set `feedbackTimer = 1500` (ms)
- Each frame, decrement `feedbackTimer` by `dt * 1000`
- While `feedbackTimer > 0`, render feedback text (zone label + points) near the pit area
- Feedback text fades out in the last 500ms using alpha: `Math.min(1, feedbackTimer / 500)`

This gives immediate visual reward on mobile without blocking gameplay.

---

## 8. IMPLEMENTATION STEPS

### Step 1: Add scoring constants and state
- Add zone threshold constants: `ZONE_PERFECT = 0.15`, `ZONE_GREAT = 0.45`
- Add base point constants: `PTS_PERFECT = 100`, `PTS_GREAT = 75`, `PTS_GOOD = 50`
- Add feedback duration constant: `FEEDBACK_DURATION = 1500`
- Add state variables: `score`, `combo`, `lastThrowPoints`, `lastThrowZone`, `feedbackTimer`

### Step 2: Implement scoring logic in onThrowResult
- Calculate `pitHalfWidth` from existing `pitLeft`/`pitRight`
- Determine zone from `|distanceFromCenter|` vs thresholds
- If miss: reset combo, set points to 0
- If hit: increment combo, calculate `comboMultiplier`, compute `throwPoints = base * multiplier`
- Add `throwPoints` to `score`
- Set `lastThrowPoints`, `lastThrowZone`, `feedbackTimer`

### Step 3: Render persistent score display
- Draw current `score` in top-left corner of canvas during `PLAYING` and `GAME_OVER`
- Font size: `Math.max(20, canvas.width * 0.06)` — readable on mobile
- Draw current combo count below score when `combo >= 2`

### Step 4: Render throw feedback text
- During `PLAYING`, if `feedbackTimer > 0`: draw zone label and `+points` near pit center
- Zone label color: perfect = gold, great = green, good = white, miss = red
- Apply fade-out alpha in last 500ms
- Decrement `feedbackTimer` by `dt * 1000` in `update()`

### Step 5: Wire scoring reset into resetRun and game over display
- Add score state reset to existing `resetRun()` function
- In `drawGameOverOverlay()`: display final `score` below "Game Over" text

---

## 9. NON-GOALS

- High score persistence or leaderboard
- Score animations or particle effects
- Per-throw score history
- Difficulty affecting point values
- Sound effects on score events
- Separate scoring UI layer or module

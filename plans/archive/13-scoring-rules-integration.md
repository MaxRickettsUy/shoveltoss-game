# Feature Plan: Real-Rules Scoring Integration

---

## 1. GOAL

Replace the existing distance-from-center scoring (PERFECT / GREAT / GOOD / MISS) with the five real shovel-toss outcomes specified by the user: stick (3), back-wall lean (2), in-pit (1), front-wall touch (0), miss (-2). Single-player only — no innings, turn order, or "first to 15".

---

## 2. CHANGE DESCRIPTION

### Classification source
- Landing position is converted to a normalized pit coordinate:
  ```
  norm = (result.x - pitLeft) / (pitRight - pitLeft)
  ```
  where `0` = front wall (player side), `1` = back wall (far side).
- `result.inPit` continues to gate "outside the pit"; everything else is determined by `norm`.

### Combo behavior (kept, narrowed)
- Combo continues / multiplies on **positive** base points only (`stick`, `back_wall`, `in_pit`).
- Combo resets on `front_wall` (0) and `miss` (-2).
- Combo multiplier formula is unchanged: `1 + (combo - 1) * 0.5`, applied before `Math.round`.

### `hitsInRun` semantics
- Increments on any in-pit result (`front_wall`, `in_pit`, `back_wall`, `stick`) — i.e., anywhere the shovel physically landed in the pit.
- Does **not** increment on `miss`.

### Score
- `score += lastThrowPoints` for every throw, including 0 and negative values. No floor clamp.

### Out of scope (unchanged)
- Pit position / wall / physics / layout.
- Throw input, meter, sweet-spot, difficulty progression.
- Game-over flow, run length, ready screen.
- Any new UI panels, animations, or zone visuals (a single-line color-routing tweak is the only UI touch — see Step 3).

---

## 3. EXPECTED EFFECT

- Each throw resolves into one of five clearly distinguished outcomes, mapped 1-to-1 to the user's specified rules.
- Skill ceiling rises: `stick` (3) and `back_wall` (2) reward precision over the generic in-pit landing (1).
- Sloppy throws are penalized (`miss` = -2), and front-lip clips give nothing without breaking the run mathematically.

---

## 4. RESULT CLASSIFICATION MODEL

Inputs: `result.inPit` (boolean), `result.x` (px, landing x), `pitLeft`, `pitRight`.

If `!result.inPit` → **miss**. Otherwise compute `norm = (result.x - pitLeft) / (pitRight - pitLeft)` and use the table.

| Zone id      | `norm` range          | Base points | Combo on this result | `hitsInRun++` |
|--------------|-----------------------|-------------|----------------------|---------------|
| `miss`       | (outside pit)         | -2          | reset                | no            |
| `front_wall` | `[0, 0.10)`           | 0           | reset                | yes           |
| `in_pit`     | `[0.10, 0.40)` ∪ `(0.60, 0.90]` | 1   | continue             | yes           |
| `stick`      | `[0.40, 0.60]`        | 3           | continue             | yes           |
| `back_wall`  | `(0.90, 1.0]`         | 2           | continue             | yes           |

Final points awarded:
- For `stick` / `back_wall` / `in_pit`: `lastThrowPoints = Math.round(base * (1 + (combo - 1) * 0.5))`.
- For `front_wall`: `lastThrowPoints = 0`.
- For `miss`: `lastThrowPoints = -2`.

---

## 5. IMPLEMENTATION STEPS

### Step 1: Replace scoring constants
- Remove: `ZONE_PERFECT`, `ZONE_GREAT`, `PTS_PERFECT`, `PTS_GREAT`, `PTS_GOOD`.
- Add:
  ```
  const PTS_STICK       = 3;
  const PTS_BACK_WALL   = 2;
  const PTS_IN_PIT      = 1;
  const PTS_FRONT_WALL  = 0;
  const PTS_MISS        = -2;
  const ZONE_FRONT_WALL_MAX = 0.10;
  const ZONE_STICK_MIN      = 0.40;
  const ZONE_STICK_MAX      = 0.60;
  const ZONE_BACK_WALL_MIN  = 0.90;
  ```

### Step 2: Rewrite the body of `onThrowResult()` for the new classification
Replace the existing in-pit / not-in-pit branch with:
```
let zone, basePoints;

if (!result.inPit) {
  zone = 'miss';
  basePoints = PTS_MISS;
} else {
  const norm = (result.x - pitLeft) / (pitRight - pitLeft);
  if (norm < ZONE_FRONT_WALL_MAX) {
    zone = 'front_wall'; basePoints = PTS_FRONT_WALL;
  } else if (norm > ZONE_BACK_WALL_MIN) {
    zone = 'back_wall';  basePoints = PTS_BACK_WALL;
  } else if (norm >= ZONE_STICK_MIN && norm <= ZONE_STICK_MAX) {
    zone = 'stick';      basePoints = PTS_STICK;
  } else {
    zone = 'in_pit';     basePoints = PTS_IN_PIT;
  }
}

if (basePoints > 0) {
  scoring.combo++;
  scoring.hitsInRun++;
  const mul = 1 + (scoring.combo - 1) * 0.5;
  scoring.lastThrowPoints = Math.round(basePoints * mul);
} else {
  scoring.combo = 0;
  scoring.lastThrowPoints = basePoints;
  if (zone !== 'miss') scoring.hitsInRun++;
}

scoring.lastThrowZone   = zone;
scoring.score          += scoring.lastThrowPoints;
scoring.feedbackTimer   = FEEDBACK_DURATION;
```
- Leave the surrounding `run.throwCount++` / `endRun()` block at the bottom of the function untouched.

### Step 3: Route new zone ids through the existing feedback color block
- In `draw()`, replace the current `lastThrowZone` color conditional with:
  ```
  let zoneColor;
  if      (scoring.lastThrowZone === 'stick')      zoneColor = '#ffe600';
  else if (scoring.lastThrowZone === 'back_wall')  zoneColor = '#44dd44';
  else if (scoring.lastThrowZone === 'in_pit')     zoneColor = '#ffffff';
  else if (scoring.lastThrowZone === 'front_wall') zoneColor = '#aaaaaa';
  else                                             zoneColor = '#ff4444';
  ```
- The conditional that hides `+points` when `lastThrowPoints <= 0` should be widened from `> 0` to `!= 0` so `-2` is still shown but `0` is suppressed:
  ```
  if (scoring.lastThrowPoints !== 0) {
    drawText(`${scoring.lastThrowPoints > 0 ? '+' : ''}${scoring.lastThrowPoints}`, ...);
  }
  ```
  No new UI elements, fonts, or layout changes.

### Step 4: Manual scoring sanity check
- Center hit → `stick`, base 3, combo applies.
- Slightly off-center hit → `in_pit`, base 1, combo applies.
- Far-back hit → `back_wall`, base 2, combo applies.
- Front-lip hit → `front_wall`, 0 points, combo resets, `hitsInRun` still increments.
- Outside pit → `miss`, -2 points, combo resets, `hitsInRun` does not increment.
- Run total reflects the new amounts (can be negative).

---

## 6. ROLLBACK STRATEGY

- Restore the prior constants (`ZONE_PERFECT`, `ZONE_GREAT`, `PTS_PERFECT`, `PTS_GREAT`, `PTS_GOOD`) and remove the new ones.
- Revert the `onThrowResult()` body to the previous distance-from-center branch.
- Revert the `draw()` zone-color conditional and the `lastThrowPoints` display guard.

A single revert of the feature commit fully restores prior scoring behavior. No physics, layout, or input paths are touched.

---

## 7. NON-GOALS

- No innings, turn order, multiplayer, or "first to 15".
- No new UI panels, leaderboard, or per-zone animations.
- No changes to pit position / pit width / wall / deflection / physics.
- No changes to difficulty, meter, sweet-spot, or input.
- No score floor clamp — scores may go negative.
- No new audio, haptics, or particle effects.

# Feature Plan: Stick-Streak Score Multiplier

## Scope

Reward consecutive sticks with a points multiplier on the stick itself. Two tiers: ×1.5 at 3-streak, ×2 at 5-streak. Streak resets on any non-stick throw (in_pit, front_wall, back_wall, miss). No change to lives or run length.

## Files Touched

- `index.html`

## Implementation Steps

### Step 1 — Constants

Near other scoring constants (around index.html:144):

```js
const STREAK_TIER_1 = 3;   // ×1.5 starts here
const STREAK_TIER_2 = 5;   // ×2 starts here
const STREAK_MULT_1 = 1.5;
const STREAK_MULT_2 = 2.0;
```

### Step 2 — Run state

Extend the `run` object (around index.html:200):

```js
stickStreak: 0,
```

In `resetRun()` (around index.html:520):

```js
run.stickStreak = 0;
```

Extend `scoring` object init with multiplier-feedback fields:

```js
multiplierTierReachedTimer: 0,
multiplierTierReached: 0, // 1 or 2 — the tier just crossed
```

Reset both in `resetRun()`.

### Step 3 — Apply multiplier in throw resolution

In throw resolution (around index.html:567–578), replace the existing assignment + stick branch:

```js
let mult = 1;
if (zone === 'stick') {
  run.stickStreak++;
  if (run.stickStreak >= STREAK_TIER_2) mult = STREAK_MULT_2;
  else if (run.stickStreak >= STREAK_TIER_1) mult = STREAK_MULT_1;
} else {
  run.stickStreak = 0;
}

scoring.lastThrowPoints = Math.round(basePoints * mult);
scoring.lastThrowZone   = zone;
scoring.score          += scoring.lastThrowPoints;
scoring.feedbackTimer   = FEEDBACK_DURATION;

run.throwCount++;
if (zone === 'stick') {
  difficulty.meterSpeed += METER_SPEED_INCREMENT_PER_THROW;
  // Toast on tier entry
  if (run.stickStreak === STREAK_TIER_1 || run.stickStreak === STREAK_TIER_2) {
    scoring.multiplierTierReached = run.stickStreak === STREAK_TIER_2 ? 2 : 1;
    scoring.multiplierTierReachedTimer = FEEDBACK_DURATION;
  }
}
if (zone === 'miss') {
  run.missesRemaining--;
}
if (run.missesRemaining === 0) {
  endRun(timestamp);
}
```

Note: `mult` only multiplies sticks in practice because non-stick zones reset the streak first, leaving `mult = 1`. The `Math.round` keeps integer scores.

### Step 4 — Decay the tier-reached toast timer

Wherever per-frame timers like `feedbackTimer` are decremented, apply the same dt decrement to `multiplierTierReachedTimer` and clamp at 0.

### Step 5 — HUD: streak counter + active multiplier

In the playing-state HUD draw (after the existing throw feedback text, around index.html:1233), add:

```js
// Active streak indicator (only while streak > 0)
if (run.stickStreak > 0) {
  let label = `Streak ${run.stickStreak}`;
  if (run.stickStreak >= STREAK_TIER_2)      label += ' ×2';
  else if (run.stickStreak >= STREAK_TIER_1) label += ' ×1.5';
  drawText(label,
    canvas.width / 2, hudY + subFontSize,
    subFontSize, 'rgba(255,230,0,0.9)', 'center', true);
}

// Tier-entry toast
if (scoring.multiplierTierReachedTimer > 0 && scoring.multiplierTierReached) {
  const alpha = Math.min(1, scoring.multiplierTierReachedTimer / 500);
  ctx.save();
  ctx.globalAlpha = alpha;
  const msg = scoring.multiplierTierReached === 2 ? '×2 STREAK!' : '×1.5 STREAK!';
  drawText(msg, canvas.width / 2, canvas.height * 0.4,
    Math.max(28, Math.floor(canvas.width * 0.08)), '#ffe600', 'center', true);
  ctx.restore();
}
```

## Constraints

- Streak strictly counts consecutive sticks; any other zone resets to 0.
- Multiplier applies only to the stick that earns it (not retroactively to prior throws).
- No new assets, no schema changes, no leaderboard changes.

## Edge Cases

- Streak reset on miss: streak goes to 0 *before* the miss-life-decrement runs, so the order is: (1) reset streak, (2) decrement life, (3) check end-run. Existing order preserved.
- Streak crosses tier 1 then breaks then climbs back to tier 1: toast fires again (intended — feels rewarding).
- Tied/round scores in the leaderboard: scores remain integers via `Math.round`.
- Difficulty ramp (`METER_SPEED_INCREMENT_PER_THROW`) still increments per stick — multiplier doesn't change difficulty pacing.

## Out of Scope

- A third multiplier tier (×3 at 7-streak) — easy to add later if ×2 turns out to be the new soft cap.
- Stack-decay (multiplier slowly drops if you don't stick within N seconds) — not needed; non-stick already breaks it.
- Per-character streak modifiers.
- Persisting "longest streak" across runs.

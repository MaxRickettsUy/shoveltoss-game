# Feature Plan: "Big Stick" Second Sweet Spot

## Scope

Add a second, independent sweet-spot stripe to the throw meter, alongside the existing one:

- Width = **½ of the existing sweet spot width**.
- Position is **independent** of the existing sweet spot — each throw rolls a separate random center within the same valid range, and the two bands must not overlap.
- Hitting it (and landing in the pit) scores **6 points** under a new zone called `big_stick`.
- Throw physics anchor on whichever band was hit, so hitting either band can land in the pit.
- Drawn as a distinct cyan stripe, separate from the yellow sweet-spot band.

Out of scope: difficulty ramping of big-stick width, separate big-stick streak counters, dedicated celebration/confetti for big stick, per-character tuning, three or more bands.

## Files Touched

- `index.html`

## Design Notes

- **Two independent bands.** Each rolls its own center in `[SWEET_CENTER_MIN, SWEET_CENTER_MAX]`. Big-stick band is half the width of the regular one. Bands must not overlap (re-roll big stick until clear; finite cap with deterministic fallback).
- **Throw physics**: the `throwMultiplier` formula at index.html:1149–1153 currently treats `sweetCenter` as the "perfect throw" reference. With two bands, that reference becomes per-throw context-dependent: if the player hits big stick, big-stick center is the anchor; if they hit the regular sweet spot, sweet center is the anchor; if they miss both, the **nearest** band's center is the anchor. This is the only way both bands can produce pit-landing throws.
- **Precedence on overlap**: bands are placed non-overlapping, but the detection logic still uses `else if`. Big stick takes priority over regular sweet spot if both are somehow true (defense-in-depth).
- **Pit gate still applies**: `big_stick` zone is only awarded when the throw also lands in the pit. Off-pit throws fall through to existing `front_wall` / `back_wall` / `miss` outcomes.
- **Stick-side effects** (meter-speed increment at index.html:901–903, `SHOVEL_STICK_ANGLE` at index.html:1407–1408) fire for both `stick` and `big_stick`.
- **Visual**: cyan stripe drawn in a separate pass after the yellow translucent band. Different vertical inset (slightly thinner than meter height) is *not* needed — same height, different color is enough to differentiate.
- **Feedback color** for `big_stick` uses cyan so the post-throw label reads clearly different from `STICK`.

## Implementation Steps

### Step 1 — Constants and state

Near the existing sweet-spot constants (index.html:184–205), add:

```js
const BIG_STICK_WIDTH_RATIO = 0.5; // half of sweetSpotWidth
const BIG_STICK_MIN_GAP = 0.01;    // minimum normalized gap between the two bands
const BIG_STICK_REROLL_LIMIT = 8;  // tries before fallback placement
const PTS_BIG_STICK = 6;
```

In the `throw_` object (around index.html:305–306), add:

```js
sweetCenter: SWEET_SPOT_CENTER,
bigStickCenter: SWEET_SPOT_CENTER,
inSweetSpot: false,
inBigStick: false,
```

In `difficulty` (around index.html:340–342), add the sibling band's bounds:

```js
sweetSpotWidth: SWEET_SPOT_WIDTH,
sweetSpotMin:   SWEET_SPOT_CENTER - SWEET_SPOT_WIDTH / 2,
sweetSpotMax:   SWEET_SPOT_CENTER + SWEET_SPOT_WIDTH / 2,
bigStickWidth:  SWEET_SPOT_WIDTH * BIG_STICK_WIDTH_RATIO,
bigStickMin:    SWEET_SPOT_CENTER - (SWEET_SPOT_WIDTH * BIG_STICK_WIDTH_RATIO) / 2,
bigStickMax:    SWEET_SPOT_CENTER + (SWEET_SPOT_WIDTH * BIG_STICK_WIDTH_RATIO) / 2,
```

### Step 2 — Recompute both bands in `updateSweetSpotBounds()`

Replace `updateSweetSpotBounds()` at index.html:417–421 with:

```js
function updateSweetSpotBounds() {
  const half = difficulty.sweetSpotWidth / 2;
  difficulty.sweetSpotMin = throw_.sweetCenter - half;
  difficulty.sweetSpotMax = throw_.sweetCenter + half;

  difficulty.bigStickWidth = difficulty.sweetSpotWidth * BIG_STICK_WIDTH_RATIO;
  const bigHalf = difficulty.bigStickWidth / 2;
  difficulty.bigStickMin = throw_.bigStickCenter - bigHalf;
  difficulty.bigStickMax = throw_.bigStickCenter + bigHalf;
}
```

### Step 3 — Roll both centers on throw start (non-overlapping)

Add a placement helper near `updateSweetSpotBounds()`:

```js
function rollBandCenters() {
  const sweetHalf = difficulty.sweetSpotWidth / 2;
  const bigHalf   = (difficulty.sweetSpotWidth * BIG_STICK_WIDTH_RATIO) / 2;
  const minGap    = sweetHalf + bigHalf + BIG_STICK_MIN_GAP;
  const range     = SWEET_CENTER_MAX - SWEET_CENTER_MIN;

  const sweetCenter = SWEET_CENTER_MIN + Math.random() * range;
  let bigCenter = SWEET_CENTER_MIN + Math.random() * range;
  for (let i = 0; i < BIG_STICK_REROLL_LIMIT && Math.abs(bigCenter - sweetCenter) < minGap; i++) {
    bigCenter = SWEET_CENTER_MIN + Math.random() * range;
  }
  if (Math.abs(bigCenter - sweetCenter) < minGap) {
    // Deterministic fallback: place big stick on the side with more room
    const leftRoom  = sweetCenter - SWEET_CENTER_MIN;
    const rightRoom = SWEET_CENTER_MAX - sweetCenter;
    bigCenter = rightRoom >= leftRoom
      ? Math.min(SWEET_CENTER_MAX, sweetCenter + minGap)
      : Math.max(SWEET_CENTER_MIN, sweetCenter - minGap);
  }
  return { sweetCenter, bigCenter };
}
```

In `onPressStart()` at index.html:1138, replace the line that rolls `throw_.sweetCenter` plus the following `updateSweetSpotBounds()` / `inSweetSpot = false` lines with:

```js
const { sweetCenter, bigCenter } = rollBandCenters();
throw_.sweetCenter    = sweetCenter;
throw_.bigStickCenter = bigCenter;
updateSweetSpotBounds();
throw_.inSweetSpot = false;
throw_.inBigStick  = false;
```

In the run-init reset at index.html:855–865, add:

```js
throw_.bigStickCenter = SWEET_SPOT_CENTER;
throw_.inBigStick     = false;
```

### Step 4 — Detect both bands and anchor throw physics

In `onPressEnd()` at index.html:1147, replace the existing `inSweetSpot` set + `throwMultiplier` block with:

```js
throw_.inSweetSpot = f >= difficulty.sweetSpotMin && f <= difficulty.sweetSpotMax;
throw_.inBigStick  = f >= difficulty.bigStickMin  && f <= difficulty.bigStickMax;

let anchorCenter;
if (throw_.inBigStick)         anchorCenter = throw_.bigStickCenter;
else if (throw_.inSweetSpot)   anchorCenter = throw_.sweetCenter;
else {
  const dSweet = Math.abs(f - throw_.sweetCenter);
  const dBig   = Math.abs(f - throw_.bigStickCenter);
  anchorCenter = dBig < dSweet ? throw_.bigStickCenter : throw_.sweetCenter;
}

let throwMultiplier;
if (f < anchorCenter) {
  throwMultiplier = THROW_MULT_MIN + (f / anchorCenter) * (1 - THROW_MULT_MIN);
} else {
  const overPower = (f - anchorCenter) / (1 - anchorCenter);
  throwMultiplier = 1 + overPower * overPower * (THROW_MULT_MAX - 1);
}
```

(Replaces the `sweetCenter` constant local at index.html:1146 and the `if (f < sweetCenter) ... else ...` block at 1149–1154.)

In the result object built at index.html:1398–1402, pass it through:

```js
const result = {
  x:           throw_.shovelX,
  inPit:       throw_.shovelX >= pitLeft && throw_.shovelX <= pitRight,
  inSweetSpot: throw_.inSweetSpot,
  inBigStick:  throw_.inBigStick
};
```

### Step 5 — New `big_stick` zone in `onThrowResult`

In the zone-resolution block at index.html:884–892, replace the `inSweetSpot` branch — big stick takes precedence:

```js
} else if (result.inBigStick) {
  zone = 'big_stick'; basePoints = PTS_BIG_STICK;
} else if (result.inSweetSpot) {
  zone = 'stick';     basePoints = PTS_STICK;
}
```

Update the two `stick` side-effect checks:

```js
if (zone === 'stick' || zone === 'big_stick') {
  difficulty.meterSpeed += METER_SPEED_INCREMENT_PER_THROW;
}
```

```js
if (scoring.lastThrowZone === 'stick' || scoring.lastThrowZone === 'big_stick') {
  throw_.angle = SHOVEL_STICK_ANGLE;
}
```

### Step 6 — Draw both bands and add feedback color

In `drawMeter()` at index.html:1720–1726, after the existing translucent yellow band, draw the big-stick band as a distinct second stripe:

```js
// Sweet-spot band (existing, yellow translucent)
const sweetX = meterX + meterWidth * difficulty.sweetSpotMin;
const sweetW = meterWidth * (difficulty.sweetSpotMax - difficulty.sweetSpotMin);
ctx.fillStyle = 'rgba(255, 220, 0, 0.25)';
ctx.beginPath();
ctx.roundRect(sweetX, meterY, sweetW, meterHeight, r);
ctx.fill();

// Big-stick band (independent location, cyan translucent)
const bigX = meterX + meterWidth * difficulty.bigStickMin;
const bigW = meterWidth * (difficulty.bigStickMax - difficulty.bigStickMin);
ctx.fillStyle = 'rgba(0, 229, 255, 0.45)';
ctx.beginPath();
ctx.roundRect(bigX, meterY, bigW, meterHeight, r);
ctx.fill();
```

Update the moving fill-bar tint at index.html:1730–1731 so big-stick hits visually pop too:

```js
const inAnyBand = throw_.meterFill >= difficulty.sweetSpotMin && throw_.meterFill <= difficulty.sweetSpotMax
              ||  throw_.meterFill >= difficulty.bigStickMin  && throw_.meterFill <= difficulty.bigStickMax;
ctx.fillStyle = inAnyBand ? '#ffe600' : '#ff6b35';
```

In the throw-feedback color block at index.html:1697–1701, add the `big_stick` case as cyan:

```js
if      (scoring.lastThrowZone === 'big_stick')  zoneColor = '#00e5ff';
else if (scoring.lastThrowZone === 'stick')      zoneColor = '#ffe600';
else if (scoring.lastThrowZone === 'back_wall')  zoneColor = '#44dd44';
else if (scoring.lastThrowZone === 'in_pit')     zoneColor = '#ffffff';
else if (scoring.lastThrowZone === 'front_wall') zoneColor = '#44dd44';
else                                             zoneColor = '#ff4444';
```

The label render `scoring.lastThrowZone.toUpperCase().replace('_', ' ')` (index.html:1702) produces `"BIG STICK"` automatically.

### Step 7 — Manual test plan + release note

- New throw: yellow band and cyan band are visible at **two distinct positions** on the meter, never overlapping or touching.
- Each throw, both bands move independently to new positions.
- Hit cyan band + land in pit → "BIG STICK" label, +6 points, shovel sticks, meter speed increments.
- Hit yellow band + land in pit → "STICK" label, +3 points (unchanged behavior).
- Stop the meter between the two bands → throw goes off-power based on whichever band's center is nearer; outcome is `front_wall` / `back_wall` / `miss` per existing rules.
- Stop the meter inside the cyan band but the throw lands short/long of the pit → no +6 awarded, falls through to standard zone outcome.
- After 30+ throws verify the two bands' positions look uncorrelated (visual sanity check).
- Edge case: when sweet spot rolls near the meter's far edge, big stick consistently lands on the opposite side via the deterministic fallback.
- Game-over and HUD render unchanged.

Bump `APP_VERSION_TAG` (index.html:221) and prepend a `releaseNotes.js` entry: "Big Stick — second cyan sweet spot worth 6 points appears alongside the yellow one."

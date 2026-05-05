# Feature Plan: Remove Pit/Wall Gap Causing Phantom Misses (Keep Bounce)

## Problem

Throws aimed at the back of the pit visually look like they should land in-pit, but instead the shovel ricochets backward off the wall mid-flight and registers as a miss elsewhere.

Root cause is the wall-bounce trigger in `index.html:1244-1260`:

```js
const hitWall = isLilItalyLevel() ? throw_.shovelX <= wallX : throw_.shovelX >= wallX;
if (!throw_.bounced && hitWall) {
  if (throw_.shovelY >= wallTopY && throw_.shovelY < groundY) {
    // bounce: redirect shovel back toward player
  }
  throw_.bounced = true;
}
```

`pitRight` and `wallX` are set to the same value (index.html:373-374), so a trajectory aimed at the back-wall scoring zone (rightmost 10% of `[pitLeft, pitRight]`) crosses `shovelX = wallX` while still descending. With `wallTopY <= shovelY < groundY` true at that moment, the bounce fires even though the throw was destined to land inside the pit. Throws that *should* score as `back_wall` end up bouncing into a miss.

Also: `WALL_GAP = 12` (index.html:180) is declared but never read anywhere — dead code, but its name suggests an unfinished version of this same fix.

## Approach

Keep the wall bounce animation intact for genuine overshoots. Change the bounce trigger from per-frame "shovel crossed wallX in flight" to "this throw was aimed past the wall" — i.e., gate on `throw_.landingX`, which is set once at throw time and reflects the player's actual target.

A throw whose `landingX` is within the pit will never bounce, even if its parabola briefly grazes `shovelX = wallX` during descent. A throw aimed past the wall still bounces visually, kicking off `wallX` exactly as today.

## Files Touched

- `index.html`

## Implementation Steps

### Step 1 — Delete dead `WALL_GAP`

Remove index.html:180.

### Step 2 — Gate the bounce on projected landing, not in-flight x

In the bounce block (index.html:1244-1260), change `hitWall` to test the throw's destination instead of the current shovel position:

```js
const overshoots = isLilItalyLevel()
  ? throw_.landingX < wallX
  : throw_.landingX > wallX;
const crossedWall = isLilItalyLevel()
  ? throw_.shovelX <= wallX
  : throw_.shovelX >= wallX;
if (!throw_.bounced && overshoots && crossedWall) {
  if (throw_.shovelY >= wallTopY && throw_.shovelY < groundY) {
    // existing bounce body, unchanged
  }
  throw_.bounced = true;
}
```

`overshoots` decides whether the bounce is allowed at all (set once, true only for genuine overshoots); `crossedWall` keeps the existing per-frame check so the bounce fires at the moment of contact for correct animation timing.

### Step 3 — Manual verification

Run the dev server. Test both orientations and both levels (default right and Lil Italy left):

- Repeated throws aimed at the back-wall zone (last ~10% of pit): should score `back_wall` (1 pt) consistently, with no mid-flight ricochets.
- Deliberate overshoots beyond the pit: should still bounce off the wall with the same animation as today, then land/miss per the bounce trajectory.
- Throws into front and middle of pit: unchanged.

## Constraints

- Bug fix only; no new mechanics.
- Bounce animation, wall position, scoring zones, and pit hit-test are all preserved.
- Minimal diff: ~6 lines of logic change in the bounce block plus the dead-constant deletion.

## Out of Scope

- Moving `wallX` or `pitRight`.
- Changing scoring zone fractions (`ZONE_FRONT_WALL_MAX`, `ZONE_BACK_WALL_MIN`).
- Asset changes.

## Risks / Edge Cases

- Throws with `landingX == wallX` exactly: `overshoots` is false, no bounce. Lands at `pitRight`, scores as `back_wall`. Correct.
- Throws with `landingX` slightly past `wallX`: `overshoots` is true; if the parabola descends through the wall band before reaching ground, bounce fires as today. If the throw is high and clears the wall (`shovelY < wallTopY` while crossing), no bounce — same as current behavior.
- `throw_.landingX` is mutated *inside* the bounce body (gets reassigned to the bounce target). The `!throw_.bounced` guard already prevents re-entry, so the gate isn't affected by the mutation. Safe.

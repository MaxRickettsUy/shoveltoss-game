# Feature Plan: Throw System

---

## 1. GOAL

Implement a touch-based throw system where the player holds to charge a power meter, releases to launch a shovel along an arc, and the shovel lands (or misses) relative to a pit zone. Emit an event on landing so a future scoring system can hook into it.

---

## 2. SYSTEM CONSTRAINTS

- Vanilla JavaScript + Canvas only, no libraries
- Touch input is primary (mouse fallback acceptable but not the design target)
- One-thumb interaction: hold to charge, release to throw
- Deterministic arc per power value (same input = same result)
- Must feel responsive on mobile browsers (no perceptible input lag)
- Portrait orientation layout assumed

---

## 3. INPUT / OUTPUT MODEL

### Input
| Event | Maps to |
|---|---|
| `touchstart` / `mousedown` | Begin charging meter |
| `touchend` / `mouseup` | Release throw at current power |

No drag, swipe, or multi-touch. Single press-and-release only.

### Output
- A `power` value (0.0 – 1.0) derived from meter position at release
- `power` is passed to the launch function to determine initial velocity

---

## 4. THROW METER DESIGN

- Vertical bar displayed on the left or right side of the screen (thumb-reachable zone)
- Meter oscillates automatically from bottom (0) to top (1) and back while the player holds
- Oscillation speed: start at ~1.2 seconds per full cycle (tunable constant)
- On release, the meter freezes and the fill value becomes `power`
- Visual: filled bar with a distinct color change at the sweet-spot zone (e.g. 0.7–0.9 range)
- Meter is large enough to read on a phone screen (minimum 48px wide, ~60% of screen height)

---

## 5. PHYSICS MODEL

### Launch parameters
- Fixed launch origin: player position (left side of canvas)
- Fixed launch angle: 45 degrees (constant for MVP — removes angle complexity)
- Initial velocity: `V = V_MIN + power * (V_MAX - V_MIN)`
  - `V_MIN` = minimum throw speed (weak lob)
  - `V_MAX` = maximum throw speed (full send)
- Gravity: constant `G` pulling downward each frame

### Flight equations (per frame, dt in seconds)
```
vx = V * cos(angle)
vy = V * sin(angle) - G * elapsedTime
x = originX + vx * elapsedTime
y = originY - (V * sin(angle) * elapsedTime - 0.5 * G * elapsedTime^2)
```

### Landing condition
- Shovel has landed when `y >= groundY`
- On landing, record final `x` position

---

## 6. HIT / RESULT HOOKS

On landing, emit a result object:

```js
{
  landed: true,
  x: finalX,
  inPit: finalX >= pitLeftEdge && finalX <= pitRightEdge,
  distanceFromCenter: finalX - pitCenterX,
  power: powerValue
}
```

This object is passed to a callback (`onThrowResult`). The scoring system (not implemented here) will consume it.

After result is emitted, reset state to allow the next throw.

---

## 7. IMPLEMENTATION STEPS

### Step 1: Canvas bootstrap
- Create `index.html` with a full-viewport `<canvas>` element
- Set up the game loop (`requestAnimationFrame`)
- Draw static scene: ground line, player placeholder (rectangle), pit zone (rectangle on ground)
- Handle canvas resize for mobile viewport

### Step 2: Throw meter
- Draw the vertical meter bar on screen
- On `touchstart`/`mousedown`: start oscillating the meter fill value
- On `touchend`/`mouseup`: freeze meter, capture `power` value
- Render meter fill and sweet-spot zone each frame

### Step 3: Projectile launch and flight
- On release, calculate initial velocity from `power`
- Each frame, update shovel position using arc physics
- Render shovel as a small rectangle during flight
- Stop updating when shovel reaches `groundY`

### Step 4: Landing detection and result hook
- When shovel hits ground, calculate `inPit` and `distanceFromCenter`
- Call `onThrowResult(result)` with the result object
- Log result to console (temporary, until scoring exists)

### Step 5: Reset and repeat
- After landing, pause briefly (~0.5s), then reset shovel to player position
- Clear meter, return to idle state awaiting next touch input
- Ensure no input is accepted during flight or reset pause

---

## 8. NON-GOALS

- Scoring / points display
- Angle control by the player
- Shovel rotation or spin animation
- Sound effects
- Difficulty scaling
- Combo tracking
- Desktop-optimized layout
- Multiple throw types

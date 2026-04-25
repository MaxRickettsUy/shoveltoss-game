# Shovel Toss — App Seed Spec (Mobile-First MVP)

---

## 🧠 Core Idea

Shovel Toss is a mobile-first, 2D side-view arcade timing game inspired by NBA Jam aesthetics, where players throw shovels into a dirt pit for points.

The game is designed for fast, satisfying one-thumb interaction on mobile browsers, emphasizing timing skill and arcade physics over realism.

---

## 🎯 Player Objective

The player’s goal is to score as many points as possible by successfully throwing shovels into a target pit.

Higher accuracy, consistent timing, and combo streaks increase score.

Gameplay is structured as short, replayable runs optimized for mobile sessions.

---

## 🔁 Core Game Loop

Tap / hold input → charge throw meter → release input → shovel launches with arc physics → shovel lands (or misses) → score resolves → repeat with increasing difficulty.

The loop is designed to complete in ~5–10 seconds per throw for mobile pacing.

---

## 🎮 Core Mechanics (MVP Scope)

### Player Interaction (MOBILE-FIRST)
- Single-thumb touch input only
- Tap or hold to control throw meter
- Release triggers throw
- No keyboard dependency (optional fallback only)

---

### Throw System
- Timing-based power meter (Madden / Retro Bowl style)
- Touch-driven charge and release mechanic
- Power and optional angle determine projectile arc
- Predictable arcade-style physics (not realistic simulation)

---

### Physics
- 2D arc-based projectile motion
- Simple constant gravity model
- Deterministic flight path per input
- Collision detection with pit zone

---

### Scoring
- Points awarded for landing shovel in pit
- Bonus points for center accuracy
- Combo multiplier for consecutive successful throws
- Score resets per run (arcade loop style)

---

### Difficulty Scaling (MVP-lite)
- Gradual increase in timing difficulty over run
- Optional speed increase in throw meter
- Optional distance or precision tightening over time
- Designed for short mobile play sessions

---

## 🧍 Game Presentation

- 2D side-view (NBA Jam-inspired framing)
- Mobile-first layout (portrait orientation preferred)
- Fixed player position (no movement system)
- Large, readable arcade visuals
- High contrast feedback for mobile screens

---

## 🏆 MVP Features Only

- Single-player mode only
- Fixed player position (no movement)
- Touch-based throw system
- Score tracking per run
- Increasing difficulty curve
- Restart loop for replayability

---

## 🌐 Future Features (Explicitly OUT OF SCOPE)

- Multiplayer (local or online)
- Player movement systems
- Cosmetics or customization
- Power-ups or special shovel types
- Progression / upgrade systems
- Multiple arenas or environments
- Persistent meta-progression

---

## 🧱 Technical Constraints (Light Guidance Only)

- Must run in mobile browsers
- Canvas-based rendering preferred
- No backend required for MVP
- No heavy game engine dependency
- Vanilla JavaScript preferred for simplicity
- Touch input is primary interaction method
- Must perform well on mobile devices

---

## ⚠️ Non-Goals

- No complex physics engine
- No simulation-grade realism
- No inventory or upgrade systems
- No persistent account progression
- No multiplayer implementation in MVP
- No desktop-first UX assumptions

---

## 🧠 Design Philosophy

- Mobile-first, arcade-second
- One-thumb gameplay is the primary constraint
- Fast feedback loops (<10 seconds per interaction)
- Favor clarity and feel over realism
- Keep systems minimal and composable
- Build for “fun in first 30 seconds”

---

## 🎯 Success Definition (MVP)

The MVP is successful if:

- A player can repeatedly throw shovels using touch input
- The throw meter feels responsive and satisfying on mobile
- Shovel follows predictable arc physics
- Landing in pit reliably scores points
- The gameplay loop is fun within 30–60 seconds of play
- The game is playable comfortably on a phone screen with one hand
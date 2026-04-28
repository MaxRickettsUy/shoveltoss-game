# Plan: Game Loop — Lives-Based Progression

**Target system:** scoring-system / game-loop

**User feedback:**
- 5-throw limit feels arbitrary and short
- Players want a longer run that ends on failure, not on a counter
- No persistence of best score across attempts in a session

**Hypothesis:**
Switching from a fixed throw count to a 3-miss lives system will extend session length, increase tension, and make high scores meaningful. Persisting a session high score (until tab refresh) gives players a clear goal to beat.

## 1. GOAL
Replace the fixed 5-throw cap with unlimited throws gated by a 3-miss lives counter, and track an in-session high score that resets on tab refresh.

## 2. CHANGE DESCRIPTION
- Remove the throw limit (`maxThrows` / `throwsRemaining` logic).
- Add a `missesRemaining` counter, initialized to 3.
- Decrement `missesRemaining` only on a miss outcome (not on a successful stick).
- Game ends when `missesRemaining === 0`.
- Track `highScore` in module-level memory (no localStorage). Update when `score > highScore` at end-of-run or in real time.
- Display lives remaining in the HUD (placement TBD by HUD plan).

## 3. EXPECTED EFFECT
- Runs last longer for skilled players, shorter for new players.
- High score creates a self-driven retry loop without persistence complexity.
- Game-over trigger now tied to skill failure, not arbitrary cap.

## 4. IMPLEMENTATION STEPS
1. In game state init, replace `throwsRemaining` with `missesRemaining = 3`. Remove any `maxThrows` constant.
2. In throw-resolution logic, decrement `missesRemaining` only on miss; trigger game-over when it hits 0.
3. Add `highScore` to game state (in-memory only). Update on score change; carry across runs within the same tab session.
4. Update HUD to render lives remaining and high score (delegate exact placement to HUD plan).

## 5. ROLLBACK STRATEGY
Revert the commit. Restore `throwsRemaining` constant and original game-over condition. `highScore` is in-memory only, so no data cleanup needed.

## 6. NON-GOALS
- No persistent high score across sessions (no localStorage).
- No new game-over UI/animations.
- No difficulty scaling based on streak/score.
- No multiple lives indicators beyond a single counter.

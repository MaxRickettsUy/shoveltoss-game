# Feature Plan: In-Game Score Celebrations

## Scope

Add three score-crossing celebrations that fire during PLAYING:

1. **100-point milestone** (once per run): burst of 💯 emoji confetti.
2. **All-time high score pass** (once per run): burst of 👑 emoji confetti, only fires if the player isn't already the current leader.
3. **Every 20-point boundary** (20, 40, 60, …): big high-energy phrase (e.g., "LETS GO", "SHEEEEESH") drawn over the play area for ~1.2s.

All triggers fire on score crossing — i.e., the boundary lies in `(prevScore, newScore]` — so a single +3 stick that goes 99→102 still triggers the 100 burst.

Out of scope: sound effects, screen shake, persisted "longest streak" stats, network-driven celebration broadcasts, customizable phrases.

## Files Touched

- `index.html`

## Design Notes

- **Library**: [`canvas-confetti`](https://www.npmjs.com/package/canvas-confetti) via `https://esm.sh/canvas-confetti@1`. It creates its own absolutely-positioned overlay canvas at z-index above the game canvas — no conflict. It exposes `confetti.shapeFromText({ text })` for emoji-shaped particles.
- **Single trigger point**: all crossings checked in a new `triggerCelebrations(prevScore, newScore)` called immediately after `scoring.score += scoring.lastThrowPoints` (index.html:897). Crossing semantics keep us correct when a throw skips a boundary.
- **One-shot flags per run**: `celebration.firedHundred` and `celebration.firedAllTime` so milestones fire at most once per run. Reset in the run-init block at index.html:856.
- **All-time high score reference**: `leaderboard.globalRows[0]?.score` when `leaderboard.globalStatus === 'ready'`. If unknown (offline/loading), skip the all-time trigger silently. Also skip if `isScoreLeaderUsername(username.get())` is true (don't celebrate beating yourself).
- **Phrase rendering**: canvas-drawn, separate state from `scoring.feedbackTimer` so the +zone label and the celebration phrase can coexist without one stomping the other. Drawn after HUD, before the game-over overlay.
- **Phrase pool**: small fixed list, picked by `(boundary / 20 - 1) % phrases.length` so the same boundary always shows the same phrase within a run (avoids surprise variance), but consecutive boundaries differ.
- **Performance**: `canvas-confetti` is GPU-friendly and self-cleans. No need to gate it on device class.

## Implementation Steps

### Step 1 — Load `canvas-confetti` and prepare emoji shapes

The current `<script>` at index.html:36 is non-module. Add a small ES-module script *before* it:

```html
<script type="module">
  import confetti from 'https://esm.sh/canvas-confetti@1';
  window.confetti = confetti;
  window.celebrationShapes = {
    hundred: confetti.shapeFromText({ text: '💯', scalar: 2 }),
    crown:   confetti.shapeFromText({ text: '👑', scalar: 2 }),
  };
</script>
```

Shape registration is one-time and cheap; doing it on load avoids a flash on first crossing. If the import fails (offline), `window.confetti` stays undefined and triggers no-op (handled in Step 3).

### Step 2 — Celebration state + phrase pool

Near the `scoring` object (search for `scoring.score = 0` at index.html:856), add a sibling object — declare it once near the other top-level state:

```js
const celebration = {
  firedHundred: false,
  firedAllTime: false,
  phraseText: '',
  phraseTimer: 0, // ms remaining
};
const CELEBRATION_PHRASES = ['LETS GO', 'SHEEEEESH', 'ON FIRE', 'INSANE', 'CRACKED', 'NO WAY', 'UNREAL', 'COOKING'];
const CELEBRATION_PHRASE_DURATION = 1200; // ms
```

Reset block — in the run-init that already zeroes `scoring` (index.html:856–859), append:

```js
celebration.firedHundred = false;
celebration.firedAllTime = false;
celebration.phraseText = '';
celebration.phraseTimer = 0;
```

### Step 3 — `triggerCelebrations(prev, next)` and call site

Add the function near `submitGlobalScore` / `getScoreLeaderName` (around index.html:604):

```js
function crossedBoundary(prev, next, boundary) {
  return prev < boundary && next >= boundary;
}

function fireConfetti(shape, particleCount) {
  if (!window.confetti) return;
  window.confetti({
    particleCount,
    spread: 90,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.6 },
    shapes: [shape],
    scalar: 2,
    ticks: 200,
  });
}

function triggerCelebrations(prev, next) {
  if (next <= prev) return;

  // 1. 100-point milestone
  if (!celebration.firedHundred && crossedBoundary(prev, next, 100)) {
    celebration.firedHundred = true;
    fireConfetti(window.celebrationShapes?.hundred, 100);
  }

  // 2. All-time high score pass
  if (!celebration.firedAllTime && leaderboard.globalStatus === 'ready' && leaderboard.globalRows.length > 0) {
    const topScore = Number(leaderboard.globalRows[0].score) || 0;
    const isSelf = isScoreLeaderUsername(username.get());
    if (!isSelf && topScore > 0 && crossedBoundary(prev, next, topScore + 1)) {
      celebration.firedAllTime = true;
      fireConfetti(window.celebrationShapes?.crown, 120);
    }
  }

  // 3. Every-20 phrase — pick the highest boundary crossed this throw
  const lastBoundary = Math.floor(next / 20) * 20;
  if (lastBoundary >= 20 && lastBoundary > prev) {
    const idx = (lastBoundary / 20 - 1) % CELEBRATION_PHRASES.length;
    celebration.phraseText = CELEBRATION_PHRASES[idx];
    celebration.phraseTimer = CELEBRATION_PHRASE_DURATION;
  }
}
```

Note: 100 is also a multiple of 20, so the player will get **both** the confetti burst *and* the phrase at 100 — desired (intensifies the moment). The phrase at 100 picks index `(5 - 1) % 8 = 4` ("CRACKED").

For the all-time-high boundary we use `topScore + 1` because the celebration should fire on **passing**, not tying.

Insert the call right after the score mutation at index.html:897:

```js
const prevScore = scoring.score - scoring.lastThrowPoints;
triggerCelebrations(prevScore, scoring.score);
```

### Step 4 — Render the phrase

In the play-screen draw function (the section that already handles `scoring.feedbackTimer` rendering at index.html:1692), add **after** that block:

```js
if (celebration.phraseTimer > 0) {
  celebration.phraseTimer = Math.max(0, celebration.phraseTimer - dt * 1000);
  const t = celebration.phraseTimer / CELEBRATION_PHRASE_DURATION; // 1 → 0
  const alpha = Math.min(1, t * 1.4);
  const scaleBoost = 1 + (1 - t) * 0.25; // grows slightly as it fades
  const fontSize = Math.max(48, Math.floor(canvas.width * 0.13)) * scaleBoost;
  ctx.globalAlpha = alpha;
  drawText(celebration.phraseText, canvas.width / 2, canvas.height * 0.4, fontSize, '#ffe600', 'center', true);
  ctx.globalAlpha = 1;
}
```

The decrement piggybacks on the existing `dt` already used by the adjacent `scoring.feedbackTimer` decrement at index.html:1418–1419. If `dt` isn't in scope at the draw site, decrement it inside the existing `update`/tick block instead and only draw here.

### Step 5 — Manual test plan

- Throw to score 99, then a +3 stick to 102: 💯 confetti fires once; phrase "CRACKED" appears.
- Continue to 120: 💯 does **not** refire; phrase "NO WAY" appears.
- Score 0 → 19 → 20 (single +1 throw): phrase "LETS GO" fires.
- Score 19 → 22 in one throw: phrase fires for the 20 boundary (highest crossed this throw).
- With leaderboard loaded and player ≠ current top: cross top+1 → 👑 confetti fires once; further passes don't refire.
- Player **is** current top score holder: cross own top → no 👑 confetti.
- Leaderboard offline / loading: 👑 trigger silently skipped, others still work.
- Start a new run: all flags reset; 100/top/phrase can fire again.
- Confetti overlay disappears on its own (~3s); doesn't capture taps or block input.
- Game over screen renders cleanly even if a celebration was active when the run ended.

### Step 6 — Release-checklist note

Bump `APP_VERSION_TAG` (index.html:221) and prepend a `releaseNotes.js` entry: "Score celebrations — 100-point and high-score confetti, every-20-point hype phrases."

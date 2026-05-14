# Dead & Unused Code — Cleanup Plan

Audit of `index.html`, `src/config.js`, `src/globalScores.js`, `src/releaseNotes.js`.

Scope: identify symbols that are declared but never read, functions that are defined but never called, and obviously-dead branches. Refactor opportunities (DRY, dead-flag guards) are listed separately and are lower priority.

Do NOT implement from this plan — it is research only. Each tier is independent; cherry-pick what to land.

---

## Tier 1 — High-confidence dead code (mechanical removals)

### 1.1 `drawHome()` and its supporting machinery (~120 lines)

`drawHome()` (`index.html:3984-4081`) is the canvas-rendered home screen. The `gameLoop()` calls it only when `landingEl` is falsy:

```
index.html:3104-3109
if (run.state === RUN_STATE.USERNAME) {
  if (landingEl) showLanding();
  else drawHome(timestamp);
  if (!usernameOverlayEl) openUsernameOverlay(RUN_STATE.HOME);
} else if (run.state === RUN_STATE.HOME) {
  if (landingEl) showLanding();
  else drawHome(timestamp);
}
```

`landingEl = document.getElementById('landing')` at `index.html:307`, and the `#landing` DOM element is hard-coded in `index.html:267-293`. It is never removed. So `landingEl` is always truthy and `drawHome()` is unreachable.

Removing `drawHome()` lets us also remove:

| Symbol | Location | Why it dies with drawHome |
|---|---|---|
| `homeButtonRects` | `index.html:437` declaration; populated only inside `drawHome` at 4041, 4056 | Read only in the HOME branch of `onPressStart` (2619-2645), which is gated by `if (isLandingVisible()) return;` (2610). Since the landing overlay is always visible in HOME state, that loop is unreachable. |
| `footerGithubRect` | `index.html:438`; set only inside `drawHome` at 4078 | Read only inside the same dead HOME branch (2615). |
| `githubImg`, `githubReady` | `index.html:351-354` | Drawn only inside `drawHome` at 4072-4076. |
| `openSourceCode()` | `index.html:2602-2605` | Only call site is the dead `footerGithubRect` branch (2616). |
| `SOURCE_CODE_URL` constant | `index.html:624` | Only consumed by `openSourceCode()`. |
| `usernameNameRect` | `index.html:431`; set in `drawHome` (4000, 4017), set to null in `drawCharacterSelect` (4835) | Read at 2611 (HOME branch of `onPressStart`, dead) and 2672 (SELECTING branch, also dead because `drawCharacterSelect` always sets it to null at 4835). The "tap to edit" affordance is now the DOM `#landing-player` button (handled at `index.html:826-828`). |
| HOME branch of `onPressStart` | `index.html:2609-2664` | The `if (isLandingVisible()) return;` early-exit on line 2610 makes the entire branch dead in steady state. Can be reduced to a no-op return (or removed if HOME state never reaches `onPressStart` on canvas — verify). |

After removal, the `gameLoop` HOME/USERNAME branches simplify to just `showLanding();` (+ the username overlay re-open guard).

**Risk:** Verify that the canvas does not need to be cleared/painted underneath the landing overlay. The landing DOM is opaque (`background: radial-gradient(...)` at `index.html:55`), so the canvas behind it is invisible. Should be safe.

### 1.2 `drawStubScreen()` and `stubBackRect`

`drawStubScreen()` at `index.html:4428-4448` and `stubBackRect` at `index.html:439`. No call sites anywhere. Pure dead code — drop both.

### 1.3 State variables that are written but never read

| Symbol | Declared | Written | Read |
|---|---|---|---|
| `versusRecordRect` | `index.html:518` | `4115` (assigned `null`) | nowhere |
| `versusRecordFetchedFor` | `index.html:532` | `1203` | nowhere |
| `versusLastPolledMatchId` | `index.html:543` | `1344, 1354` | nowhere |
| `leaderboard.globalError` | `index.html:886` | `1042, 1061, 1411` | nowhere |
| `playerDetailError` | `index.html:500` | `1034, 1141` | nowhere — the error state is never shown to the user |

`playerDetailError` is the most interesting: the playerDetail screen does not render an offline/error state, while `versusHistoryError` (the analogous variable) does (`index.html:4376`). Two options:
- (a) Delete `playerDetailError` and the dead branch is gone.
- (b) Decide an error path is wanted and wire it into `drawPlayerDetail` next to the existing "Loading…" / "no scores" empty states.

Prefer (a) unless the missing UX is intentional.

### 1.4 `createInviteMatch()` in `globalScores.js`

`src/globalScores.js:314-330`. Never called from `index.html`, `releaseNotes.js`, or any other source file. Originally the open-invite flow; superseded by `createDirectChallenge`. Remove the method.

**Side effect:** CLAUDE.md (line about "globalScores.createInviteMatch() or createDirectChallenge() creates a match") is then stale. Update CLAUDE.md in the same change.

### 1.5 `getLatestNote()` in `releaseNotes.js`

`src/releaseNotes.js:130-132`. Exported on `window.releaseNotes` but never called — every consumer uses `getLatestNotes(3)`. Remove the function and stop exporting it.

### 1.6 Always-true defensive guard

```
index.html:1173-1175
window.globalScores.fetchRecentResultsForUser
  ? window.globalScores.fetchRecentResultsForUser(name)
  : Promise.resolve([]),
```

`fetchRecentResultsForUser` is always defined on the `globalScores` object (`globalScores.js:402`). Replace with the direct call.

---

## Tier 2 — Refactor opportunities (DRY, dead branches)

These are not strictly dead — they work — but they carry risk: a code change in one spot can drift from the other copies.

### 2.1 `PROD_APEX` is duplicated three times

`'shoveltoss.ing'` lives in:
- `src/config.js:5`
- `src/globalScores.js:4`
- `index.html:620`

Both `config.js` and `globalScores.js` also recompute `isProductionHost` from scratch (`config.js:9`, `globalScores.js:10-14`), and `index.html:1433-1436` (`isDevMode`) has the same logic inverted. Three independent definitions of the same predicate.

**Recommendation:** export `PROD_APEX` and an `isProductionHost()` helper from `src/config.js`. Import in `globalScores.js`. For `index.html` (no module scope), expose `window.shovelHost = { isProduction }` from `globalScores.js` and replace the inline check.

Low urgency, but if the prod hostname ever changes (custom domain, staging environment, etc.), three places must move in sync today.

### 2.2 `VERSUS_ENABLED` is hard-coded to `true`

`index.html:621`. The kill-switch guards `if (!VERSUS_ENABLED) return` at 691, 1162, 1199, 1208, 1220, 1228, 2149, 2198 and the `VERSUS_ENABLED ? ... : ...` conditional at 4025, 5190 are all dead branches under the current value.

Two choices:
- (a) Remove the constant and the guards. Cleaner, less code.
- (b) Document the kill-switch intent in a comment so future readers know not to delete it.

Note that `drawHome` (Tier 1.1) is one of the consumers — option (a) compounds nicely with that removal.

### 2.3 `drawText`'s `italic` parameter

`index.html:3239` defines `drawText(text, x, y, fontSize, color, align, bold, italic = false)`. No call site ever passes `italic = true` (grep confirms). Remove the parameter and the `${italic ? 'italic ' : ''}` branch — saves one minor concat per draw call, which fires ~10× per frame.

### 2.4 Dead-feeling click handlers in `onPressStart`

Once `drawHome` is gone (Tier 1.1), the HOME branch of `onPressStart` (2609-2664) can be deleted entirely. The SELECTING branch's `if (pointerInRect(usernameNameRect))` (2672-2675) is also unreachable since `drawCharacterSelect` nulls the rect at 4835 — drop it.

---

## Tier 3 — Documentation drift

These are not code, but they will be wrong after Tier 1 lands:

- **CLAUDE.md** mentions `globalScores.createInviteMatch()` as part of the versus flow. After Tier 1.4 this method is gone — update the architecture note to reflect that only `createDirectChallenge()` exists.

---

## Suggested ordering

1. **Tier 1.3 + 1.4 + 1.5 + 1.6** first — pure removals, no behavior change, tiny diff. Easy to review.
2. **Tier 1.2** (`drawStubScreen`) — trivial.
3. **Tier 1.1** (`drawHome` and friends) — the big one. Land it on its own commit. Manual smoke test: open the app on prod and on `localhost`, confirm HOME state shows the DOM landing screen, version + flag appear in the footer, all six buttons route correctly, "tap to edit" still works.
4. **Tier 2.4** as a follow-up to 1.1 (same area, easier to reason about once 1.1 is in).
5. **Tier 2.1** (PROD_APEX consolidation) — independent, can land any time.
6. **Tier 2.2 / 2.3** — opportunistic.

---

## What was investigated and is NOT dead

For the record, so a future pass doesn't re-examine these:

- `champShovelImg` / `champShovelReady` / `CHAMPION_IDS` — used by `drawLifeIcons` (3271) and `draw` (3422) to swap the shovel sprite for champion characters.
- `NEW_CHARACTER_IDS`, `LADY_CHARACTER_IDS` — used by `getFilteredCharacters` and `getCharacterFilterCount` (2521-2533) and the NEW-badge render (4978).
- `flippedCardCache`, `cardFlipAnimations` — live in the character-select card-flip flow.
- `versusError`, `versusHistoryError` — both rendered (4137, 4376).
- `seenResults` / `IN_PROGRESS_MATCH_KEY` / challenge rate-limit functions — all read.
- `versusLastFetch`, `versusPendingFetchedAt` — used as throttles (1167, 1223).
- `versusRankRows` / `versusRankRects` — used by `drawVersusHome` and its hit-testing.
- `drawDevTestButtons`, `triggerDevTest`, `isDevMode` — gated dev-only path, live.
- `drawPitFallback` — fallback when pit asset isn't ready yet (3380).
- `landing-flag` `<span>` in the DOM footer — purely decorative (flag emoji); not JS-referenced but visible content.

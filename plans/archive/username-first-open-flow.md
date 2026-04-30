# Plan: Username Captured on First Open

**Target system:** ui-system / persistence / scoring-integration

**User feedback:**
- Entering a name after every game is annoying
- Want a single username captured the first time the game opens, stored locally, and reused everywhere
- Username should be visible on the character-select screen and in the HUD during play
- Username should be sent automatically with every leaderboard entry

**Hypothesis:**
Capturing the username once at first open and persisting it in localStorage removes friction from the game-over loop, gives the player a sense of identity throughout the run, and simplifies the leaderboard submission code path.

## 1. GOAL
Capture the player's username on first app open, persist it in localStorage, display it on the character-select screen and in the HUD, and use it automatically for all leaderboard entries.

## 2. CHANGE DESCRIPTION
- localStorage key: `shoveltoss.username` (string, length 1–20, trimmed).
- On app boot, before reaching `RUN_STATE.SELECTING`: if the key is missing or empty, show a username-entry overlay. Submitting persists the value and proceeds to character select.
- Character-select screen: render the username near the top (tap/click to edit — opens the same overlay, prefilled).
- HUD during `RUN_STATE.PLAYING`: render the username in the top-right corner using existing `HUD_PAD` for spacing.
- Leaderboard submission (local + global): always read `shoveltoss.username` at submit time; never prompt on game-over.
- Validation on entry: trim whitespace; reject empty; cap to 20 characters.

**Supersedes** the per-game name-entry behavior in [plans/high-scores-crud-local.md](high-scores-crud-local.md) and [plans/high-scores-global-supabase.md](high-scores-global-supabase.md). Those plans should drop their game-over prompt step and read `shoveltoss.username` directly.

## 3. EXPECTED EFFECT
- First-time players enter their name once and never see the prompt again.
- Username is visible at character-select and during play, reinforcing identity.
- Game-over flow becomes faster — score is recorded silently with the stored name.
- Players can rename via a tap on the character-select screen.

## 4. IMPLEMENTATION STEPS
1. Add a `username` module: `get()` reads `localStorage.shoveltoss.username`, `set(name)` validates (trim, 1–20 chars) and writes. Add a boot-time check before character select; if `get()` is empty, render a minimal overlay (input + submit) and block until set.
2. On the character-select screen draw, render the username near the top of the screen. Add a tap/click hit-region on the username that re-opens the entry overlay (prefilled). After save, return to character select.
3. In the HUD draw path (active when `run.state === RUN_STATE.PLAYING`), render the username at top-right, padded by `HUD_PAD`. Match the existing HUD font/style.
4. In the leaderboard submission code paths (local store + Supabase submit), replace any name-prompt logic with a direct read from `username.get()`. Skip submission entirely if it's somehow empty (defensive — shouldn't happen given the boot gate).

## 5. ROLLBACK STRATEGY
Revert the commit. Remove the `username` module, the boot-time overlay, the HUD render, and the character-select display. Stale `shoveltoss.username` keys in localStorage are harmless without the reader code.

## 6. NON-GOALS
- No accounts, sync, or cross-device username portability.
- No username uniqueness check (collisions on the leaderboard are allowed).
- No profanity filter or moderation.
- No avatars, colors, or other identity customization.
- No multiple profiles on the same device.
- No display of the username on the game-over screen (HUD-only during play).
- No keyboard shortcut to edit username during play.
- No analytics or telemetry on username entry.

# Plan: Character & Sprite Sheet Generator Site

**Target system:** new standalone website (not part of Shovel Toss runtime)

**User feedback:**
- Need a faster way to produce characters and sprite sheets that match the established visual prompts
- Want to reuse `prompts/hero-character.md` and `prompts/sprite-sheet-og.md` as the canonical templates

**Hypothesis:**
A minimal one-page tool that takes an archetype, generates a hero render, then generates a matching sprite sheet using the hero as a reference image, will produce on-style assets in a single workflow without manual prompt copy-paste.

## 1. GOAL
Stand up a single-page website where the user enters a character archetype, clicks generate, and receives both a hero render and a 3-frame sprite sheet — produced from the existing prompt templates.

## 2. CHANGE DESCRIPTION
- New project at `tools/character-generator/` (or a separate repo — pick one and document).
- Stack: Vite + TypeScript + plain HTML/CSS, plus a single serverless function (Vercel / Netlify / Cloudflare Worker) to proxy the image API and hide the key.
- API: OpenAI `gpt-image-1`. Hero call uses `images.generate`; sprite-sheet call uses `images.edit` with the hero image as the reference input.
- Prompts loaded from `prompts/hero-character.md` and `prompts/sprite-sheet-og.md` at build time. `[ARCHETYPE]` is substituted from the form.
- UI: one input (archetype text), one "Generate" button, two output panels (hero, sprite sheet), download buttons under each.
- Loading + error states inline; no toasts or modals.

## 3. EXPECTED EFFECT
- Producing a new character takes ~30s of waiting and one form submission.
- Output style stays consistent because the templates are the single source of truth.
- No image API key exposed in the browser.

## 4. IMPLEMENTATION STEPS
1. Scaffold `tools/character-generator/` with Vite + TS. Add a serverless function (`api/generate-hero.ts`, `api/generate-sprite.ts`) that proxies OpenAI `images.generate` and `images.edit`. Read `OPENAI_API_KEY` from env.
2. Bundle the two prompt files as imported strings. In the hero handler, replace `[ARCHETYPE — e.g., ...]` with the submitted archetype. In the sprite handler, send the prompt text plus the hero image bytes as the reference.
3. Build the page: archetype input, Generate button, two `<img>` slots, two download links. Wire submit → call hero endpoint → render hero → call sprite endpoint with hero blob → render sprite sheet.
4. Add minimal error handling: surface API errors inline; disable the button while in flight. Document local dev (`OPENAI_API_KEY` in `.env`) and deploy steps in a short README.

## 5. ROLLBACK STRATEGY
Delete the `tools/character-generator/` folder (or archive the separate repo). Revoke the OpenAI key. No runtime impact on Shovel Toss.

## 6. NON-GOALS
- No accounts, auth, or per-user state.
- No history, gallery, or saved generations.
- No batch generation, queueing, or retries beyond a single attempt.
- No model picker, parameter tuning, or prompt editing in the UI.
- No image post-processing (downscaling, palette quantization, sheet packing).
- No integration with the Shovel Toss game runtime.
- No payment, rate limiting, or abuse protection beyond the API key being server-side.
- No alternative image providers in v1.

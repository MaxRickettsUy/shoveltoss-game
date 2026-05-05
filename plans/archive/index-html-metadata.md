# Feature Plan: HTML Head Metadata

## Scope

Add SEO + social-preview + favicon metadata to `index.html` so that shoveltoss.ing renders a proper title/description/preview when shared (Slack, iMessage, Twitter, Discord, search engines) and shows a real icon in browser tabs and bookmarks. PWA manifest is out of scope (covered by `plans/pwa-install.md`).

## Files Touched / Added

- `index.html` (head additions only)
- `assets/favicon.png` (new — 32×32 or 64×64, derived from `assets/shovel.png`)
- `assets/share.png` (new — 1200×630, social preview image; can start as a copy of `docs/buck-lil-italy.png` and replace with a purpose-built image later)

## Implementation Steps

### Step 1 — Add SEO description + canonical

Inside `<head>` (after the existing `<title>`):

```html
<meta name="description" content="Shovel Toss: The Game. Stick the shovel, top the leaderboard.">
<link rel="canonical" href="https://shoveltoss.ing/">
```

Description must be ≤155 chars (truncated by Google). Update if the game's pitch changes.

### Step 2 — Add Open Graph tags (Slack / iMessage / Discord / Facebook previews)

```html
<meta property="og:type" content="website">
<meta property="og:site_name" content="Shovel Toss">
<meta property="og:title" content="Shovel Toss">
<meta property="og:description" content="Shovel Toss: The Game. Stick the shovel, top the leaderboard.">
<meta property="og:url" content="https://shoveltoss.ing/">
<meta property="og:image" content="https://shoveltoss.ing/assets/share.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

`og:image` must be an absolute URL — relative paths break previews on most platforms.

### Step 3 — Add Twitter Card tags

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Shovel Toss">
<meta name="twitter:description" content="Shovel Toss: The Game. Stick the shovel, top the leaderboard.">
<meta name="twitter:image" content="https://shoveltoss.ing/assets/share.png">
```

### Step 4 — Add favicon + apple touch icon

Generate `assets/favicon.png` (recommended 32×32 PNG, transparent background, derived from the shovel mark — manual step in any image editor or via `sips`). Then:

```html
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/favicon.png">
```

A single PNG is enough for modern browsers; skip `.ico` unless legacy IE matters.

### Step 5 — Add theme-color + author

```html
<meta name="theme-color" content="#1a1a2e">
<meta name="author" content="Max Ricketts-Uy">
```

`theme-color` tints the browser chrome on Android Chrome and iOS Safari (when added to home screen).

## Constraints

- All paths in OG/Twitter image URLs must be absolute (`https://shoveltoss.ing/...`) — relative paths fail.
- Favicon path is relative (`/assets/favicon.png`) so it works in dev (`localhost`) and prod alike.
- No HTML structure changes outside `<head>`.

## Edge Cases

- Local dev (`localhost`) — `og:url` will still point at prod; not a concern since dev URLs aren't shared.
- `share.png` is sized 1200×630 (the universal social preview spec). Smaller images get pixelated when scaled; non-2:1 aspects get cropped center-out.
- `description` is shown by Google in search results; keep it punchy.

## Verification

1. After deploy, paste `https://shoveltoss.ing` into Slack/iMessage/Twitter — preview should show title, description, and image.
2. Use [opengraph.xyz](https://www.opengraph.xyz) or [metatags.io](https://metatags.io) to lint.
3. View page source on prod and confirm all tags rendered.
4. Check browser tab — favicon should appear within a few seconds of load.

## Out of Scope

- PWA manifest / installable app (separate plan).
- Structured data (JSON-LD) — game-specific schema; defer until search indexing matters.
- Localized metadata (`og:locale`, alternate language tags) — English-only for now.

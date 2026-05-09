# Plan: Full character image zoom

## Related
Sits alongside `plans/character-picture-frame.md`, `plans/character-image-placeholders.md`, and `plans/character-name-plaque.md`. Independent of those, but the new icon button must coexist with the existing flip button (bottom-right) and the NEW / champion badges.

## Behavior target
- Each character tile on the SELECTING screen gets a small expand-icon button in the bottom-left corner.
- Tapping the icon opens a modal that shows the full hero image at its native aspect ratio, no cropping.
- Tapping outside the image, the close button, or pressing Esc closes the modal.
- The icon does NOT trigger character selection or card flip — those handlers must be checked first and bail when the expand-icon hit-rect fires.

## Visual target
- Icon: Font Awesome `fa-up-right-and-down-left-from-center` (expand) at ~`tileW * 0.18` square, centered in a small rounded-square hit area sized like the existing flip button.
- Color: `THEME.text` glyph on a translucent dark backplate (`rgba(0,0,0,0.35)`) for visibility against varied hero art.
- Modal: HTML overlay matching the style of the other dialogs (Settings / How to Play / What's New): `THEME.bgTop` card, `THEME.secondary` 2px border, image centered, character ID heading on top, single "Close" button styled like the existing primary buttons (`THEME.accent` / `THEME.bgTop`).
- The image inside the modal scales to fit `min(80vh, container)` without upscaling beyond its natural size.

## Implementation Steps

### 1. State + hit-rect tracking
Near the other character-select state vars (~index.html:441):
```js
let cardExpandBtnRects = [];
let imageZoomOverlayEl = null;
```

### 2. Draw the expand icon per tile
In `drawCharacterSelect`, inside the front-face render block (after the hero image / placeholder, after the existing flip button code, ~index.html:3248–3265):

1. `const expandSize = Math.max(22, Math.floor(tileW * 0.18));`
2. `const expandX = x + 6;`
3. `const expandY = y + tileH - expandSize - 6;`
4. Draw a translucent rounded-rect backplate at `(expandX, expandY, expandSize, expandSize)`, radius 6, fill `rgba(0,0,0,0.35)`.
5. Draw the FA expand glyph centered in that rect:
   - `ctx.font = \`900 ${Math.round(expandSize * 0.55)}px "Font Awesome 6 Free", sans-serif\``
   - `ctx.fillStyle = THEME.text`, `textAlign = 'center'`, `textBaseline = 'middle'`.
   - Glyph: `` (FA `fa-up-right-and-down-left-from-center`). Fallback `'⤢'` when `!faReady`.
6. Push to `cardExpandBtnRects`:
   ```js
   cardExpandBtnRects.push({ id: character.id, x: expandX, y: expandY, w: expandSize, h: expandSize });
   ```
7. Skip drawing the icon when `faceFlipped` is true (the back of the card has its own UI).
8. Reset `cardExpandBtnRects = []` at the top of the draw loop alongside `cardFlipBtnRects = []`.

### 3. Pointer handling (~index.html:1789, before tile-tap)
In the `RUN_STATE.SELECTING` branch, **before** the tile-tap loop and **before** the `cardFlipBtnRects` loop:
```js
for (let i = 0; i < cardExpandBtnRects.length; i++) {
  const btn = cardExpandBtnRects[i];
  if (pointerInRect(btn)) {
    openImageZoomOverlay(btn.id);
    return;
  }
}
```
The early `return` prevents the tile underneath from also firing.

### 4. Modal open/close
Add functions near `openHowToPlayOverlay` / `closeHowToPlayOverlay`:

```js
function openImageZoomOverlay(characterId) {
  if (imageZoomOverlayEl) return;
  const character = CHARACTERS.find(c => c.id === characterId);
  if (!character) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;';

  const card = document.createElement('div');
  card.style.cssText = `background:${THEME.bgTop};color:${THEME.text};border:2px solid ${THEME.secondary};border-radius:10px;max-width:min(640px, 96vw);width:100%;padding:18px;display:flex;flex-direction:column;align-items:center;gap:14px;`;

  const title = document.createElement('h2');
  title.textContent = character.id;
  title.style.cssText = 'margin:0;font-size:20px;text-align:center;';
  card.appendChild(title);

  const img = document.createElement('img');
  img.src = character.heroImage;  // use the full hero asset path
  img.alt = character.id;
  img.style.cssText = 'max-width:100%;max-height:70vh;object-fit:contain;display:block;';
  card.appendChild(img);

  const close = document.createElement('button');
  close.textContent = 'Close';
  close.style.cssText = `padding:10px 24px;background:${THEME.accent};color:${THEME.bgTop};border:none;border-radius:6px;font-weight:bold;font-size:15px;cursor:pointer;`;
  close.addEventListener('click', closeImageZoomOverlay);
  card.appendChild(close);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeImageZoomOverlay(); });
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  imageZoomOverlayEl = overlay;
}

function closeImageZoomOverlay() {
  if (!imageZoomOverlayEl) return;
  imageZoomOverlayEl.remove();
  imageZoomOverlayEl = null;
}
```

(Confirm the actual hero-image source path on `CHARACTERS[i]` — pick whichever field is already used by `loadHeroImages` so we get the highest-quality available source.)

### 5. Esc-to-close
Extend the existing `keydown` listener (search for `usernameOverlayEl` close-on-Esc or similar) so that when `imageZoomOverlayEl` is present and `key === 'Escape'`, it calls `closeImageZoomOverlay()` and stops propagation.

### 6. Verify
- Tap expand icon on any tile: full image opens in modal, character name above, Close button below.
- Modal does not steal taps that should select the character: tapping just outside the icon still selects the tile.
- Card flip button still works and does not collide with the icon.
- Modal closes via: outside-click, Close button, Esc.
- Phone-landscape: icon is still tappable (≥ 22px hit area); modal max-height adapts via `70vh`.
- Card back (`faceFlipped`): no expand icon drawn, no hit-rect pushed.

## Out of Scope
- No zoom/pan inside the modal — image is fit-to-container only.
- No image preloading at higher resolution; uses the same asset already referenced by `loadHeroImages`.
- No change to flip button, tile selection, or character data.
- No analytics event for opening the modal.

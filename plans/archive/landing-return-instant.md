# Plan: Make landing return instant after first reveal

## Diagnosis
The landing overlay re-fades in every return to HOME. Two contributors:

1. `#landing` has `transition: opacity 200ms ease` (index.html:60). Default state is `opacity: 0`; visible state is `opacity: 1`.
2. `showLanding()` (index.html:605–626) sets `data-state='showing'` (opacity 0), then on the next `requestAnimationFrame` flips to `'visible'`. The rAF commits the opacity-0 frame so the full 200ms fade always plays — even on a return visit.

`hideLanding()` (index.html:629) also delays `display: none` by 220ms via `setTimeout`, but that's invisible to the user because canvas screens paint on top.

The first-load child animations (`landingTitleIn`, `landingFadeIn`, `landingBtnIn`) are already gated on `landingAnimatedOnce` — they don't replay. So the container fade is the entire perceived delay (~200–220ms per return).

## Behavior target
- First show (boot): keep current 200ms fade-in for the intro feel.
- Every subsequent show (back from any subscreen): instant.
- Hide stays as-is for the first transition; instant after that.

## Implementation Steps

### 1. Add a CSS opt-out class for the opacity transition (~index.html:60)
```css
#landing.landing--instant { transition: none; }
```

### 2. Branch `showLanding()` on `landingAnimatedOnce` (~index.html:605)
- If `landingAnimatedOnce === true`: add `landing--instant`, set `landingEl.dataset.state = 'visible'` synchronously (skip the rAF), keep the existing `landing--no-anim` add.
- Else (first show): keep current behavior — rAF flip, remove `landing--no-anim`, set `landingAnimatedOnce = true`.

### 3. Match `hideLanding()` to the instant path after first show (~index.html:629)
- If `landingAnimatedOnce === true`: ensure `landing--instant` is present, set `landingEl.style.display = 'none'` immediately, no 220ms timer.
- Else: keep current behavior. (In practice hide always follows a show, so this branch will rarely fire pre-first-show.)

### 4. Manual verification
- First load: landing fades in over 200ms (unchanged).
- From any subscreen → home: landing appears instantly, no flash.
- Title/button reveal animations do NOT replay on return.
- Hide → re-show → hide → re-show: still instant.

## Out of Scope
- No changes to canvas screens or first-load reveal animations.
- No changes to `landing-spot` drift / fonts / colors.

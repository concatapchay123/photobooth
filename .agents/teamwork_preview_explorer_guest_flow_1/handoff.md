# Handoff Report - Guest Flow Transition Analysis

## 1. Observation
We investigated the guest transitions, slider track layout, and screen animations in `src/App.jsx` and `src/useGuestAnimations.js`. The following specific pieces of code were observed:

1. **Card Entrance Animation in `src/App.jsx` (Lines 2470-2481)**:
   ```javascript
   // Smooth entrance for active step content card
   const activeStepId = stepsList[stepIndex];
   const activeSection = document.getElementById(`guest-${activeStepId}`);
   if (activeSection) {
     const card = activeSection.querySelector('.pink-card, .pink-hero-shell');
     if (card) {
       gsap.fromTo(card, 
         { opacity: 0 }, 
         { opacity: 1, duration: 0.5, delay: 0.1, ease: 'power2.out', overwrite: 'auto' }
       );
     }
   }
   ```
2. **Card Entrance Animation in `src/useGuestAnimations.js` (Lines 14-19)**:
   ```javascript
   // Animate elements entering the new step
   tl.fromTo(`.guest-step-${guestStep} .pink-card, .guest-step-${guestStep} .pink-hero-stage`, 
     { y: 30, opacity: 0, scale: 0.98 },
     { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out", stagger: 0.1 }
   );
   ```
3. **Programmatic Scroll Snapping in `src/App.jsx` (Lines 8031-8034)**:
   ```javascript
   onScroll={(e) => {
     e.currentTarget.scrollLeft = 0;
     e.currentTarget.scrollTop = 0;
   }}
   ```
4. **Scroll Navigation via `scrollIntoView` in `src/App.jsx` (Lines 4072-4094)**:
   ```javascript
   const scrollToGuestStep = (stepId) => {
     isProgrammaticScrollingRef.current = true;
     window.requestAnimationFrame(() => {
       const el = document.getElementById(`guest-${stepId}`);
       if (el) {
         el.scrollIntoView({ behavior: 'smooth', block: 'start' });
       }
       // ...
     });
   };
   ```
5. **Horizontal Slider Translation in `src/App.jsx` (Lines 8859 & 2463-2468)**:
   ```html
   className="guest-slider-track flex w-[600vw] h-[100dvh]"
   ```
   ```javascript
   gsap.to(guestTrackRef.current, {
     x: `${targetX}vw`,
     duration: 0.85,
     ease: 'power4.out',
     overwrite: 'auto'
   });
   ```
6. **IntersectionObserver setup in `src/App.jsx` (Lines 4201-4241)**:
   An `IntersectionObserver` is registered to observe `guest-` screen ids to set `visibleGuestStep` dynamically when elements enter the viewport.
7. **Missing scope parameter in `useGuestAnimations.js` `useGSAP` hook (Lines 45)**:
   ```javascript
   }, { dependencies: [guestStep], revertOnUpdate: true });
   ```
8. **Unsynchronized Step Animations in `useGuestAnimations.js` (Lines 28-43)**:
   Animations for `.pink-camera-feed-container`, `.pink-frame-slot-item`, and `.mascot-container` are triggered as separate, standalone `gsap.fromTo` calls instead of being chained to the `tl` timeline.

---

## 2. Logic Chain
We trace our observations to the cause of transition jank:

1. **Flicker/Double Fade-In Jank**:
   - `useGuestAnimations.js` starts a timeline animation immediately (0s delay) to animate the active step's `.pink-card` opacity from 0 to 1 (Observation 2).
   - 100ms later (0.1s delay), `App.jsx`'s `useGSAP` hook starts a separate tween animating the same `.pink-card` opacity from 0 to 1 with `overwrite: 'auto'` (Observation 1).
   - This delay causes `App.jsx` to hijack the animation, reset the card's opacity back to `0`, and restart the fade-in.
   - *Conclusion*: This double-fade conflict is directly responsible for the visible visual jump and flickering when changing pages.

2. **Scroll Lock vs. Smooth Scroll Conflict**:
   - `scrollToGuestStep` calls `el.scrollIntoView({ behavior: 'smooth' })` (Observation 4).
   - Concurrently, the container `pink-pop-app` listens to `onScroll` and forces `scrollLeft = 0` (Observation 3).
   - The browser's smooth scrolling engine continually tries to adjust `scrollLeft` to bring the step element into view, while the `onScroll` event listener intercepts this and snaps it back to `0` on every animation frame.
   - *Conclusion*: This conflict triggers a layout fighting loop, resulting in heavy layout thrashing, high CPU load, console warnings, and intense page stuttering/shattering during page transitions.

3. **Performance Penalty from Viewport-Width (`vw`) translations**:
   - The main slide container is translated using `x: "${targetX}vw"` (Observation 5).
   - Viewport units force the browser to recalculate element sizes and resolve units on the main thread during animations, bypassing GPU-composited hardware acceleration.
   - *Conclusion*: Percentage translations are significantly more performant as they translate to native CSS `%` transforms which run directly on the compositor thread.

4. **Inefficient Selector Matching and Cleanup Leaks**:
   - `useGSAP` in `useGuestAnimations.js` is missing a `scope` reference (Observation 7). It queries the global document tree instead of confining queries to the guest wrapper.
   - Animations inside the step condition blocks (Observation 8) are separate `gsap` calls rather than chained onto the `tl` timeline. As a result, they do not participate in timeline sequencing and might not be cleaned up/reverted correctly when state updates.

---

## 3. Caveats
- No other external styles or CSS files define custom transitions on `.guest-slider-track` or `.pink-card`. The transition relies entirely on the GSAP animations defined in these two files.
- We assume touch-swipe/gesture scroll is fully disabled in Kiosk mode, so scroll-based step detection (via `IntersectionObserver`) is entirely redundant since transitions are driven programmatically.

---

## 4. Conclusion
The guest flow page transitions are janky due to two major architectural conflicts:
1. **Parallel conflict**: Duplicate and overlapping `opacity` tweens running on `.pink-card` in both hooks, causing a visual flash.
2. **Scroll engine conflict**: `scrollIntoView({ behavior: 'smooth' })` fighting against the `onScroll` lock snapping `scrollLeft` to 0.

To solve these, we recommend:
1. **Remove redundant tweens**: Remove the card opacity animation from the `useGSAP` in `App.jsx`, letting `useGuestAnimations.js` exclusively manage inner step staggers.
2. **Disable scrolling & IntersectionObserver**: Remove `scrollIntoView` from `scrollToGuestStep` and delete the `IntersectionObserver` setup. Sync `visibleGuestStep` directly with `guestStep` in a `useEffect`.
3. **Use percentage translations**: Translate the track using `xPercent: -stepIndex * (100 / 6)` inside `App.jsx` instead of `vw` units.
4. **Scope and Sequence animations**: Pass `scope: containerRef` to `useGSAP` in `useGuestAnimations.js` and add step-specific animations directly onto the timeline `tl` (with a slight delay to start after the slide transition has initiated).

---

## 5. Verification Method

To verify these issues and ensure the recommended fixes work:
1. **Flicker check**: Open Chrome DevTools Performance panel, record a transition, and observe the frame rate and repaint blocks. Look for redundant styling overrides on `.pink-card` at the 100ms mark.
2. **Scroll fighting check**: Run `npm run dev` to start the application, navigate the steps, and observe if console warning logs (such as `Layout thrashing` or `Scroll interrupted`) disappear when `scrollIntoView` is disabled.
3. **GPU composite check**: Verify in DevTools "Rendering" tab that "Layer borders" are enabled. The `.guest-slider-track` should have a composite layer border, and transforms should occur purely on the GPU when shifted via `xPercent`.

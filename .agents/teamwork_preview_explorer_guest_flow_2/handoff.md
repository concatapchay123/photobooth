# Handoff Report: R1 Smooth Page Transitions Analysis

## Summary
This investigation analyzed the smooth page transitions in the photobooth guest flow. We identified multiple active conflicts between GSAP animations and CSS transitions/transforms on `.pink-card`, `.pink-btn`, and `.pink-outline-btn` classes. These conflicts trigger GSAP overwrites and browser-level transition fighting, causing UI stutter, jumps, and broken button hover states. We recommend a multi-layered fix strategy involving targeted transition overrides, GSAP `clearProps` cleanup, removing redundant animation tweens, and scoped GSAP selector targeting.

## 1. Observation
We observed the following exact definitions, lines, and components in the codebase:

### A. CSS Base and Hover Transitions
In `src/styles.css` and `src/theme-gsap.css`, `.pink-card`, `.pink-btn`, and `.pink-outline-btn` are defined with global `all` transitions under `!important` constraints:
- **`src/styles.css` (lines 7123-7131)**:
  ```css
  .pink-card {
    background: var(--glass-bg) !important;
    backdrop-filter: blur(24px) !important;
    border: 1px solid var(--glass-border) !important;
    border-radius: 28px !important;
    box-shadow: var(--glass-shadow) !important;
    padding: 2rem !important;
    transition: all 0.3s ease !important;
  }
  ```
- **`src/styles.css` (lines 7134-7153)**:
  ```css
  .pink-btn {
    ...
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
    ...
  }
  ```
- **`src/styles.css` (lines 7174-7189)**:
  ```css
  .pink-outline-btn {
    ...
    transition: all 0.3s ease !important;
    ...
  }
  ```
- **`src/styles.css` (lines 6379-6402)**:
  ```css
  .pink-outline-btn {
    ...
    transition: all 0.2s ease !important;
  }
  .pink-btn {
    ...
    transition: all 0.2s ease !important;
  }
  ```
- **`src/theme-gsap.css` (lines 54-64 & 75-81)**:
  ```css
  .pink-btn {
    ...
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  }
  .pink-outline-btn {
    ...
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  }
  ```

### B. GSAP Page Transition Hook
In `src/useGuestAnimations.js`, GSAP animates these classes globally using `fromTo` tweens without a scope:
- **`src/useGuestAnimations.js` (lines 8-25)**:
  ```javascript
  useGSAP(() => {
    if (!guestStep) return;
    
    // Page transition animation
    const tl = gsap.timeline();
    
    // Animate elements entering the new step
    tl.fromTo(`.guest-step-${guestStep} .pink-card, .guest-step-${guestStep} .pink-hero-stage`, 
      { y: 30, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out", stagger: 0.1 }
    );

    // Stagger buttons
    tl.fromTo(`.guest-step-${guestStep} .pink-btn, .guest-step-${guestStep} .pink-outline-btn`,
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)", stagger: 0.05 },
      "-=0.3"
    );
  }, { dependencies: [guestStep], revertOnUpdate: true });
  ```

### C. Redundant App.jsx Entrance Animation
In `src/App.jsx`, a separate `useGSAP` hook animates `opacity` on the exact same card element concurrently when `guestStep` changes:
- **`src/App.jsx` (lines 2470-2481)**:
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

---

## 2. Logic Chain
Based on our observations, we trace the issues through the following logic:
1. **Concurrency Overwrite**:
   - In `App.jsx` (lines 2476-2480), `gsap.fromTo(card, { opacity: 0 }, { opacity: 1, ... })` targets the card of the active section.
   - Concurrently, in `useGuestAnimations.js` (lines 15-18), `tl.fromTo('.pink-card', ...)` targets the same card.
   - Because they animate the same `opacity` property at the same time, GSAP's `overwrite: 'auto'` clobbers one of the active tweens, causing a sudden jump or flicker.
2. **Transition Fighting (Base Transitions)**:
   - When GSAP updates the inline styles (such as `transform: translate3d(...)` or `opacity: ...`) frame-by-frame (60fps), the browser's CSS transition engine intercepts those changes because of the CSS rule `transition: all 0.3s ease !important;` on `.pink-card`, `.pink-btn`, and `.pink-outline-btn`.
   - The browser applies a CSS transition (easing from the current value to the newly set value) on every single frame update.
   - This "fight" causes severe lagging, jitter, and stutter during page transitions.
3. **Hover State Blockage**:
   - Because `useGuestAnimations.js` does not clean up its inline styles upon completion (missing `clearProps`), it leaves inline styles like `transform: translate3d(0px, 0px, 0px) scale(1)` and `opacity: 1` on the elements.
   - Standard inline styles have higher specificity than CSS rules. Therefore, the CSS hover rule `.pink-btn:hover { transform: translateY(-3px) }` is overridden by the inline styles, breaking the button hover animation completely.
4. **Scope Leaks**:
   - Since `useGuestAnimations.js` does not pass `scope: containerRef` to `useGSAP`, selector strings are queried globally on the `document` level. This is slower, fragile, and does not leverage React container boundaries.

---

## 3. Caveats
- This investigation assumes that the CSS hover animations (`translateY(-3px)`) on buttons are desired by the user. If hover movements are not required, we can simply drop `transform` from the CSS transition property entirely.
- We assume that the horizontal track slider animation in `App.jsx` (`gsap.to(guestTrackRef.current, { x: ... })`) is the correct step transition method, and should be kept intact.

---

## 4. Conclusion & Strategy Recommendations
To achieve smooth, conflict-free transitions, we recommend the following four-step strategy:

### Step 1: Add a Transition-Disabling Class
Add a class `.gsap-animating` to the container during the page transition, and disable CSS transitions for all target elements when that class is present.
Add this rule to `src/styles.css`:
```css
/* Disable CSS transitions while GSAP is actively animating to prevent conflicts */
.gsap-animating .pink-card,
.gsap-animating .pink-btn,
.gsap-animating .pink-outline-btn,
.gsap-animating .pink-hero-stage,
.gsap-animating .pink-frame-slot-item,
.gsap-animating .pink-camera-feed-container,
.gsap-animating .mascot-container {
  transition: none !important;
}
```

### Step 2: Update the GSAP hook in `src/useGuestAnimations.js`
Refactor `src/useGuestAnimations.js` to:
1. Pass the `scope: containerRef` parameter in the `useGSAP` hook options.
2. Toggle the `.gsap-animating` class on the container during the timeline execution (`onStart`/`onComplete`).
3. Clear the inline styles of elements using `clearProps` inside `onComplete`.
4. Simplify selectors to use scoped descendant queries instead of prepending `.guest-step-${guestStep}`.

*Refer to the proposed replacement file `proposed_useGuestAnimations.js` inside this directory.*

### Step 3: Remove Redundant Card Tween in `src/App.jsx`
Remove lines 2470 to 2481 in `src/App.jsx` which animates the active section's card opacity, as this is now handled exclusively by `useGuestAnimations.js` with nicer positioning and scaling.

### Step 4: Apply Diff Patch
We have compiled all of these changes into a unified patch file: `proposed_transitions.patch`. It should be applied to clean up the code.

---

## 5. Verification Method
To verify that these changes are correct and compile without errors:
1. **Dry-Run Build**:
   Run the project's build command in the terminal to verify no syntax errors:
   `npm run build`
2. **Visual Inspection**:
   - Build/start the app using `npm run booth` or `npm run dev` and navigate through the guest flow.
   - Verify that there is no flicker or jump when changing guest steps.
   - Verify that the card enters smoothly (translating up, expanding slightly, and fading in).
   - Verify that the buttons stagger in cleanly.
   - Verify that once the page transition completes, hovering over the pink buttons (e.g. `.pink-btn`, `.pink-outline-btn`) triggers a smooth hover elevation and shadow transition, and that leaving the button returns it smoothly to its base state.

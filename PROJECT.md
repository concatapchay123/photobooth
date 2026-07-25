# Project: Photobooth Guest Flow Optimization

## Architecture
- **Vite React Frontend**: The main application entry point is `src/main.jsx`, which renders `src/App.jsx`.
- **GSAP & CSS Transitions**: Screen transitions and animations are handled by GSAP (via `src/useGuestAnimations.js` and `@gsap/react` in `src/App.jsx`) and styled with `src/styles.css` and `src/theme-gsap.css`.
- **Guest Screens**:
  - `src/components/GuestHeroScreen.jsx`
  - `src/components/GuestCaptureScreen.jsx`
  - `src/components/GuestFrameScreen.jsx`
  - `src/components/GuestSelectScreen.jsx`
  - `src/components/GuestAdjustScreen.jsx`
  - `src/components/GuestResultScreen.jsx`
- **Camera & Timer**: The countdown and image capture timing reside in `src/BeautyFilterCamera.jsx` and `src/App.jsx`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | R1: Smooth Page Transitions | Optimize page transitions, slide track translations, and eliminate GSAP/CSS conflicts | none | DONE |
| 2 | R2: Precise Countdown & Capture | Resolve countdown tick lagging and precise 10.0s shutter capture timing | M1 | DONE |
| 3 | R3: Camera Capture Improvements | Fix camera alignment/offset in the capture screen and remove initial `??` countdown placeholder | M2 | DONE |
| 4 | R4: Selection Layout Overhaul | Overhaul Screen 2 (Frame selection) and Screen 3 (Photo selection) to premium single-column layout, expanding grids to full width and moving controls to top/bottom | M3 | DONE |
| 5 | R5: Screen 4 Preview & Slots | Fix interactive frame preview collisions (responsive fit) and stretched slot previews on adjustment screen; streamline slot editor panel | M4 | DONE |
| 6 | R6: Screen 5 Result Mockup Fit | Fix result screen print preview to prevent top/bottom clipping | M5 | DONE |

## Interface Contracts
- Screen slide order: 'hero' -> 'capture' -> 'frame' -> 'select' -> 'adjust' -> 'result'.
- Slide animations translate a track container.
- Countdown trigger signature: starts when transitioning into the 'capture' screen.
- Camera ready callback or state transition.

## Code Layout
- Main App: `src/App.jsx`
- Animations hook: `src/useGuestAnimations.js`
- Camera Component: `src/BeautyFilterCamera.jsx`
- Main CSS: `src/styles.css`
- Guest Screens: `src/components/Guest*.jsx`

# Handoff Report: Camera Capture Screen Improvements (R1)

## 1. Observation

Direct code observations from `src/components/GuestCaptureScreen.jsx`, `src/App.jsx`, and `src/styles.css`:

### A. Camera Container Layout & Styling
1. In `src/components/GuestCaptureScreen.jsx` (lines 46-53), the main container is defined as:
   ```jsx
   <div className="w-screen h-[100dvh] shrink-0 overflow-hidden relative flex flex-col justify-center items-center pt-[108px] pb-8 px-4 md:px-8" style={{ boxSizing: 'border-box' }}>
     <section id="guest-capture" className={`pink-step ${isCaptureUnlocked ? 'active' : ''} ${isCaptureLocked ? 'locked' : ''}`} data-disabled={!isCaptureUnlocked || isCaptureLocked}>
         <div className="pink-step-dot"><span /></div>
         <div className="pink-card pink-capture-card p-5 md:p-6 lg:max-w-none">
           
           <div className="flex flex-col lg:flex-row gap-6 items-stretch">
             {/* Left Column: Camera and Capture buttons */}
             <div className="flex-1 flex flex-col justify-between gap-4">
   ```
2. In `src/styles.css`, `.guest-slider-track section.pink-step` (lines 6032-6042) has the following styles:
   ```css
   .guest-slider-track section.pink-step {
     display: flex !important;
     flex-direction: column !important;
     justify-content: center !important;
     height: 100% !important;
     width: 100% !important;
     margin-top: 0 !important;
     padding: 0 !important;
     max-width: 100% !important;
     box-sizing: border-box !important;
   }
   ```
3. In `src/styles.css`, `.guest-slider-track section.pink-step .pink-card` (lines 6044-6056) has the following styles:
   ```css
   .guest-slider-track section.pink-step .pink-card {
     flex: 1 1 auto !important;
     display: flex !important;
     flex-direction: column !important;
     height: 100% !important;
     margin: 0 !important;
     padding: 1.5rem !important;
     background: rgba(255, 255, 255, 0.82) !important;
     backdrop-filter: blur(20px) !important;
     border: 1px solid rgba(255, 255, 255, 0.6) !important;
     box-shadow: 0 24px 50px -12px rgba(247, 53, 145, 0.08) !important;
     overflow: hidden !important;
   }
   ```
4. In `src/styles.css`, under the `@media (min-width: 1024px)` media query (lines 5970-5984), `.pink-camera-large` and `.pink-camera-id` are styled as:
   ```css
     .pink-camera-large {
       height: 65vh !important;
       aspect-ratio: 4 / 3 !important;
       width: auto !important;
       max-width: 100% !important;
       margin: 0 auto !important;
     }

     .pink-camera-id {
       height: 72vh !important;
       aspect-ratio: 3 / 4 !important;
       width: auto !important;
       max-width: 100% !important;
       margin: 0 auto !important;
     }
   ```

### B. Countdown Timer Placeholder (`??`) & Warm-up Phase
1. In `src/App.jsx` (lines 5208-5213), when initiating the guest capture session:
   ```javascript
       setGuestNotice('');
       setCaptureSessionSecondsLeft(Math.ceil(guestStepBudgets.capture));
       setNextCaptureSecondsLeft(captureInterval);
       setCaptureCountdown('??');
       setIsLockedCaptureRunning(true);
   ```
2. In `src/App.jsx` (lines 5251-5254), in the lock capture runner effect:
   ```javascript
       setCaptureSessionSecondsLeft(totalSeconds);
       setNextCaptureSecondsLeft(captureInterval);
       setCaptureCountdown('??');
   ```
3. In `src/App.jsx` (lines 5272-5317), the sequential capture cycle waits for the camera stream and beauty filter canvas to be ready before entering the countdown loop:
   ```javascript
       const runCaptureCycle = async () => {
         if (cancelled) return;
   
         // Wait for camera stream to restore and be active
         let waitAttempts = 0;
         while (!cameraStreamRef.current || !cameraStreamRef.current.active || ...) { ... }
   
         // Wait for beauty camera canvas to start rendering
         let cameraReadyAttempts = 0;
         while (boothMode === 'photobooth' && (!beautyCameraRef.current || !beautyCameraRef.current.isReady())) { ... }
         ...
         // Start recording
         if (boothMode === 'photobooth') {
           startClipRecording();
           await wait(300);
         }
   
         for (let secondsLeft = captureInterval; secondsLeft > 0; secondsLeft--) {
           ...
           setCaptureCountdown(String(secondsLeft));
           ...
         }
   ```
4. In `src/components/GuestCaptureScreen.jsx` (lines 304-311), the countdown overlay is rendered conditionally:
   ```jsx
     {captureCountdown && (
       <div
         key={captureCountdown}
         className={`pink-countdown ${isNaN(Number(captureCountdown)) ? 'is-emoji' : ''}`}
       >
         {captureCountdown}
       </div>
     )}
   ```

---

## 2. Logic Chain

1. **Camera misaligned/offset vertically**:
   - The outer container has height `100dvh` and padding `pt-[108px] pb-8`, giving an available content height of `100dvh - 140px` (Observation A1).
   - `.pink-card` takes `100%` height of the content area (Observation A3).
   - The children inside `.pink-card` are wrapped in a flex container `div` that lacks height constraints (`height: auto`), so it does not expand to fill the card.
   - However, on desktop viewports (`min-width: 1024px`), the camera container `.pink-camera-large` is given a hard height of `65vh !important` (Observation A4), and `.pink-camera-id` is given a height of `72vh !important` (Observation A4).
   - Combined with the header height, gaps, title height, and filter preset controls, a height of `65vh` or `72vh` exceeds the available vertical space of the `.pink-card` on typical screen sizes (e.g., at `1080px` height, `65vh` is `702px` + other items exceed `940px`).
   - Because the card has `overflow: hidden !important` (Observation A3), the overflowing content is cut off and layout elements are shifted, resulting in the camera container appearing misaligned/offset relative to the visible card.
   - Adjusting the camera container to use a safe `max-height` (such as `max-height: 48vh !important` or `max-height: 52vh !important`) and letting the height be `auto` or flex-scaled, combined with adding `flex-1 h-full` to the card's inner flex container, will resolve the vertical misalignment.

2. **Countdown `??` placeholder display**:
   - The state `captureCountdown` is initialized to `'??'` at the start of the capture session (Observations B1 and B2).
   - The capture loop performs async waiting (up to 11+ seconds) for the stream to warm up, WebGL canvas to start rendering, and recorder to initialize (Observation B3). During this period, the state remains `'??'`.
   - In `GuestCaptureScreen.jsx`, since `captureCountdown` is truthy, it immediately renders the countdown overlay (Observation B4). Because `'??'` is not a number, it falls back to the `is-emoji` styling.
   - Setting `setCaptureCountdown(null)` instead of `setCaptureCountdown('??')` during initialization prevents the overlay from rendering during the warm-up phase (since `{captureCountdown && ...}` will evaluate to false).
   - Once the countdown actually begins, `setCaptureCountdown(String(secondsLeft))` sets it to numerical values, rendering the countdown cleanly.

---

## 3. Caveats

- We did not run the application in a browser to visually inspect the changes because we are in read-only investigation mode.
- We assume that removing the initial `'??'` value doesn't impact any other business logic, which is supported by checking that no other active files reference `'??'` (apart from backup files).

---

## 4. Conclusion

- **Camera Misalignment**: Caused by excessive viewport-based height rules (`65vh`/`72vh`) on `.pink-camera-large` and `.pink-camera-id` within desktop styles, combined with a lack of vertical stretching (`flex-grow`/`height`) on the inner flex container of the card.
  - *Recommended Fix*:
    1. Update the inner container in `src/components/GuestCaptureScreen.jsx` to stretch:
       `<div className="flex flex-col lg:flex-row gap-6 items-stretch flex-1 h-full w-full justify-center">`
    2. Adjust `src/styles.css` rules for `.pink-camera-large` and `.pink-camera-id` under `@media (min-width: 1024px)` to use responsive bounds:
       - Replace `height: 65vh !important; width: auto !important;` with `max-height: 48vh !important; height: auto !important; width: auto !important;` for `.pink-camera-large`.
       - Replace `height: 72vh !important; width: auto !important;` with `max-height: 52vh !important; height: auto !important; width: auto !important;` for `.pink-camera-id`.
- **Countdown Placeholder**: Caused by initializing `captureCountdown` to `'??'` during the asynchronous camera warm-up phase.
  - *Recommended Fix*:
    - Update `src/App.jsx` at lines 5211 and 5253 to use `null` instead of `'??'`:
      `setCaptureCountdown(null);`

---

## 5. Verification Method

1. **Inspection**:
   - Inspect `src/components/GuestCaptureScreen.jsx` at lines 51-53 to locate the inner container.
   - Inspect `src/styles.css` at lines 5970-5984 to locate `.pink-camera-large` and `.pink-camera-id` desktop styles.
   - Inspect `src/App.jsx` at lines 5211 and 5253 to verify `setCaptureCountdown('??');`.
2. **Runtime Verification**:
   - Launch the application: `npm run dev` (or appropriate project start command).
   - Enter Guest Journey & start capture:
     - Verify that the camera stream displays inside the card cleanly without vertical overflow, vertical offset, or cut-off presets.
     - Verify that when clicking the capture button, no `'??'` text or overlay is displayed until the countdown actually starts ticking down.

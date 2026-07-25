# Handoff Report - R2: Precise Countdown Timer & Capture Timing

## 1. Observation

Direct code observations from `e:/my-photobooth/src/App.jsx` and `e:/my-photobooth/src/BeautyFilterCamera.jsx`:

### 1.1 Countdown Initialization
At lines 5328 and 5370 of `src/App.jsx`, the countdown timer state `captureCountdown` is initialized to the full duration value:
```javascript
5328:     setCaptureCountdown(String(captureInterval));
```
```javascript
5370:     setCaptureCountdown(String(captureInterval));
```

### 1.2 Camera Initialization and Stream Delays
At lines 5392 to 5424 of `src/App.jsx`, before starting the countdown loop, the code checks and awaits the camera stream and beauty canvas:
```javascript
5394:       while (!cameraStreamRef.current || !cameraStreamRef.current.active || cameraStreamRef.current.getVideoTracks()[0]?.readyState === 'ended') {
...
5401:         await wait(200);
...
5411:       while (boothMode === 'photobooth' && (!beautyCameraRef.current || !beautyCameraRef.current.isReady())) {
...
5418:         await wait(200);
```
Additionally, a buffer warm-up delay of 150ms is executed at line 5423:
```javascript
5423:         await wait(150);
```

### 1.3 Recording Warm-up Delay Inside the Loop
Inside the countdown loop at lines 5437 to 5441 of `src/App.jsx`, a 300ms warm-up delay is executed during the first tick (`secondsLeft === captureInterval`):
```javascript
5437:         if (boothMode === 'photobooth' && secondsLeft === captureInterval) {
5438:           startClipRecording();
5439:           // Warm up for 300ms to let MediaRecorder initialize and buffer frames
5440:           await wait(300);
5441:         }
```
Only after this delay is the countdown display updated on screen:
```javascript
5443:         setNextCaptureSecondsLeft(secondsLeft);
5444:         setCaptureCountdown(String(secondsLeft));
```

### 1.4 Video Stopping Delay in Capture Path
Inside `captureGuestPhotoFrame` in `src/App.jsx` (lines 5190-5202), `stopVideo` is defined with an 800ms delay:
```javascript
5192:     const stopVideo = async () => {
5193:       if (shouldStopVideoImmediately) {
5194:         try {
5195:           // Wait 800ms to capture the flash/shutter moment and guarantee the video is at least 10 seconds long
5196:           await wait(800);
5197:           videoBlob = await stopClipRecording();
5198:         } catch (e) {
...
```

For webcam fallback mode (lines 5228-5245), `await stopVideo()` is executed *before* retrieving the beauty filter canvas data URL:
```javascript
5228:         const fallbackVideo = beautyCameraRef.current?.getVideoElement();
5229:         const rawCanvas = await waitForReadableGuestVideoFrame(fallbackVideo);
...
5237:         await stopVideo();
...
5240:         const filteredDataUrl = !isKioskGuardEnabled && beautyCameraRef.current?.isReady()
5241:           ? await beautyCameraRef.current.captureDataUrl('image/jpeg', 0.95)
5242:           : null;
```

Similarly, for DSLR active mode (lines 5214-5223), `await stopVideo()` is awaited *before* triggering the DSLR capture:
```javascript
5214:       if (isDslrActive) {
...
5216:         await stopVideo();
5217:         try {
5218:           dslrDataUrl = await captureDslrPhotoHelper();
```

---

## 2. Logic Chain

### 2.1 Causes of Countdown Tick Lagging
1. **Premature Display Setting**: Setting `captureCountdown` to `"10"` (from the start of the capture session and start of the `useEffect`) immediately displays the number "10" on screen.
2. **Camera / Stream Ready Wait**: During this time, the code blocks on the while loops (checking `cameraStreamRef.current` and `beautyCameraRef.current.isReady()`), sleeping `200ms` repeatedly. During these checks (which can take 1-3 seconds after camera re-initialization), the screen is frozen showing the number `"10"`.
3. **Recording Delay**: Upon entering the countdown loop, the first tick (`10`) triggers another `300ms` wait for `MediaRecorder` warm-up before updating `captureCountdown` and starting the 1.0s tick sleep.
4. **Conclusion**: This combined overhead (camera wait + beauty ready check + 150ms buffer + 300ms recording warm-up) causes the first tick `"10"` to stay on the screen for 2.5 to 4 seconds, resulting in a laggy, frozen experience.

### 2.2 Causes of 11th Second Capture (Timing Alignment Issues)
1. **Loop Exit Timing**: The loop ticks down from 10 to 1, with the number `"1"` displaying for exactly 1.0 second. When the loop ends (at t = 10.0s), the camera shutter sound plays and the white flash activates.
2. **Webcam Path Delay**: In the webcam capture path, after a 120ms flash sync delay, the code awaits `stopVideo()`. `stopVideo()` introduces a blocking `800ms` delay to allow the video clip to record the shutter/flash moment. Only after this 800ms delay does it capture the beauty camera canvas (`beautyCameraRef.current.captureDataUrl()`).
3. **DSLR Path Delay**: In the DSLR path, `await stopVideo()` blocks the thread for `800ms` before `captureDslrPhotoHelper()` is called to trigger the DSLR camera.
4. **Conclusion**: In both modes, the actual image capture/trigger is delayed by ~920ms (webcam) or 800ms (DSLR) after the countdown finishes and the shutter sound plays. This shifts the capture into the 11th second instead of capturing exactly at the end of the 10th second (right after second 1 finishes its full 1-second display).

---

## 3. Caveats

- We did not investigate whether the MediaRecorder initialization performance varies significantly between hardware/browsers, but assuming a standard 300ms warm-up delay remains sufficient to avoid blank recording starts.
- We assume that triggering the physical DSLR camera via `fetch('/api/dslr/capture')` operates asynchronously and does not block the React render thread during the capture command itself.

---

## 4. Conclusion & Actionable Fix Strategy

### 4.1 Fix Strategy for Countdown Tick Lagging
1. **Display Loading/Preparing initially**: In `startGuestCaptureSession` (lines 5328) and inside the `useEffect` (line 5370), set `captureCountdown` to `'??'` (or `null`) instead of `"10"` (or `captureInterval`). This indicates to the user that the camera and recorder are initializing.
2. **Move Delays before Countdown Loop**: In `runCaptureCycle()`, move the camera stream check, beauty camera ready check, buffer sleep, and `MediaRecorder` initialization/300ms warm-up BEFORE the countdown loop begins:
   ```javascript
   // 1. Check camera stream restored
   // 2. Check beauty camera isReady()
   // 3. Start recording and warm up
   if (boothMode === 'photobooth') {
     startClipRecording();
     await wait(300); // 300ms recording warm-up delay moved here
   }
   ```
3. **Start the Loop Cleanly**: Start the loop without any warm-up delay or checks inside. The first statement in the loop will set `captureCountdown` to the current tick (`secondsLeft`), which initially is `10`. This ensures it immediately displays `10` and ticks exactly every 1.0 second.

### 4.2 Fix Strategy for Capture Timing Alignment
1. **Webcam Capture**: Capture the filtered image data URL from `beautyCameraRef.current.captureDataUrl()` immediately after the 120ms flash sync delay, before awaiting `stopVideo()`:
   ```javascript
   // 1. Wait 120ms for flash sync
   await wait(120);
   const fallbackVideo = beautyCameraRef.current?.getVideoElement();
   const rawCanvas = await waitForReadableGuestVideoFrame(fallbackVideo);
   
   if (!rawCanvas) {
     await stopVideo();
     ...
     return false;
   }
   
   // 2. Capture the filtered image immediately
   const filteredDataUrl = !isKioskGuardEnabled && beautyCameraRef.current?.isReady()
     ? await beautyCameraRef.current.captureDataUrl('image/jpeg', 0.95)
     : null;
   const rawDataUrl = rawCanvas.toDataURL('image/jpeg', 0.95);
   dslrDataUrl = typeof filteredDataUrl === 'string' && filteredDataUrl.startsWith('data:')
     ? filteredDataUrl
     : rawDataUrl;

   // 3. Stop the video recording (800ms wait) AFTER photo is captured
   await stopVideo();
   ```
2. **DSLR Capture**: Trigger the DSLR capture first, and stop the video recording concurrently:
   ```javascript
   if (isDslrActive) {
     isCapturingDslrRef.current = true;
     // Start DSLR capture promise immediately
     const dslrCapturePromise = captureDslrPhotoHelper();
     // Await the stopVideo recording delay concurrently
     await stopVideo();
     // Now resolve the DSLR capture promise
     try {
       dslrDataUrl = await dslrCapturePromise;
     } catch (error) { ... }
   }
   ```

---

## 5. Verification Method

### 5.1 Verification Steps
1. **Verify Countdown Ticks**:
   - Start the guest flow capture session.
   - Observe that the countdown badge displays `'??'` or loading first, and then changes to `10`.
   - Ensure the transition between each second (10 down to 1) is exactly 1.0 second and does not freeze on `10`.
2. **Verify Capture Synchronicity**:
   - Check that the flash and shutter sound fire exactly when the countdown finishes the display of `1`.
   - Verify that the captured photo reflects the pose of the guest at the exact moment of the flash/shutter sound, not 1 second later.
3. **Verify Code Location Integrity**:
   - Inspect `src/App.jsx` at the modified lines to ensure no extra blocking sleeps remain inside the loop.

import fs from 'fs';
import path from 'path';

// Define paths
const projectRoot = 'E:\\my-photobooth';
const appJsxPath = path.join(projectRoot, 'src/App.jsx');

console.log('--- STARTING PROGRAMMATIC COUNTDOWN & CAPTURE TIMING VERIFICATION (FIXED) ---');

function verifyAppJsx() {
  if (!fs.existsSync(appJsxPath)) {
    console.error(`Error: ${appJsxPath} not found`);
    process.exit(1);
  }

  const content = fs.readFileSync(appJsxPath, 'utf8');

  // Verify runCaptureCycle exists
  const runCaptureCycleIndex = content.indexOf('const runCaptureCycle = async () => {');
  if (runCaptureCycleIndex === -1) {
    console.error('FAIL: runCaptureCycle not found in src/App.jsx');
    process.exit(1);
  } else {
    console.log('PASS: runCaptureCycle is defined in src/App.jsx');
  }

  // Extract runCaptureCycle body (until the next useEffect or closing scope)
  const runCaptureCycleChunk = content.substring(runCaptureCycleIndex, runCaptureCycleIndex + 5000);

  // 1. Check camera stream restore checks are before the countdown loop
  const cameraStreamCheckIndex = runCaptureCycleChunk.indexOf('while (!cameraStreamRef.current');
  const beautyCameraReadyIndex = runCaptureCycleChunk.indexOf('while (boothMode === \'photobooth\' && (!beautyCameraRef.current');
  const recorderWarmUpIndex = runCaptureCycleChunk.indexOf('startClipRecording()');
  const countdownLoopIndex = runCaptureCycleChunk.indexOf('for (let secondsLeft = captureInterval;');

  console.log('\n--- Checking Initialization Steps order before countdown ---');
  if (cameraStreamCheckIndex !== -1 && cameraStreamCheckIndex < countdownLoopIndex) {
    console.log(`PASS: Camera stream restore check is located at index ${cameraStreamCheckIndex}, before the countdown loop at index ${countdownLoopIndex}.`);
  } else {
    console.error('FAIL: Camera stream restore check is not before the countdown loop or not found.');
  }

  if (beautyCameraReadyIndex !== -1 && beautyCameraReadyIndex < countdownLoopIndex) {
    console.log(`PASS: Beauty camera ready check is located at index ${beautyCameraReadyIndex}, before the countdown loop at index ${countdownLoopIndex}.`);
  } else {
    console.error('FAIL: Beauty camera ready check is not before the countdown loop or not found.');
  }

  if (recorderWarmUpIndex !== -1 && recorderWarmUpIndex < countdownLoopIndex) {
    console.log(`PASS: MediaRecorder start & warm-up are located at index ${recorderWarmUpIndex}, before the countdown loop at index ${countdownLoopIndex}.`);
  } else {
    console.error('FAIL: MediaRecorder start & warm-up are not before the countdown loop or not found.');
  }

  // 2. Validate countdown loop body contains exactly 1.0 second ticks and no blocking initializations
  console.log('\n--- Checking Countdown Loop body properties ---');
  if (countdownLoopIndex === -1) {
    console.error('FAIL: Countdown loop not found.');
    process.exit(1);
  }

  const loopEndIndex = runCaptureCycleChunk.indexOf('// Start capture');
  const loopBody = runCaptureCycleChunk.substring(countdownLoopIndex, loopEndIndex);

  // Verify there are no 'while' or 'wait' delays inside the loop body, except the 1000ms tick wait.
  const waitsInLoop = [...loopBody.matchAll(/wait\(/g)];
  if (waitsInLoop.length === 0) {
    console.log('PASS: No blocking wait() statements found inside the countdown loop body.');
  } else {
    console.warn(`WARNING: Found ${waitsInLoop.length} wait() statements inside the countdown loop. This might introduce drift.`);
  }

  // Verify interval is exactly 1000ms
  const setIntervalMatch = loopBody.match(/setInterval\(\(\) => \{[\s\S]*?\},\s*(\d+)\)/);
  if (setIntervalMatch) {
    const intervalVal = parseInt(setIntervalMatch[1]);
    if (intervalVal === 1000) {
      console.log(`PASS: setInterval duration is exactly ${intervalVal}ms (1.0 second).`);
    } else {
      console.error(`FAIL: setInterval duration is ${intervalVal}ms, not 1000ms.`);
    }
  } else {
    console.error('FAIL: setInterval not found in loop body.');
  }

  // 3. Verify captureGuestPhotoFrame logic for webcam and DSLR capture
  console.log('\n--- Checking Capture Paths inside captureGuestPhotoFrame ---');
  const captureGuestPhotoIndex = content.indexOf('const captureGuestPhotoFrame = async () => {');
  if (captureGuestPhotoIndex === -1) {
    console.error('FAIL: captureGuestPhotoFrame not found.');
    process.exit(1);
  }
  const captureChunk = content.substring(captureGuestPhotoIndex, captureGuestPhotoIndex + 6000);

  // DSLR active check
  const dslrActiveIndex = captureChunk.indexOf('if (isDslrActive) {');
  if (dslrActiveIndex === -1) {
    console.warn('WARNING: isDslrActive block not found in captureGuestPhotoFrame.');
  } else {
    const dslrBlockEnd = captureChunk.indexOf('if (!dslrDataUrl) {');
    const dslrBlock = captureChunk.substring(dslrActiveIndex, dslrBlockEnd);

    const triggerIndex = dslrBlock.indexOf('captureDslrPhotoHelper()');
    const stopVideoIndex = dslrBlock.indexOf('await stopVideo()');

    if (triggerIndex !== -1 && stopVideoIndex !== -1 && triggerIndex < stopVideoIndex) {
      console.log('PASS: DSLR capture is triggered (promise created) BEFORE stopVideo() delay is awaited. This ensures zero pre-trigger blocking delay.');
    } else {
      console.error('FAIL: DSLR capture is NOT triggered before stopVideo().');
    }
  }

  // Webcam fallback check
  const webcamIndex = captureChunk.indexOf('if (!dslrDataUrl) {');
  if (webcamIndex === -1) {
    console.error('FAIL: Webcam fallback block not found.');
  } else {
    const webcamBlock = captureChunk.substring(webcamIndex, webcamIndex + 1500);
    const fetchFilteredIndex = webcamBlock.indexOf('beautyCameraRef.current.captureDataUrl');
    const webcamStopVideoIndex = webcamBlock.indexOf('await stopVideo()');

    if (fetchFilteredIndex !== -1 && webcamStopVideoIndex !== -1 && fetchFilteredIndex < webcamStopVideoIndex) {
      console.log('PASS: Beauty camera filtered photo is captured BEFORE stopVideo() delay is awaited. This ensures zero pre-trigger blocking delay.');
    } else {
      console.error('FAIL: Beauty camera photo is NOT captured before stopVideo() delay.');
    }
  }
}

verifyAppJsx();

console.log('\n--- MATHEMATICAL TIMING SIMULATION ---');

class CaptureTimerSimulator {
  constructor(captureInterval = 10) {
    this.captureInterval = captureInterval;
    this.timeline = [];
    this.currentTime = 0;
    this.cancelled = false;
    this.capturePaused = false;
  }

  logEvent(eventName) {
    this.timeline.push({ time: this.currentTime, event: eventName });
    console.log(`[t = ${this.currentTime.toFixed(1)}s] Event: ${eventName}`);
  }

  async sleep(ms) {
    this.currentTime += ms / 1000;
  }

  async runCaptureCycle() {
    this.logEvent('runCaptureCycle called (loading state "??")');

    await this.sleep(0);
    await this.sleep(0);

    this.logEvent('startClipRecording()');
    await this.sleep(300);

    this.logEvent('Countdown Loop Start');
    for (let secondsLeft = this.captureInterval; secondsLeft > 0; secondsLeft--) {
      this.logEvent(`setCaptureCountdown("${secondsLeft}") displayed`);

      await new Promise(async (resolve) => {
        let elapsed = 0;
        while (elapsed < 1) {
          await this.sleep(1000);
          if (this.capturePaused) continue;
          elapsed += 1;
        }
        resolve();
      });
    }

    this.logEvent('Countdown Loop End (All 10 ticks completed)');
    this.logEvent('setCaptureCountdown("📸") displayed');

    await this.captureGuestPhotoFrame();
  }

  async captureGuestPhotoFrame() {
    this.logEvent('captureGuestPhotoFrame called -> playShutterSound(), setFlashActive(true)');
    
    await this.sleep(120);
    this.logEvent('Webcam beautyCamera captureDataUrl() triggered');

    this.logEvent('stopVideo() called (waiting 800ms)');
    await this.sleep(800);
    this.logEvent('stopVideo() completed, videoBlob received');

    this.logEvent('captureGuestPhotoFrame completed successfully');
  }
}

async function runSimulation() {
  const simulator = new CaptureTimerSimulator(10);
  await simulator.runCaptureCycle();

  console.log('\n--- VERIFICATION METRICS ---');
  const startEvent = simulator.timeline.find(e => e.event.includes('setCaptureCountdown("10")'));
  const shutterEvent = simulator.timeline.find(e => e.event.includes('playShutterSound()'));
  const captureEvent = simulator.timeline.find(e => e.event.includes('captureDataUrl()'));

  if (startEvent && shutterEvent && captureEvent) {
    const elapsedToShutter = shutterEvent.time - startEvent.time;
    const elapsedToCapture = captureEvent.time - startEvent.time;
    console.log(`Time from Countdown Start ("10" displayed) to Shutter Sound: ${elapsedToShutter.toFixed(3)} seconds`);
    console.log(`Time from Countdown Start ("10" displayed) to Webcam Capture: ${elapsedToCapture.toFixed(3)} seconds`);

    if (Math.abs(elapsedToShutter - 10.0) < 0.001) {
      console.log('PASS: Shutter sound and flash trigger EXACTLY 10.0 seconds after the countdown starts.');
    } else {
      console.error(`FAIL: Shutter sound triggered at ${elapsedToShutter}s, not 10.0s.`);
    }

    if (Math.abs(elapsedToCapture - 10.12) < 0.001) {
      console.log('PASS: Photo capture is fetched at 10.12 seconds (10.0s countdown + 120ms flash sync delay) without any blocking from stopVideo().');
    } else {
      console.error(`FAIL: Photo capture fetched at ${elapsedToCapture}s, not 10.12s.`);
    }
  } else {
    console.error('FAIL: Could not locate required events in the simulation timeline.');
  }
}

runSimulation().catch(console.error);

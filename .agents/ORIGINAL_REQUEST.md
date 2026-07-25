# Original User Request

## 2026-06-21T03:13:44Z

Optimize the photobooth guest flow: resolve janky page transitions between screens and fix the photo-taking countdown timer so that it captures exactly when the 10th second finishes (preventing a delay that causes it to capture on the 11th second).

Working directory: e:/my-photobooth
Integrity mode: development

## Requirements

### R1. Smooth Page Transitions
- Ensure screen transitions between all guest slides ('hero', 'capture', 'frame', 'select', 'adjust', 'result') are extremely smooth.
- Optimize the GSAP slider track translation.
- Eliminate any conflicts between GSAP animations and CSS transitions (specifically on `.pink-card`, `.pink-btn`, and `.pink-outline-btn`).

### R2. Precise Countdown Timer & Capture Timing
- Optimize the photo capture countdown so that each second is exactly 1.0 seconds.
- Ensure camera initialization checks and recording warm-up delays (like the 300ms delay) occur before the countdown displays its first tick (10), preventing the first tick from lagging.
- Trigger the camera capture precisely after the last second (1) finishes its full 1-second display.

## Acceptance Criteria

### UI Transitions
- [ ] Carousel sliding transitions between screens are fluid and free of stutter.
- [ ] Entrance animations on cards and buttons do not jump or flicker.

### Timing & Capture
- [ ] The countdown starts ticking immediately after the count (10) becomes visible.
- [ ] Each countdown tick (from 10 down to 1) lasts exactly 1.0 second.
- [ ] The capture shutter sound, flash, and photo capture execute exactly 10.0 seconds after the countdown starts.

## 2026-06-21T07:58:28Z

Fix UI issues in the photobooth application, including camera alignment, redundant step sidebars, stretched slot adjustment previews, and result screen frame cropping.

Working directory: e:\my-photobooth
Integrity mode: development

## Requirements

### R1. Camera Capture Screen Improvements
- Fix camera misalignment/offset in the capture screen.
- Remove the initial `??` countdown placeholder displayed when starting the capture session. Do not show any overlay or placeholder while waiting for the stream to warm up, and ensure the countdown starts counting down cleanly.

### R2. Overhaul Screen 2 (Frame Selection) and Screen 3 (Photo Selection) Layouts
- Eliminate the empty/redundant left sidebar column in both Screen 2 (`GuestFrameScreen`) and Screen 3 (`GuestSelectScreen`).
- Re-layout the necessary UIs (titles, subtitles, selection status/counts, back/next buttons, and pagination/search controls) to integrate them cleanly into a premium single-column layout.
- Move the navigation buttons ("Quay lại", "Chốt khung" / "Qua căn chỉnh") and selection status badge to a clean control row at the top/bottom.
- Expand the frame library grid and captured photo grid to occupy the full width of the screen, making the selections much more spacious and visually impressive.

### R3. Fix Screen 4 (Adjustment Screen) UI Collisions and Stretched Previews
- Fix overlapping/collision and sub-merging of the interactive frame preview on the left with other elements (such as title or bottom buttons). Ensure it fits within the stage area responsive to viewport height.
- Fix the stretched preview image in the slot editing area on the right by ensuring the container maintains the slot's correct aspect ratio (using `--slot-ratio` or `aspect-ratio` inline styles matched with CSS), preventing any vertical/horizontal distortion.
- Streamline the slot detail editing tools by combining icon buttons for quick actions into a compact grid/row, and wrapping them in a clean, expandable accordion or tab panel so the UI remains highly compact and doesn't overflow the screen height.

### R4. Fix Screen 5 (Result Screen) Frame Cropping
- Fix the final print preview screen where the frame mockup is clipped or cut off at the top and bottom. Limit the preview container and image max-height to fit within the visible viewport bounds.

## Acceptance Criteria

### Verification Checks
- [ ] No `??` string is displayed in the countdown overlay at the start of capture.
- [ ] Screen 2 and 3 do not have a vertical empty sidebar on the left. The grid of frames and photos expands to full screen width.
- [ ] The slot adjustment preview image on the right panel of Screen 4 is not stretched or distorted.
- [ ] The frame preview on the left panel of Screen 4 does not overlap or spill outside of its container boundaries.
- [ ] The final print preview on Screen 5 fits entirely within the mockup box without any top or bottom clipping.

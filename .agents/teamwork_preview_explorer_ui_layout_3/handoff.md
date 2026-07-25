# Handoff Report - UI Preview and Layout Fixes (R3 & R4)

This report details the layout and rendering issues in Screen 4 (Adjustment Screen) and Screen 5 (Result Screen) in `e:/my-photobooth`, analyzes their root causes, and proposes a complete fix strategy via a patch file.

---

## 1. Observation
During the code investigation, the following files and lines were examined:

### A. Screen 4 (GuestAdjustScreen) Left-Pane Preview
- **File:** `src/styles.css` (Lines 2770–2779)
  ```css
  .pink-adjust-stage {
    border-radius: 28px;
    border: 2px solid #ffd5e9;
    background: rgba(255, 255, 255, 0.68);
    padding: 0.9rem;
    box-shadow: 0 18px 32px rgba(255, 47, 147, 0.1);
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }
  ```
  *Observation:* Lacks `position: relative` or vertical containment rules.
- **File:** `src/styles.css` (Lines 2824–2837)
  ```css
  .pink-adjust-frame-preview {
    position: relative;
    width: min(100%, 520px, calc(60vh * var(--frame-ratio, 1))) !important;
    max-width: 100%;
    margin-inline: auto;
    border-radius: 18px;
    overflow: hidden;
    background: #fff;
    border: 2px solid #ffd5e9;
    box-shadow: inset 0 0 0 1px rgba(255, 47, 147, 0.08), 0 18px 35px rgba(255, 47, 147, 0.12);
    touch-action: none;
    user-select: none;
    flex: 0 0 auto;
  }
  ```
  *Observation:* Hardcoded width using viewport height (`60vh`) and `flex: 0 0 auto` prevents it from shrinking to fit inside the parent container.
- **File:** `src/components/GuestAdjustScreen.jsx` (Lines 62-75)
  *Observation:* The `.pink-adjust-frame-tabs` container is absolute-positioned (`absolute bottom-5 left-5 z-10`). Since `.pink-adjust-stage` is not positioned, the tabs float relative to the entire card/step, overlapping the bottom step buttons.

### B. Screen 4 (GuestAdjustScreen) Right-Pane Slot Preview & Tools
- **File:** `src/styles.css` (Lines 2942–2953)
  ```css
  .pink-adjust-zoom-preview {
    position: relative;
    width: min(100%, 280px, calc(30vh * var(--slot-ratio, 1)));
    max-width: 100%;
    margin: 0 auto 1rem;
    border-radius: 20px;
    overflow: hidden;
    background: #fff;
    border: 2px dashed #ff8fc5;
    cursor: grab;
    touch-action: none;
  }
  ```
  *Observation:* Uses `--slot-ratio` variable to compute responsive width but does not define `height` or `aspect-ratio`.
- **File:** `src/components/GuestAdjustScreen.jsx` (Lines 141–158)
  ```jsx
  <div
    className="pink-adjust-zoom-preview mx-auto"
    style={{
      height: '120px',
      width: `${120 * (zone.width / Math.max(1, zone.height))}px`,
      maxWidth: '100%',
      ...
    }}
  ```
  *Observation:* Hardcodes inline `height: '120px'` and calculates a static width. However, it does not pass the CSS variable `--slot-ratio` or set `aspect-ratio` inline.
- **File:** `src/components/GuestAdjustScreen.jsx` (Lines 160–225)
  *Observation:* Sliders group, quick actions group, and swap pane all render simultaneously in a stack.

### C. Screen 5 (GuestResultScreen) Mockup Cropping
- **File:** `src/styles.css` (Lines 2067–2075)
  ```css
  .pink-result-box {
    min-height: 420px;
    ...
  }
  ```
  and (Lines 4416–4428)
  ```css
  .pink-result-paper-mockup {
    ...
    min-height: 480px !important;
  }
  ```
  *Observation:* Strong minimum height requirements override layout constraints.
- **File:** `src/styles.css` (Lines 4438–4450 and Lines 6022–6025)
  ```css
  .pink-result-paper-mockup .pink-result-image {
    max-height: 70vh !important;
  }
  ```
  *Observation:* Image `max-height` is bound to the viewport (`70vh`/`72vh`), ignoring the actual space inside the card.

---

## 2. Logic Chain
1. **Left-Pane Preview Overlay (Issue 1):**
   - The stage container `.pink-adjust-stage` does not establish a positioning context. Therefore, any child absolute element (like `.pink-adjust-frame-tabs` at `bottom-5 left-5`) will align relative to `.pink-step` (which covers the whole card), overlapping footer buttons.
   - The preview box `.pink-adjust-frame-preview` uses `60vh` width and `flex: 0 0 auto`, meaning it refuses to shrink when vertical viewport space is tight (e.g. laptop screens). Its height is driven by `aspect-ratio` and overflows the container, causing layout collisions with titles and buttons.
   - *Conclusion:* Setting `position: relative` on `.pink-adjust-stage` and using flex containment (`flex: 1 1 auto; min-height: 0; max-height: calc(100% - 3.5rem)`) on the preview will resolve collisions.

2. **Stretched Zoom Preview (Issue 2):**
   - In CSS, `.pink-adjust-zoom-preview` computes width using `var(--slot-ratio)`. Because this variable is missing in the inline style, it defaults to `1` (square width).
   - In JSX, the inline height is fixed to `120px` (Observation 1.5). Thus, the container becomes distorted (e.g. `280px` wide by `120px` tall), forcing the image inside to stretch.
   - *Conclusion:* Setting `--slot-ratio` in the JSX inline style and binding `.pink-adjust-zoom-preview`'s size to its aspect ratio via `aspect-ratio: var(--slot-ratio)` resolves the distortion.

3. **Streamlined Workspace Tools (Issue 3):**
   - Stacked layout tools cause excessive vertical space requirements (Observation 1.6).
   - *Conclusion:* Splitting these controls into a tabbed navigation (e.g., Tab 1: **Cân Chỉnh Tay**, Tab 2: **Công Cụ Nhanh**) reduces vertical height by ~50% and fits shorter screens.

4. **Result Mockup Cropping (Issue 4):**
   - The hardcoded minimum heights on the mockup (`480px`) and `70vh`/`72vh` max height on the image ignore card container bounds and cause layout overflows. Since the parent card has `overflow: hidden`, the top and bottom are cropped.
   - *Conclusion:* Removing the minimum heights (`min-height: 0 !important`), setting height to `100%`, and restricting the image to `max-height: 100%; object-fit: contain;` resolves the cropping.

---

## 3. Caveats
- No caveats. The proposed changes are localized to CSS layout properties and safe component restructuring, with zero impact on logical data flow.

---

## 4. Conclusion
The layout issues on Screen 4 and 5 are resolved by:
1. Adding `position: relative` to `.pink-adjust-stage` and replacing hardcoded viewport widths on `.pink-adjust-frame-preview` with flexible flexbox constraints.
2. Passing `--slot-ratio` inline and using `aspect-ratio: var(--slot-ratio)` on the slot editing preview.
3. Adding tab selectors to separate basic adjust sliders from quick actions/swap tools.
4. Removing `min-height` on the print mockup and restricting image `max-height: 100%` with `object-fit: contain`.

Proposals have been structured in a `.patch` file: `e:/my-photobooth/.agents/teamwork_preview_explorer_ui_layout_3/preview_layout_fixes.patch`.

---

## 5. Verification Method
- Compile and build using:
  ```powershell
  npm run build
  ```
- Run the local dev server using:
  ```powershell
  npm run dev
  ```
- Open the application and adjust browser window height (e.g. using DevTools responsive mode to test heights under `650px`):
  1. Inspect the left frame preview in Step 4 and verify it scales down correctly within the white stage boundaries and does not overlap the card title or back/next buttons.
  2. Inspect the zoom preview on the right and verify it maintains the correct slot ratio (square, portrait, or landscape) without image distortion.
  3. Toggle between tabs in the adjust tools to ensure compact layout height.
  4. Complete the flow to Step 5 (Result Screen) and verify the final print sheet mockup shrinks to fit the screen height without top/bottom cropping.

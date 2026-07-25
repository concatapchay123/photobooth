# Handoff Report: R2 Screen Layout Overhaul (Screen 2 & Screen 3)

## Observation
* **File Locations**:
  * `src/components/GuestFrameScreen.jsx`
  * `src/components/GuestSelectScreen.jsx`
  * `src/styles.css`
  * `src/useGuestAnimations.js`
* **Sidebar Layouts**:
  * In `src/components/GuestFrameScreen.jsx` (Lines 37-76), a left-hand column sidebar was defined using className `"w-full lg:w-[280px] shrink-0 flex flex-col justify-start lg:justify-between pink-frame-editor-left-card gap-6 h-auto lg:h-full"`.
  * In `src/components/GuestSelectScreen.jsx` (Lines 29-124), a left-hand column sidebar was defined using className `"w-full lg:w-[420px] shrink-0 flex flex-col justify-start lg:justify-between pink-select-left-card gap-4 h-auto lg:h-full"`.
  * In `src/styles.css`, `.pink-frame-editor-left-card` is styled at line 6241 and `.pink-select-left-card` is styled at line 6434. These left sidebar elements are only referenced within these two JSX screen files.
* **Grid and Content Columns**:
  * In `src/components/GuestFrameScreen.jsx` (Lines 79-173), the right-hand column layout is wrapped inside `<div className="flex-1 flex flex-col gap-4 justify-between overflow-hidden">` and contains the frame library grid `.pink-frame-grid.pink-frame-preview-grid`.
  * In `src/components/GuestSelectScreen.jsx` (Lines 127-149), the right-hand column layout is wrapped inside `<div className="flex-1 flex flex-col justify-center overflow-hidden">` and contains `.pink-selection-panel` and `.pink-selection-grid`.
  * In `src/styles.css`, the frame selection grid is restricted to exactly 4 columns at lines 6278-6285:
    ```css
    .pink-frame-grid.pink-frame-preview-grid {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 0.85rem !important;
      overflow-y: auto !important;
      padding: 0.25rem !important;
      align-content: center !important;
    }
    ```
  * In `src/styles.css`, the photo selection grid is restricted to exactly 3 columns at lines 6450-6459:
    ```css
    .pink-selection-panel .pink-selection-grid {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 1rem !important;
      overflow-y: auto !important;
      max-height: none !important;
      padding: 0.25rem !important;
      flex: 1 1 auto !important;
      align-content: center !important;
    }
    ```
* **Page Animations**:
  * In `src/useGuestAnimations.js` (Lines 22-51), the GSAP page transition animations target individual cards and buttons: `.pink-card`, `.pink-hero-stage`, `.pink-btn`, `.pink-outline-btn`, and `.pink-frame-choice`. None of the animations target the sidebar container classes (`pink-frame-editor-left-card` or `pink-select-left-card`) directly.

## Logic Chain
1. **Sidebar Elimination**: Since the sidebar columns (`pink-frame-editor-left-card` and `pink-select-left-card`) are only used in Screen 2 and Screen 3 respectively, removing them from the markup will not affect other steps or components.
2. **Single-Column Flex Layout**: By removing the sidebar columns and changing the parent flex container from a horizontal layout (`flex flex-col lg:flex-row gap-6 items-stretch h-full overflow-hidden`) to a vertical-only layout (`flex flex-col gap-4 h-full overflow-hidden`), the UI transitions into a premium single-column layout.
3. **Controls Relocation**: Moving the titles/subtitles to a top header row and the navigation buttons/selection badges to a bottom control row retains the screen's interactive states, text context, and actions while freeing up space.
4. **Adaptive Grids**: With the sidebars removed, the frame selection grid and captured photo grid will automatically span 100% of the screen width. Because the horizontal space increases, changing the static column count definitions (from `repeat(4, 1fr)` and `repeat(3, 1fr)`) to adaptive sizes (e.g., `repeat(auto-fill, minmax(180px, 1fr))`) will allow the grids to display more cards on wide screens while maintaining beautiful grid dimensions.
5. **Animation Integrity**: Since `useGuestAnimations.js` does not animate the sidebar divs but instead animates buttons, cards, and grid choices directly, the structural changes will retain full GSAP transition animations without requiring hook modifications.

## Caveats
* **Mobile / Scroll Behavior**: On smaller screens, the vertical height might be tight depending on the device window. By ensuring the grid container has `flex-1 overflow-y-auto` and the header/footer have `flex-shrink-0`, the content area will scroll independently, preventing the page layout from overflowing or breaking.
* **ID Photo Mode delivery options**: For Screen 3 in ID photo mode, the delivery options card must be cleanly integrated. Placing it between the grid and bottom control row as a wide row ensures it stays visible and easily accessible.

## Conclusion
To implement R2, the codebase needs three key modifications:
1. Replace `GuestFrameScreen.jsx` with a single-column layout structure (fully drafted in `proposed_GuestFrameScreen.jsx`).
2. Replace `GuestSelectScreen.jsx` with a single-column layout structure (fully drafted in `proposed_GuestSelectScreen.jsx`).
3. Update `src/styles.css` using the patch in `proposed_styles.patch` to make both grid columns responsive and auto-adaptive (`repeat(auto-fill, minmax(180px, 1fr))`).

This overhaul yields a spacious, premium, and unified UI layout on both Screen 2 and Screen 3, matching all layout requirements.

## Verification Method
1. **Build and Preview Compilation**:
   * Execute the following command in the workspace to verify there are no JSX compilation/build syntax errors:
     `npm run build`
2. **Inspect Files**:
   * Inspect the proposed layout structures in `proposed_GuestFrameScreen.jsx` and `proposed_GuestSelectScreen.jsx`.
   * Inspect style overrides in `proposed_styles.patch`.
3. **Behavioral Invalidation Conditions**:
   * Invalidation: If the grid items do not scroll properly or overlap with header/footer rows, verify that the header and footer containers have `flex-shrink-0` and that the parent container uses `overflow-hidden` with the grid designated as `flex-1 overflow-y-auto`.

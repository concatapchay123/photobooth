# Plan - Photobooth Flow Optimization

## Overview
- **Iteration 1**: Completed optimization of page transitions (R1) and precision timing (R2).
- **Iteration 2**: Implement the UI & Layout Overhaul (Milestones 3, 4, 5, and 6) using the Project Pattern: Explorer -> Worker -> Reviewer -> Challenger -> Auditor.

## Action Steps

### Phase 1: Setup & Initialization [x]
- Update `ORIGINAL_REQUEST.md`, `PROJECT.md`, `plan.md`, `progress.md`, and `BRIEFING.md` to reflect the new UI requirements.

### Phase 2: Exploration & Analysis [ ]
- Spawn 3 Explorer agents to analyze the codebase for the new requirements:
  - **Explorer 1**: Analyze R3 (Camera Capture Improvements). Locate the camera offset/misalignment and find where the `??` placeholder is set/shown.
  - **Explorer 2**: Analyze R4 (Selection Layout Overhaul). Explore `GuestFrameScreen.jsx` and `GuestSelectScreen.jsx`, locate sidebar columns, controls layout, and grid styling.
  - **Explorer 3**: Analyze R5 & R6 (Adjustment Preview/Slot Ratio and Result Screen Fitting). Explore `GuestAdjustScreen.jsx` and `GuestResultScreen.jsx`. Find preview sizing, slot editing controls, aspect ratio bindings, and result screen clipping bounds.

### Phase 3: Implementation [ ]
- Spawn 1 Worker agent with the Explorer-recommended fix strategy.
- Worker modifies Vite React components and styling to implement:
  - Camera centering and removing `??` placeholder.
  - Clean premium single-column layout for Screens 2 and 3 with full-width grids and control rows.
  - Interactive frame preview scaling and slot aspect ratio preservation (using `--slot-ratio` or inline aspect ratio styles) on Screen 4.
  - Compact, accordion/tab panel quick action row on Screen 4 to prevent height overflow.
  - Max-height limits on Screen 5 print preview bounds to prevent top/bottom clipping.
- Worker runs builds/tests to verify.

### Phase 4: Review and Challenge [ ]
- Spawn 2 Reviewers independently to verify code correctness, responsiveness, and contract compliance.
- Spawn 2 Challengers to verify:
  - Responsive alignment of elements.
  - No countdown `??` visual stutter.
  - Layout matches requirements (no sidebars, full width grids, etc.).
  - Proper aspect ratio rendering of adjustment slots without stretching.

### Phase 5: Forensic Audit & Gating [ ]
- Spawn 1 Forensic Auditor to perform integrity validation (no cheating, no hardcoded results).
- Gate verification. If clean, proceed to completion.

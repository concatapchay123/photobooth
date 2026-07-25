# BRIEFING — 2026-06-21T03:14:46Z

## Mission
Investigate and analyze R1: Smooth Page Transitions, focusing on CSS transitions and potential animation conflicts on .pink-card, .pink-btn, and .pink-outline-btn classes in e:/my-photobooth/src/styles.css and React components.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: Teamwork explorer, Read-only investigator
- Working directory: e:/my-photobooth/.agents/teamwork_preview_explorer_guest_flow_2/
- Original parent: e28941b8-f03c-4c2e-a2c1-6c91b6a1f93c
- Milestone: R1: Smooth Page Transitions

## 🔒 Key Constraints
- Read-only investigation — do NOT implement.
- Do not modify source code or tests, only write files in own agent folder.
- Focus on CSS transitions/transforms on .pink-card, .pink-btn, and .pink-outline-btn.
- Identify GSAP animation conflicts (scale, opacity, translations).
- Recommend clear, concrete fix strategy.

## Current Parent
- Conversation ID: e28941b8-f03c-4c2e-a2c1-6c91b6a1f93c
- Updated: 2026-06-21T03:16:00Z

## Investigation State
- **Explored paths**:
  - `src/styles.css` (analyzed definitions of `.pink-card`, `.pink-btn`, `.pink-outline-btn`, and hover effects).
  - `src/theme-gsap.css` (analyzed theme overrides and transition definitions).
  - `src/useGuestAnimations.js` (examined the GSAP page transition logic and target classes).
  - `src/App.jsx` (examined how guest screen components are rendered, the slider track container `guestTrackRef`, and the duplicate opacity animation).
- **Key findings**:
  - Direct GSAP conflicts where `App.jsx` and `useGuestAnimations.js` both attempt to animate the `opacity` of `.pink-card` elements when `guestStep` changes.
  - Browser CSS transitions (e.g. `transition: all 0.3s ease !important;`) on `.pink-card`, `.pink-btn`, and `.pink-outline-btn` intercept and fight with GSAP's inline style updates (`transform` and `opacity`), causing stutter and jumps.
  - Missing `clearProps` on GSAP tweens leaves stale inline styles (`transform: translate3d(0, 0, 0) scale(1)`) on elements, which blocks CSS hover styles (`transform: translateY(-3px)`) from applying after entering.
  - Lack of `scope` argument in `useGuestAnimations.js` leads to global selector queries instead of scoping to the slider container.
- **Unexplored areas**: None. The scope of this specific bug investigation is fully covered.

## Key Decisions Made
- Formulated a multi-layered conflict resolution strategy combining a `.gsap-animating` transition-disabling CSS utility class, GSAP `clearProps` cleanup, removing the redundant `App.jsx` tween, and adding the React `scope` to `useGSAP`.

## Artifact Index
- e:/my-photobooth/.agents/teamwork_preview_explorer_guest_flow_2/ORIGINAL_REQUEST.md — Original task description
- e:/my-photobooth/.agents/teamwork_preview_explorer_guest_flow_2/BRIEFING.md — Persistent memory index
- e:/my-photobooth/.agents/teamwork_preview_explorer_guest_flow_2/progress.md — Progress tracker
- e:/my-photobooth/.agents/teamwork_preview_explorer_guest_flow_2/proposed_useGuestAnimations.js — Proposed code changes for hook
- e:/my-photobooth/.agents/teamwork_preview_explorer_guest_flow_2/proposed_transitions.patch — Diff patch of the complete recommended changes

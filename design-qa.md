# OneShowTools Platform Design QA

- Source visual truth: `/Users/liyulong/.codex/generated_images/019fa77c-5d15-7b81-96c3-7dacd649f75e/call_NVCRhPnmluLuRJi0wnk8v0lg.png`
- Browser implementation: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/qa-platform-marketplace.png`
- Homepage search update: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/qa-home-search.png`
- Tool workspace update: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/qa-tool-page.png`
- Animated homepage source: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/docs/hero-motion-target.png`
- Animated homepage implementation: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/qa-home-motion-v2.png`
- Animated homepage comparison: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/qa-home-motion-comparison.png`
- Animated homepage mobile capture: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/qa-home-motion-mobile.png`
- Combined comparison: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/qa-comparison.png`
- Viewport: 1440 × 1024 CSS pixels, device scale factor 1.
- Source pixels: 1487 × 1058. Implementation pixels: 1440 × 1024.
- Normalization: both images were rendered side by side at equal CSS width in `qa-compare.html`; no density mismatch was used as evidence.
- State: authenticated Tool Marketplace, Chinese locale, live SQLite account and credit data, runtime providers unconfigured.

## Full-view comparison evidence

The implementation preserves the selected option's three-column command-center
composition: persistent left navigation, a wide search-and-tool workspace, and a
narrow account/status rail. The implementation intentionally extends the mock's
category rail into the eight requested platform modules and replaces the mock's
signed-out right rail with authenticated real account state.

## Focused comparison evidence

The original 1440 × 1024 implementation capture was inspected at full size for:

- Navigation spacing, selected state, icon weight, and header search alignment.
- Search bar height, category-chip rhythm, two-column tool-card grid, card padding,
  status pills, and action alignment.
- Right-rail avatar, live credit balance, plan state, task status, borders, and
  vertical spacing.

No raster illustrations or product imagery exist in the selected source. The
implementation uses the Phosphor icon library for all interface icons.

## Required fidelity surfaces

- Fonts and typography: DM Sans and Noto Sans SC provide the same neutral SaaS
  character, clear hierarchy, and readable small labels. Weights and truncation
  remain consistent across English and Chinese.
- Spacing and layout rhythm: the three principal columns, compact 76px header,
  12–14px component gaps, restrained radii, and thin borders match the reference
  direction. The larger card padding is intentional to support longer bilingual
  product descriptions.
- Colors and tokens: white surfaces, quiet gray-blue canvas, royal blue primary
  actions, hairline borders, and restrained semantic colors match the selected
  direction. No gradients or glass effects were introduced.
- Image and asset quality: no source raster assets were required. The existing
  OneShowTools mark and Phosphor icons render sharply and consistently.
- Copy and content: all eight requested platform modules are named explicitly.
  Account, credits, task, file, runtime, and billing states come from real API
  data. Missing providers are labeled as unconfigured rather than represented
  with fabricated success states.

## Browser interactions tested

- Email registration and automatic secure session creation.
- Dashboard loading with the real 200-credit welcome ledger entry.
- Tool Marketplace navigation and tool selection.
- Task creation, queued state, runtime-unconfigured state, and automatic credit refund.
- Task Center refresh and live right-rail balance update.
- File upload, authenticated download, listing, and deletion through the API lifecycle.
- Chinese interface and English locale control visibility.
- Desktop responsive rendering at 1440 × 1024.

## Console check

The first pass detected a nested interactive control in Task Center. The task-row
container was changed from a button to a keyboard-accessible `div[role=button]`.
After reload, the corrected DOM was present and no new console errors were emitted.
The browser's retained log still contains the two pre-fix messages timestamped
2026-07-29T16:33:02.453Z.

## Comparison history

### Iteration 1

- P1: Task Center placed a cancel button inside a task-row button, producing
  invalid nested interactive HTML and a React console error.
- Fix: replaced the outer button with a focusable, keyboard-operable row using
  `role="button"` and retained the independent cancel button.
- Post-fix evidence: refreshed Task Center DOM shows the corrected row semantics;
  no post-fix console message was recorded.

### Iteration 2

- The source and implementation were compared in the same authenticated
  Tool Marketplace state. No actionable P0, P1, or P2 differences remained.
- The expanded eight-module navigation and authenticated right rail are accepted
  product requirements rather than design drift.

### Iteration 3

- Added a first-screen tool search and live popular-tool shortcuts for visitors
  and signed-in users.
- Verified that searching `PDF` filters the database-backed marketplace to the
  matching PDF tool and scrolls the visitor to the result.
- The revised hero preserves the selected design's typography, blue/white tokens,
  spacing rhythm, and two-column marketplace composition.

### Iteration 4

- Replaced the marketplace's generic run dialog with stable routes for all five
  currently listed tools.
- Verified real copy-polish and image-compression output, including WebP download,
  output size statistics, task creation, credit consumption, and right-rail refresh.
- Verified PDF text extraction and local summary output using a generated test PDF.
- Verified solid-color background removal with transparent PNG output and a real
  authenticated download route.
- Verified the speech-to-text result workflow with an editable transcript without
  granting microphone permission during browser QA.
- Direct tool routes retain the selected command-center layout, while signed-out
  visitors receive a focused login/register prompt before processing.

### Iteration 5

- Replaced the static sign-in card in the guest hero with the selected
  OneShowTools capability-network direction.
- Implemented the network as a responsive high-density canvas with three orbit
  paths, moving capability packets, task streams, subtle pointer parallax, and
  sequenced status labels.
- Added a complete reduced-motion state: moving packets and label sequencing stop
  when the visitor requests less motion.
- Preserved the original Tool Marketplace grid and all real database-backed tool
  names, statuses, credit costs, and routes.
- First comparison found the hero section was approximately 55–60 CSS pixels
  taller than the source, delaying the marketplace entry point.
- Fix: reduced hero height and visual padding while preserving the search and
  network proportions. The second 1440 × 1024 capture aligns the marketplace
  boundary and primary hero hierarchy with the selected source.
- Mobile verification at 390 × 844 shows a single-column hero, simplified
  capability network, readable CTAs, and one-column tool cards without horizontal
  overflow.
- Primary interaction verification: searching `PDF` leaves only the PDF summary
  tool visible and scrolls to the retained marketplace grid.
- Browser console: no application errors or warnings were emitted. Browser-client
  telemetry timeouts were external to the page and did not appear in the page
  console.

## Follow-up polish

- P3: a future iteration may reduce English labels in the Chinese locale for a
  more fully localized first impression while retaining product module names.
- P3: add compact tablet captures after the next round of feature expansion.

final result: passed

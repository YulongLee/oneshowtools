# Design QA

- Source visual truth path: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/reference-oneshowtools.png`
- Implementation URL: `http://localhost:4173/`
- Implementation screenshot path: unavailable because the in-app browser blocked local-site access
- Intended viewport: 1488 × 1058 CSS px
- Source pixels: 1488 × 1058
- Implementation pixels: unavailable
- Density normalization: source is treated as 1×; implementation capture unavailable
- State: desktop default, tool plaza selected, empty search query

## Full-view comparison evidence

Blocked. The source reference was opened and inspected, but the browser-rendered
implementation could not be opened or captured because local-site access was
blocked by the browser's network policy.

## Focused region comparison evidence

Blocked for the same reason. The intended focus regions were the navigation,
hero/search area, tool rows, recent-usage list, and quota card.

## Findings

- [P1] Browser-rendered implementation evidence is missing.
  - Location: full page.
  - Evidence: source image is available; implementation screenshot is not.
  - Impact: typography, spacing, color, icon, and responsive fidelity cannot be
    judged from visible browser evidence.
  - Fix: open the local preview in an allowed browser surface, capture it at
    1488 × 1058, and compare it alongside the source reference.

## Required fidelity surfaces

- Fonts and typography: blocked pending browser capture.
- Spacing and layout rhythm: blocked pending browser capture.
- Colors and visual tokens: blocked pending browser capture.
- Image quality and asset fidelity: the reference contains no raster imagery;
  icon fidelity still requires browser capture.
- Copy and content: implemented from the reference, but visible wrapping and
  truncation require browser capture.

## Primary interactions tested

Not tested in the browser because local-site navigation was blocked. Search,
quick searches, tool selection, recent-tool selection, navigation selection,
and the login dialog are implemented in code.

## Console errors checked

Not checked because the implementation page could not be opened in the browser.

## Comparison history

- Initial pass: blocked before implementation capture; no visual fixes were
  applied from browser evidence.

## Implementation checklist

- Capture the default desktop page at 1488 × 1058.
- Test search, a quick-search chip, a tool row, navigation, and login.
- Check console errors.
- Compare the source and implementation together.
- Fix all P0/P1/P2 findings and repeat.

final result: blocked

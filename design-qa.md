# Design QA — 滑动变祖器

- Source visual truth: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-ea361e98-7d97-4189-aed3-eef3851ac904.png`
- Implementation screenshot: `implementation-ancestor.png`
- Implementation route: `http://localhost:5173/tools/sliding-ancestor-generator`
- Desktop viewport: 1280 × 900 CSS px, density 1; full-page screenshot 1280 × 1254 px.
- Responsive viewport: 768 × 900 CSS px, density 1.
- State: unauthenticated empty/upload state.

## Full-view comparison evidence

The reference establishes a dark experimental image lab, large serif Chinese title, central portrait stage, intensity scale, sparse bronze/grey accents, and a theatrical ancestral portrait direction. The implementation retains those defining surfaces while fitting the existing OneShowTools header and commercial tool workflow. The left configuration rail is an intentional product addition needed for upload, style selection, consent, billing and generation.

## Focused region comparison evidence

Focused checks covered the header/title, portrait stage, slider/ticks, upload card, style cards and action state. The reference's central portrait is user-generated content, so the implementation correctly uses a real upload/result slot rather than a placeholder illustration. Phosphor icons are consistent with the existing product icon system.

## Required fidelity surfaces

- Typography: serif display face for the experimental title and selected state; legible system sans for controls; hierarchy and wrapping pass.
- Spacing/layout: desktop two-column composition and 768 px single-column breakpoint have no horizontal overflow. Persistent controls remain visible.
- Colors/tokens: dark charcoal, aged bronze, paper-white and muted grey match the reference direction while retaining OneShowTools outer shell.
- Image quality/assets: source and generated portraits use real image elements with `object-fit`; no fake raster asset, CSS illustration or emoji is used.
- Copy/content: explicitly describes 12 left + 12 right results, storage impact, wait time, credits, authorization and entertainment-only limitation.

## Interaction and runtime checks

- Tool catalog route opens successfully.
- Upload control, three style choices, authentication gate, generate action and intensity control are present and labelled.
- Browser console errors: none.
- Production build: passed.
- Automated test suite: 123/123 passed.

## Findings

No actionable P0/P1/P2 visual or responsive findings remain.

## Comparison history

Initial implementation passed the normalized full-view and focused checks. No P0/P1/P2 fix iteration was required.

## Follow-up polish

- P3: after real production generations exist, consider using the strongest approved output as the marketplace campaign thumbnail.

final result: passed

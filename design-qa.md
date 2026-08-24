# Design QA — 夯拉排行榜生成器

- Reference images: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-46aca8eb-17a1-4d02-9afc-07c9d99c5ff2.png`, `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-59c9c4e4-2100-4c87-aca9-9e64c5b5f3b8.png`, and `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-94bccc55-6ed7-4d54-8c0a-293d7f80680b.png`.
- Implementation screenshot: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/design-qa-tier-list-full-sort.png`
- Side-by-side comparison: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/design-qa-tier-list-full-sort-comparison.png`
- Reference viewport: supplied desktop reference.
- Implementation viewport: 1440 × 1200; mobile verification at 390 × 844.
- State: signed-in OneShowTools workspace, default five levels, full-page sorting step selected, and two uploaded images retained in the compact bottom tray.
- Interactions checked: image chooser, real mouse drag from the tray to a tier, click outside after dropping, drag-state cleanup, cross-tier drop targets, preview step, and mobile overflow.
- Console: no warnings or errors during the verified flow.
- Responsive result: no horizontal document overflow at 390 px; tier rows, the toolbar, and bottom material tray stack cleanly on mobile.
- Visual comparison: the sorting board now follows the compact exported-list structure in the references, uses solid tier labels, removes image sequence badges, and reduces the upload area to one `上传图片` entry while retaining the OneShowTools card language.
- Defects fixed during QA: the former mouse-down state could remain active when a browser did not complete native drag events. Sorting now uses native drag/drop plus a pointer-release fallback and clears state on successful drop, drag cancellation, and window mouse release. A real drag followed by an unrelated click retained the moved image and left no stale dragging state.
- Final result: passed.

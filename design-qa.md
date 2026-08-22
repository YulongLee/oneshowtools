# OneShowTools — Homepage Alignment QA

## Evidence

- Visual reference: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-cc88dafb-fd57-49e8-a873-91eb1ea9db66.png` (2048 × 746).
- Implementation capture: `/tmp/oneshowtools-home-align-qa/implementation-desktop-final.png` (1600 × 1100, 1× browser capture).
- Tested state: guest homepage with “热门 AI 工具”, product stories, proof metrics, and the following capability section visible.
- Primary desktop viewport: 1600 × 1100. Secondary responsive viewport: 390 × 844.

## Visual comparison

- Replaced the hot-tools section's reserved title column with a full-width content rail, removing the horizontal offset between the tool cards and product-story cards below.
- Introduced one shared homepage content-width token for the hot-tools section, product stories, and proof bar.
- The three sections now share identical desktop boundaries: left `60.8 px`, right `1539.2 px`, width `1478.4 px`.
- Card spacing is normalized to `12 px`, and all six popular-tool cards distribute evenly across the available width.
- On mobile, all three sections share left `10 px`, right `380 px`, width `370 px`, with no viewport overflow.
- The hot-tools heading remains readable on narrow screens and the tool cards stack into one column.

## Interaction and engineering verification

- Tool cards retain the existing launch behavior and configured tool metadata.
- Desktop and mobile browser inspection reported no console errors.
- Horizontal overflow check passed at both tested widths (`scrollWidth = clientWidth`).
- Production build, database consistency check, and full automated test suite passed.

## Severity review

- P0: none.
- P1: none.
- P2: none after the shared-rail and mobile-heading fixes.

final result: passed

# OneShowTools — Design QA

## AI Tool Marketplace

- Reference: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-2734a0e7-75f9-4e63-b571-9322211c625d.png`
- The hierarchy includes the market hero, category filters, featured tools, popular tools, and the complete catalog.
- Featured cards use real published applications and their admin-configured icons.
- Free applications display “免费”; paid applications display the configured per-run credit price.
- Search, category, pricing, AI Agent, local-tool, favorite, and launch interactions use the existing product flows.
- Desktop and 390 px mobile layouts passed visual and overflow checks.

## Recent Usage

## Evidence

- Reference: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-cccba4b9-4b91-4bee-8a26-ac31d25df956.png`
- Desktop implementation inspected at 1440 × 1000.
- Mobile implementation inspected at 390 × 844.
- The reference and implementation were reviewed in one side-by-side comparison image before release.

## Visual comparison

- Matched the reference information hierarchy: page heading, section tabs, recent tools, recent tasks, and recent files.
- Preserved the existing OneShowTools workspace shell, spacing system, borders, blue-violet palette, and typography.
- Replaced reference-only sample content with the signed-in user's real task and file data; empty states remain structured and actionable.
- Desktop sections align to the same content rail and keep consistent card radii, header heights, and section gaps.
- Mobile layout stacks controls and cards without horizontal overflow (`scrollWidth = clientWidth = 390`). The task table intentionally scrolls inside its own card on narrow screens.

## Interaction verification

- Tool cards reopen the selected tool.
- Task rows reopen the original task result through its tool route.
- File cards open the authenticated file download endpoint.
- “查看全部任务 / 文件” navigate to the full management centers.
- Time range and grid/list controls are interactive.

## Engineering verification

- Production build passed.
- Full automated suite passed: 151 / 151.
- Desktop and mobile browser inspection passed with no console errors.

final result: passed

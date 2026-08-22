# Homepage Reference Design QA

## Evidence

- Source visual truth: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-3c788885-a0fd-4a22-967d-801add8e014d.png`.
- Subtitle copy reference: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-b9d774bf-c07c-467e-9d91-13648519849f.png`.
- Source pixels: 2048 × 377 at the supplied screenshot density.
- Full-page implementation: `qa/home-all-sections-aligned.png`, 1481 × 2024 pixels at a 1481 × 1001 CSS viewport.
- Narrow-screen implementation: `qa/home-final-mobile.png`, 390 × 844 pixels.
- Full-view comparison evidence: the source and revised desktop capture were opened together in the same visual comparison input.
- Route/state: `http://localhost:5173/`, logged-out Chinese homepage.

## Findings

- P0: none.
- P1: none. The first fold now follows the supplied layout: compact header, two-column hero, six-card hot-tool strip, three commercial feature cards, and five-column proof bar.
- P2: none. Every homepage section after the hero now shares the same fluid content boundary. The hot-tool rail, three application cards, proof bar, “Why OneShowTools”, workflow, CTA, and footer all measure left 56 px / right 1425 px / width 1368 px at 1481 px. At 2048 px they all measure left 78 px / right 1970 px / width 1892 px. The previous 1380 px maximum-width constraints that made the lower sections narrower than the application area have been removed.
- P3: the fallback tool illustrations use OneShowTools category icons when a custom product image is not configured. This preserves the product icon-management contract while keeping the reference layout intact.
- Hero subtitle now matches the selected reference copy exactly: “AI 音乐、图片处理、视频生成、AI 写作、SEO 优化、数据分析、PDF 工具、AI Agent… 在一个平台完成所有工作。”

## Interaction and accessibility

- Six tool cards orbit slowly and continuously around the central branded sphere.
- Tool-card content does not swap or remount, preventing the previous flash.
- Published tool cards remain actionable; unavailable capability cards remain descriptive and cannot trigger a broken route.
- Reduced-motion preference disables nonessential animation.
- Chinese and English layouts share the same responsive structure.

## Verification

- Production build: passed.
- Automated tests: 151 passed, 0 failed.
- Desktop visual comparison: passed.
- Subtitle reference and rendered homepage were opened together in one comparison input: passed.
- Wide desktop alignment check at 2048 px: passed.
- Existing 390 px responsive layout check: passed (370 px section width, zero horizontal overflow).
- Git whitespace validation: passed.

final result: passed

## Commercial tool icon refresh · 2026-08-22

### Evidence

- Current flat-icon reference: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-18df11b4-2e86-4cf9-bcdc-0883a37760f3.png`.
- Target commercial-image reference: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-f676b264-98f8-4f0d-99a9-e51a90ad9264.png`.
- Six generated product assets: `public/tool-icons-v2/`.
- The supplied target and revised live homepage were opened together in the same comparison input at a 1280 × 720 viewport.

### Result

- Replaced the six homepage/core-product fallback icons with purpose-built 512 × 512 commercial assets for music, outfit changing, image generation, SEO, writing, and PDF tools.
- The icon family now shares a rounded-square canvas, soft volumetric lighting, premium glass/3D material, a single recognizable product object, and category-specific color direction.
- The same fallback assets flow through the common tool icon component, so homepage, dashboard, marketplace, modal, and tool workspaces remain consistent.
- Administrator-uploaded product artwork still overrides every generated fallback icon.
- All 12 visible homepage placements loaded at 512 px source resolution, and the desktop page has zero horizontal overflow.
- Production build passed; automated tests passed 151/151; whitespace validation passed.

final result: passed
# Homepage lower-half commercial refresh — 2026-08-22

- Reference: `codex-clipboard-60d313e5-a665-4848-b764-60eadfb51256.png`
- Implemented the reference hierarchy: capability proof bar, asymmetric five-card value mosaic, four-step workflow, full-width conversion banner, and compact footer.
- Preserved real application behavior: tool navigation, account entry, and pricing anchors remain connected to the existing application.
- Added purpose-built visual assets for AI Agent, file/task management, and the conversion banner; no fabricated live usage metrics were introduced.
- Desktop visual QA at 1280×720: five cards rendered, no horizontal overflow, CTA and footer visible, and no console errors.
- Responsive contracts cover two-column tablet and one-column mobile layouts.
- Verification: production build passed; 151/151 automated tests passed; `git diff --check` passed.

## Commercial metric bar follow-up

- Replaced the capability-only copy with the five requested commercial metrics: `100+ AI 工具`, `10W+ 活跃用户`, `100W+ 任务完成`, `100TB+ 文件处理`, and `98%+ 用户满意度`.
- Updated the English locale to equivalent `100+`, `100K+`, `1M+`, `100TB+`, and `98%+` labels.
- Replaced the icon sequence to match tools, users, completed tasks, files, and satisfaction.
- Visual comparison against the supplied metric-bar reference passed at 1280×720 with no horizontal overflow.
- Final result: passed.

## Featured product showcase restoration · 2026-08-22

### Evidence

- Source visual truth: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-52643833-c25c-445b-b21b-4763f709feb9.png`, 1024 × 1536 pixels.
- Browser-rendered implementation: `qa/homepage-large-products-restored.png`, 1280 × 2003 pixels at the default 1280 px desktop viewport.
- Normalized side-by-side comparison: `qa/homepage-large-products-comparison.png`; the implementation was proportionally normalized to 1024 px width and placed beside the 1024 px source.
- Route/state: `http://localhost:5173/`, logged-out Chinese homepage with two published tools.
- Focused region: the area between the six-card “热门 AI 工具” rail and five-metric proof bar. A separate crop was unnecessary because this region is clearly readable in the normalized comparison.

### Comparison history

- Earlier P1: the three large featured-product cards visible in the source were absent, causing the page to jump directly from popular tools to platform metrics.
- Fix: restored the asymmetric three-card product showcase, reused the existing purpose-built triptych asset, restored localized product copy and feature lists, and connected the first two cards to the real published tool routes.
- Post-fix evidence: all three cards render in the expected 1.65 / 1 / 1 desktop composition and stack without horizontal overflow at 900 px and 390 px.

### Required fidelity surfaces

- Fonts and typography: heading hierarchy, product subtitles, compact feature labels, and action text match the existing commercial landing-page scale.
- Spacing and layout rhythm: showcase uses the same fluid content boundary as the hot-tool rail, proof bar, capability mosaic, workflow, and CTA.
- Colors and visual tokens: preserved the source white/blue/violet system, including the dark music feature card and soft image/writing cards.
- Image quality and asset fidelity: uses the 2048 × 683 commercial triptych raster rather than placeholders or code-drawn artwork.
- Copy and content: restored the three intended experiences—AI Music Studio, AI Visual Tools, and Unified Workspace—in both Chinese and English.

### Verification

- Primary interactions: music and outfit cards route through the existing `onRun` tool flow; the workspace card anchors to the real workflow section.
- Console errors and warnings: none.
- Responsive checks: 900 px and 390 px report zero horizontal overflow.
- Production build: passed.
- Automated tests: 151 passed, 0 failed.
- Git whitespace validation: passed.

final result: passed

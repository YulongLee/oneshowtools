# Featured Products Carousel Design QA

- Source visual truth: `/Users/liyulong/.codex/generated_images/019fa77c-5d15-7b81-96c3-7dacd649f75e/exec-2d6bc537-59bf-4b0c-bbdb-a2b1d49ae60c.png`
- Implementation screenshot: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/qa/featured-carousel-implementation.png`
- Side-by-side comparison: `/Users/liyulong/.codex/.chatgpt-projects/g-p-6a683d1ad61c819185e753932b3c2aec/oneshowtools-prototype/qa/featured-carousel-comparison.png`
- State: the source shows the first item active; implementation was also checked with the first item active and at the available in-app desktop viewport. Responsive behavior was separately checked at 390 × 844.

## Visual comparison

The implementation preserves the selected hierarchy: one dominant product card, two upcoming products visible in the rail and lightweight edge arrows. Following the user's scoped refinement, autoplay status, pause/play, progress and pagination chrome are intentionally omitted from the visible interface. Existing OneShowTools product icons, Chinese copy, category labels and credit prices are used instead of placeholders.

## Required fidelity surfaces

- Hierarchy: the active product remains the visual anchor while upcoming items clearly communicate horizontal continuation.
- Color and spacing: pale indigo, blue, mint, coral and warm surfaces replace the previous heavy banners; spacing and elevation remain consistent with the marketplace design system.
- Typography: product names, descriptions, prices and actions remain readable without turning the section into a dense feature inventory.
- Assets: all visible product imagery uses existing commercial tool icons; no CSS-drawn or placeholder graphics were introduced.
- Responsive behavior: the mobile view keeps the active card and a partial next card visible, with swipe support and no document-level horizontal overflow.

## Interaction and accessibility checks

- Automatic rotation advanced from `AI 音乐工作室` to `AI 一键换装` after five seconds.
- No autoplay status, pause, progress or pagination controls are rendered in the page.
- Previous/next controls, keyboard focus, hover pause and touch swipe are implemented.
- Each card keeps a stable DOM position and transitions between previous, active and upcoming slots over 720 ms; the next card moves left while expanding into the primary position instead of being replaced abruptly.
- Autoplay is disabled when the operating system requests reduced motion.
- The browser console contained no application errors.
- Production build passed.
- Automated test suite passed: 195/195.

## Findings and comparison history

- Pass 1 found the legacy parent grid constraining the carousel to one quarter of the available width (P1). The carousel was explicitly reset to a block formatting context.
- Pass 2 confirmed the active card, preview cards and controls now occupy the intended track width. No actionable P0, P1 or P2 findings remain.
- Pass 3 removed the user-rejected autoplay control strip and confirmed automatic rotation still advances after five seconds.
- Pass 4 replaced the abrupt content swap with a continuous positional track transition. Geometry sampled before, 120 ms into and after the transition confirmed progressive changes to both card position and width.

## Follow-up polish

- P3: production analytics can later tune the five-second interval using real click-through and pause behavior.

## Workbench redesign QA

- Reference: user-provided OneShowTools workbench redesign screenshot
- Route: authenticated workbench home (`/`)
- Viewports checked: 1440 × 900 and 1920 × 1080
- Visual comparison: hero, compact account status bar, continue-creation card, recommendations, popular/new tools, recent activity, Pro banner, sidebar grouping
- Responsive result: no horizontal overflow at either desktop viewport; content remains complete and readable
- Interaction result: recommended tool opens its existing product route and renders successfully; returning to the workbench preserves the dashboard
- Data result: credits, plan, completed tasks, files, recent task, and activity use existing API data; merchandising order is isolated in explicit dashboard configuration
- Console result: no new runtime errors during the final interaction pass
- Automated checks: production build passed; 197 automated tests passed

final result: passed

## 字迹 V3 图片内直接编辑验收

- 视觉真相：`/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-495de020-6a0a-4864-a5f7-fba4766dec3a.png`（1536 × 1024）。
- 实现证据：`artifacts/image-text-editor-direct-edit-1536.png`（1536 × 1324 全页截图，CSS 视口 1536 × 1024，DPR 1）。
- 同屏比较：`artifacts/image-text-editor-direct-edit-comparison.png`。
- 状态：管理员已登录；上传 900 × 420 测试图片；OCR 识别 3 个文字区域；首个区域在画布内原位改为“AI 直接改字”。

### 全局与局部比较

- 全局结构继续匹配参考稿的素材栏、中央图片画布和右侧文字属性栏，且保留 OneShowTools 统一工作台外壳。
- 核心区域现在直接以可输入文字框覆盖识别位置，右侧输入框、字体、字号、颜色、粗细和对齐状态与画布同步。
- 图片默认按可用画布自动缩放；100% 表示完整适配，避免大图只显示局部。工具栏仍可继续放大与缩小。
- 聚焦区域已检查文字框边界、光标输入、选中态、背景遮罩和原图位置关系；未发现影响使用的 P0/P1/P2 差异。

### 五项保真检查

- 字体与排版：画布文字使用平台中文字体栈并沿用识别字号、字重和对齐；输入时无异常换行。
- 间距与布局：三栏比例、画布留白、操作条与底部按钮在 1536 × 1024 视口完整可见。
- 颜色与令牌：蓝紫选择框、浅色编辑遮罩和右侧表单沿用现有产品色。
- 图片质量：原图等比例完整展示，无拉伸、裁切或模糊放大。
- 文案与内容：明确提示“点击文字框，直接在图片上输入”，并提供 ⌘/Ctrl + Enter 应用快捷方式。

### 交互验证

- 点击识别框会立即获得输入焦点，可直接键入并同步更新右侧“修改为”字段。
- 撤销在首次原位编辑后可用；按住对比、重新识别、样式控制、应用生成和下载入口保持可用。
- 生产构建与 3 项图片/PPT 专项测试通过；浏览器控制台无错误或警告。

final result: passed

## Shared commercial tool workspace QA

- Scope: every tool rendered by the shared workspace, including image, PDF, audio, video, data, writing, developer, SEO utility, and marketing utilities.
- Reference: the approved commercial hierarchy used by AI Fridge Recipe, Sliding Ancestor, and Food Nutrition Analyzer.
- Product hierarchy: each shared tool now has an independent back action, outcome-led product hero, product artwork, trust signals, runtime state, and per-run pricing.
- Functional hierarchy: every shared tool exposes a four-stage journey above separate input and result surfaces without changing its existing processing logic.
- Category identity: visual, document, media, data, utility, voice, and writing tools use category-specific accent tokens while preserving one consistent component structure.
- Responsive result: journey steps collapse from four columns to two and then one; hero metadata and workspace panels stack without horizontal overflow.
- Interaction result: AI Outfit Changer rendered the new shell with all four stages and retained description/reference upload mode behavior.
- Runtime result: the inspected page produced no browser console errors.
- Automated result: production build passed; full automated suite passed 198/198.

final result: passed

## Sliding Ancestor and Food Nutrition commercial layout QA

- Reference: user-provided AI Music Studio commercial tool hierarchy.
- Routes: `/tools/sliding-ancestor-generator` and `/tools/food-nutrition-analyzer`.
- Implementation screenshots: `qa/sliding-ancestor-commercial-layout.png` and `qa/food-nutrition-commercial-layout.png`.
- Combined visual comparison: `qa/commercial-tool-layout-comparison.png`.
- Navigation: both pages now place “返回工具市场” in an independent row above the product surface.
- Product hierarchy: each page has a dedicated commercial hero containing product identity, outcome-led headline, trust signals, product artwork, and per-run pricing.
- Functional hierarchy: generation steps, input configuration, results, timeline/history, and supporting actions stay in clearly separated framed work areas.
- Responsive result: the commercial hero artwork remains visible at the normal desktop workspace width and collapses only when the actual tool container becomes narrow.
- Interaction result: Sliding Ancestor style selection and advanced editor expansion passed; Food Nutrition meal-context selection persisted as `dinner`.
- Runtime result: neither page produced browser console errors or warnings.
- Automated result: production build passed; full automated suite passed 197/197.
- Visual review: reference and both implementations were inspected in one combined comparison; no actionable P0, P1 or P2 findings remain.

final result: passed

## AI Fridge Recipe workspace redesign QA

- Reference: user-provided AI Music Studio commercial tool header and workspace hierarchy.
- Route: `/tools/ai-fridge-recipe`
- Implementation screenshot: `qa/fridge-recipe-redesign.png`
- Combined reference comparison: `qa/fridge-recipe-comparison.png`
- Navigation: “返回工具市场” is now an independent navigation row above the product surface.
- Product hierarchy: product identity, value proposition, trust signals, product visual, and per-run price are grouped in a dedicated commercial hero.
- Functional hierarchy: the four-step flow, upload/preferences panel, recipe result panel, shopping list, and expiry reminder remain separate framed work areas.
- Responsive result: at the in-app 1280 px desktop viewport, the input and result panels remain fully visible and supporting cards move to a full-width responsive row without horizontal clipping.
- Interaction result: serving count changed from 2 to 3, and submitting without a photo displayed the expected validation message.
- Runtime result: no browser console errors or warnings were present.
- Automated result: production build passed.
- Visual review: reference and implementation were inspected together; no actionable P0, P1 or P2 visual findings remain.

final result: passed
# 2026-08-31 智能工具搜索验收

- 自然语言“我想生成一个歌”即时推荐 `AI 音乐工作室`，展示推荐原因并支持一键进入。
- 回车/搜索按钮触发低置信度模型兜底；模型未配置或故障时自动退回本地混合排序，不阻塞工具市场。
- 搜索画像（中英文别名、示例问题、能力词、排除词、优先级、开关）由后台持久化管理，版本更新不覆盖。
- 1280px 实机检查无横向溢出（`scrollWidth === clientWidth`），浏览器控制台无错误。
- 自动化：202 tests passed；生产构建与迁移检查通过。

## 2026-08-31 全站布局一致性验收

- 审查范围：工作台、AI 工具市场、AI 音乐工作室、AI 冰箱食谱、滑动变祖器、MBTI 性格偏好自测，以及共享工具页面外壳。
- 桌面端基准：1440 × 900；移动端基准：390 × 844。
- 发现：旧页面同时使用 1280、1420、1480、1540、1580 等多套最大宽度，部分工具页又叠加 18–28 px 内边距，导致相同窗口下内容左右边界和顶部位置明显跳动。
- 修复：建立统一的 1280 px 内容容器、24 px 顶部节奏、响应式左右留白和 224 px 商业主视觉基线；去除冰箱食谱、食物分析、滑动变祖器及 MBTI 的重复页面内边距。
- MBTI：改为容器响应式布局，桌面端标题、产品图和数据区不再互相挤压；窄屏时按实际内容宽度折叠，不依赖浏览器窗口宽度误判。
- 移动端：工具市场与音乐工作室在 390 px 下无文档级横向溢出，主视觉、表单和结果区按单列顺序展示。
- 视觉证据：`.design-audit/layout-consistency/06-workbench-after.png` 至 `14-music-mobile-after.png`。
- 自动化：布局回归测试和完整测试套件通过；生产构建通过后方可部署。

final result: passed

## AI Runtime desktop client commercial redesign QA

- Source visual truth: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-27076033-4e5f-43ca-a978-f25485bc0015.png` (user-provided previous implementation, 1574 × 958 px).
- Implementation screenshot: `artifacts/design-qa/desktop-downloads-commercial-1574.png` (browser-rendered full page, 931 × 1255 px after the in-app browser's 0.591 display scaling).
- Combined comparison input: `artifacts/design-qa/desktop-downloads-before-after.png` (1824 × 744 px, both sides normalized to 900 × 720 containment boxes).
- CSS viewport and state: authenticated `?view=downloads`, desktop override 1574 × 958; responsive overflow also checked at an 820 × 900 override. The browser exposed 1211 CSS px at the desktop override and 631 CSS px at the responsive override because of its display scale.

### Findings and comparison history

- Pass 1 — P1: the page repeated two oversized image cards with unrelated artwork, weak hierarchy, tiny supporting copy, and duplicated security messaging. The left navigation also gave an unfinished client equal weight to core product areas.
- Fix: removed the left `下载客户端` navigation item while retaining the global header entry and the AI Runtime tab; replaced the duplicate artwork cards with one product-led hero, compact platform selectors, a release plan, truthful launch states, and four outcome-oriented capability cards.
- Pass 2 — P2: the primary hero action implied a notification subscription that was not persisted. It was renamed to `查看发布状态`, while the click continues to show the real development status.
- Pass 3: the rendered implementation and source were inspected together. No actionable P0, P1 or P2 findings remain.

### Required fidelity surfaces

- Typography: the new hero establishes a clear headline, supporting copy, platform labels, and readable feature descriptions instead of uniformly small UI text.
- Spacing and layout rhythm: the main hero, platform panel, capability panel, and right release rail use the existing Runtime container and token rhythm; desktop and responsive layouts have no document-level horizontal overflow.
- Colors and tokens: the dark indigo hero, purple/blue states, green completion states, white surfaces, radii, and shadows stay within the established OneShowTools commercial system.
- Image quality: the single hero visual reuses the existing production Runtime artwork at its intended aspect ratio; the unrelated dashboard artwork was removed. Platform marks use the existing Phosphor icon system.
- Copy and product truth: macOS and Windows remain clearly marked as under development, no fake installer is exposed, official distribution is stated, and iPhone/iPad remain a future roadmap item.

### Interaction and accessibility checks

- The left navigation contains no `下载客户端` item; the top download button and Runtime `桌面客户端` tab remain available.
- `查看发布状态` and both platform actions return the development-status feedback.
- The desktop page has no horizontal overflow; the 820 × 900 responsive check also returned `scrollWidth === clientWidth`.
- Browser console errors/warnings: none.
- Production build: passed.
- Automated tests: 211 passed, 0 failed.

final result: passed

## Promotion Center guided launchpad QA

- Reference: selected guided launchpad concept (option 1).
- Build state: production build succeeds.
- Interaction state: onboarding, prerequisite routing, channel setup, optional campaign setup, and link creation states are implemented.
- Automated checks: 214 tests passed.
- Visual comparison: blocked because the in-app browser rejected refreshing the local admin URL during this run.

final result: blocked

# Design QA — 字迹 · AI 图片文字编辑

## Source and evidence

- Source reference: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-495de020-6a0a-4864-a5f7-fba4766dec3a.png`
- Source dimensions: 1536 × 1024
- Implementation viewport: 1536 × 1024
- Empty-state capture: `artifacts/image-text-editor-empty.png`
- Working-state capture: `artifacts/image-text-editor-filled.png`
- Side-by-side comparison: `artifacts/image-text-editor-filled-comparison.png`
- Tested state: authenticated administrator; 1200 × 675 PNG uploaded; OCR returned three selectable text regions; one region was edited, rendered and archived; deterministic local background repair was used for the visual run.

## Visual comparison

- The implementation preserves the source hierarchy: compact product hero, image/PPT mode tabs, asset rail, central canvas and right-side text editor.
- Color, border, radius, typography and control density follow the existing OneShowTools design system while retaining the blue-violet visual direction of the reference.
- The shared authenticated navigation shell is intentionally retained, so the working canvas is denser than the standalone reference but stays within the platform's established content width.
- Empty, uploaded and generated states fit the viewport without horizontal overflow or clipped primary actions.
- OCR selection boxes, selected text and editor state remain visually synchronized.

## Interaction and quality checks

- Upload, automatic OCR, selection, text/style editing, AI copy actions, re-recognition, comparison, undo/redo, generation and download have wired controls.
- Generated output is persisted to the existing task center and file center.
- The tool is administrator-only, marked `testing`, and uses the existing configurable 30-credit task charge.
- Database migration check, production build and the complete 227-test suite pass.
- Browser console inspection returned no warnings or errors.

## Final result

passed

## 字迹 V2 主视觉与 PPT 改字验收

- 参考图：用户提供的 1536 × 1024「图改字 · AI 图片文字编辑器」设计稿。
- 图片模式证据：`artifacts/image-text-editor-image-v2.png`。
- 图片模式同屏对照：`artifacts/image-text-editor-image-v2-comparison.png`。
- PPT 模式证据：`artifacts/image-text-editor-ppt-v2-top.png`。
- PPT 测试文件：`artifacts/image-text-editor-ppt-sample.pptx`。
- 视口状态：浏览器 CSS 视口设为 1536 × 1024；实现保留 OneShowTools 已登录工作台外壳，因此实际工具内容宽度小于独立参考页。

### 视觉结果

- 原先单一字母图块替换为独立的商业化 3D 产品图标，并同步用于工具市场、工作台和产品页。
- 顶部介绍区改为完整产品主视觉：产品定位、价值主张、三项能力凭证、测试状态和上传/价格信息都有明确层级。
- 图片模式继续保持参考图的三栏工作区结构，PPT 模式复用同一视觉语言，避免出现两个不一致的产品页面。
- 桌面视口下主要操作完整可见，无页面级横向溢出；现有平台导航与商业化组件未被破坏。

### 功能结果

- PPT 改字已经开放，支持最大 50 MB 的 `.pptx` 上传、按页读取文字框、逐项修改和导出独立副本。
- 导出只写回文字节点，原 PPTX 压缩包中的图片和其他资源保持存在；原始上传文件不会被覆盖。
- 浏览器实测完成一次 PPT 上传、文字修改、30 积分扣除、异步导出、下载链接生成，以及任务中心和文件中心归档。
- 数据库迁移检查、生产构建和完整 228 项自动化测试全部通过。
- 浏览器控制台无错误或警告。

final result: passed

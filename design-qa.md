# Design QA

## 设置中心

- 参考：用户提供的 OneShowTools 设置中心效果图。
- 页面：`/?view=settings`。
- 保留并复用真实账户资料、密码、邮箱、会话、数据导出和注销 API；未使用模拟账户数据。
- 新增账户偏好、通知与界面设置，本地持久化用户选择。
- 桌面端完成参考图对照，信息层级、双栏布局、账户卡片和安全概览一致。
- 交互检查通过：账户、安全、通知、偏好、会话与隐私页签均可切换。
- 响应式检查通过：390px 宽度无横向溢出，表单与导航保持可用。
- `npm run build` 通过。
- `npm test` 通过，152 项测试全部通过。
- `git diff --check` 通过。

## 工作台顶部

- Status: Passed
- Reference: `/var/folders/2c/sdg0hxmx3b5_x84y09b7hk1w0000gn/T/codex-clipboard-8c9664c0-1baf-45ad-9f4e-b10520dcf556.png`
- Implementation screenshot: `design-dashboard-hero.png`
- Visual comparison: `/tmp/oneshowtools-dashboard-hero-compare.png`

## Checkpoints

- Layout: wide rounded lavender hero, left task entry and right 3D platform visual match the reference hierarchy.
- Content: personalized greeting, task prompt, search entry, and six quick actions are present.
- Asset quality: the hero uses a project-bound WebP asset with the OneShowTools mark and five distinct capability bubbles.
- Responsive behavior: verified at the default desktop viewport, 768 px, and 390 px without horizontal overflow.
- Accessibility: the decorative artwork is hidden from assistive technology and the search action retains its accessible label.
- Regression: production build and all 155 automated tests pass.

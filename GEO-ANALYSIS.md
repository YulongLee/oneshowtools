# OneShowTools GEO / AI 搜索可见性分析

日期：2026-11-06

## GEO Readiness

**当前实现判断：70–79 / 100（Good foundation，置信度 Medium）**

| 平台 | 当前基础 | 主要原因 |
|---|---|---|
| Google AI Overviews | Good foundation | 传统 SEO 信号、可抓取正文、问题式标题、结构化数据已补齐 |
| ChatGPT Search | Good foundation | OAI 搜索爬虫可访问，llms.txt 有工具说明与权威页面 |
| Perplexity | Good foundation | PerplexityBot 可访问，工具页有自包含答案与来源主体 |
| Bing Copilot | Needs follow-up | 页面可索引，但尚未验证 Bing Webmaster/IndexNow |

## AI 爬虫访问状态

- 明确允许：GPTBot、OAI-SearchBot、ChatGPT-User、ClaudeBot、PerplexityBot、Google-Extended。
- 默认允许：普通搜索引擎爬虫。
- 明确阻止：CCBot（训练型抓取），不影响主要搜索引用入口。
- `/admin` 与 `/api/` 不允许抓取，避免无价值或私有路径进入索引。

## llms.txt 状态

- 改造前：返回 SPA HTML，检测质量 5/100，没有标题、描述、章节或链接。
- 本次实现：根目录提供规范 `llms.txt` 和扩展 `llms-full.txt`，列出核心工具、平台说明、运营主体、费用与结果审核边界。

## 可引用性

已完成：

- 每个工具页用首段直接说明“是什么、能做什么”。
- 使用问题式 H2、步骤列表、相关工具列表，便于 passage indexing。
- 首页提供平台定义、能力清单、使用流程和运营主体。
- JSON-LD 明确 Organization、WebApplication 和页面关系。

仍需加强：

- 重点工具需要加入真实测试数据、对比表与误差说明，形成其他网站没有的可引用信息。
- 增加产品发布日期/更新时间和维护者信息。
- 建立外部品牌提及：B 站、知乎、小红书、YouTube/视频号及行业社区。

## 最高影响的下一步

1. 发布真实评测数据和方法说明，给 AI 搜索提供独有事实来源。
2. 每个重点工具制作一篇完整指南，形成“答案页 → 工具页”的内容集群。
3. 建立公开的团队/关于页面与更新日志，补强 E-E-A-T。
4. 在视频内容中统一使用“OneShowTools + 工具全名”，增加品牌实体一致性。
5. 接入 GSC、百度资源平台与 Bing Webmaster，监控索引与 AI 引用来源。

## SSR 检查

本地生产模式验证通过：不执行 JavaScript 时，首页可读取 H1、4 个 H2、工具列表、法律链接和 JSON-LD；工具页可读取唯一 H1、4 个 H2、使用步骤、限制说明和相关工具链接。


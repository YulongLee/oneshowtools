# OneShowTools SEO / GEO 全站审计

审计日期：2026-11-06  
审计范围：`https://oneshowtools.com/`、公开工具页、抓取与 AI 搜索入口。  
业务类型：在线 AI 工具/SaaS 平台。  
证据来源：线上原始 HTML、HTTP 响应、仓库源代码、SEO 校验脚本与本地生产构建。

## A. 审计摘要

### 总体判断

- **改造前：Poor（30–39）**。首页 canonical 指向旧域名 `gameforcast.top`，原始 HTML 仅约 4 个词，无 H1、正文、内部链接与结构化数据；`llms.txt` 实际返回 SPA HTML，质量检测仅 5/100。
- **本次实现后：Good（70–79，证据置信度 Medium）**。本地生产模式已确认首页和工具页具有唯一标题、摘要、正确 canonical、可抓取正文、内部链接、Open Graph、Twitter Card、JSON-LD、robots、sitemap 与有效 llms.txt。
- 性能分数未计入最终精确分数：Google PageSpeed API 在审计时限流，未获得可验证的 LCP、INP、CLS 数据。

### 最重要的 3 个原始问题

1. canonical 与 hreflang 指向旧域名，存在权重和索引信号错误。
2. 首屏内容完全依赖 JavaScript，非 JS/AI 爬虫几乎看不到产品与工具页面信息。
3. 缺少有效 sitemap、AI 爬虫声明、社交元数据与结构化数据。

### 已落地的 3 个高价值机会

1. 为首页和每个公开工具提供服务端可见的 H1、问题式 H2、操作步骤与相关工具链接。
2. 为工具页加入 `WebApplication`、`WebPage`、`BreadcrumbList`，为首页加入 `Organization`、`WebSite`、`CollectionPage` 与 `ItemList` JSON-LD。
3. 建立 20 个目标关键词到对应页面的映射，并添加 `robots.txt`、`sitemap.xml`、`llms.txt`、`llms-full.txt`。

## B. 发现表

| Area | Severity | Confidence | Finding | Evidence | Fix |
|---|---|---|---|---|---|
| Canonical | Critical | Confirmed | 首页曾把规范网址指向旧域名 | 线上 HTML：`canonical=https://www.gameforcast.top/` | 已改为 `https://oneshowtools.com/`，工具页生成独立 canonical |
| Crawlability | Critical | Confirmed | 原始 HTML 无 H1、正文或工具链接 | 改造前解析：word count 4，H1/H2/links 均为空 | 已加入服务端 SEO 内容注入，JS 不执行时仍有完整页面内容 |
| On-page | Warning | Confirmed | 全站共用一个泛化标题与极短摘要 | 改造前标题为“OneShowTools — 实用 AI 小工具” | 已为首页及核心工具生成唯一标题、描述和 H1 |
| Structured data | Warning | Confirmed | 改造前没有 JSON-LD | HTML 解析结果 `schema=[]` | 已加入有效 JSON-LD，不使用受限 FAQPage 或已弃用 HowTo |
| Social | Warning | Confirmed | OG/Twitter 元数据完全缺失 | social_meta 检测为 0/100 | 已补充 og:title/description/url/image/type 和 Twitter Card |
| Sitemap | Warning | Confirmed | robots 没有 Sitemap 声明 | robots_checker 报告“No Sitemap directive” | 已创建 sitemap.xml，并在 robots.txt 中声明 |
| GEO | Warning | Confirmed | 原 llms.txt 是 SPA fallback，不是规范文本 | llms checker：标题缺失、0 sections、0 links、5/100 | 已创建规范 llms.txt 与 llms-full.txt，包含工具和权威说明 |
| AI crawlers | Info | Confirmed | AI 爬虫原先只依赖默认策略 | robots_checker 显示 11 个 AI crawler 未明确管理 | 已明确允许搜索型爬虫，阻止 CCBot 训练抓取 |
| Internal links | Warning | Confirmed | 原始 HTML 内部链接为 0 | 改造前 parse_html：internal=[] | 首页链接所有公开工具，工具页链接首页、法律页与相关工具 |
| Security | Pass | Confirmed | 安全响应头完整 | security_headers：100/100，HTTPS、HSTS、CSP 等均存在 | 保持现状 |
| Redirects | Pass | Confirmed | 首页无多余重定向 | redirect_checker：200，0 hops | 保持现状 |
| Performance | Info | Unknown | 无法确认 Core Web Vitals | PageSpeed API 连续限流 | 部署后用 Search Console/CrUX 复测 LCP、INP、CLS |
| Keyword metrics | Info | Unknown | 暂无真实搜索量、KD、当前排名 | 未连接 Search Console/DataForSEO | 上线后连接 GSC，按曝光和 5–20 位关键词迭代 |

## C. 分类评估

### Technical SEO

正向信号：HTTPS、安全头、200 直达、正确 canonical、robots 与 sitemap。  
缺口：Core Web Vitals 未取得真实数据。  
判断：**Good，置信度 Medium**。

### Content Quality 与 E-E-A-T

正向信号：运营主体、隐私政策、服务协议、积分规则、工具限制与人工核对提醒清晰；页面回答“是什么、怎么用、能否商用”。  
缺口：尚无作者/团队页、案例、用户评价、原创行业数据与内容更新记录。  
判断：**Needs Improvement，置信度 High**。

### On-page SEO

正向信号：唯一 title、description、H1、问题式 H2、描述性内部链接和关键词页面映射。  
缺口：部分工具页面仍可增加更具体的示例、输入输出样例和实际截图说明。  
判断：**Good，置信度 High**。

### Schema

正向信号：首页与工具页均采用 JSON-LD；类型符合当前可用 Schema.org 类型。  
缺口：暂未加入有真实证据支持的 Review/AggregateRating，避免虚构评分。  
判断：**Good，置信度 High**。

### GEO / AI Search

正向信号：原始 HTML 可读、llms 文件有效、AI 搜索爬虫可访问、页面有自包含答案块、列表与步骤、运营主体明确。  
缺口：外部品牌提及、第三方引用、YouTube/社区讨论和原创数据仍不足。  
判断：**Good foundation，置信度 Medium**。

## D. 未知项与后续验证

- Google PageSpeed/CrUX 的真实 LCP、INP、CLS。
- Google Search Console 的收录、曝光、点击、查询与平均排名。
- 百度搜索资源平台的收录与关键词数据。
- 20 个关键词的精确搜索量、难度和 CPC；在没有数据源时不虚构指标。
- Google/Bing/百度重新抓取后的实际索引结果通常需要数天至数周。

## 环境限制

- PageSpeed API 在审计期间触发限流，因此性能项保持 Unknown。
- broken_links 脚本因工具自身 `KeyError: total` 失败；本次通过原始 HTML内部链接解析与自动化测试验证链接结构，但仍建议部署后再用独立爬虫复核全站状态码。


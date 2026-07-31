# Market Intelligence Agent

The administrator console now includes a daily market-demand brief that combines:

- persisted tool catalog, task lifecycle, zero-result searches, repeat usage, subscriptions, invoices, credits, and marketplace funnel demand;
- public, traceable signals from GitHub repositories, GitHub Issues, Hacker News, DEV Community, and Stack Exchange;
- China-market signals from official V2EX endpoints and official feeds published by 少数派、36氪、IT之家、InfoQ 中文, with optional Gitee repository search;
- optional authorized signals from Product Hunt, YouTube, Search Console, Google Ads Keyword Planner, and Reddit;
- a server-side Codex synthesis step using `kimi/kimi-k3` by default.

Reports run once per day after 08:00 Asia/Shanghai and can also be triggered manually by an administrator with `intelligence.manage`. Evidence is normalized, deduplicated, classified into the 13-product matrix, quality-scored, and balanced across sources and categories. Every recommendation must retain at least two valid evidence IDs from two independent sources. Source health, category coverage, failures, and historical evidence are persisted; unsupported recommendations are discarded rather than displayed.

No model credential, provider endpoint, customer content, or raw user identifier is returned by the admin API. Marketplace searches and funnel events are recorded only for authenticated users with an opaque user identifier. Authorized sources support server-side OAuth refresh tokens for unattended collection.

Administrators can continue a report as a persisted, report-scoped Codex conversation. The assistant receives only that report's sanitized evidence, product snapshot, and bounded conversation history. Answers, follow-up suggestions, problem statements, solutions, and next steps are required to be in Simplified Chinese; citations are filtered to evidence IDs that actually exist in the selected report.

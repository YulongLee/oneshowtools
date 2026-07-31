# Market Intelligence Agent

The administrator console now includes a daily market-demand brief that combines:

- persisted tool catalog, task lifecycle, and marketplace search demand;
- public, traceable signals from GitHub, Hacker News, and DEV Community;
- a server-side Codex synthesis step using `kimi/kimi-k3` by default.

Reports run once per day after 08:00 Asia/Shanghai and can also be triggered manually by an administrator with `intelligence.manage`. Every recommendation must retain at least two valid evidence IDs. Source failures are stored with the report, and unsupported recommendations are discarded rather than displayed.

No model credential, provider endpoint, customer content, or raw user identifier is returned by the admin API. Marketplace searches are recorded only for authenticated users with an opaque user identifier.

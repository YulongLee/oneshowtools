# OneShowSEO Execution Log

## 2026-08-02

- Added persistent projects, scans, opportunities, and recommendation actions.
- Reused the SSRF-protected live crawler for observed website evidence.
- Added evidence-derived title, description, canonical, image-alt, broken-link,
  robots, and sitemap opportunities.
- Connected approvals to the real task table, credit ledger, and audit events.
- Removed website write configuration, automatic execution, and rollback from
  the public product. The API rejects automatic-change requests and legacy
  connector records are disabled for audit-only compatibility.
- Added a recurring due-project scanner and persisted automation policy.
- Added owner-scoped multi-site project switching and an always-visible scan
  report, including explicit successful output when no issue is detected.
- Replaced fixed frontend metrics and fake source states with API data.
- Verified a live crawl of `https://mianshiwen.cn/` locally: 2 pages parsed,
  2 links checked, 1 sitemap URL observed, and no covered issue detected.
- Build passed and the complete automated suite passed.

Deferred because authorization was not supplied:

- Google Search Console OAuth
- GA4 OAuth
- Baidu Search Resource Platform authorization

# OneShowSEO Execution Log

## 2026-08-02

- Added persistent projects, connectors, scans, opportunities, and actions.
- Reused the SSRF-protected live crawler for observed website evidence.
- Added evidence-derived title, description, canonical, image-alt, broken-link,
  robots, and sitemap opportunities.
- Connected approvals to the real task table, credit ledger, and audit events.
- Added encrypted CMS webhook testing, execution, and rollback contracts.
- Exposed manual recommendation and automatic change as two explicit choices;
  manual delivery is the default and requires no site write authorization.
- Added a recurring due-project scanner and persisted automation policy.
- Replaced fixed frontend metrics and fake source states with API data.
- Verified a live crawl of `https://mianshiwen.cn/` locally: 2 pages parsed,
  2 links checked, 1 sitemap URL observed, and no covered issue detected.
- Build passed and the complete automated suite passed.

Deferred because authorization was not supplied:

- Google Search Console OAuth
- GA4 OAuth
- Baidu Search Resource Platform authorization
- A production CMS write connector and real rollback token

# Open-source capability benchmarks

Reviewed on 2026-08-01. These projects inform behavior and quality gates; OneShowTools does not copy their source code.

- SEOnaut (`github.com/StJudeWasHere/seonaut`): organize crawler findings by severity and connect every issue to an affected page.
- Unlighthouse (`unlighthouse.dev`): discover URLs from robots.txt, Sitemap, and internal links; keep crawl sampling bounded and make coverage visible.
- Google Lighthouse (`github.com/GoogleChrome/lighthouse`): preserve structured machine-readable evidence while also offering an HTML report; keep performance observations separate from SEO recommendations.
- SerpBear (`github.com/towfiqi/serpbear`): rankings come from timestamped SERP observations, then history and trends are derived from saved snapshots. Search Console metrics and manually observed live rank are different data types.

## OneShowTools application rules

1. Technical sub-tools must return capability-specific evidence rather than the same generic site report.
2. A network timeout is unknown, not automatically a broken link.
3. Historical reports may only summarize persisted runs inside an explicit date range.
4. Ranking history requires saved SERP snapshots with keyword, market, source, result URL, and observation time.
5. Keyword volume, difficulty, CPC, SERP rank, and backlinks stay locked until a maintained provider is configured.

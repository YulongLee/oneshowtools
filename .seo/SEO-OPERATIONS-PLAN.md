# OneShowSEO Operations Plan

## Objective

Deliver an evidence-driven SEO Agent loop inside OneShowTools: live crawl,
prioritized opportunity, human approval, task and credit settlement, optional
CMS execution, rollback, and recurring scans.

## Baseline

- Shared user, task, credit, audit, model, and SEO crawl infrastructure exists.
- The previous OneShowSEO screen used component-local demo state.
- GSC, GA4, Baidu, and CMS authorization are not available to the Agent and
  therefore remain explicitly unknown or unconnected.

## Prioritized backlog

| ID | Area | Impact | Confidence | Effort | Dependency | Owner | Evidence | Acceptance test |
|---|---|---:|---:|---:|---|---|---|---|
| SEOA-01 | Projects and crawl | High | High | Medium | Public website | Platform | Existing safe crawler | A saved project produces persisted crawl evidence |
| SEOA-02 | Opportunities | High | High | Medium | SEOA-01 | Agent | Observed page fields | Every opportunity includes URLs and observed evidence |
| SEOA-03 | Approval and credits | High | High | Medium | Ledger | Platform | Existing immutable ledger | Approval creates one task and one idempotent charge |
| SEOA-04 | CMS execution | High | Medium | High | Owner connector | Tool integration | No CMS credential available | Only a tested connector may report execution |
| SEOA-05 | Monitoring | Medium | High | Medium | Scheduler | Agent | Persisted scan timestamps | Due projects are scanned without inventing traffic data |

## Measurement

- Crawl coverage, health score, opportunities by status, actions, failures, and
  consumed credits are measured from persisted records.
- Clicks, impressions, CTR, rankings, and conversions remain `null` until a
  real first-party or provider authorization is connected.

# Commercial account lifecycle release evidence

- Date: 2026-07-30
- Application commit: `5241f1b7413cbdac854d153fce0ca7de4ab2a09c`
- Domain: `https://oneshowtools.com`
- Production service: `oneshowtools`

## Backup and migration

- Pre-deployment backup:
  `/var/backups/oneshowtools/oneshowtools-before-5241f1b-20260730T125700.sqlite`
- Pre-deployment backup SHA-256:
  `f1c1d714b195aa1795c50ed2db1795613d868a07340cbf0b1a563384fdfebdcf`
- Post-migration backup:
  `/var/www/oneshowtools/app/data/backups/oneshowtools-2026-07-30T05-01-24-905Z.sqlite`
- Migration invariant result: 14 required tables present
- Production aggregate after migration: 0 users, 0 sessions, 0 tasks,
  0 files, and 0 credits

The migration is additive. Rollback starts by disabling all commercial
capabilities and redeploying the prior code while preserving the upgraded
database and financial history. The pre-deployment snapshot is retained for
disaster recovery.

## Release gates

The following server-controlled flags were confirmed disabled:

- Registration
- Google authentication
- Billing and checkout
- Account deletion

Public tool discovery, the home page, tools API, and plans API remained
available. Registration returned the expected unavailable response while email
delivery was unconfigured.

## Health and compatibility checks

- Service state: active
- `/api/health`: 200, configuration ready, SQLite available
- `/`: 200
- `/api/tools`: 200
- `/api/plans`: 200
- Registration gate: 503 `REGISTRATION_UNAVAILABLE`
- OneShow AI Lab public site: 200
- Local automated suite: 13 passed, 0 failed
- Production build and migration check: passed

## Monitoring and rollback signals

Before enabling any capability, monitor service restarts, API 5xx responses,
email delivery failures, authentication rate-limit events, OAuth callback
errors, Stripe webhook receipt failures, and credit-ledger invariant failures.
If a regression appears, disable the affected capability first, restore the
previous application build, and reconcile any accepted provider events before
re-enabling it.

# OneShowModel runtime release

## Release identity

- Commits: `b29a4d9`, followed by `b282ec1`
- Production service: `oneshowtools`
- Production domain: `https://oneshowtools.com`
- Pre-release backup: `20260731-011559`
- Application rollback source: `/var/www/oneshowtools/releases/b29a4d9`
- Database rollback policy: keep additive migration tables and roll the
  application back; do not remove historical tasks, ledger entries, jobs, or
  invocation summaries.

## Baseline and rollout

Before migration, production had one verified user, one administrator, 200
credits, no tasks or files, registration enabled, and billing, destructive
account deletion, and administrator MFA disabled. The database integrity check
returned `ok`.

The additive runtime migration was applied with managed execution and personal
connections disabled. After invariant checks, the minimum three managed-model
settings and a separate generated credential-encryption key were installed in
the root-owned service environment. A private canary returned normalized text
through the `managed` route. Managed execution and personal connections were
then enabled.

## Verification evidence

- Local build succeeded.
- Local and production automated suites: 19/19 passing.
- Migration validation and strict OpenSpec validation succeeded.
- Browser acceptance added a synthetic personal connection, showed only its
  final four key characters, and confirmed the saved connection lifecycle UI.
- Production task smoke: task `completed`, durable job `completed` on the first
  attempt, output present, managed route recorded, and balance changed from 10
  to 7. The synthetic user and all related rows were then deleted.
- Final database integrity and ownership checks succeeded with one user, no
  tasks, no files, 200 credits, no pending execution jobs, and one retained
  redacted canary invocation.
- The public health response reports `oneShowModelEnabled: true` and
  `configurationReady: true`; billing and destructive account deletion remain
  disabled.
- The release journal contained zero matches for credential field names,
  authorization headers, bearer values, or the internal test model identifier.
- `/etc/oneshowtools/oneshowtools.env` remains mode `0600`, owned by root.

## Emergency controls

Set `ONESHOW_MODEL_EXECUTION_ENABLED=false` to stop managed execution and
`MODEL_CONNECTIONS_ENABLED=false` to stop personal-connection management, then
restart `oneshowtools`. Existing encrypted credentials and durable task records
remain intact. Restore the application from the recorded release source if
needed; restore the pre-release database only for disaster recovery, not normal
application rollback.

The upstream managed credential still needs to be rotated in its provider
console after the owner confirms the release. The replacement value must be
written only to the service environment.

# Commercial admin v1 release evidence

- Release date: 2026-07-30 (Asia/Shanghai)
- Deployed application commit: `df67660`
- Previous application commit: `6596f29`
- Migration: `db/migrations/0003_commercial_admin_console.sql`
- Production database before migration: 1 user, 0 tasks, 1 credit-ledger row
- Pre-release backup: `/var/backups/oneshowtools/pre-admin-v1-20260730.sqlite`
- Pre-release backup SHA-256: `3a2dff788cb80db7953de8b03fea14164829344ce3d86e0a5ebbbebec8fe46d9`
- Post-migration backup: `/var/www/oneshowtools/app/data/backups/oneshowtools-2026-07-30T10-32-11-356Z.sqlite`
- Production health: configuration ready, SQLite ready, registration and email enabled
- Admin release state: `/api/admin/v1`, RBAC enabled, mandatory TOTP MFA enabled
- Commercial release state: Stripe, Alipay, and WeChat Pay live charging disabled
- Destructive account deletion: disabled
- Verification: 16 automated tests passed, production build passed, migration invariant check passed
- Public smoke: `/` 200, `/admin` 200, anonymous `/api/admin/v1/session` 401
- Browser security: HSTS, CSP, Permissions-Policy, nosniff, frame, and referrer headers enabled

Rollback procedure:

1. Restore application commit `6596f29`.
2. Keep the additive migration tables in place; the previous application ignores them.
3. If data rollback is required, stop the service and restore the pre-release SQLite backup and environment backup.
4. Start the service, check `/api/health`, registration, email verification, customer login, and tool routes.


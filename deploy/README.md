# OneShowTools deployment

The production release flow preserves the current architecture: Node 22,
systemd, Nginx, SQLite, and OSS. It does not copy application secrets or user
data from Git.

## Existing server: one command

1. Copy `deploy/deploy.env.example` to `.deploy.env` and set the SSH key path.
2. Commit the release so the working tree is clean.
3. Run `npm run deploy:prod`.

The command verifies the build and test suite, uploads an isolated staging
release, builds it on the server, checks migrations, checkpoints and backs up
SQLite, deploys the code, checks `/api/health`, and rolls back automatically if
the health check fails. It retains three code snapshots and three SQLite
backups. The `.env`, `data/`, and OSS objects are never replaced.

## Rollback

List snapshots on the server under `/var/www/oneshowtools/releases`, then run:

```bash
npm run deploy:rollback -- <release-id>
```

Rollback preserves the current database and creates another database backup
before restoring code.

## Fresh Ubuntu server: one command

Create a production environment file outside the repository. In `.deploy.env`,
set `DEPLOY_BOOTSTRAP=true`, `DEPLOY_DOMAIN`, `DEPLOY_LETSENCRYPT_EMAIL`, and
`DEPLOY_ENV_FILE`. Make sure DNS for the root domain and `www` already points at
the new server, then run `npm run deploy:prod`.

That command installs the pinned Node runtime, Nginx, systemd service, TLS
certificate, protected environment file, application release, and health
checks. After the first deployment, switch `DEPLOY_BOOTSTRAP` back to `false`.

The bootstrap script is intentionally non-destructive: it does not overwrite an
existing environment file, database, Nginx configuration, or another service.

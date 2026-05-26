GitHub Actions → Railway automatic deploy

This repository contains a GitHub Actions workflow at `.github/workflows/deploy.yml` that will automatically build and deploy to Railway when you push to the `main` or `staging` branches.

- Required GitHub secrets

- `RAILWAY_API_KEY` — a Railway API key with access to the target project(s). To create one:
  1. Sign in to Railway dashboard.
  2. Open Project Settings → Service Settings → Service API Keys (or Account API Keys).
  3. Create a new key and copy it.
  4. In GitHub, go to your repository → Settings → Secrets and variables → Actions → New repository secret.
  5. Add `RAILWAY_API_KEY` with the value you copied.

- (Optional) `RAILWAY_ENV_VARS` — a single repository secret containing newline-separated `KEY=VALUE` pairs for environment variables you want the workflow to push to Railway before deploying. Example value for the secret:

```
FRONTEND_URL=https://aientity.co.uk
COOKIE_DOMAIN=.aientity.co.uk
JWT_SECRET=super-secret-value
```

The workflow will iterate each non-empty, non-comment line and run `railway variables set KEY VALUE` against the target project (staging or production) depending on the branch.

Additional required secrets for branch-based deploys

- `RAILWAY_PROJECT_PROD` — Railway project ID for production (used when pushing to `main`)
- `RAILWAY_PROJECT_STAGING` — Railway project ID for staging (used when pushing to `staging`)

How the workflow works

- On push to `staging`, the workflow deploys to the staging Railway project.
- On push of a tag matching `v*` or `release/*`, the workflow deploys to the production Railway project (this is how production releases are gated by tags).

Notes and optional improvements

- If you need environment variables set on Railway, configure them in the Railway project UI (recommended) or set `RAILWAY_ENV_VARS` as a GitHub secret and the workflow will push them to the target project before deploying.
- For multi-environment deployments, the workflow already uses branch or tag conditions to route deploys to the appropriate Railway project.

Security

- Keep `RAILWAY_API_KEY` secret. Rotate the key if it is ever exposed.

If you want, I can:
- add branch-based deploy rules (e.g., `staging` branch deploys to a staging Railway project), or
- add commands to the workflow to push environment variables into Railway via the CLI.

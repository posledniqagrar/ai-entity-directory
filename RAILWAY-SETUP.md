Railway Setup — Quick Steps

This file documents a one-click style setup for Railway (or similar host) to ensure cookies and CORS work correctly for production.

1) Add environment variables in Railway

- Open your Railway project > Environments > Variables
- Add the variables from `.env.example` (at minimum set `NODE_ENV=production` and `FRONTEND_URL`)

Recommended vars:
- `NODE_ENV` = production
- `FRONTEND_URL` = https://aientity.co.uk
- `COOKIE_DOMAIN` = .aientity.co.uk (optional)
- `JWT_SECRET` = <secure random string>

2) Deploy / Redeploy

- After saving variables, click Deploy (or redeploy the service).

3) Verify

- Use the browser to open your frontend and attempt registration/login.
- In DevTools > Network, inspect the POST to `/api/auth/register` and confirm the response contains `Set-Cookie` with `SameSite=None; Secure`.

Quick curl test (use `curl.exe` on Windows PowerShell):

```powershell
curl.exe -i -X POST "https://aientity.co.uk/api/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"test+deploy@example.com\",\"password\":\"password123\"}"
```

Expected `Set-Cookie` header example:

```
Set-Cookie: token=...; Max-Age=604800; Path=/; Expires=...; HttpOnly; Secure; SameSite=None
```

4) Troubleshooting

- If no cookie appears:
  - Ensure the response includes `Set-Cookie` and flags `Secure; SameSite=None`.
  - Confirm the site is served over HTTPS.
  - Confirm `FRONTEND_URL` exactly matches the origin of your frontend.

- If CORS errors occur:
  - Add the frontend origin to `FRONTEND_ORIGINS` as a comma-separated list.

5) Optional: railway.json

- If you want to seed Railway with variables via the CLI, you can create a `railway.json` template and use the Railway CLI to push environment variables. I can prepare that for you if desired.

---
If you want, I can create `railway.json` or add a deploy script next. Which would you prefer?
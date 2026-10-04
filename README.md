# Category Expense Tracker

Expense tracking app with a React and TypeScript frontend and an Express, MongoDB backend.

## Local development

1. Install Node.js and MongoDB.
2. Copy `backend/.env.example` to `backend/.env`; set `MONGODB_URI` and generate a `JWT_SECRET` of at least 32 bytes.
3. For the first run, set `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and a unique `BOOTSTRAP_ADMIN_PASSWORD` (12–72 UTF-8 bytes), then run `npm run bootstrap:admin` from `backend/`. Remove the bootstrap password from the environment after creating the initial administrator.
4. Start the backend from `backend/` with `npm install` and `npm run dev`.
5. Start the frontend from `frontend/` with `npm install` and `npm run dev`.

The Vite development server proxies `/api` to `http://localhost:5000`.

## Production configuration

- Set `MONGODB_URI` to the production database connection string in the backend environment. Do not put credentials in `.env.example` or commit `.env` files.
- Set `CORS_ORIGINS` to the exact comma-separated frontend origins if the frontend and API use different origins. Same-origin deployments can use a reverse proxy for `/api`.
- Set `TRUST_PROXY` to the number of trusted reverse proxies only when the API is deployed behind them; this is used to determine client IPs for rate limiting.
- Set a unique random `JWT_SECRET` of at least 32 bytes. Sessions expire after eight hours; disabling an account, changing its role, or signing out revokes its active sessions.
- Run the initial admin bootstrap command once against the production database. Public registration is disabled; admins create team accounts from the application.
- Deploy the frontend and API behind HTTPS. If they use different origins, include the exact frontend origin in `CORS_ORIGINS`; browser session cookies use credentialed requests and CSRF tokens.
- Set frontend `VITE_API_BASE_URL` to the API base URL, including `/api`. Use `/api` when a same-origin reverse proxy routes API requests.
- `VITE_*` values are embedded in the public frontend bundle and must never contain secrets.

Backend readiness is available at `GET /api/health`; it returns `503` until MongoDB is connected. Backend startup fails if its database connection cannot be established.

## Checks

Run from `frontend/`:

```sh
npm run lint
npm run test
npm run build
```

## Access model

All signed-in team accounts can read shared categories and summary data. Members can create expenses and edit or delete only their own; administrators can manage all expenses, shared categories, and team accounts. Expenses recorded before authentication was added have no owner and are visible/manageable only by administrators.

# Category Expense Tracker

Expense tracking app with a React and TypeScript frontend and an Express, MongoDB backend.

## Local development

1. Install Node.js and MongoDB.
2. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`.
3. Start the backend from `backend/` with `npm install` and `npm run dev`.
4. Start the frontend from `frontend/` with `npm install` and `npm run dev`.

The Vite development server proxies `/api` to `http://localhost:5000`.

## Production configuration

- Set `MONGODB_URI` to the production database connection string in the backend environment. Do not put credentials in `.env.example` or commit `.env` files.
- Set `CORS_ORIGINS` to the exact comma-separated frontend origins if the frontend and API use different origins. Same-origin deployments can use a reverse proxy for `/api`.
- Set `TRUST_PROXY` to the number of trusted reverse proxies only when the API is deployed behind them; this is used to determine client IPs for rate limiting.
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

## Deployment limitation

The API currently has no user authentication or authorization. CORS and rate limiting do not protect expense records from direct API access. Add an authentication model before deploying with private or sensitive financial data.

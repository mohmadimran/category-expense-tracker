# Category Expense Tracker

A team expense tracking application for recording expenses, organizing spending into budgeted categories, and reviewing monthly summaries. The frontend is built with React and TypeScript; the API uses Express and MongoDB.

## Features

- Record, filter, edit, and delete expenses.
- Organize spending with shared categories and monthly budgets.
- Review category totals and budget status by month.
- Sign in with administrator or member access.
- Register a member account directly from the sign-in screen.
- Give members access to their own expenses; administrators can manage all expenses, categories, and team accounts.

## Repository structure

```text
.
├── backend/
│   └── src/
│       ├── middleware/       # Authentication, roles, and CSRF checks
│       ├── middelware/       # Request body validation
│       ├── models/           # User, expense, and category schemas
│       ├── routes/           # Authentication, expense, and category API routes
│       ├── scripts/          # Initial administrator setup
│       ├── tests/            # Auth API flow tests
│       ├── utils/            # Shared API error handling
│       └── index.js          # Express app and server startup
└── frontend/
    ├── public/               # Static files
    ├── src/
    │   ├── api/              # Axios client and API calls
    │   ├── components/       # Expense, category, and summary UI
    │   ├── hooks/            # Data fetching and UI state
    │   ├── utils/            # Formatting and validation helpers
    │   ├── App.tsx           # Authentication gate and application shell
    │   └── types.ts          # Shared frontend types
    └── tests/                # Unit, component, and authentication-flow tests
```

## Application workflow

1. The frontend checks for an existing session. Signed-out users see the sign-in form.
2. Anyone can register as a member or sign in. The API issues a 15-minute HTTP-only access cookie, a rotating refresh cookie with a 30-day session lifetime, and a CSRF token.
3. The Axios client sends cookies with API requests and attaches the CSRF token to write requests. When access expires, it refreshes the session and retries the request.
4. Authentication middleware validates the session and loads the active user. Role middleware restricts administrator operations.
5. Expense records are associated with their creator. Members can access their own expenses; admins can access all expenses. Categories and summaries are shared across the team.
6. Administrators can create and manage team accounts from the application. Public registration always creates a member account.

The API exposes `/api/auth` for sessions and account administration, `/api/expenses` for expense records, `/api/categories` for shared categories, `/api/summary` for category totals, and `/api/health` for service readiness.

## Local setup

Requirements: Node.js, npm, and a running MongoDB instance.

1. Create `backend/.env` from `backend/.env.example`.
2. Set `MONGODB_URI` and a random `JWT_SECRET` with at least 32 bytes.
3. In `backend/`, install dependencies:

   ```sh
   npm install
   ```

4. To enable administrator features immediately, set `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` in the backend environment. The password must contain 12–72 UTF-8 bytes. Then run `npm run bootstrap:admin` from `backend/` and remove the bootstrap password afterward. This step is optional; without an admin the API still starts and public member registration works, but category and team-account management are unavailable.

5. Start the API from `backend/`:

   ```sh
   npm run dev
   ```

6. In another terminal, start the frontend from `frontend/`:

   ```sh
   npm install
   npm run dev
   ```

Open the Vite URL shown in the terminal (usually `http://localhost:5173`). During development, Vite proxies `/api` to `http://localhost:5000`.

## Configuration and deployment

- Keep secrets in environment variables. Do not commit `.env` files.
- Set `MONGODB_URI` and `JWT_SECRET` in the backend environment. Public registration can run before an administrator is bootstrapped; an admin is needed to create categories and manage accounts.
- For separate frontend and API origins, set `CORS_ORIGINS` to the exact frontend origin(s), separated by commas. Set frontend `VITE_API_BASE_URL` to the API URL including `/api`. For same-origin deployments, use `/api` behind a reverse proxy.
- Serve frontend and API over HTTPS in production. Credentialed session cookies require HTTPS when origins are separate.
- Authentication endpoints are rate limited: registration allows 5 attempts per hour, sign-in 10 per 15 minutes, and refresh 30 per 15 minutes per client IP. The API also applies a general request limit.
- Set `TRUST_PROXY` to the number of trusted proxy hops when running behind a reverse proxy.
- `VITE_*` variables are public and bundled into the frontend; never put secrets in them.
- Legacy expenses created before authentication have no owner. They remain accessible to administrators; members will not see or modify them.

## Development checks

Run from `frontend/`:

```sh
npm run lint
npm test
npm run build
```

Run the backend auth API flow test from `backend/`:

```sh
npm test
```

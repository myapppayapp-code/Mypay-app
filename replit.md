# MyPay

A multi-currency wallet and payment platform supporting INR and USDT transactions, OTP-based auth, user referrals, task-based rewards, and a comprehensive admin dashboard.

## Run & Operate

- `artifacts/web-app: web` workflow — Vite dev server (Replit proxies internal port 22965 to preview)
- `artifacts/api-server: API Server` workflow — Express API on port 8080
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, JWT auth, bcryptjs, pino logging
- DB: PostgreSQL + Drizzle ORM
- Frontend: React 19, Vite, Tailwind CSS 4, Radix UI (shadcn/ui), TanStack Query, Wouter
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- OTP SMS: FAST2SMS (dev mode returns devOtp when key not set)

## Where things live

- `artifacts/api-server/` — Express backend
- `artifacts/api-server/src/routes/` — API route handlers
- `artifacts/api-server/src/lib/` — wallet, fraud, seed, logger utilities
- `artifacts/web-app/src/` — React frontend
- `lib/db/src/schema/` — Drizzle ORM schema (source of truth for DB)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — generated TanStack Query hooks
- `lib/api-zod/` — generated Zod schemas

## Architecture decisions

- API proxied from Vite dev server: `/api/*` → `http://localhost:8080` (configured in `vite.config.ts`)
- Artifact workflow system manages ports: web app uses Replit-injected PORT (defaults to 22965), API hardcodes PORT=8080 in dev script
- JWT tokens for user sessions, separate admin auth
- Idempotency keys on wallet operations to prevent double-spend
- Risk scoring (fraud checks) via device fingerprint + IP before critical operations

## Product

- User registration/login via mobile number + OTP
- INR and USDT wallet with deposit, withdrawal, and transfer
- Sell requests and UPI account management
- Task system: complete tasks to earn wallet credits
- 3-level referral network with bonuses
- Admin dashboard: manage users, transactions, deposits, withdrawals, settings, banners, announcements

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- API server dev script hardcodes `PORT=8080` to avoid conflicts with Replit's injected PORT env var for the web workflow
- Web app's `vite.config.ts` uses `process.env.PORT ?? "22965"` — Replit injects PORT=22965 for the artifact workflow; do NOT hardcode PORT=5000 or the workflow restart will fail (Replit expects the app on the injected port)
- Run `pnpm --filter @workspace/db run push` after schema changes before restarting the API
- `pnpm install` must be run from workspace root (not per-package) to link workspace packages

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Admin seed credentials are set in `artifacts/api-server/src/lib/seed.ts`

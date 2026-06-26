---
name: MyPay project setup
description: Stack, seed credentials, route layout, port configuration, and key gotchas.
---

## Seed admin credentials
- Username: `aslambhai`, Password: `aslambhai123098` (seeded by seed.ts, never expose in UI)

## Port configuration (CRITICAL — do not change)
- Replit's artifact workflow system injects `PORT=22965` into the `artifacts/web-app: web` workflow process at runtime. The web app MUST listen on this injected port — do NOT hardcode PORT=5000 or the workflow will fail with "didn't open port 22965".
- `artifacts/web-app/vite.config.ts` uses `process.env.PORT ?? "22965"` as fallback. Replit proxies external preview traffic to whatever port the process opens.
- `artifacts/api-server/package.json` dev script hardcodes `PORT=8080` (`export NODE_ENV=development PORT=8080 && pnpm run build && PORT=8080 pnpm run start`) to avoid being clobbered by any shared PORT env var.
- Do NOT set PORT as a shared env var — Replit injects per-workflow and a shared var could conflict with the API server.

**Why:** Changing the web app to port 5000 caused `restart_workflow` to fail ("didn't open port 22965"). Artifact workflow port is determined by Replit's system, not by us.

## 4 requirements — all pre-implemented in ZIP, all verified live

1. **Admin-only sell requests** — No user POST endpoint exists. `POST /api/admin/sell-requests` guarded by `req.adminUser`. Approval deducts wallet, creates ledger/transaction/notification/audit log.
2. **One-account-per-mobile** — `artifacts/api-server/src/routes/auth/local.ts` — returns 409 + "This mobile number is already registered."
3. **10 cancellations/day limit** — `artifacts/api-server/src/routes/deposits.ts` line 312-331 — excludes "Timer expired" reason, blocks at ≥10 with "Daily buy order cancellation limit reached."
4. **Admin credentials removed from UI** — `artifacts/web-app/src/pages/admin/login.tsx` line 73: `placeholder="Enter username"` (was "admin").

## Routes
- User GET sell requests: `GET /api/sell-requests`
- Admin create/approve/reject: `POST /api/admin/sell-requests`, `PATCH /api/admin/sell-requests/:id/approve`
- Wallet adjust: `POST /api/admin/users/:id/wallet-adjust` (not `/api/admin/wallet/adjust`)
- UPI add requires `provider` field: one of `phonepe|paytm|mobikwik|airtel|freecharge`

**Why:** All 4 requirements were in the original ZIP. Only UI placeholder fix was needed.

## Auth system (unified OTP)
- `artifacts/web-app/src/lib/firebaseOtp.ts` — unified `sendFirebaseOtp(mobile, containerId, purpose)` — tries Firebase, auto-falls back to DEV MODE on `auth/billing-not-enabled` or `auth/quota-exceeded`; DEV MODE `confirmFn` auto-accepts any OTP
- `artifacts/web-app/src/pages/login.tsx` — 3-tab auth: login (mobile+password), register (OTP→details), forgot password (OTP→new password); all OTP flows use shared utility
- `POST /api/auth/reset-password` added in `local.ts` — takes `{mobile, newPassword, confirmPassword}`, verifies mobile exists, bcrypt-hashes new password, updates DB
- Firebase diagnostic console.log removed from `firebase.ts`
- Logging: `[PROD MODE] Firebase OTP sent` / `[DEV MODE] Mock verification active`

## Startup / workflow notes
- Run `pnpm install` from workspace root after any dependency changes
- Run `pnpm --filter @workspace/db run push` after schema changes before restarting API
- API server build takes ~2s (esbuild). The artifact dev script builds then starts.
- Do NOT create manual ("MyPay ...") workflows — they conflict with artifact workflows on ports 8080/22965.

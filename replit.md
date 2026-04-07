# Pro SJA Micro Finance — SJA Foundation

## Overview

A comprehensive financial investment platform for Indian users (₹ currency), managing users, KYC, wallets, deposits/withdrawals, investment plans, payout ledgers, referral/commission systems, and admin dashboards.

## Architecture

- **Frontend**: React 18 + Vite SPA, TypeScript, Tailwind CSS, shadcn/ui
- **Auth & Data**: Supabase (auth, RLS policies, database RPCs, storage buckets)
- **Server**: Express.js backend at port 3000 (health check, future API routes)
- **Database (schema)**: PostgreSQL via Drizzle ORM (`shared/schema.ts`) — schema reference for all 23 tables
- **Routing**: React Router v6 with lazy-loaded pages

## Key Features

- User portal: dashboard, investments, wallet, withdrawals, referrals, KYC, agreements, support
- Admin portal: user management, KYC approval, deposit/withdrawal processing, payout management, reporting, audit log
- Investment agreement PDF generation and QR-code verification
- Commission/referral multilevel system
- Maintenance mode
- System settings management (branding, agreement templates, bank details)

## Project Structure

```
src/                  Frontend React app
  App.tsx             Main routes
  components/         Reusable components (admin/, auth/, dashboard/, etc.)
  hooks/              Custom React hooks (Supabase-powered)
  lib/                supabase.ts, utils.ts, agreements.ts, etc.
  pages/              Page-level components
  types/              TypeScript type definitions
server/               Express backend
  index.ts            Server entry point (port 3000)
  db.ts               Drizzle + node-postgres pool
shared/               Shared code between frontend and backend
  schema.ts           Drizzle ORM schema (all 23 tables)
supabase/migrations/  Historical Supabase migration SQL files (reference only)
drizzle.config.ts     Drizzle Kit configuration
```

## Environment Variables

- `VITE_SUPABASE_URL` — Supabase project URL (set as Replit env var)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (set as Replit env var)
- `DATABASE_URL` — Replit Postgres connection string (provisioned as secret)
- `SERVER_PORT` — Express server port (3000)
- `NODE_ENV` — development / production
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — Replit Postgres credentials (secrets)

## Database Tables (Drizzle Schema)

All 23 tables defined in `shared/schema.ts`:
`profiles`, `wallets`, `investment_plans`, `user_investments`, `withdrawal_requests`, `deposit_requests`, `investment_cancellation_requests`, `payout_log`, `nominees`, `kyc_documents`, `notifications`, `transactions`, `commission_rules`, `commission_payouts`, `system_settings`, `investment_agreements`, `agreement_public_views`, `user_notes`, `admin_audit_log`, `faqs`, `support_tickets`, `support_messages`, `investment_requests`

## Scripts

- `npm run dev` — Start Vite dev server (port 5000)
- `npm run server` — Start Express API server (port 3000)
- `npm run db:push` — Sync Drizzle schema to Postgres
- `npm run db:studio` — Open Drizzle Studio

## Workflows

- **Start application** — Vite dev server on port 5000 (webview)
- **Start server** — Express backend on port 3000 (console)

## Notes

- The app uses Supabase for all auth and data operations (auth, RPCs, storage)
- The Supabase anon key is intentionally public-safe per Supabase design; RLS policies control data access
- Express server handles additional server-side logic and future API routes
- All financial amounts are in Indian Rupees (₹)
- Supabase storage buckets: `system_assets` (public), `nominee_photos`, `agreement_assets`, `signed_agreements` (private)

# Replit Quick Start (Fast Setup)

This guide helps you run this app on Replit quickly and reliably.

## 1) Open in Replit
- Import this GitHub repository into Replit.
- Replit will auto-detect `.replit` and install dependencies.

## 2) Configure Secrets (Required)
In **Replit → Tools → Secrets**, add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `SESSION_SECRET`

Optional/auto-managed in many Replit setups:
- `SERVER_PORT=3000`
- `NODE_ENV=development`

## 3) One-Click Run (Recommended)
- Press the **Run** button.
- Replit workflow starts both services:
  - Frontend: `npm run dev` (port `5000`, mapped to external `80`)
  - Backend: `npm run server` (port `3000`)

## 4) Manual Run (if needed)
In Shell:
```bash
npm ci
npm run dev
```
In another Shell tab:
```bash
npm run server
```

## 5) Open the App
- Use Replit Webview after Run starts.
- If needed, wait until port `5000` is ready.

## 6) Quick Health Check
- Frontend loads in Webview.
- Backend should respond on port `3000`.
- Login/auth and dashboard pages should load without missing-env errors.

## Common Fixes
- **Blank page / env errors**: re-check secrets names exactly.
- **Port conflict**: keep frontend on `5000`, backend on `3000`.
- **Install issues**: run `npm ci` again.

---
If you keep `.replit` and secrets correct, this project should run in Replit almost instantly with the Run button workflow.

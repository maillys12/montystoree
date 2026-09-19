# Deployment checklist

## 1. Vercel
Create a **new** Vercel project named `montystoree` from GitHub repository `maillys12/montystoree`; do not import the existing `montystore` project. Framework: Vite; build command `npm run build`; output directory `dist`. The `vercel.json` file enables SPA deep links.

## 2. Supabase
Create a **new** project named `montystoree` in the organization chosen by its owner, following the required cost confirmation. Region `ap-southeast-1` (Singapore) is a suggested nearby region; confirm before creating. Run the reviewed `supabase/migrations/20260919000000_foundation.sql` on this new project only. Review RLS and advisor results before real users are onboarded.

## 3. Client environment
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel project's environment settings. Never store secret or service-role keys in the frontend or GitHub.

## 4. Before accepting actual payments
Implement server-side tenant provisioning, tenant staff authorization, secure inventory vault, checkout transactions, verified payment callbacks, idempotent wallet ledger posting, rental billing, account recovery, audit trails, and testing. The current demo intentionally disables payment and delivery.

## 5. Domain
Use the Vercel project URL with paths `/s/:slug` until a custom root domain and DNS configuration are available. Do not assume free automatic per-store subdomains on vercel.app.

# MONTYSTOREE

A multi-tenant premium digital storefront and website-rental platform.

## Development status

The first commit establishes a responsive frontend preview. Checkout, wallet balances, account delivery, tenant provisioning and admin mutations are intentionally **not enabled** until secure server-side APIs and Supabase policies are implemented. Sample products and numbers are demonstration data only.

## Run locally

```bash
npm install
npm run dev
npm run build
```

## Tenant routing

- `/`: main store
- `/products`: catalog
- `/products/:id`: product detail
- `/wallet`: wallet onboarding (no transfers enabled)
- `/orders`: order history onboarding (no fake orders)
- `/admin`: admin onboarding (no fake authorization)
- `/rent`: website rental introduction
- `/s/:slug`: local tenant storefront preview (sample theme only)

Production requirements: Supabase Auth, tenant isolation with RLS, verified payment webhooks and an append-only wallet ledger, encrypted inventory, role-based authorization, tenant/domain routing, PWA assets, and end-to-end tests.

No third-party premium accounts, keys, or credentials are included.

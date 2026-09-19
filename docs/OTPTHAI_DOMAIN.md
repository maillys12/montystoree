# otpthai.shop domain deployment

Main host: https://www.otpthai.shop (currently the apex otpthai.shop redirects here).
Tenant host format: https://<slug>.otpthai.shop

## Required Vercel configuration
In project **montystoree** → Settings → Domains:
1. Keep otpthai.shop and www.otpthai.shop on this same project.
2. Add `*.otpthai.shop` to the SAME project, and follow Vercel's exact DNS/nameserver/verification instructions for the wildcard domain. Vercel typically requires managing the domain using Vercel nameservers for automatic wildcard SSL certificates.
3. Wait until wildcard domain shows **Valid Configuration** and SSL is issued.
4. Verify https://maillys.otpthai.shop loads the site (not just the root domain).

Do not add a separate project for each store. Do not assume `*.vercel.app` can be provisioned dynamically.

## Routing
`src/tenant/domains.ts` resolves the exact single-label hostname beneath otpthai.shop. `App.tsx` renders only that tenant's storefront on a matching hostname. Database queries are scoped to that store and protected by RLS. Existing `/s/<slug>` routes remain available as draft owner previews.

## Supabase Auth
Under Authentication → URL Configuration, set the production Site URL to `https://www.otpthai.shop`. Allowlist exact redirects for:
- `https://www.otpthai.shop/login`
- `https://www.otpthai.shop/reset-password`

Until cross-subdomain authentication is implemented, a pending tenant is previewed through `/s/<slug>` from the central admin host; otherwise signing in to the main host does not create a browser session on every new subdomain. Do not publish pending tenant drafts.

## Verification checklist
- DNS, certificate, main host and an actual tenant hostname
- signup, confirmation and password reset redirects
- anonymous tenant draft inaccessible
- owner can view only own draft and own products
- cross-tenant requests are blocked by RLS

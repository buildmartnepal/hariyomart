# Hariyo Mart Nepal v8.2 — Cloudflare-Native Produce Commerce & Tenant SaaS

Hariyo Mart Nepal is a Cloudflare-native marketplace and multi-tenant SaaS for farms, cooperatives, produce suppliers, wholesalers, institutional buyers, retailers and household customers across Nepal.

v8.2 keeps the v8.1 theme/auth/product hardening and adds a production commerce control plane: D1-synchronized carts, coupons, delivery-slot capacity, RMA returns, inventory alerts, product price history and seller/admin commerce operations.

## Production stack

```text
Cloudflare Edge / DNS / CDN / WAF / Turnstile
                    |
                    v
     Next.js + OpenNext on Worker `hariyomart`
                    |
       +------------+-------------+
       |            |             |
       v            v             v
      D1           R2             KV
 business DB   media/cache    config/cache
       |
       v
  private `hariyo-mart-services` Worker
       +-- Durable Objects
       +-- Queues + DLQ
       +-- Workflows
       +-- Analytics Engine
```

## v8.2 highlights

- production Worker name/url aligned to `hariyomart` / `hariyomart.nishrutesh.workers.dev`
- complete D1, R2, KV, Queue and service bindings retained in Wrangler
- OpenNext self-reference matches Worker identity
- source maps + observability enabled
- required Worker secrets declared and deployment-validated
- synchronized authenticated carts with guest/local fallback
- coupon rules and server-side redemption reservation
- delivery-slot capacity and reservation
- RMA / return workflow for real buyer order items
- farmer/admin commerce control dashboard
- low-stock/expiry alert rules
- product price-history audit
- inventory coordination through Durable Objects
- event Queue with integration-outbox fallback
- multi-tenant produce supply modules from v8 retained
- semantic light/dark menu/footer/form contrast from v8.1 retained

## First local checks

```powershell
npm ci
npm run v8.2:doctor
npm run validate
npm run smoke
npm run cloudflare:types
npm run typecheck
```

Apply local D1 migrations:

```powershell
npm run cloudflare:db:local
```

Run the web app:

```powershell
npm run dev:web
```

## Before production deploy

1. Replace `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `apps/web/wrangler.jsonc`.
2. Set `JWT_SECRET`, `JWT_REFRESH_SECRET` and `TURNSTILE_SECRET_KEY` as Wrangler secrets.
3. Export/backup the production D1 database.
4. Apply migration `0005` through the normal D1 migration command.
5. Deploy the private services Worker first.
6. Deploy the OpenNext web Worker.
7. Verify `/api/health`, `/api/system/readiness` and `/api/system/supply-stack`.

See `docs/V8_2_CLOUDFLARE_PRODUCTION_GUIDE.md` for the complete Windows/PowerShell production procedure.

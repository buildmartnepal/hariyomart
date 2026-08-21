# Hariyo Mart v8.4.1 Demo Accounts

These identities are for staging, sales demos, QA and role testing. They are **not production owner credentials**.

## Shared password

```text
HariyoDemo@2026
```

| Workspace | Email | Effective access |
|---|---|---|
| Buyer | `buyer@demo.hariyomart.local` | Customer account, orders, nearby, procurement demand |
| Farmer owner | `farmer@demo.hariyomart.local` | Growth Farmer OS, tenant owner |
| Cooperative owner | `cooperative@demo.hariyomart.local` | Enterprise cooperative, tenant owner |
| Tenant admin | `tenantadmin@demo.hariyomart.local` | Tenant administration |
| Manager | `manager@demo.hariyomart.local` | Farm manager |
| Procurement | `procurement@demo.hariyomart.local` | Procurement operations |
| Inventory | `inventory@demo.hariyomart.local` | Stock, lots and warehouse operations |
| Sales | `sales@demo.hariyomart.local` | Sales operations |
| Delivery | `delivery@demo.hariyomart.local` | Delivery operations |
| Accounting | `accounting@demo.hariyomart.local` | Accounting/settlement operations |
| Field farmer | `fieldfarmer@demo.hariyomart.local` | Field-farmer member role |
| Viewer | `viewer@demo.hariyomart.local` | Read-only tenant access |
| Vendor | `vendor@demo.hariyomart.local` | Vendor workspace |
| Platform admin | `admin@demo.hariyomart.local` | Platform administration |

## Local demo

```bash
npm run cloudflare:db:local
npm run demo:seed:local
npm run dev
```

In development the login page automatically shows the demo selector.

## Dedicated staging / demo deployment

1. Set the **non-secret** public variable:

```env
NEXT_PUBLIC_DEMO_MODE=true
```

2. Apply current production migrations and seed demo accounts:

```bash
npm run cloudflare:db:remote
npm run demo:seed:remote
```

3. Redeploy the web Worker so `NEXT_PUBLIC_DEMO_MODE=true` is reflected in the client bundle.
4. Open `/demo` or `/login`.

## Remove demo access before a real production launch

```bash
npm run demo:remove:remote
```

Then set:

```env
NEXT_PUBLIC_DEMO_MODE=false
```

and redeploy.

The SQL demo seed stores a bcrypt hash for the shared demo password. The plaintext value is intentionally present only in the demo UI/config helper because it is a published test credential, not a production secret.


## v8.7 one-click login

Open `/login` and choose a demo role card. **Use & sign in** submits the known test credential directly in Production Test Mode. Migration 0011 repairs stale credentials on upgrade, and the login path can self-heal a stale stored hash.

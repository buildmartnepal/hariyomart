# v8.3.3 standalone Cloudflare deployment

The production web Worker is intentionally self-contained for first deployment.

## Default topology

`hariyo-mart-nepal` uses D1, KV, R2, Queues and OpenNext directly. The optional `hariyo-mart-services` Worker is not a required binding.

D1 fallback paths cover checkout, inventory adjustments, auth/API rate limiting and tenant document numbering. This eliminates Cloudflare error 10143 when the private Worker has not been deployed.

## Optional advanced topology

The source under `infra/cloudflare/services` remains available for Durable Objects, Workflows, WebSockets and stronger coordination. Deploy it separately first. Only after it exists should an advanced deployment add the `HARIYO_SERVICES` binding back to the web Worker.

## Production checklist

1. Deploy `hariyo-mart-nepal`.
2. Apply all D1 migrations through `0006_standalone_web_runtime.sql`.
3. Set `JWT_SECRET` and `JWT_REFRESH_SECRET` as Cloudflare secrets.
4. Configure Turnstile site + secret keys before public launch.
5. Run `/api/health`, `/api/system/readiness`, and `/api/system/supply-stack` checks.
6. Optionally deploy `hariyo-mart-services` later and enable the advanced binding only after verifying it exists.

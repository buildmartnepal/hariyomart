# Hariyo Mart v8.0.0 — Cloudflare TypeScript Build Hotfix

Date: 2026-08-14

This hotfix addresses the six TypeScript errors reported by the Cloudflare OpenNext build after the dependency-level Cloudflare SDK issue was resolved.

## Fixed

1. `components/SupplySaaSWorkbench.tsx`
   - Explicitly types `summarizePayload()` as `Array<[string, unknown]>`.
   - Explicitly types mapped tuples so React keys remain strings instead of `unknown`.
   - Narrows `/api/system/supply-stack` JSON to `PlatformStatus | null` before calling `setStatus`.

2. `server/cloudflare/platform.ts`
   - Widens Wrangler-generated `TURNSTILE_ENFORCEMENT_MODE` from the current literal configuration to the supported application union: `web | all | off`.

3. `server/cloudflare/supply-api.ts`
   - Normalizes `taxNpr` with `input.taxNpr ?? 0` before arithmetic and D1 binding.

4. `server/cloudflare/supply-stack.ts`
   - Treats a completed D1 schema probe batch as ready. Failed probes are already handled by the surrounding `catch` block, avoiding comparison against D1's literal `success: true` result type.

## Cloudflare rebuild

From the repository root:

```bash
npm ci
npm --workspace apps/web run typecheck
npm --workspace apps/web run build
npx @opennextjs/cloudflare build
npx @opennextjs/cloudflare deploy
```

Recommended Cloudflare Workers Builds configuration:

- Build command: `npx @opennextjs/cloudflare build`
- Deploy command: `npx @opennextjs/cloudflare deploy`

Do not disable strict TypeScript or use `ignoreBuildErrors` for these issues.

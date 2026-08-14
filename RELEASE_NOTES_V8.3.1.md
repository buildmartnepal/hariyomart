# Hariyo Mart Nepal v8.3.1 — Cloudflare Workflow Type Safety Hotfix

## Fixed

- Replaced Workflow `step.do()` results typed as `Record<string, unknown>` with explicit serializable DTOs.
- Added explicit generic return types for order loading and due-subscription loading.
- Restored `due` as `DueSubscriptionRow[]`, fixing iterator, nullability, and `.length` errors.
- Added the current Workflow step callback context parameter (`_ctx`) to the fixed persisted steps.
- Isolated the Cloudflare services TypeScript project from unrelated ambient `@types` packages with `types: []`.
- Added `typecheck:services` and made Cloudflare service deployment fail before deploy when service typecheck fails.
- Made `build:cloudflare` typecheck the services Worker before building the OpenNext web bundle.
- Added GitHub Actions CI to run dependency install, generated Cloudflare types, full typecheck, validation, smoke checks, and Cloudflare build.

## Why the error happened

Current Cloudflare Workflows requires values persisted from `step.do()` to be serializable. `Record<string, unknown>` is intentionally too broad because `unknown` can include non-serializable values. Concrete row DTOs whose fields are strings, numbers, booleans, nulls, arrays, or other serializable values satisfy the Workflows type contract and preserve useful TypeScript inference.

## Verification

- The complete `infra/cloudflare/services/src/index.ts` passes strict TypeScript checking against the package's generated Wrangler/workerd runtime definitions when external npm module resolution is stubbed for `zod`.
- A dedicated Workflow-only strict typecheck passes with the generated runtime definitions.
- Repository-wide TS/TSX syntax validation is run during packaging.
- Full dependency-backed `npm run typecheck` and `npm run build:cloudflare` should be run after `npm ci` on the user's machine / GitHub / Cloudflare, because this packaging environment cannot access the npm registry.

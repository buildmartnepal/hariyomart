# Hariyo Mart Nepal v9.0.0 Handoff

This package is a clean source handoff. It intentionally excludes `node_modules`, `.next`, `.open-next`, Git metadata and local secret files.

## Recommended verification
```bash
npm clean-install --progress=false
npm run v9:doctor
npm run typecheck
npm run test
npx @opennextjs/cloudflare build
```

## Production Test deploy
```bash
npm run deploy:cloudflare:production
```

## Demo Lab
Open `/demo`. One-click sessions call `/api/auth/demo-session`, which is active only under explicit Production Test Mode and only for allow-listed demo accounts.

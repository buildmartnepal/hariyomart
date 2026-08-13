# Security policy

Report suspected vulnerabilities privately to the Hariyo Mart operator; do not include credentials, customer records or exploit details in a public issue. Until a dedicated security mailbox is configured, repository administrators should enable GitHub private vulnerability reporting.

## Supported release

Security fixes target the latest v5 release on `main`. Production deployments should use the committed lockfile and pass `npm run release:check` before promotion.

## Dependency scope

`npm run audit:prod` audits the dependencies deployed by the Next.js web/API workspace and is part of CI. The Expo workspace includes Metro, native build and Apple project tooling that is used while building but is not shipped as server code or bundled into the native JavaScript runtime. Keep Expo packages aligned with `npx expo install --check`, use isolated EAS builders and review full-workspace audit findings separately rather than applying forced major-version downgrades.

## Operational expectations

- Keep secrets only in Vercel/EAS/provider secret stores.
- Use signed Cloudinary uploads and restrict media type, size and folder policies.
- Require MongoDB transactions for checkout and protect Redis with TLS.
- Rotate bootstrap and service credentials after initial setup or suspected exposure.
- Preserve audit logs and avoid placing tokens, passwords or personal data in application logs.

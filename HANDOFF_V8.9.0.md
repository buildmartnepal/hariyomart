# Hariyo Mart Nepal v8.9.0 — Handoff

This package is the v8.9.0 production-test baseline. It preserves the complete v8.8 commerce/product/Farmer OS stack and adds the Public Story & Trust Experience.

## Public experience focus

- About: system story, marketplace network graphic, facts, trust pillars, FAQs.
- Contact: routed support experience, safer support form, ticket reference workflow.
- How It Works: eight-stage operating model, buyer and seller journeys, trust checkpoints.
- 19 supporting guide/policy pages: visual story, facts, cards, FAQ and CTA modules.
- Mobile: responsive diagrams, stacked facts, accessible FAQ/details and full-width CTAs.
- Themes: Auto/Light/Dark tokens continue across every new module.

## Deployment

1. `npm clean-install --progress=false`
2. `npm run v8.9:doctor`
3. `npm run typecheck`
4. `npm run test`
5. `npx @opennextjs/cloudflare build`
6. `npm run deploy:cloudflare:production`

Do not commit real JWT or Turnstile secrets. Production Test Mode remains enabled in the provided baseline for controlled testing; disable it before real customer launch.

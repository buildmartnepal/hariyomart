# Deployment infrastructure

Hariyo Mart uses managed production infrastructure and keeps provider secrets outside the repository.

- `../vercel.json` defines the production web/API install and build contract.
- `../docker-compose.yml` provides local MongoDB replica-set and Redis infrastructure.
- `../.env.production.example` is the canonical environment-variable inventory.
- `../apps/mobile/eas.json` defines Expo development, preview and production build profiles.
- `../.github/workflows/ci.yml` is the source release gate.

MongoDB Atlas, Redis/Upstash, Cloudinary, Vercel and EAS resources are provisioned in their provider consoles. Provider-generated state, tokens and credentials must not be committed here. See `docs/PRODUCTION_V5.md` for the complete rollout.

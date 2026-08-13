# Operations runbook

The full production procedure is in `PRODUCTION_V5.md`. This page is the quick incident and recovery index for on-call operators.

## Deploy

1. Require a green GitHub Actions release check.
2. Deploy a Vercel preview with isolated non-production data services.
3. Verify health, readiness, buyer COD checkout, order tracking, farmer publishing and admin moderation.
4. Promote the verified deployment; build native apps from the same commit through EAS.

## Roll back

Promote the previous known-good Vercel deployment. If stock or order integrity is uncertain, pause checkout and seller publishing before investigating. A code rollback does not undo database writes. Restore data only after confirming corruption and selecting an Atlas recovery point.

## Backup and restore

Enable MongoDB Atlas point-in-time backups and run a quarterly restore drill into a non-production cluster. Record recovery time, recovery point and index validation. Cloudinary originals should follow the business retention policy; repository source remains recoverable from protected GitHub history.

## Incident triage

1. Check `/api/health` and `/api/system/readiness`.
2. Correlate Vercel errors/latency with Atlas connections/slow queries, Redis errors/evictions and Cloudinary usage.
3. Preserve relevant audit records without copying tokens or customer personal data into tickets.
4. Rotate affected credentials and revoke refresh sessions when exposure is possible.
5. Document the timeline, affected orders, remediation and prevention work before closing the incident.

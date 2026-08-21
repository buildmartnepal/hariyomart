-- Hariyo Mart Nepal v8.7.0
-- Repairs stale Production Test Mode demo credentials left by older deployments.
-- Published test credential repaired here: HariyoDemo@2026
-- This is a no-op after demo identities are removed for real production.
UPDATE users
SET password_hash = '$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6',
    is_verified = 1,
    status = 'active',
    updated_at = datetime('now')
WHERE lower(email) IN (
  'buyer@demo.hariyomart.local',
  'farmer@demo.hariyomart.local',
  'cooperative@demo.hariyomart.local',
  'manager@demo.hariyomart.local',
  'procurement@demo.hariyomart.local',
  'inventory@demo.hariyomart.local',
  'sales@demo.hariyomart.local',
  'delivery@demo.hariyomart.local',
  'accounting@demo.hariyomart.local',
  'vendor@demo.hariyomart.local',
  'admin@demo.hariyomart.local',
  'tenantadmin@demo.hariyomart.local',
  'fieldfarmer@demo.hariyomart.local',
  'viewer@demo.hariyomart.local'
);

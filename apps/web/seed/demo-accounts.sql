-- Hariyo Mart v8.4.1 demo identities.
-- Explicit opt-in seed. DO NOT use these credentials for a real production launch.
-- Shared demo password: HariyoDemo@2026
PRAGMA foreign_keys = ON;

-- bcrypt cost 12 for HariyoDemo@2026. Only the hash is stored in D1.
-- htpasswd generated $2y$ and it is normalized to bcrypt $2b$.

INSERT INTO users (id,tenant_id,active_tenant_id,name,email,phone,password_hash,role,is_verified,language,marketing_opt_in,reward_points,addresses,updated_at)
VALUES ('demo-user-buyer',NULL,NULL,'Hariyo Demo Buyer','buyer@demo.hariyomart.local','9801000001','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','customer',1,'en',0,650,'[{"label":"Demo Home","province":"bagmati","district":"Kathmandu","municipality":"Kathmandu","ward":"10","street":"New Baneshwor","phone":"9801000001","isDefault":true}]',datetime('now'))
ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash,role=excluded.role,is_verified=1,updated_at=datetime('now');

INSERT INTO users (id,tenant_id,active_tenant_id,name,email,phone,password_hash,role,is_verified,language,updated_at)
VALUES
('demo-user-farmer','seed-tenant-bagmati','seed-tenant-bagmati','Hariyo Demo Farmer','farmer@demo.hariyomart.local','9801000002','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','farmer',1,'ne',datetime('now')),
('demo-user-cooperative','seed-tenant-koshi','seed-tenant-koshi','Hariyo Demo Cooperative','cooperative@demo.hariyomart.local','9801000003','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','farmer',1,'en',datetime('now')),
('demo-user-manager','seed-tenant-bagmati','seed-tenant-bagmati','Hariyo Demo Manager','manager@demo.hariyomart.local','9801000004','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','farmer',1,'en',datetime('now')),
('demo-user-procurement','seed-tenant-bagmati','seed-tenant-bagmati','Hariyo Demo Procurement','procurement@demo.hariyomart.local','9801000005','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','farmer',1,'en',datetime('now')),
('demo-user-inventory','seed-tenant-bagmati','seed-tenant-bagmati','Hariyo Demo Inventory','inventory@demo.hariyomart.local','9801000006','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','farmer',1,'en',datetime('now')),
('demo-user-sales','seed-tenant-bagmati','seed-tenant-bagmati','Hariyo Demo Sales','sales@demo.hariyomart.local','9801000007','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','farmer',1,'en',datetime('now')),
('demo-user-delivery','seed-tenant-bagmati','seed-tenant-bagmati','Hariyo Demo Delivery','delivery@demo.hariyomart.local','9801000008','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','farmer',1,'ne',datetime('now')),
('demo-user-accounting','seed-tenant-bagmati','seed-tenant-bagmati','Hariyo Demo Accounting','accounting@demo.hariyomart.local','9801000009','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','farmer',1,'en',datetime('now')),
('demo-user-vendor','seed-tenant-lumbini','seed-tenant-lumbini','Hariyo Demo Vendor','vendor@demo.hariyomart.local','9801000010','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','vendor',1,'en',datetime('now')),
('demo-user-admin',NULL,NULL,'Hariyo Platform Demo Admin','admin@demo.hariyomart.local','9801000011','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','admin',1,'en',datetime('now')),
('demo-user-tenant-admin','seed-tenant-bagmati','seed-tenant-bagmati','Hariyo Demo Tenant Admin','tenantadmin@demo.hariyomart.local','9801000012','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','farmer',1,'en',datetime('now')),
('demo-user-field-farmer','seed-tenant-bagmati','seed-tenant-bagmati','Hariyo Demo Field Farmer','fieldfarmer@demo.hariyomart.local','9801000013','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','farmer',1,'ne',datetime('now')),
('demo-user-viewer','seed-tenant-bagmati','seed-tenant-bagmati','Hariyo Demo Viewer','viewer@demo.hariyomart.local','9801000014','$2b$12$EeX82.Uhb3E0CHWzGIIIY.UAeXm60MhHxg6QT5b2wrvHSjXyLKum6','farmer',1,'en',datetime('now'))
ON CONFLICT(email) DO UPDATE SET tenant_id=excluded.tenant_id,active_tenant_id=excluded.active_tenant_id,password_hash=excluded.password_hash,role=excluded.role,is_verified=1,updated_at=datetime('now');

INSERT INTO tenant_members (tenant_id,user_id,role,status,joined_at,created_at) VALUES
('seed-tenant-bagmati','demo-user-farmer','owner','active',datetime('now'),datetime('now')),
('seed-tenant-koshi','demo-user-cooperative','owner','active',datetime('now'),datetime('now')),
('seed-tenant-bagmati','demo-user-manager','manager','active',datetime('now'),datetime('now')),
('seed-tenant-bagmati','demo-user-procurement','procurement','active',datetime('now'),datetime('now')),
('seed-tenant-bagmati','demo-user-inventory','inventory','active',datetime('now'),datetime('now')),
('seed-tenant-bagmati','demo-user-sales','sales','active',datetime('now'),datetime('now')),
('seed-tenant-bagmati','demo-user-delivery','delivery','active',datetime('now'),datetime('now')),
('seed-tenant-bagmati','demo-user-accounting','accounting','active',datetime('now'),datetime('now')),
('seed-tenant-lumbini','demo-user-vendor','manager','active',datetime('now'),datetime('now')),
('seed-tenant-bagmati','demo-user-tenant-admin','admin','active',datetime('now'),datetime('now')),
('seed-tenant-bagmati','demo-user-field-farmer','farmer','active',datetime('now'),datetime('now')),
('seed-tenant-bagmati','demo-user-viewer','viewer','active',datetime('now'),datetime('now'))
ON CONFLICT(tenant_id,user_id) DO UPDATE SET role=excluded.role,status='active';

-- Make demo workspaces rich enough to demonstrate paid SaaS features.
INSERT INTO tenant_subscriptions (tenant_id,plan_code,status,current_period_starts_at,current_period_ends_at,updated_at)
VALUES
('seed-tenant-bagmati','growth','active',datetime('now'),datetime('now','+30 days'),datetime('now')),
('seed-tenant-koshi','enterprise','active',datetime('now'),datetime('now','+30 days'),datetime('now')),
('seed-tenant-lumbini','growth','active',datetime('now'),datetime('now','+30 days'),datetime('now'))
ON CONFLICT(tenant_id) DO UPDATE SET plan_code=excluded.plan_code,status='active',updated_at=datetime('now');

UPDATE tenants SET plan='growth',updated_at=datetime('now') WHERE id IN ('seed-tenant-bagmati','seed-tenant-lumbini');
UPDATE tenants SET plan='enterprise',updated_at=datetime('now') WHERE id='seed-tenant-koshi';

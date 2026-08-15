-- Hariyo Mart Nepal v8.4.2
-- Account-security columns used by the password change gate and admin-managed identities.

ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended'));
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login_at TEXT;
ALTER TABLE users ADD COLUMN password_changed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role,status);
CREATE INDEX IF NOT EXISTS idx_users_tenant_status ON users(tenant_id,status);

UPDATE users
SET status='active',
    must_change_password=0,
    password_changed_at=COALESCE(password_changed_at,updated_at,created_at)
WHERE status IS NULL OR status='';

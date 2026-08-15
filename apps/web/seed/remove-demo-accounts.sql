-- Remove only the explicit Hariyo v8.4.1 demo identities and their dependent rows.
-- Intended for production cleanup after demos/testing.
PRAGMA foreign_keys = ON;

DELETE FROM users
WHERE id LIKE 'demo-user-%'
   OR email LIKE '%@demo.hariyomart.local';

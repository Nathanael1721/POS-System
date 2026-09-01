-- 003_product_image_and_users.sql
-- Adds product image support and supporting index for user management.

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Speeds up listing/managing cashiers within a store.
CREATE INDEX IF NOT EXISTS idx_users_store_role ON users(store_id, role);

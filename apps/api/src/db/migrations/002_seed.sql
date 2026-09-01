-- 002_seed.sql
-- Development seed data. Idempotent: safe to run multiple times.
--
-- Passwords are hashed with bcrypt (cost 12) via pgcrypto's crypt()/gen_salt,
-- producing $2a$ hashes that bcryptjs can verify.
--   owner@simplepos.test   / Owner123!
--   cashier@simplepos.test / Cashier123!

-- Store (fixed UUID so re-running is stable)
INSERT INTO stores (id, owner_id, name, address, currency, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'SimplePOS Demo Store',
  'Jl. Contoh No. 1, Jakarta',
  'IDR',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Owner
INSERT INTO users (id, store_id, name, email, password_hash, role, is_active)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Demo Owner',
  'owner@simplepos.test',
  crypt('Owner123!', gen_salt('bf', 12)),
  'owner',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Cashier
INSERT INTO users (id, store_id, name, email, password_hash, role, is_active)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Demo Cashier',
  'cashier@simplepos.test',
  crypt('Cashier123!', gen_salt('bf', 12)),
  'cashier',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Categories
INSERT INTO categories (id, store_id, name, sort_order)
VALUES
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111', 'Beverages', 1),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111111', 'Snacks', 2),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111111', 'Groceries', 3)
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO products (id, store_id, category_id, name, sku, price, stock, is_active)
VALUES
  ('55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444401', 'Bottled Water 600ml', 'BEV-001', 4000.00, 200, true),
  ('55555555-5555-5555-5555-555555555502', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444401', 'Iced Tea 350ml', 'BEV-002', 6500.00, 150, true),
  ('55555555-5555-5555-5555-555555555503', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444402', 'Potato Chips 70g', 'SNK-001', 12000.00, 80, true),
  ('55555555-5555-5555-5555-555555555504', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444402', 'Chocolate Bar 45g', 'SNK-002', 9000.00, 120, true),
  ('55555555-5555-5555-5555-555555555505', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444403', 'Instant Noodles', 'GRC-001', 3500.00, 300, true),
  ('55555555-5555-5555-5555-555555555506', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444403', 'Cooking Oil 1L', 'GRC-002', 28000.00, 60, true)
ON CONFLICT (id) DO NOTHING;

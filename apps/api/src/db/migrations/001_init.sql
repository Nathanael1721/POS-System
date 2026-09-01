-- 001_init.sql
-- Initial schema for simplepos. Tables/columns must match the spec exactly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- stores (defined before users because users references stores)
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  currency VARCHAR(10) DEFAULT 'IDR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'cashier')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sort_order INT DEFAULT 0
);

-- products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  price DECIMAL(15,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  cashier_id UUID REFERENCES users(id),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'qris', 'card')),
  subtotal DECIMAL(15,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- order_items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  quantity INT NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL
);

-- payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  amount_paid DECIMAL(15,2) NOT NULL,
  change_given DECIMAL(15,2) DEFAULT 0,
  method VARCHAR(20) NOT NULL,
  reference VARCHAR(255),
  paid_at TIMESTAMPTZ DEFAULT now()
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  payload JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes to support the documented query patterns.
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_cashier ON orders(cashier_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_store_created ON audit_logs(store_id, created_at);

-- Supports daily-resetting per-store order number sequence lookups.
CREATE INDEX IF NOT EXISTS idx_orders_number_prefix ON orders(store_id, order_number);

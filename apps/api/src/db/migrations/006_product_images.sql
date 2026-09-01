-- 006_product_images.sql
-- Store uploaded product images directly in the database (BYTEA), kept in a
-- separate table so product list queries (SELECT *) stay lean.

CREATE TABLE IF NOT EXISTS product_images (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  data BYTEA NOT NULL,
  mime VARCHAR(100) NOT NULL,
  byte_size INT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

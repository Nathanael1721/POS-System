-- 004_product_barcode.sql
-- Adds barcode support to products for scanning at the POS and label printing.

ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);

-- Barcode must be unique within a store (ignoring NULLs / unset barcodes).
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_store_barcode
  ON products(store_id, barcode)
  WHERE barcode IS NOT NULL;

-- Fast exact lookup by barcode for scan-to-add.
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

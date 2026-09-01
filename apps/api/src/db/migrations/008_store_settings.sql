-- Store-level operational defaults (owner-configurable via /api/store).
ALTER TABLE stores ADD COLUMN IF NOT EXISTS default_tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS low_stock_threshold INT NOT NULL DEFAULT 5;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS auto_print_receipt BOOLEAN NOT NULL DEFAULT false;

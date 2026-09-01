-- 005_shifts.sql
-- Cashier shifts & cash drawer reconciliation.

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  cashier_id UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opening_cash DECIMAL(15,2) NOT NULL DEFAULT 0,   -- modal awal laci
  counted_cash DECIMAL(15,2),                      -- hitungan fisik saat tutup
  expected_cash DECIMAL(15,2),                     -- modal + penjualan tunai
  difference DECIMAL(15,2),                         -- counted - expected (lebih/kurang)
  total_sales DECIMAL(15,2) DEFAULT 0,
  cash_sales DECIMAL(15,2) DEFAULT 0,
  noncash_sales DECIMAL(15,2) DEFAULT 0,
  order_count INT DEFAULT 0,
  notes TEXT,
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Tautan order ke shift tempat ia dibuat.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id);

-- Hanya boleh ada satu shift terbuka per kasir.
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_open_shift_per_cashier
  ON shifts(cashier_id) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_shifts_store_opened ON shifts(store_id, opened_at);
CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id);

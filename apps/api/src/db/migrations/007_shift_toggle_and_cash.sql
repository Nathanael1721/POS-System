-- 007_shift_toggle_and_cash.sql
-- Make the shift system optional per store, and add cash in/out movements
-- so the drawer reconciliation is accurate.

-- Toggle: when false, orders do not require an open shift (shift UI hidden).
ALTER TABLE stores ADD COLUMN IF NOT EXISTS shift_enabled BOOLEAN DEFAULT false;

-- Snapshot of cash movements stored on the shift at close time.
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cash_in DECIMAL(15,2) DEFAULT 0;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cash_out DECIMAL(15,2) DEFAULT 0;

-- Petty-cash movements during a shift (e.g. buy supplies = out, top-up = in).
CREATE TABLE IF NOT EXISTS shift_cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
  amount DECIMAL(15,2) NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_shift ON shift_cash_movements(shift_id);

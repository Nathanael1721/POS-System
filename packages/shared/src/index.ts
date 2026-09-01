// ---- Zod schemas ----
export * from './schemas/auth.schema.js';
export * from './schemas/product.schema.js';
export * from './schemas/order.schema.js';
export * from './schemas/user.schema.js';
export * from './schemas/shift.schema.js';
export * from './schemas/store.schema.js';
export * from './schemas/audit.schema.js';

import type { Role } from './schemas/auth.schema.js';
import type { PaymentMethod, OrderStatus } from './schemas/order.schema.js';

// ---- Database row types (mirror the SQL schema) ----

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  currency: string;
  is_active: boolean;
  shift_enabled: boolean;
  default_tax_percent: string;
  low_stock_threshold: number;
  auto_print_receipt: boolean;
  created_at: string;
}

export interface User {
  id: string;
  store_id: string | null;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** User without the password hash — safe to return to clients. */
export type PublicUser = Omit<User, 'password_hash'>;

export interface Category {
  id: string;
  store_id: string | null;
  name: string;
  sort_order: number;
}

export interface Product {
  id: string;
  store_id: string | null;
  category_id: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: string; // DECIMAL serialized as string by postgres.js
  stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  store_id: string | null;
  cashier_id: string | null;
  shift_id: string | null;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  subtotal: string;
  discount_percent: string;
  discount_amount: string;
  tax_percent: string;
  tax_amount: string;
  total: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount_paid: string;
  change_given: string;
  method: PaymentMethod;
  reference: string | null;
  paid_at: string;
}

export type ShiftStatus = 'open' | 'closed';

export interface Shift {
  id: string;
  store_id: string | null;
  cashier_id: string | null;
  status: ShiftStatus;
  opening_cash: string;
  counted_cash: string | null;
  expected_cash: string | null;
  difference: string | null;
  total_sales: string;
  cash_sales: string;
  noncash_sales: string;
  cash_in: string;
  cash_out: string;
  order_count: number;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
}

/** Live sales tally for a shift (computed from its orders & cash movements). */
export interface ShiftSummary {
  order_count: number;
  total_sales: string;
  cash_sales: string;
  noncash_sales: string;
  cash_in: string;
  cash_out: string;
  expected_cash: string;
}

export interface CashMovement {
  id: string;
  shift_id: string;
  type: 'in' | 'out';
  amount: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

/** Shift with its (optionally live) summary and cashier name. */
export interface ShiftWithSummary {
  shift: Shift;
  summary: ShiftSummary;
  cashier_name: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  store_id: string | null;
  action: string;
  payload: unknown;
  ip_address: string | null;
  created_at: string;
}

/** Audit log joined with the acting user's name (viewer API). */
export type AuditLogWithUser = AuditLog & { user_name: string | null };

// ---- API response shapes ----

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: PublicUser;
}

export interface JwtAccessPayload {
  sub: string; // user id
  store_id: string | null;
  role: Role;
  type: 'access';
}

export interface JwtRefreshPayload {
  sub: string;
  type: 'refresh';
  jti: string; // token id used for rotation/revocation
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface Receipt {
  order_number: string;
  store_name: string;
  cashier_name: string;
  items: Array<{
    product_name: string;
    unit_price: string;
    quantity: number;
    subtotal: string;
  }>;
  subtotal: string;
  discount_percent: string;
  discount_amount: string;
  tax_percent: string;
  tax_amount: string;
  total: string;
  payment_method: PaymentMethod;
  amount_paid: string;
  change_given: string;
  reference: string | null;
  created_at: string;
}

export interface CreateOrderResult {
  order: Order;
  payment: Payment;
  receipt: Receipt;
}

export interface ReportSummary {
  total_revenue: string;
  total_orders: number;
  avg_order_value: string;
}

export interface TopProduct {
  product_name: string;
  quantity_sold: number;
  revenue: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface ValidationErrorBody {
  error: string;
  code: string;
  fields: Array<{ field: string; message: string }>;
}

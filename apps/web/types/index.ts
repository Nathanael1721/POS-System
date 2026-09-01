// Re-export shared domain types and add frontend-only view models.
export type {
  PublicUser,
  Product,
  Category,
  Order,
  OrderItem,
  Payment,
  Receipt,
  CreateOrderResult,
  ReportSummary,
  TopProduct,
  Paginated,
  PaymentMethod,
  Role,
  AuthTokens,
} from '@simplepos/shared';

import type { Product } from '@simplepos/shared';

/** A line in the cashier cart (client-side only). */
export interface CartLine {
  product: Product;
  quantity: number;
}

/** A parked cart ("tahan keranjang") that can be resumed later. */
export interface HeldCart {
  id: string;
  label: string;
  heldAt: number;
  lines: CartLine[];
  discountPercent: number;
  taxPercent: number;
}

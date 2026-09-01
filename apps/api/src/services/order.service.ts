import type {
  CreateOrderInput,
  CreateOrderResult,
  Order,
  OrderItem,
  Payment,
  Product,
  Receipt,
  Paginated,
  ListOrdersQuery,
} from '@simplepos/shared';
import { sql, withTransaction } from '../db/client.js';
import type { AuthUser } from '../types.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import {
  toCents,
  fromCents,
  lineSubtotalCents,
  percentOfCents,
} from '../utils/money.js';
import { nextOrderNumber } from '../utils/order-number.js';
import { recordAudit } from '../middleware/audit.js';
import { findOpenShift } from './shift.service.js';

interface ResolvedLine {
  product: Product;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
}

/**
 * Process an order atomically. Every step below runs inside one transaction;
 * any failure rolls the whole thing back (no partial stock deduction, no
 * orphan order):
 *   1. Validate products exist + active + same store
 *   2. Validate stock >= quantity per item
 *   3-4. Compute per-line and order totals
 *   5. INSERT order
 *   6. INSERT order_items
 *   7. UPDATE product stock (guarded against concurrent oversell)
 *   8. INSERT payment
 *   9. Write audit_log
 *  10. Return full receipt
 */
export async function createOrder(
  user: AuthUser,
  input: CreateOrderInput,
  ctx: { ip: string | null; storeName: string },
): Promise<CreateOrderResult> {
  const storeId = user.store_id;
  if (!storeId) throw new ValidationError('User is not assigned to a store', { fields: [] });

  // Reject duplicate product ids in the cart to keep stock math unambiguous.
  const ids = input.items.map((i) => i.product_id);
  if (new Set(ids).size !== ids.length) {
    throw new ValidationError('Duplicate products in cart; combine quantities instead', { fields: [] });
  }

  return withTransaction(async (tx) => {
    // --- 0. Require an open shift only if the store enables the shift system ---
    const storeCfg = await tx<{ shift_enabled: boolean }[]>`
      SELECT shift_enabled FROM stores WHERE id = ${storeId} LIMIT 1
    `;
    const shiftEnabled = storeCfg[0]?.shift_enabled ?? false;
    let shiftId: string | null = null;
    if (shiftEnabled) {
      const shift = await findOpenShift(tx, user.id, true);
      if (!shift) {
        throw new ConflictError('Tidak ada shift aktif. Buka shift terlebih dahulu sebelum bertransaksi.');
      }
      shiftId = shift.id;
    }

    // --- 1. Load and validate products (lock rows to prevent oversell) ---
    const products = await tx<Product[]>`
      SELECT * FROM products
      WHERE store_id = ${storeId} AND id IN ${tx(ids)}
      FOR UPDATE
    `;
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines: ResolvedLine[] = [];
    for (const item of input.items) {
      const product = byId.get(item.product_id);
      if (!product) {
        throw new NotFoundError(`Product ${item.product_id} not found in this store`);
      }
      if (!product.is_active) {
        throw new ValidationError(`Product "${product.name}" is not active`, { fields: [] });
      }
      // --- 2. Stock check ---
      if (product.stock < item.quantity) {
        throw new ConflictError(
          `Insufficient stock for "${product.name}": have ${product.stock}, need ${item.quantity}`,
        );
      }
      const unitPriceCents = toCents(product.price);
      lines.push({
        product,
        quantity: item.quantity,
        unitPriceCents,
        subtotalCents: lineSubtotalCents(product.price, item.quantity),
      });
    }

    // --- 3-4. Totals ---
    const subtotalCents = lines.reduce((sum, l) => sum + l.subtotalCents, 0);
    const discountAmountCents = percentOfCents(subtotalCents, input.discount_percent);
    const taxableCents = subtotalCents - discountAmountCents;
    const taxAmountCents = percentOfCents(taxableCents, input.tax_percent);
    const totalCents = taxableCents + taxAmountCents;

    // Payment validation: cash must cover the total; compute change.
    const amountPaidCents = toCents(input.amount_paid);
    let changeCents = 0;
    if (input.payment_method === 'cash') {
      if (amountPaidCents < totalCents) {
        throw new ValidationError(
          `Amount paid (${fromCents(amountPaidCents)}) is less than total (${fromCents(totalCents)})`,
          { fields: [{ field: 'amount_paid', message: 'Insufficient amount for cash payment' }] },
        );
      }
      changeCents = amountPaidCents - totalCents;
    } else {
      // Non-cash: amount must equal total exactly; no change.
      if (amountPaidCents !== totalCents) {
        throw new ValidationError(
          `Non-cash amount paid must equal total (${fromCents(totalCents)})`,
          { fields: [{ field: 'amount_paid', message: 'Must equal order total' }] },
        );
      }
    }

    // --- 5. INSERT order ---
    const orderNumber = await nextOrderNumber(tx, storeId, ctx.storeName, new Date());
    const orderRows = await tx<Order[]>`
      INSERT INTO orders (
        store_id, cashier_id, shift_id, order_number, status, payment_method,
        subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total
      )
      VALUES (
        ${storeId}, ${user.id}, ${shiftId}, ${orderNumber}, 'paid', ${input.payment_method},
        ${fromCents(subtotalCents)}, ${input.discount_percent}, ${fromCents(discountAmountCents)},
        ${input.tax_percent}, ${fromCents(taxAmountCents)}, ${fromCents(totalCents)}
      )
      RETURNING *
    `;
    const order = orderRows[0]!;

    // --- 6. INSERT order_items ---
    const itemRows = await tx<OrderItem[]>`
      INSERT INTO order_items ${tx(
        lines.map((l) => ({
          order_id: order.id,
          product_id: l.product.id,
          product_name: l.product.name,
          unit_price: fromCents(l.unitPriceCents),
          quantity: l.quantity,
          subtotal: fromCents(l.subtotalCents),
        })),
      )}
      RETURNING *
    `;

    // --- 7. UPDATE stock (guard prevents going negative under races) ---
    for (const line of lines) {
      const updated = await tx<{ stock: number }[]>`
        UPDATE products
        SET stock = stock - ${line.quantity}, updated_at = now()
        WHERE id = ${line.product.id} AND stock >= ${line.quantity}
        RETURNING stock
      `;
      if (updated.length === 0) {
        throw new ConflictError(`Stock changed for "${line.product.name}"; please retry`);
      }
    }

    // --- 8. INSERT payment ---
    const paymentRows = await tx<Payment[]>`
      INSERT INTO payments (order_id, amount_paid, change_given, method, reference)
      VALUES (
        ${order.id}, ${fromCents(amountPaidCents)}, ${fromCents(changeCents)},
        ${input.payment_method}, ${input.reference ?? null}
      )
      RETURNING *
    `;
    const payment = paymentRows[0]!;

    // --- 9. Audit log (atomic with the order) ---
    await recordAudit(
      {
        userId: user.id,
        storeId,
        action: 'order.confirm',
        payload: { order_id: order.id, order_number: orderNumber, total: order.total, item_count: lines.length },
        ip: ctx.ip,
      },
      tx,
    );

    // --- 10. Receipt ---
    const receipt: Receipt = {
      order_number: order.order_number,
      store_name: ctx.storeName,
      cashier_name: user.name,
      items: itemRows.map((it) => ({
        product_name: it.product_name,
        unit_price: it.unit_price,
        quantity: it.quantity,
        subtotal: it.subtotal,
      })),
      subtotal: order.subtotal,
      discount_percent: order.discount_percent,
      discount_amount: order.discount_amount,
      tax_percent: order.tax_percent,
      tax_amount: order.tax_amount,
      total: order.total,
      payment_method: input.payment_method,
      amount_paid: payment.amount_paid,
      change_given: payment.change_given,
      reference: payment.reference,
      created_at: order.created_at,
    };

    return { order, payment, receipt };
  });
}

/**
 * List orders for a store with optional date/status filters and pagination.
 * Cashiers only see their own orders.
 */
export async function listOrders(
  user: AuthUser,
  query: ListOrdersQuery,
): Promise<Paginated<Order>> {
  const storeId = user.store_id;
  if (!storeId) throw new ValidationError('User is not assigned to a store', { fields: [] });

  const offset = (query.page - 1) * query.limit;
  const cashierFilter = user.role === 'cashier' ? user.id : null;

  const rows = await sql<Array<Order & { total_count: string }>>`
    SELECT *, COUNT(*) OVER()::text AS total_count
    FROM orders
    WHERE store_id = ${storeId}
      AND (${query.status ?? null}::text IS NULL OR status = ${query.status ?? null})
      AND (${query.date ?? null}::date IS NULL OR created_at::date = ${query.date ?? null}::date)
      AND (${cashierFilter}::uuid IS NULL OR cashier_id = ${cashierFilter})
    ORDER BY created_at DESC
    LIMIT ${query.limit}
    OFFSET ${offset}
  `;

  const total = rows.length > 0 ? Number(rows[0]!.total_count) : 0;
  const data = rows.map(({ total_count: _t, ...o }) => o as Order);

  return {
    data,
    page: query.page,
    limit: query.limit,
    total,
    total_pages: Math.ceil(total / query.limit),
  };
}

/** Full order with its items. Cashiers may only read their own orders. */
export async function getOrderById(
  user: AuthUser,
  id: string,
): Promise<{ order: Order; items: OrderItem[]; payment: Payment | null }> {
  const storeId = user.store_id;
  const orderRows = await sql<Order[]>`
    SELECT * FROM orders WHERE id = ${id} AND store_id = ${storeId} LIMIT 1
  `;
  const order = orderRows[0];
  if (!order) throw new NotFoundError('Order not found');
  if (user.role === 'cashier' && order.cashier_id !== user.id) {
    throw new NotFoundError('Order not found');
  }

  const items = await sql<OrderItem[]>`
    SELECT * FROM order_items WHERE order_id = ${id} ORDER BY id
  `;
  const paymentRows = await sql<Payment[]>`
    SELECT * FROM payments WHERE order_id = ${id} LIMIT 1
  `;

  return { order, items, payment: paymentRows[0] ?? null };
}

/**
 * Void (cancel) a paid order atomically: mark it cancelled, restore stock for
 * every item, and write an audit entry — all in one transaction. Only paid
 * orders can be voided; cashiers may only void their own orders. Shift totals
 * are derived from `status = 'paid'`, so voided orders drop out of live shift
 * summaries automatically (a closed shift's stored snapshot is not rewritten —
 * the void stays visible in the audit trail instead).
 */
export async function voidOrder(
  user: AuthUser,
  id: string,
  reason: string,
  ctx: { ip: string | null },
): Promise<Order> {
  const storeId = user.store_id;
  if (!storeId) throw new ValidationError('User is not assigned to a store', { fields: [] });

  return withTransaction(async (tx) => {
    const orderRows = await tx<Order[]>`
      SELECT * FROM orders WHERE id = ${id} AND store_id = ${storeId} LIMIT 1 FOR UPDATE
    `;
    const order = orderRows[0];
    if (!order) throw new NotFoundError('Order not found');
    if (user.role === 'cashier' && order.cashier_id !== user.id) {
      throw new NotFoundError('Order not found');
    }
    if (order.status !== 'paid') {
      throw new ConflictError('Hanya order berstatus lunas yang dapat dibatalkan');
    }

    // Restore stock for items still tied to an existing product.
    const items = await tx<OrderItem[]>`
      SELECT * FROM order_items WHERE order_id = ${id}
    `;
    for (const item of items) {
      if (item.product_id) {
        await tx`
          UPDATE products SET stock = stock + ${item.quantity}, updated_at = now()
          WHERE id = ${item.product_id} AND store_id = ${storeId}
        `;
      }
    }

    const updated = await tx<Order[]>`
      UPDATE orders SET status = 'cancelled' WHERE id = ${id} RETURNING *
    `;

    await recordAudit(
      {
        userId: user.id,
        storeId,
        action: 'order.void',
        payload: {
          order_id: id,
          order_number: order.order_number,
          total: order.total,
          payment_method: order.payment_method,
          reason,
        },
        ip: ctx.ip,
      },
      tx,
    );

    return updated[0]!;
  });
}

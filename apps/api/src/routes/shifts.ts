import { Hono } from 'hono';
import { z } from 'zod';
import { openShiftSchema, closeShiftSchema, listShiftsQuerySchema, cashMovementSchema } from '@simplepos/shared';
import type { AppEnv } from '../types.js';
import { parseBody, parseQuery } from '../middleware/validate.js';
import { clientIp, recordAudit } from '../middleware/audit.js';
import * as shiftService from '../services/shift.service.js';

export const shiftRoutes = new Hono<AppEnv>();

const idParam = z.string().uuid('Invalid shift id');

// GET /api/shifts/current — caller's open shift + live summary (or {shift:null})
shiftRoutes.get('/current', async (c) => {
  const result = await shiftService.getCurrentShift(c.get('user'));
  return c.json(result, 200);
});

// POST /api/shifts/open — open a shift with starting cash
shiftRoutes.post('/open', async (c) => {
  const body = await parseBody(c, openShiftSchema);
  const user = c.get('user');
  const shift = await shiftService.openShift(user, body);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'shift.open',
    payload: { shift_id: shift.id, opening_cash: shift.opening_cash },
    ip: clientIp(c),
  });
  return c.json(shift, 201);
});

// POST /api/shifts/close — close caller's shift with cash count
shiftRoutes.post('/close', async (c) => {
  const body = await parseBody(c, closeShiftSchema);
  const user = c.get('user');
  const result = await shiftService.closeShift(user, body);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'shift.close',
    payload: {
      shift_id: result.shift.id,
      counted_cash: result.shift.counted_cash,
      expected_cash: result.shift.expected_cash,
      difference: result.shift.difference,
    },
    ip: clientIp(c),
  });
  return c.json(result, 200);
});

// POST /api/shifts/cash-movement — record petty cash in/out on the open shift
shiftRoutes.post('/cash-movement', async (c) => {
  const body = await parseBody(c, cashMovementSchema);
  const user = c.get('user');
  const movement = await shiftService.addCashMovement(user, body);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'shift.cash_movement',
    payload: { type: movement.type, amount: movement.amount, reason: movement.reason },
    ip: clientIp(c),
  });
  return c.json(movement, 201);
});

// GET /api/shifts — history (owner: all; cashier: own)
shiftRoutes.get('/', async (c) => {
  const query = parseQuery(c, listShiftsQuerySchema);
  const result = await shiftService.listShifts(c.get('user'), query);
  return c.json(result, 200);
});

// GET /api/shifts/:id — detail + summary
shiftRoutes.get('/:id', async (c) => {
  const id = idParam.parse(c.req.param('id'));
  const result = await shiftService.getShiftById(c.get('user'), id);
  return c.json(result, 200);
});

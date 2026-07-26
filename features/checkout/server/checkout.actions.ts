'use server';

/**
 * Checkout Server Actions.
 */

import { orderService } from './order.service';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { PlaceOrderInput } from '../schemas';
import { handleError } from '@/lib/errors';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; details?: Record<string, string[]> };

export async function placeOrderAction(
  input: PlaceOrderInput
): Promise<ActionResult<{ orderNumber: string; orderId: string }>> {
  try {
    const result = await orderService.placeOrder(input);
    return { success: true, data: result };
  } catch (error) {
    const appError = handleError(error);
    return {
      success: false,
      error: appError.message,
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      details: 'details' in appError ? (appError as any).details : undefined,
    };
  }
}

export async function updateOrderStatusAction(
  orderId: string,
  status: string,
  note?: string
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await orderService.updateStatus(orderId, status, admin.adminId, note);
    return { success: true, data: undefined };
  } catch (error) {
    const appError = handleError(error);
    return { success: false, error: appError.message };
  }
}

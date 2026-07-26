'use server';

/**
 * Cart Server Actions.
 */

import { cartService } from './cart.service';
import type { AddToCartInput, UpdateCartItemInput } from '../schemas';
import { handleError } from '@/lib/errors';
import type { CartDTO } from '../types';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getCartAction(): Promise<ActionResult<CartDTO>> {
  try {
    const cart = await cartService.getCart();
    return { success: true, data: cart };
  } catch (error) {
    const appError = handleError(error);
    return { success: false, error: appError.message };
  }
}

export async function addToCartAction(
  input: AddToCartInput
): Promise<ActionResult<CartDTO>> {
  try {
    const cart = await cartService.addItem(input);
    return { success: true, data: cart };
  } catch (error) {
    const appError = handleError(error);
    return { success: false, error: appError.message };
  }
}

export async function updateCartItemAction(
  input: UpdateCartItemInput
): Promise<ActionResult<CartDTO>> {
  try {
    const cart = await cartService.updateItem(input);
    return { success: true, data: cart };
  } catch (error) {
    const appError = handleError(error);
    return { success: false, error: appError.message };
  }
}

export async function clearCartAction(): Promise<ActionResult> {
  try {
    await cartService.clearCart();
    return { success: true, data: undefined };
  } catch (error) {
    const appError = handleError(error);
    return { success: false, error: appError.message };
  }
}

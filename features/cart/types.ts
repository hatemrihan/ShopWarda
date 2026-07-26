/**
 * Cart DTOs for UI consumption.
 */

export interface CartItemDTO {
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  sku: string;
  selectedOptions: { label: string; value: string }[];
  imageUrl?: string;
  unitPricePiasters: number;
  quantity: number;
  lineTotalPiasters: number;
  inStock: boolean;
}

export interface CartDTO {
  id: string;
  items: CartItemDTO[];
  itemCount: number;
  subtotalPiasters: number;
}

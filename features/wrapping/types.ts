/**
 * Wrapping paper DTOs.
 *
 * A wrapping paper is stored as an ordinary product with a single default
 * variant and no options. These types just present that shape flatly, so the
 * admin screen never has to think about variant matrices.
 *
 * Money is integer piasters.
 */

export interface WrappingPaperMedia {
  assetKey: string;
  url: string;
  alt: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

export interface WrappingPaperDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMinor: number;
  stock: number;
  trackInventory: boolean;
  status: 'draft' | 'active' | 'archived';
  imageUrl?: string;
  media: WrappingPaperMedia[];
}

export interface WrappingPaperInput {
  name: string;
  description?: string;
  priceMinor: number;
  stock: number;
  trackInventory: boolean;
  status: 'draft' | 'active' | 'archived';
  media: WrappingPaperMedia[];
}

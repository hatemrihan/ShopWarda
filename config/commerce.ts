/**
 * Commerce configuration constants.
 */

export const commerce = {
  /** Currency code */
  currency: 'EGP' as const,

  /** Minor unit factor (1 EGP = 100 piasters) */
  subunit: 100,

  /** Default pagination */
  pagination: {
    defaultPageSize: 12,
    maxPageSize: 48,
  },

  /** Image constraints */
  images: {
    maxSizeMB: 10,
    maxVideoSizeMB: 50,
    allowedImageMimes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedVideoMimes: ['video/mp4', 'video/quicktime'],
    thumbnailWidth: 400,
    galleryWidth: 800,
    fullWidth: 1200,
  },

  /** Cart settings */
  cart: {
    maxQuantityPerItem: 99,
    expirationDays: 7,
  },

  /** Order number prefix */
  orderPrefix: 'WRD',
} as const;

import type { NextConfig } from "next";
import { DEVICE_SIZES, IMAGE_SIZES } from "./lib/images/widths";

const nextConfig: NextConfig = {
  images: {
    // Images are resized by our own /api/img route rather than Vercel's
    // metered optimizer, which answers 402 once the monthly quota is spent
    // (that is what blanked every photo on the storefront).
    loader: 'custom',
    loaderFile: './lib/images/loader.ts',
    deviceSizes: [...DEVICE_SIZES],
    imageSizes: [...IMAGE_SIZES],
  },
};

export default nextConfig;

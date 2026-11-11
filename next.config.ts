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

  // sharp's Linux binding loads libvips from a sibling package at runtime
  // (dlopen), which build-time file tracing cannot see. Without these files
  // the deployed /api/img function failed every request with
  // "libvips-cpp.so: cannot open shared object file".
  outputFileTracingIncludes: {
    '/api/img': [
      './node_modules/sharp/**/*',
      './node_modules/@img/sharp-linux-x64/**/*',
      './node_modules/@img/sharp-libvips-linux-x64/**/*',
    ],
  },
};

export default nextConfig;

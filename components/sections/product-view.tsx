'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { piastersToCurrency } from '@/lib/money/egp';
import { ProductCard } from '@/components/sections/product-card';
import { useCart } from '@/features/cart/context/cart-context';
import { track } from '@/lib/analytics';
import type { ProductDTO, ProductListItem } from '@/features/catalog/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface SizeGuideData {
  enabled: boolean;
  title: string;
  description: string;
  columns: { key: string; label: string }[];
  rows: { size: string; values: Record<string, string> }[];
  notes: string;
}

/** Shown when a product has no photo. (The old path pointed at a file that did not exist.) */
const PLACEHOLDER_IMAGE = '/images/placeholder.svg';

interface ProductViewProps {
  product: ProductDTO;
  relatedProducts?: ProductListItem[];
  sizeGuide?: SizeGuideData | null;
}

export function ProductView({ product, relatedProducts = [], sizeGuide }: ProductViewProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [showMoreInfo, setShowMoreInfo] = useState<boolean>(false);
  const [showSizeGuide, setShowSizeGuide] = useState<boolean>(false);

  // Dynamic Option choices from Admin
  // Keyed by option key -> value key (NOT labels — variants are keyed).
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    product.options?.forEach((opt) => {
      if (opt.values.length > 0) {
        defaults[opt.key] = opt.values[0].key;
      }
    });
    return defaults;
  });

  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Selected variant calculated strictly from Admin option values
  const selectedVariant = product.variants.find((variant) =>
    variant.optionValues.every(
      (opt) => selectedOptions[opt.name] === opt.value
    )
  ) ?? product.variants.find((v) => v.isDefault) ?? product.variants[0];

  const currentPrice = selectedVariant?.pricePiasters ?? product.pricePiasters;

  // A variant that does not track inventory is made to order and never sells
  // out. This used to look at `stock` alone, so those products showed
  // "Sold Out" whenever their (meaningless) stock number was 0 — and an
  // inactive variant with stock left could still be bought.
  const tracksInventory = selectedVariant?.trackInventory !== false;
  const isAvailable =
    !!selectedVariant &&
    selectedVariant.isActive &&
    (!tracksInventory || selectedVariant.stock > 0);

  // Media items list from Admin
  const mediaList = product.media.length > 0
    ? product.media
    : [{ assetKey: 'placeholder', url: PLACEHOLDER_IMAGE, alt: product.name, type: 'image' as const, isPrimary: true, sortOrder: 0 }];

  // Intersection Observer to detect active image in view
  useEffect(() => {
    if (mediaList.length === 0) return;

    const observers: IntersectionObserver[] = [];
    const observerOptions = {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0,
    };

    imageRefs.current.forEach((ref, index) => {
      if (ref) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setSelectedImageIndex(index);
            }
          });
        }, observerOptions);

        observer.observe(ref);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [mediaList.length]);

  const { addItem } = useCart();

  // Funnel: one product view per product page.
  useEffect(() => {
    track('ViewContent', {
      value: product.pricePiasters,
      content_ids: [product.id],
      content_name: product.name,
    });
  }, [product.id, product.name, product.pricePiasters]);

  const activeMobileMedia = mediaList[selectedImageIndex] ?? mediaList[0];

  const handleAddToCart = async () => {
    if (!isAvailable || isAddingToCart) return;

    try {
      setIsAddingToCart(true);

      const currentPriceEGP = (selectedVariant?.pricePiasters ?? product.pricePiasters ?? 0) / 100;
      const primaryImage =
        mediaList.find((m) => m.type !== 'video')?.url || PLACEHOLDER_IMAGE;

      // Cart shows human-readable labels, never the slugified keys.
      const sizeValue = labelFor(sizeOption);
      const colorValue = labelFor(colorOption);
      const variantName =
        sizeValue ||
        selectedVariant?.optionValues
          .map((ov) => {
            const optDef = product.options?.find((o) => o.key === ov.name);
            return optDef?.values.find((v) => v.key === ov.value)?.label ?? ov.value;
          })
          .join(' / ') ||
        'Default';

      const result = addItem(
        {
          id: product.id,
          variantId: selectedVariant?.id,
          slug: product.slug,
          name: product.name,
          image: primaryImage,
          price: currentPriceEGP,
          // Undefined = no limit, for variants that do not track inventory.
          stock: tracksInventory ? selectedVariant?.stock : undefined,
          variant: {
            name: variantName,
            color: colorValue,
          },
        },
        1
      );

      if (!result.ok) {
        toast.error(
          result.available > 0
            ? `Only ${result.available} more available.`
            : 'You already have all the available stock in your bag.'
        );
        return;
      }

      track('AddToCart', {
        value: currentPrice,
        content_ids: [product.id],
        content_name: product.name,
      });

      toast.success(`Added "${product.name}" to shopping bag`);
    } catch {
      toast.error('Failed to add to shopping bag.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Find options dynamically configured in Admin
  const colorOption = product.options?.find(
    (opt) => opt.key.toLowerCase() === 'color' || opt.key.toLowerCase() === 'colour'
  );
  const sizeOption = product.options?.find(
    (opt) => opt.key.toLowerCase() === 'size'
  ) || product.options?.find((opt) => opt.key.toLowerCase() !== 'color');

  /** Display label for the currently selected value of an option. */
  const labelFor = (opt: { key: string; values: { key: string; label: string }[] } | undefined) => {
    if (!opt) return undefined;
    const selectedKey = selectedOptions[opt.key];
    return opt.values.find((v) => v.key === selectedKey)?.label;
  };

  // 'Ready to Wear' was an apparel leftover; wrong on a florist's catalogue.
  const categoryName = product.categoryNames?.[0] || 'Shop';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-0 py-8">

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-[100px_minmax(400px,600px)_420px] gap-4 lg:gap-16 mb-8 lg:mb-16">

          {/* LEFT: Desktop Thumbnails */}
          <div className="hidden lg:block">
            {mediaList.length > 1 && (
              <div className="flex flex-col gap-3 sticky top-28">
                {mediaList.map((item, index) => (
                  <button
                    key={item.assetKey || index}
                    type="button"
                    onClick={() => {
                      setSelectedImageIndex(index);
                      imageRefs.current[index]?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      });
                    }}
                    className={`relative w-full aspect-square overflow-hidden border transition-all duration-200 bg-white flex items-center justify-center ${selectedImageIndex === index
                        ? 'border-black border-2'
                        : 'border-neutral-300 hover:border-black'
                      }`}
                  >
                    {item.type === 'video' ? (
                      <video src={item.url} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <Image
                        src={item.url}
                        alt={`View ${index + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CENTER: Stacked Images (Desktop) */}
          <div className="hidden lg:block">
            <div className="flex flex-col gap-4 w-full">
              {mediaList.map((item, index) => (
                <div
                  key={item.assetKey || index}
                  ref={(el) => {
                    imageRefs.current[index] = el;
                  }}
                  className="flex items-center justify-center w-full"
                >
                  {item.type === 'video' ? (
                    <video src={item.url} controls playsInline preload="metadata" className="w-full h-auto" />
                  ) : (
                    <Image
                      src={item.url}
                      alt={`${product.name} - View ${index + 1}`}
                      width={800}
                      height={1000}
                      sizes="(min-width: 1024px) 600px, 100vw"
                      priority={index === 0}
                      className="object-contain w-full h-auto"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* MOBILE: Gallery Display */}
          <div className="lg:hidden col-span-1">
            <div className="overflow-hidden relative flex items-center justify-center">
              <div className="w-full flex items-center justify-center">
                {activeMobileMedia.type === 'video' ? (
                  <video src={activeMobileMedia.url} controls playsInline preload="metadata" className="w-full h-auto" />
                ) : (
                  <Image
                    src={activeMobileMedia.url}
                    alt={`${product.name} ${selectedImageIndex + 1}`}
                    width={800}
                    height={1000}
                    sizes="100vw"
                    priority
                    className="w-full h-auto object-contain"
                  />
                )}
              </div>

              {/* Mobile Dots */}
              {mediaList.length > 1 && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10 bg-white/80 px-3 py-2 rounded-full">
                  {mediaList.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Show image ${index + 1}`}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`h-1.5 rounded-full transition-all duration-200 ${selectedImageIndex === index ? 'bg-black w-6' : 'bg-gray-400 w-1.5'
                        }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Thumbnails Strip */}
            {mediaList.length > 1 && (
              <div className="grid grid-cols-7 gap-2 mt-3">
                {mediaList.map((item, index) => (
                  <button
                    key={item.assetKey || index}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square overflow-hidden border transition-all duration-200 bg-white flex items-center justify-center ${selectedImageIndex === index
                        ? 'border-black border-2'
                        : 'border-gray-300'
                      }`}
                  >
                    {item.type === 'video' ? (
                      <video src={item.url} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <Image
                        src={item.url}
                        alt={`View ${index + 1}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Details (Dynamic from Admin) */}
          <div className="space-y-4 lg:space-y-4">

            {/* Dynamic Category Breadcrumb */}
            <nav className="hidden lg:block text-xs text-gray-600 mb-4">
              <span>Collection</span> <span className="mx-2">·</span>
              <span>{categoryName}</span> <span className="mx-2">·</span>
              <span>{product.name}</span>
            </nav>

            <div>
              <h1 className="text-xl lg:text-2xl font-light text-[#292827] mb-2 lg:mb-3 font-[family-name:var(--font-playfair)]">
                {product.name}
              </h1>
              <p className="text-base lg:text-lg text-black font-light mt-4">
                {piastersToCurrency(currentPrice)}
              </p>
            </div>

            {/* Dynamic Color Selection from Admin Options */}
            {colorOption && (
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <p className="text-sm text-black">
                  Color : <span className="font-normal">{labelFor(colorOption) ?? colorOption.values[0]?.label}</span>
                </p>
                <div className="flex gap-2">
                  {colorOption.values.map((val) => (
                    <button
                      key={val.key}
                      type="button"
                      onClick={() =>
                        setSelectedOptions((prev) => ({
                          ...prev,
                          [colorOption.key]: val.key,
                        }))
                      }
                      className={`w-4 h-4 border transition-all duration-200 hover:border-black ${selectedOptions[colorOption.key] === val.key
                          ? 'border-black border-2'
                          : 'border-gray-300'
                        }`}
                      style={{
                        // Real swatch from admin; fall back to the house colour.
                        backgroundColor: val.swatchHex || '#292827',
                      }}
                      title={val.label}
                      aria-label={val.label}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Option selector — only when the product actually defines one.
                A simple product (wrapping paper, a vase, a card) has no
                options, and used to render a disabled dropdown labelled
                "Please select size" with a stray "Select Recipient's
                Governorate" placeholder. */}
            {sizeOption && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-black">
                    {labelFor(sizeOption) ?? `Please select ${sizeOption.label.toLowerCase()}`}
                  </p>
                </div>

                <Select
                  value={selectedOptions[sizeOption.key] || ''}
                  onValueChange={(val: string | null) => {
                    if (val) {
                      setSelectedOptions((prev) => ({
                        ...prev,
                        [sizeOption.key]: val,
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-white border border-black text-black h-12 text-sm font-normal rounded-none">
                    <SelectValue placeholder={`Select ${sizeOption.label}`} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-black rounded-none">
                    {sizeOption.values.map((size) => (
                      <SelectItem
                        key={size.key}
                        value={size.key}
                        className="hover:bg-neutral-200/50 cursor-pointer text-sm"
                      >
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Size Guide Link — only if enabled in admin */}
            {sizeGuide?.enabled && sizeOption && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="text-sm text-black underline hover:no-underline transition-all"
                >
                  {sizeGuide.title || 'Size Guide'}
                </button>
              </div>
            )}

            {/* Add to Shopping Bag CTA */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAddingToCart || !isAvailable}
              className={`w-full py-4 text-sm font-medium tracking-wide transition-colors rounded-none ${!isAvailable
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-black hover:bg-gray-900 text-white'
                }`}
            >
              {isAddingToCart ? 'Adding...' : !isAvailable ? 'Sold Out' : 'Add to Shopping Bag'}
            </button>

            {/* Product Description from Admin */}
            {(product.description || product.shortDescription) && (
              <div className="text-sm text-black leading-relaxed pt-6 border-t border-gray-200 mt-6 font-light">
                <p className="whitespace-pre-line">{product.description || product.shortDescription}</p>
              </div>
            )}

            {/* More Information - Expandable Drawer */}
            <div className="border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={() => setShowMoreInfo(!showMoreInfo)}
                aria-expanded={showMoreInfo}
                className="w-full flex items-center justify-between py-5 text-sm text-black hover:opacity-70 transition-opacity"
              >
                <span>More information {showMoreInfo ? '−' : '+'}</span>
              </button>

              {showMoreInfo && (
                <div className="text-sm text-gray-700 space-y-4 pb-4 font-light">
                  {selectedVariant?.sku && (
                    <div>
                      <h4 className="font-medium mb-1 text-black">SKU / Code</h4>
                      <p>{selectedVariant.sku}</p>
                    </div>
                  )}
                  {product.categoryNames && product.categoryNames.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-1 text-black">Categories</h4>
                      <p>{product.categoryNames.join(', ')}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium mb-1 text-black">Shipping & Returns</h4>
                    <p>Standard delivery across Egypt within 2-4 business days. Returns accepted within 14 days.</p>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Complete the Look / Related Section */}
        {relatedProducts.length > 0 && (
          <section className="py-16 border-t border-gray-200 mt-16">
            <h2 className="text-xl lg:text-2xl font-light text-black mb-8 uppercase tracking-wider font-[family-name:var(--font-playfair)]">
              More From This Collection
            </h2>
            <div className="flex gap-6 lg:gap-8 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none touch-pan-x scroll-smooth -mx-6 px-6 lg:mx-0 lg:px-0">
              {relatedProducts.map((relatedProduct) => (
                <div key={relatedProduct.id} className="w-[220px] sm:w-[250px] lg:w-[270px] shrink-0 snap-start">
                  <ProductCard product={relatedProduct} />
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* SHADCN SHEET DRAWER FOR SIZE GUIDE */}
      {sizeGuide?.enabled && (
        <Sheet open={showSizeGuide} onOpenChange={setShowSizeGuide}>
          <SheetContent side="right" className="bg-white border-l border-neutral-300 w-full sm:max-w-md p-6 text-[#1a1a1a]">
            <SheetHeader className="mb-6 border-b border-neutral-300 pb-4">
              <SheetTitle className="text-xl font-normal font-[family-name:var(--font-playfair)] tracking-wide">
                {sizeGuide.title}
              </SheetTitle>
              {sizeGuide.description && (
                <SheetDescription className="text-xs text-neutral-600 font-light mt-1">
                  {sizeGuide.description}
                </SheetDescription>
              )}
            </SheetHeader>

            <div className="space-y-6 text-sm font-light">
              {sizeGuide.columns.length > 0 && sizeGuide.rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-black font-medium">
                        <th className="py-2.5 px-2">Size</th>
                        {sizeGuide.columns.map((col) => (
                          <th key={col.key} className="py-2.5 px-2">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-300/60">
                      {sizeGuide.rows.map((row) => (
                        <tr key={row.size} className="hover:bg-neutral-200/30">
                          <td className="py-3 px-2 font-medium">{row.size}</td>
                          {sizeGuide.columns.map((col) => (
                            <td key={col.key} className="py-3 px-2">
                              {row.values[col.key] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sizeGuide.notes && (
                <div className="space-y-2 pt-4 border-t border-neutral-300 text-xs text-neutral-600 leading-relaxed">
                  <h4 className="font-medium text-neutral-900">Notes</h4>
                  <p>{sizeGuide.notes}</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

    </div>
  );
}

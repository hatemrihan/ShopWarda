'use client';

/**
 * Bouquet Showcase — home page editorial section.
 *
 * Layout reference: bloomandwolf.com
 * - Big image left (~65%), tall
 * - Right column: heading + CTA top, body text bottom (justify-between)
 * - Thin divider line below
 * - White background
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { piastersToCurrency } from '@/lib/money/egp';
import type { FlowerDTO, WrapDTO, BouquetSettingsDTO } from '@/features/bouquet/types';

interface BouquetShowcaseProps {
  flowers: FlowerDTO[];
  wraps: WrapDTO[];
  settings: BouquetSettingsDTO;
}

export function BouquetShowcase({ flowers, wraps, settings }: BouquetShowcaseProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const activeFlowers = flowers.filter((f) => f.selectable);
  const activeWraps = wraps.filter((w) => w.available);

  // Static editorial hero image
  const DesignImage = '/images/design-image.avif';

  // Dynamic body text from admin
  const details: string[] = [];
  if (activeFlowers.length > 0) details.push(`${activeFlowers.length} seasonal blooms`);
  if (activeWraps.length > 0) details.push(`${activeWraps.length} wrapping styles`);
  if (settings.card.enabled) {
    details.push(
      settings.card.priceMinor > 0
        ? `Handwritten card · ${piastersToCurrency(settings.card.priceMinor)}`
        : 'Free handwritten card'
    );
  }

  return (
    <section className="relative bg-white overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-10 md:pt-16">

        {/* ── Grid: Image + Content ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-0">

          {/* Left: Image */}
          <div className="relative aspect-[3/4] lg:aspect-auto lg:min-h-[600px] xl:min-h-[680px] overflow-hidden">
            {!imgLoaded && (
              <div className="absolute inset-0 bg-[#f0ece6] animate-pulse" />
            )}
            <Image
              src={DesignImage}
              alt="Build your own bouquet"
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
              className={`object-cover transition-opacity duration-700 ${imgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              onLoad={() => setImgLoaded(true)}
            />
          </div>

          {/* Right: Content — spread top/bottom */}
          <div className="flex flex-col justify-between lg:pl-14 xl:pl-20 py-8 lg:py-10">

            {/* Top: Heading + CTA */}
            <div>
              <h2
                className="text-[clamp(1.8rem,3.8vw,3rem)] leading-[1.15] text-[#1a1a1a] font-normal mb-7"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
              >
                Build a bouquet<br />
                with meaning
              </h2>

              <Link
                href="/bouquet"
                className="inline-block px-8 py-3.5 bg-[#1a1a1a] text-white text-[11px] tracking-[0.18em] uppercase font-medium rounded-[4px] hover:bg-[#1a1a1a]/85 transition-colors duration-300"
              >
                Start Building
              </Link>
            </div>

            {/* Bottom: Body text */}
            <div className="mt-10 lg:mt-0">
              <p className="text-[13.5px] leading-[1.7] text-[#1a1a1a]/55 font-normal max-w-[340px]">
                Choose your flowers stem by stem, pick a wrapping,
                and add a personal touch. We arrange it fresh on
                the day of delivery.
              </p>

              {details.length > 0 && (
                <p className="text-[10px] tracking-[0.12em] uppercase text-[#1a1a1a]/25 mt-4">
                  {details.join(' · ')}
                </p>
              )}
            </div>

          </div>
        </div>

        {/* ── Divider line ────────────────────────────────── */}
        <div className="border-t border-[#1a1a1a]/10 mt-10 md:mt-14" />

      </div>
    </section>
  );
}

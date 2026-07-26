'use client';

import { useRef } from 'react';
import Image from 'next/image';

export function ModernDriedFlowersSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#faf6f1] overflow-hidden py-20 md:py-32"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {/* Giant Title */}
        <div className="mb-16 md:mb-20">
          <h2
            className="text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.02em] text-[#1a1a1a] font-normal"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            <span className="block md:inline">Modern </span>
            <span className="block md:inline">Dried </span>
            <span className="block md:inline">Flowers</span>
          </h2>
        </div>

        {/* Content Grid: Image Left, Text Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-start">
          {/* Left — Images */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative aspect-[3/4] max-w-[420px] overflow-hidden">
              <Image
                src="/images/one.png"
                alt="Dried flower sculpture arrangement"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-contain"
              />
            </div>

            {/* Secondary floating image — offset below and right */}
            <div className="absolute -bottom-12 right-0 md:-right-8 w-[55%] aspect-[4/5] overflow-hidden hidden md:block">
              <Image
                src="/images/two.png"
                alt="Detailed dried flower arrangement"
                fill
                sizes="25vw"
                className="object-contain"
              />
            </div>
          </div>

          {/* Right — Description */}
          <div className="lg:pt-8 lg:pl-8 max-w-[440px]">
            <p className="text-[12.5px] md:text-[13px] leading-[1.9] text-[#1a1a1a]/50 font-normal mb-6">
              Dried flowers have become a sustainable interior design choice.
              The focus on form, preserved textures, and Instagram-worthy hues to the beauty
              and the art of earth-dried craft, from pampas grass to hydrangea.
            </p>
            <p className="text-[12.5px] md:text-[13px] leading-[1.9] text-[#1a1a1a]/50 font-normal">
              Our collection features carefully preserved botanicals from around the world —
              fine edition from stems of strawflower and everlasting artistically
              beautiful art. &ldquo;Dwell&rdquo; in arrangements.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

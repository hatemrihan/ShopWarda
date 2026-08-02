'use client';

import { useRef } from 'react';

export function ModernDriedFlowersSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative bg-white overflow-hidden py-12 md:py-20"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {/* Giant Title */}
        <div className="mb-8 md:mb-12">
          <h2
            className="text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.02em] text-[#1a1a1a] font-normal"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            <span className="block md:inline">Modern </span>
            <span className="block md:inline">Advertisement</span>
          </h2>
        </div>

        {/* Content Grid: Image Left, Text Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-start">
          {/* Left — Video */}
          <div className="relative w-full max-w-[360px] overflow-hidden rounded-xl">
            <video
              src="/videos/wow.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-auto object-cover rounded-xl"
            />
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

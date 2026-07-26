'use client';

import { useRef } from 'react';

export function WhoWeAreSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#faf6f1] overflow-hidden"
    >

      {/* Subtle organic line art overlay — SVG branch */}
      <svg
        className="absolute top-[10%] left-[8%] w-[200px] h-[300px] opacity-[0.06] pointer-events-none hidden lg:block"
        viewBox="0 0 200 300"
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="0.8"
      >
        <path d="M100 300 C100 250 80 200 90 150 C100 100 70 60 100 0" />
        <path d="M90 150 C60 140 30 160 10 140" />
        <path d="M90 150 C120 130 150 140 170 120" />
        <path d="M95 200 C65 190 40 210 20 200" />
        <path d="M95 200 C125 185 155 195 180 180" />
        <path d="M98 100 C75 95 50 105 30 90" />
        <path d="M98 100 C120 90 145 100 165 85" />
      </svg>

      {/* Content */}
      <div className="relative z-10 max-w-[900px] mx-auto px-6 md:px-10 py-28 md:py-40">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-12 md:gap-20 items-start">
          {/* Left — Heading */}
          <div className="flex-shrink-0">
            <h2
              className="text-[13px] md:text-[14px] tracking-[0.25em] uppercase text-[#1a1a1a] font-normal"
              style={{ fontFamily: 'var(--font-inter), sans-serif' }}
            >
              Who We Are
            </h2>
          </div>

          {/* Right — Description */}
          <div className="max-w-[420px]">
            <p className="text-[12.5px] md:text-[13px] leading-[1.9] text-[#1a1a1a]/50 font-normal">
              Founded on a love of natural beauty. Driven by a holistic approach to
              flowers, fruit, or sculptural artistry. Combining a minimalist art style
              with a support well-balanced process. We push the boundaries
              of what floral design can be, connecting each flower&apos;s wild individuality
              as a form for our expression.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

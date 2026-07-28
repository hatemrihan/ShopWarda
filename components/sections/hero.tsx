'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

// ── Slide Data ─────────────────────────────────────────────────

const SLIDES = [
  {
    num: '01',
    title: 'FRESH BOUQUETS',
    description: 'Hand-tied with seasonal blooms, made especially for you.',
    image: '/images/one.png',
  },
  {
    num: '02',
    title: 'Advertisement',
    description: 'Timeless arrangements that last for months, not days.',
    image: '/images/two.png',
  },
  {
    num: '03',
    title: 'GIFT BOXES',
    description: 'Curated collections wrapped with care for any occasion.',
    image: '/images/three.png',
  },
];

// ── Component ──────────────────────────────────────────────────

export function HeroSection() {
  const [active, setActive] = useState(0);
  const [isLocked, setIsLocked] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);
  const lockCooldown = useRef(false);
  const touchStartY = useRef(0);
  const wheelAccum = useRef(0);

  // Scroll-lock: intercept wheel/touch to cycle slides before allowing page scroll
  const advanceSlide = useCallback((direction: 'down' | 'up') => {
    if (lockCooldown.current) return;

    if (direction === 'down') {
      if (active < SLIDES.length - 1) {
        lockCooldown.current = true;
        setActive((prev) => prev + 1);
        wheelAccum.current = 0;
        setTimeout(() => { lockCooldown.current = false; wheelAccum.current = 0; }, 900);
      } else {
        // Last slide reached → unlock scroll down
        setIsLocked(false);
      }
    } else {
      if (active > 0) {
        lockCooldown.current = true;
        setActive((prev) => prev - 1);
        wheelAccum.current = 0;
        setTimeout(() => { lockCooldown.current = false; wheelAccum.current = 0; }, 900);
      } else {
        // First slide reached → unlock scroll up
        setIsLocked(false);
      }
    }
  }, [active]);

  // Re-lock when user scrolls back into the hero from below
  useEffect(() => {
    if (isLocked) return; // already locked, skip

    const handleScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Hero is mostly visible and we scrolled back near the top
      if (rect.top >= -50 && rect.bottom >= window.innerHeight * 0.8) {
        setIsLocked(true);
        setActive(SLIDES.length - 1);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLocked]);

  // Wheel handler
  useEffect(() => {
    if (!isLocked) return;

    const handleWheel = (e: WheelEvent) => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      // Only intercept if hero is in viewport
      if (rect.top > 100 || rect.bottom < window.innerHeight * 0.5) return;

      e.preventDefault();

      // If on cooldown, eat all scroll events
      if (lockCooldown.current) {
        wheelAccum.current = 0;
        return;
      }

      // Accumulate scroll delta — require significant scroll before advancing
      wheelAccum.current += e.deltaY;

      if (Math.abs(wheelAccum.current) >= 50) {
        advanceSlide(wheelAccum.current > 0 ? 'down' : 'up');
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isLocked, advanceSlide]);

  // Touch handlers for mobile
  useEffect(() => {
    if (!isLocked) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      if (rect.top > 100 || rect.bottom < window.innerHeight * 0.5) return;

      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) < 30) return; // ignore small swipes

      e.preventDefault();
      advanceSlide(deltaY > 0 ? 'down' : 'up');
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isLocked, advanceSlide]);

  const slide = SLIDES[active];

  return (
    <section ref={sectionRef} className="relative bg-white min-h-screen flex items-center overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-20 md:pt-32 pb-10 md:pb-14 w-full">

        {/* Headline */}
        <div className="text-center mb-12 md:mb-16 mt-4 md:mt-6">
          <h1
            className="text-[clamp(2rem,5vw,3.5rem)] leading-[1.15] text-[#1a1a1a] tracking-[-0.01em]"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            Flowers that turn<br />
            moments into{' '}
            <span className="italic text-[#c75c3a] font-light">memories</span>
          </h1>
          <p className="mt-4 text-[14px] leading-relaxed text-[#1a1a1a]/40 max-w-md mx-auto">
            Fresh flowers, thoughtfully arranged to bring beauty,
            warmth, and joy to every occasion.
          </p>
        </div>

        {/* Main Grid: Image + Info */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-16 items-end">

          {/* Image Container */}
          <div className="relative aspect-[4/3] md:aspect-[16/9] max-h-[340px] rounded-sm overflow-hidden">
            {SLIDES.map((s, i) => (
              <div
                key={s.num}
                className="absolute inset-0"
                style={{
                  opacity: i === active ? 1 : 0,
                  transform: i === active ? 'scale(1)' : 'scale(1.02)',
                  transition: 'opacity 600ms ease, transform 600ms ease',
                  willChange: 'opacity, transform',
                  pointerEvents: i === active ? 'auto' : 'none',
                }}
              >
                <Image
                  src={s.image}
                  alt={s.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 65vw"
                  className="object-contain"
                  priority={i === 0}
                />
              </div>
            ))}

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1a1a1a]/[0.06]">
              <div
                className="h-full bg-[#c75c3a] transition-[width] duration-600 ease-out"
                style={{ width: `${((active + 1) / SLIDES.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Right Side: Slide Info + Tabs */}
          <div className="flex flex-col justify-end pb-4">
            {/* Animated Info Block */}
            <div className="mb-8 min-h-[80px]">
              <div
                key={slide.num}
                className="transition-all duration-500"
                style={{
                  animation: 'fadeSlideUp 0.5s ease-out',
                }}
              >
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-[12px] text-[#1a1a1a]/25 font-mono tracking-wider">
                    /{slide.num}/
                  </span>
                  <h2 className="text-[14px] font-semibold tracking-[0.15em] uppercase text-[#c75c3a]">
                    {slide.title}
                  </h2>
                </div>
                <p className="text-[13px] leading-relaxed text-[#1a1a1a]/50 max-w-[260px]">
                  {slide.description}
                </p>
              </div>
            </div>

            {/* Tab Indicators */}
            <div className="flex items-center gap-3">
              {SLIDES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActive(i);
                    if (i < SLIDES.length - 1) setIsLocked(true);
                  }}
                  onMouseEnter={() => {
                    setActive(i);
                    if (i < SLIDES.length - 1) setIsLocked(true);
                  }}
                  className="group flex items-center gap-2 cursor-pointer"
                >
                  <div
                    className={`
                      h-[2px] transition-all duration-500
                      ${i === active
                        ? 'w-8 bg-[#c75c3a]'
                        : 'w-4 bg-[#1a1a1a]/15 group-hover:w-6 group-hover:bg-[#1a1a1a]/30'
                      }
                    `}
                  />
                  <span
                    className={`
                      text-[10px] font-mono tracking-wider transition-all duration-300
                      ${i === active ? 'text-[#c75c3a]' : 'text-[#1a1a1a]/20 group-hover:text-[#1a1a1a]/40'}
                    `}
                  >
                    {s.num}
                  </span>
                </button>
              ))}
            </div>

            {/* Scroll hint — only on first slide */}
            {active === 0 && isLocked && (
              <div className="mt-6 flex items-center gap-2 opacity-40 animate-pulse">
                <div className="w-[1px] h-4 bg-[#1a1a1a]/30" />
                <span className="text-[10px] text-[#1a1a1a]/40 tracking-wider uppercase">
                  Scroll to explore
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS animation */}
      <style jsx>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}

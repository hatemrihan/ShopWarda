'use client';

import { useEffect, useRef } from 'react';

export function HeroSection() {
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const desktopVideoRef = useRef<HTMLVideoElement>(null);

  // Auto-play videos
  useEffect(() => {
    mobileVideoRef.current?.play().catch(() => { });
    desktopVideoRef.current?.play().catch(() => { });
  }, []);

  return (
    <section className="hero-section">
      {/* ── Mobile: video ────────────────────────────── */}
      <div className="hero-media hero-media--mobile">
        <video
          ref={mobileVideoRef}
          src="/videos/wow.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="hero-media__video"
        />
      </div>

      {/* ── Desktop: video ───────────────────────────── */}
      <div className="hero-media hero-media--desktop">
        <video
          ref={desktopVideoRef}
          src="/videos/laptop.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="hero-media__video"
        />
      </div>

      {/* ── Bottom text ──────────────────────────────── */}
      <div className="hero-bottom">
        <p className="hero-bottom__text">
          Flowers that turn<br />
          moments into memories.
        </p>
      </div>

      <style jsx>{`
        .hero-section {
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          margin-top: -6rem;
        }
        @media (min-width: 768px) {
          .hero-section {
            margin-top: 0;
          }
        }

        /* ── Media layers ── */
        .hero-media {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .hero-media--mobile { display: block; }
        .hero-media--desktop { display: none; }
        @media (min-width: 768px) {
          .hero-media--mobile { display: none; }
          .hero-media--desktop { display: block; }
        }
        .hero-media__video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
        }

        /* ── Bottom text ── */
        .hero-bottom {
          position: absolute;
          bottom: 32px;
          left: 0;
          right: 0;
          z-index: 2;
          text-align: center;
        }
        @media (min-width: 768px) {
          .hero-bottom {
            bottom: 48px;
          }
        }
        .hero-bottom__text {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 16px;
          line-height: 1.5;
          color: #1a1a1a;
          letter-spacing: 0.02em;
          margin: 0;
          font-weight: 400;
        }
        @media (min-width: 768px) {
          .hero-bottom__text {
            font-size: 18px;
          }
        }
      `}</style>
    </section>
  );
}

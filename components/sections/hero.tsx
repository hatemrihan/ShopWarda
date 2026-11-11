'use client';

import { useEffect, useRef } from 'react';

export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Some browsers ignore the autoplay attribute until asked explicitly.
  useEffect(() => {
    videoRef.current?.play().catch(() => { });
  }, []);

  return (
    <section className="hero-section">
      {/*
        One <video>, two sources. The browser picks the first source whose
        media query matches and downloads only that file.

        There used to be two <video> elements — one per breakpoint, the other
        hidden with CSS. `display: none` does not stop a preload="auto" video
        from downloading, so every visitor fetched both clips (phones pulled
        the desktop one too) before the page was usable.
      */}
      <div className="hero-media">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="hero-media__video"
        >
          <source src="/videos/laptop.mp4" type="video/mp4" media="(min-width: 768px)" />
          <source src="/videos/wow.mp4" type="video/mp4" />
        </video>
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

        /* ── Media layer ── */
        .hero-media {
          position: absolute;
          inset: 0;
          z-index: 0;
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

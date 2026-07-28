'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { subscribeAction } from '@/features/engagement/server/engagement.actions';

export function SiteFooter() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await subscribeAction({ email, source: 'footer' });
      if (result.success) {
        toast.success('Thank you for subscribing to ShopWarda!');
        setIsSubscribed(true);
        setEmail('');
      } else {
        toast.error(result.error || 'Subscription failed. Please try again.');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#2a3829] text-white font-sans overflow-hidden select-none">
      {/* Top Instagram / Follow Us Bar */}
      <div className="pt-12 pb-6 text-center">
        <p className="text-[11px] tracking-[0.25em] font-medium text-white/90 uppercase">
          FOLLOW US
        </p>
        <p className="text-xs tracking-[0.2em] font-light text-white uppercase mt-1">
          @SHOPWARDA
        </p>
      </div>

      {/* Showcase Video Container replacing the 3 images */}
      <div className="relative max-w-[900px] mx-auto px-4 mb-16">
        {/* Floating Circular Badge Overlapping Top-Left */}
        <div className="absolute -top-10 -left-2 md:-left-8 z-20 w-32 h-32 md:w-40 md:h-40 pointer-events-none">
          <svg
            viewBox="0 0 160 160"
            className="w-full h-full animate-[spin_30s_linear_infinite]"
          >
            <path
              id="circlePath"
              d="M 80, 80 m -60, 0 a 60,60 0 1,1 120,0 a 60,60 0 1,1 -120,0"
              fill="none"
            />
            <text fill="white" className="text-[12.5px] uppercase tracking-[0.26em] font-light">
              <textPath href="#circlePath" startOffset="0%">
                S H O P • W A R D A • E G Y P T •
              </textPath>
            </text>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-white text-xs md:text-sm tracking-[0.2em] font-light uppercase">
            WARDA
          </div>
        </div>

        {/* Video Player */}
        <div className="w-full h-[230px] md:h-[260px] overflow-hidden rounded-sm relative bg-[#1e291d]">
          <video
            src="/videos/video.mov"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Main Footer Links & Information Grid */}
      <div className="max-w-[1240px] mx-auto px-6 pt-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
          {/* Column 1: Newsletter */}
          <div className="flex flex-col justify-between">
            <div>
              <h4 className="text-[11px] font-medium tracking-[0.2em] text-white uppercase mb-4">
                NEWSLETTER
              </h4>
              <p className="text-xs text-white/80 font-light mb-8">
                Get updates on all things ShopWarda
              </p>
              {isSubscribed ? (
                <p className="text-xs tracking-[0.15em] text-white/90 uppercase font-medium pt-2">
                  THANK YOU FOR SUBSCRIBING!
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="relative flex items-center border-b border-white/60 pb-2 max-w-xs">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="EMAIL"
                    disabled={isSubmitting}
                    className="w-full bg-transparent text-xs tracking-[0.15em] text-white placeholder:text-white/70 focus:outline-none uppercase font-light disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="text-xs tracking-[0.2em] font-medium text-white uppercase hover:opacity-75 transition-opacity whitespace-nowrap pl-4 disabled:opacity-50"
                  >
                    {isSubmitting ? 'SENDING...' : 'SEND'}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-12 text-[10px] text-white/70 font-light tracking-wide leading-relaxed">
              © {new Date().getFullYear()} ShopWarda. All rights reserved.
            </div>
          </div>

          {/* Column 2: Get In Touch */}
          <div>
            <h4 className="text-[11px] font-medium tracking-[0.2em] text-white uppercase mb-4">
              GET IN TOUCH
            </h4>
            <ul className="space-y-2.5 text-xs text-white/80 font-light">
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Customer Care
                </Link>
              </li>
              <li className="pt-2 text-white/70 leading-snug">
                Giza, Egypt
              </li>
            </ul>

            <div className="flex items-center gap-4 mt-8 text-white">
              <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity" aria-label="Instagram">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
              <Link href="/contact" className="hover:opacity-75 transition-opacity" aria-label="Phone">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
              <Link href="/contact" className="hover:opacity-75 transition-opacity" aria-label="Location">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Column 3: Information & Policies */}
          <div>
            <h4 className="text-[11px] font-medium tracking-[0.2em] text-white uppercase mb-4">
              INFORMATION
            </h4>
            <ul className="space-y-2.5 text-xs text-white/80 font-light">
              <li>
                <Link href="/shipping" className="hover:text-white transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-white transition-colors">
                  Returns & Exchange
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Social Media */}
          {/* <div>
            <h4 className="text-[11px] font-medium tracking-[0.2em] text-white uppercase mb-4">
              SOCIAL MEDIA
            </h4>
            <ul className="space-y-2.5 text-xs text-white/80 font-light">
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Instagram (@shopwarda)
                </a>
              </li>
              <li>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V5.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 1 0 15.8 12V8.14a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.05z" />
                  </svg>
                  TikTok
                </a>
              </li>
            </ul>
          </div> */}
        </div>
      </div>
    </footer>
  );
}

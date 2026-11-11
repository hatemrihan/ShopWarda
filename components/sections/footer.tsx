'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { subscribeAction } from '@/features/engagement/server/engagement.actions';

export function SiteFooter() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // The footer clip is 8 MB and sits at the very bottom of every page. It was
  // an autoplaying <video>, so every visit to every page began downloading it
  // whether or not the visitor ever scrolled that far. It is now mounted only
  // once the footer approaches the viewport — and if the file is missing or
  // the browser cannot play it, the block is removed instead of showing an
  // empty dark box.
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const [videoInView, setVideoInView] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const node = videoWrapRef.current;
    if (!node || videoInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVideoInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [videoInView]);

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
    <footer className="bg-[#2a3829] text-white font-sans overflow-hidden select-none pt-12 md:pt-16">


      {/* Showcase Video Container replacing the 3 images */}
      {!videoFailed && (
        <div ref={videoWrapRef} className="relative max-w-[900px] mx-auto px-4 mb-16">

          {/* Video Player */}
          <div className="w-full h-[230px] md:h-[260px] overflow-hidden rounded-sm relative bg-[#1e291d]">
            {videoInView && (
              <video
                src="/videos/video.mov"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                onError={() => setVideoFailed(true)}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
      )}

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

            <div className="hidden md:block mt-12 text-[10px] text-white/70 font-light tracking-wide leading-relaxed">
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
              <Link href="https://www.instagram.com/wardatheflorist?igsh=Z25zcWtia2kzbGM2" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity" aria-label="Instagram">
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
          <div>
            <h4 className="text-[11px] font-medium tracking-[0.2em] text-white uppercase mb-4">
              SOCIAL MEDIA
            </h4>
            <ul className="space-y-2.5 text-xs text-white/80 font-light">
              <li>
                <a
                  href="https://www.instagram.com/wardatheflorist?igsh=Z25zcWtia2kzbGM2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/share/1B9rvEirsv/"
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
            </ul>
          </div>
        </div>

        {/* Mobile Responsive Footer Copyright */}
        <div className="block md:hidden mt-12 pt-6 border-t border-white/10 text-center text-[10px] text-white/70 font-light tracking-wider leading-relaxed">
          <p>Giza, Egypt</p>
          <p>{new Date().getFullYear()} shopwarda</p>
          <p>All Rights Reserved</p>
        </div>
      </div>
    </footer>
  );
}

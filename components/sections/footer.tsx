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
    <footer className="bg-[#2a3829] text-white font-sans overflow-hidden select-none pt-12 md:pt-16">


      {/* Showcase Video Container replacing the 3 images */}
      <div className="relative max-w-[900px] mx-auto px-4 mb-16">

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
                  href="https://wa.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  WhatsApp
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

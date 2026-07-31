'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Menu, X, Search } from 'lucide-react';
import { useCart } from '@/features/cart/context/cart-context';

type SearchResult = {
  id: string;
  slug: string;
  name: string;
  price: number;
  original_price: number | null;
  main_image: string;
};

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  // The bouquet builder ships behind an admin flag; don't advertise a 404.
  const [bouquetEnabled, setBouquetEnabled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/bouquet/enabled')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setBouquetEnabled(Boolean(data?.enabled));
      })
      .catch(() => {
        /* leave the link hidden */
      });
    return () => {
      mounted = false;
    };
  }, []);
  const { state: cartState, openCart } = useCart();

  // ── Search state ─────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileBtnRef = useRef<HTMLButtonElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      const next = !prev;
      if (!next) {
        setSearchQuery('');
        setSearchResults([]);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [searchOpen]);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (desktopSearchRef.current && desktopSearchRef.current.contains(target)) ||
        (mobileSearchRef.current && mobileSearchRef.current.contains(target)) ||
        (mobileBtnRef.current && mobileBtnRef.current.contains(target))
      ) {
        return;
      }
      closeSearch();
    };
    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen, closeSearch]);

  // Close search on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [closeSearch]);

  // ── Debounced search ─────────────────────────────────────────
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 1) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.products || []);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-500
          ${scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.04)]'
            : 'bg-transparent'
          }
        `}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="flex items-center justify-between h-20 md:h-24">
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <Image
                src="/images/logo-black.png"
                alt="Warda"
                width={200}
                height={80}
                className="w-[120px] md:w-[160px] h-auto object-contain group-hover:opacity-80 transition-opacity duration-300"
                priority
              />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {[
                { label: 'Shop', href: '/shop' },
                { label: 'Categories', href: '/categories' },
                ...(bouquetEnabled ? [{ label: 'Build a Bouquet', href: '/bouquet' }] : []),
                { label: 'About', href: '/about' },
                { label: 'Contact', href: '/contact' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[12px] tracking-[0.15em] uppercase text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors duration-300 relative group"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#c75c3a] group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {/* Desktop Search Trigger & Popover */}
              <div ref={desktopSearchRef} className="relative hidden md:block">
                <button
                  type="button"
                  onClick={toggleSearch}
                  className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#1a1a1a]/[0.04] transition-colors duration-200 cursor-pointer"
                  aria-label="Search products"
                >
                  <Search className="h-[16px] w-[16px] text-[#1a1a1a]/50" strokeWidth={1.5} />
                </button>

                {/* Search Dropdown */}
                {searchOpen && (
                  <div className="absolute top-full right-0 mt-2 w-[380px] bg-white rounded-xl shadow-2xl border border-neutral-200/80 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
                      <Search className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search products..."
                        className="w-full text-xs font-medium text-neutral-900 placeholder:text-neutral-400 outline-none bg-transparent"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => { setSearchQuery(''); setSearchResults([]); searchInputRef.current?.focus(); }}
                          className="text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Results */}
                    <div className="max-h-[340px] overflow-y-auto">
                      {searchLoading && (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-5 w-5 border-2 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
                        </div>
                      )}

                      {!searchLoading && searchQuery.length > 0 && searchResults.length === 0 && (
                        <div className="py-8 text-center text-xs text-neutral-400">
                          No products found for &quot;{searchQuery}&quot;
                        </div>
                      )}

                      {!searchLoading && searchResults.length > 0 && (
                        <div className="divide-y divide-neutral-100">
                          {searchResults.map((product, idx) => (
                            <Link
                              key={product.id || product.slug || idx}
                              href={product.slug ? `/product/${product.slug}` : '/shop'}
                              onClick={closeSearch}
                              className="flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-50 transition-colors group"
                            >
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 relative border border-neutral-200/60">
                                {product.main_image ? (
                                  <Image
                                    src={product.main_image}
                                    alt={product.name || 'Product'}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-neutral-200 flex items-center justify-center text-xs text-neutral-400">?</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-neutral-900 truncate group-hover:text-[#c75c3a] transition-colors">
                                  {product.name}
                                </p>
                                <p className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                                  {product.original_price && product.original_price > product.price ? (
                                    <>
                                      <span className="line-through text-neutral-400 mr-2">
                                        EGP {product.original_price}
                                      </span>
                                      <span className="text-neutral-900 font-bold">
                                        EGP {product.price}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-neutral-900 font-bold">EGP {product.price}</span>
                                  )}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {!searchLoading && !searchQuery && (
                        <div className="py-8 text-center text-xs text-neutral-400 uppercase tracking-wider font-medium">
                          Type to search products
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Search Button */}
              <button
                ref={mobileBtnRef}
                type="button"
                onClick={toggleSearch}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#1a1a1a]/[0.04] transition-colors duration-200 cursor-pointer"
                aria-label="Search products"
              >
                <Search className="h-[16px] w-[16px] text-[#1a1a1a]/50" strokeWidth={1.5} />
              </button>

              <button
                onClick={openCart}
                className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#1a1a1a]/[0.04] transition-colors duration-200 cursor-pointer"
                aria-label="Shopping bag"
              >
                <ShoppingBag className="h-[16px] w-[16px] text-[#1a1a1a]/50" strokeWidth={1.5} />
                {cartState.itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#c75c3a] text-[#ffffff] text-[10px] font-bold flex items-center justify-center">
                    {cartState.itemCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#1a1a1a]/[0.04] transition-colors duration-200 cursor-pointer"
              >
                <Menu className="h-[18px] w-[18px] text-[#1a1a1a]/70" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search Overlay */}
        {searchOpen && (
          <div className="md:hidden animate-in fade-in slide-in-from-top-2 duration-200" ref={mobileSearchRef}>
            <div className="bg-white border-t border-b border-neutral-200 shadow-lg">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
                <Search className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full text-xs text-neutral-900 placeholder:text-neutral-400 outline-none bg-transparent"
                />
                <button
                  onClick={closeSearch}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-[50vh] overflow-y-auto">
                {searchLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-5 w-5 border-2 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
                  </div>
                )}

                {!searchLoading && searchQuery.length > 0 && searchResults.length === 0 && (
                  <div className="py-8 text-center text-xs text-neutral-400">
                    No products found for &quot;{searchQuery}&quot;
                  </div>
                )}

                {!searchLoading && searchResults.length > 0 && (
                  <div className="divide-y divide-neutral-100">
                    {searchResults.map((product, idx) => (
                      <Link
                        key={product.id || product.slug || idx}
                        href={product.slug ? `/product/${product.slug}` : '/shop'}
                        onClick={closeSearch}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 relative border border-neutral-200">
                          {product.main_image ? (
                            <Image
                              src={product.main_image}
                              alt={product.name || 'Product'}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="w-full h-full bg-neutral-200 flex items-center justify-center text-xs text-neutral-400">?</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                            {product.original_price && product.original_price > product.price ? (
                              <>
                                <span className="line-through text-neutral-400 mr-2">
                                  EGP {product.original_price}
                                </span>
                                <span className="text-neutral-900 font-bold">
                                  EGP {product.price}
                                </span>
                              </>
                            ) : (
                              <span className="text-neutral-900 font-bold">EGP {product.price}</span>
                            )}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {!searchLoading && !searchQuery && (
                  <div className="py-8 text-center text-xs text-neutral-400 uppercase tracking-wider font-medium">
                    Type to search products
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`
          fixed inset-0 z-[60] bg-white transition-all duration-500
          ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      >
        <div className="flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center" onClick={() => setMobileOpen(false)}>
            <Image
              src="/images/logo-black.png"
              alt="Warda"
              width={200}
              height={80}
              className="w-[120px] h-auto object-contain"
            />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a1a]/[0.04]"
          >
            <X className="h-5 w-5 text-[#1a1a1a]/60" />
          </button>
        </div>

        <nav className="flex flex-col items-center justify-center gap-8 pt-16">
          {[
            { label: 'Shop', href: '/shop' },
            { label: 'Categories', href: '/categories' },
            ...(bouquetEnabled ? [{ label: 'Build a Bouquet', href: '/bouquet' }] : []),
            { label: 'About', href: '/about' },
            { label: 'Contact', href: '/contact' },
            { label: 'Cart', href: '/cart' },
          ].map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="text-[28px] font-light tracking-[0.08em] text-[#1a1a1a]/80 hover:text-[#c75c3a] transition-all duration-300"
              style={{
                transform: mobileOpen ? 'translateY(0)' : 'translateY(20px)',
                opacity: mobileOpen ? 1 : 0,
                transitionDelay: `${i * 80}ms`,
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

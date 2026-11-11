'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { state: cartState, openCart } = useCart();

  // ── Search state ─────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  // Desktop and mobile each render their own input. They used to share one
  // ref, which always ended up pointing at the mobile input (it mounts last),
  // so on desktop the search opened without a cursor in it.
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileBtnRef = useRef<HTMLButtonElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cancels the in-flight lookup when a newer one starts. Responses can
  // arrive out of order; without this, results for "ro" could replace the
  // results for "roses".
  const searchAbortRef = useRef<AbortController | null>(null);

  const cancelPendingSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
  }, []);

  const closeSearch = useCallback(() => {
    cancelPendingSearch();
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchLoading(false);
  }, [cancelPendingSearch]);

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



  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => {
        // Focus whichever input is actually on screen.
        const visible = [desktopInputRef.current, mobileInputRef.current].find(
          (el) => el && el.offsetParent !== null
        );
        visible?.focus();
      }, 100);
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
    cancelPendingSearch();

    if (query.trim().length < 1) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        setSearchResults(data.success ? data.products || [] : []);
      } catch {
        if (controller.signal.aborted) return; // superseded by a newer search
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 300);
  }, [cancelPendingSearch]);

  // Enter opens the full results page.
  const submitSearch = useCallback(
    (event: React.SyntheticEvent) => {
      event.preventDefault();
      const term = searchQuery.trim();
      if (!term) return;
      closeSearch();
      router.push(`/search?q=${encodeURIComponent(term)}`);
    },
    [searchQuery, closeSearch, router]
  );

  // Drop any pending lookup when the header unmounts.
  useEffect(() => cancelPendingSearch, [cancelPendingSearch]);


  // Always use dark style — hero has a light background
  const isTransparentHeader = false;

  // Always dark nav text & icons
  const iconColor = 'text-[#1a1a1a]';
  const iconHover = 'hover:bg-[#1a1a1a]/[0.06]';
  const navLinkColor = 'text-[#1a1a1a]/70 hover:text-[#1a1a1a]';
  const underlineColor = 'bg-[#1a1a1a]';

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 bg-transparent"
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="flex items-center justify-between h-20 md:h-24">
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <Image
                src={isTransparentHeader ? '/images/logo.png' : '/images/logo-black.png'}
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
                { label: 'Build a Bouquet', href: '/bouquet' },
                { label: 'About', href: '/about' },
                { label: 'Contact', href: '/contact' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-[12px] tracking-[0.15em] uppercase ${navLinkColor} transition-colors duration-300 relative group`}
                >
                  {item.label}
                  <span className={`absolute -bottom-1 left-0 w-0 h-[1px] ${underlineColor} group-hover:w-full transition-all duration-300`} />
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
                  className={`flex items-center justify-center w-9 h-9 rounded-full ${iconHover} transition-colors duration-200 cursor-pointer`}
                  aria-label="Search products"
                >
                  <Search className={`h-[16px] w-[16px] ${iconColor}`} strokeWidth={1.5} />
                </button>

                {/* Search Dropdown */}
                {searchOpen && (
                  <div className="absolute top-full right-0 mt-2 w-[380px] bg-white rounded-xl shadow-2xl border border-neutral-200/80 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Search Input */}
                    <form onSubmit={submitSearch} role="search" className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
                      <Search className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                      <input
                        ref={desktopInputRef}
                        aria-label="Search products"
                        enterKeyHint="search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search products..."
                        className="w-full text-xs font-medium text-neutral-900 placeholder:text-neutral-400 outline-none bg-transparent"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          aria-label="Clear search"
                          onClick={() => { handleSearch(''); desktopInputRef.current?.focus(); }}
                          className="text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </form>

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
                className={`md:hidden flex items-center justify-center w-9 h-9 rounded-full ${iconHover} transition-colors duration-200 cursor-pointer`}
                aria-label="Search products"
              >
                <Search className={`h-[16px] w-[16px] ${iconColor}`} strokeWidth={1.5} />
              </button>

              <button
                onClick={openCart}
                className={`relative flex items-center justify-center w-9 h-9 rounded-full ${iconHover} transition-colors duration-200 cursor-pointer`}
                aria-label="Shopping bag"
              >
                <ShoppingBag className={`h-[16px] w-[16px] ${iconColor}`} strokeWidth={1.5} />
                {cartState.itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#c75c3a] text-[#ffffff] text-[10px] font-bold flex items-center justify-center">
                    {cartState.itemCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className={`md:hidden flex items-center justify-center w-9 h-9 rounded-full ${iconHover} transition-colors duration-200 cursor-pointer`}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileOpen ? (
                  <X className="h-[18px] w-[18px] text-[#1a1a1a]/70" strokeWidth={1.5} />
                ) : (
                  <Menu className="h-[18px] w-[18px] text-[#1a1a1a]/70" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search Overlay */}
        {searchOpen && (
          <div className="md:hidden animate-in fade-in slide-in-from-top-2 duration-200" ref={mobileSearchRef}>
            <div className="bg-white border-t border-b border-neutral-200 shadow-lg">
              {/* Search Input */}
              <form onSubmit={submitSearch} role="search" className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
                <Search className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                <input
                  ref={mobileInputRef}
                  aria-label="Search products"
                  enterKeyHint="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full text-base text-neutral-900 placeholder:text-neutral-400 outline-none bg-transparent"
                />
                <button
                  type="button"
                  aria-label="Close search"
                  onClick={closeSearch}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>

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

      {/* Mobile Menu — Bloom & Wolf style dropdown */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[55] md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          {/* Dim backdrop */}
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}
      <div
        className={`
          fixed top-[80px] left-0 right-0 z-[56] md:hidden
          bg-white shadow-xl border-t border-neutral-200/60
          transition-all duration-300 ease-in-out origin-top
          ${mobileOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-3 pointer-events-none'
          }
        `}
      >
        <nav className="py-4 max-h-[calc(100vh-80px)] overflow-y-auto">
          {/* Primary links */}
          {[
            { label: 'Shop', href: '/shop' },
            { label: 'Categories', href: '/categories' },
            { label: 'Build a Bouquet', href: '/bouquet' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                block px-6 py-3.5 text-[15px] font-medium text-[#1a1a1a]
                active:bg-neutral-50 transition-colors
                ${pathname === item.href ? 'text-[#c75c3a]' : ''}
              `}
            >
              {item.label}
            </Link>
          ))}

          {/* Separator */}
          <div className="my-3 mx-6 border-t border-neutral-100" />

          {/* Secondary links */}
          {[
            { label: 'About', href: '/about' },
            { label: 'Contact', href: '/contact' },
            { label: 'Cart', href: '/cart' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                block px-6 py-3 text-[14px] text-[#1a1a1a]/60 font-normal
                active:bg-neutral-50 transition-colors
                ${pathname === item.href ? 'text-[#c75c3a]' : ''}
              `}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

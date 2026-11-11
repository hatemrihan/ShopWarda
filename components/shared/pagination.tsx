import Link from 'next/link';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Builds the href for a given page number. */
  hrefFor: (page: number) => string;
}

/**
 * Previous / next navigation for the storefront product grids.
 *
 * Renders nothing when everything fits on one page. Before this existed the
 * grids simply stopped at 24 products — anything beyond that could not be
 * reached from the shop at all.
 */
export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;

  const linkClass =
    'text-[12px] tracking-[0.1em] uppercase text-neutral-900 hover:opacity-60 transition-opacity';
  const disabledClass = 'text-[12px] tracking-[0.1em] uppercase text-neutral-300 select-none';

  return (
    <nav
      aria-label="Pagination"
      className="mt-14 sm:mt-20 flex items-center justify-center gap-8 font-light"
    >
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={linkClass}>
          ← Previous
        </Link>
      ) : (
        <span aria-hidden="true" className={disabledClass}>← Previous</span>
      )}

      <span className="text-[12px] text-neutral-500 tabular-nums" aria-current="page">
        {page} / {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={linkClass}>
          Next →
        </Link>
      ) : (
        <span aria-hidden="true" className={disabledClass}>Next →</span>
      )}
    </nav>
  );
}

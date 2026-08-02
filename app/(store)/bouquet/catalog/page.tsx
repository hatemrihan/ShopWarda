import { redirect } from 'next/navigation';

/**
 * The separate catalog page has been merged into the main bouquet builder.
 * Redirect any existing links/bookmarks to /bouquet.
 */
export default function BouquetCatalogRedirect() {
  redirect('/bouquet');
}

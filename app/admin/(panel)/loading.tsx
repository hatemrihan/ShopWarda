import { Loader2 } from 'lucide-react';

/**
 * Shown inside the admin shell while a page's server data loads.
 *
 * Without this file every admin navigation froze on the previous page until
 * the next one had fully rendered on the server, which read as the panel
 * "hanging". The sidebar now stays put and the content area responds at once.
 */
export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading">
      <Loader2 className="h-5 w-5 animate-spin text-white/20" />
    </div>
  );
}

import { requireAdmin } from '@/lib/auth/require-admin';
import { getAdminCatalog } from '@/features/bouquet/server/bouquet.service';
import { BouquetManager } from './bouquet-manager';

export const dynamic = 'force-dynamic';

export default async function AdminBouquetPage() {
  await requireAdmin();
  const catalog = await getAdminCatalog();

  return (
    <BouquetManager
      initialFlowers={catalog.flowers}
      initialWraps={catalog.wraps}
      initialSettings={catalog.settings}
    />
  );
}

import { requireAdmin } from '@/lib/auth/require-admin';
import { listWrappingPapersAction } from '@/features/wrapping/server/wrapping.actions';
import { WrappingPaperManager } from './wrapping-manager';

export const dynamic = 'force-dynamic';

export default async function AdminWrappingPaperPage() {
  await requireAdmin();
  const result = await listWrappingPapersAction();

  return (
    <WrappingPaperManager
      initialPapers={result.success ? result.data : []}
      loadError={result.success ? undefined : result.error}
    />
  );
}

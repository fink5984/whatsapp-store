import { requireUser } from '@/lib/auth';
import { StoreForm } from '@/components/admin/StoreForm';

export const dynamic = 'force-dynamic';

export default async function NewStorePage() {
  await requireUser();
  return <StoreForm mode="create" />;
}

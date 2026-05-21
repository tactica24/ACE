import { requireAdminUser } from '@/lib/auth-page';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminUser('/admin');
  return children;
}

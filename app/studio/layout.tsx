import { requireCurrentUser } from '@/lib/auth-page';

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireCurrentUser('/studio');
  return children;
}

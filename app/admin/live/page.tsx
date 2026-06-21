import AdminLiveMatchManager, { type AdminLiveMatch } from '@/components/AdminLiveMatchManager';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminLiveMatchesPage() {
  await requireAdminUser('/admin/live');
  const matches = await prisma.liveMatch.findMany({
    orderBy: [{ status: 'asc' }, { kickoffAt: 'desc' }],
    include: { _count: { select: { messages: true } } }
  });
  const serialized = matches.map((match) => ({ ...match, kickoffAt: match.kickoffAt.toISOString(), createdAt: match.createdAt.toISOString(), updatedAt: match.updatedAt.toISOString() })) as unknown as AdminLiveMatch[];

  return <DashboardShell
    title="Live matches"
    eyebrow="Audience control room"
    description="Schedule broadcasts, publish secure embeds, and manage match-day conversations."
    sideNav={<SideNav active="/admin/live" items={getAdminNavItems()} />}
  >
    <AdminLiveMatchManager initialMatches={serialized} />
  </DashboardShell>;
}

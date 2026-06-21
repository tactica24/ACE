import AdminLiveMatchManager, { type AdminLiveMatch } from '@/components/AdminLiveMatchManager';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { VERIFIED_MATCH_CHANNELS } from '@/lib/youtube-match-import';

export const dynamic = 'force-dynamic';

export default async function AdminMatchesPage() {
  await requireAdminUser('/admin/matches');
  const matches = await prisma.liveMatch.findMany({
    orderBy: [{ isPublished: 'asc' }, { kickoffAt: 'desc' }],
    include: { _count: { select: { messages: true } } }
  });
  const serialized = matches.map((match) => ({
    ...match,
    kickoffAt: match.kickoffAt.toISOString(),
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString()
  })) as unknown as AdminLiveMatch[];

  return <DashboardShell
    title="Matches"
    eyebrow="Daily review queue"
    description="Review matches gathered from verified channels. Imports always stay in Draft until you publish them."
    sideNav={<SideNav active="/admin/matches" items={getAdminNavItems()} />}
  >
    <div className="detail-card" style={{ marginBottom: 20 }}>
      <span className="detail-label">Automatic sources</span>
      <strong style={{ fontSize: '1rem' }}>{VERIFIED_MATCH_CHANNELS.map((channel) => channel.label).join(' · ')}</strong>
      <p className="muted" style={{ marginBottom: 0 }}>Vercel checks these verified YouTube channels daily at 6:00 AM West Africa Time. Nothing is published automatically.</p>
    </div>
    <AdminLiveMatchManager initialMatches={serialized} />
  </DashboardShell>;
}

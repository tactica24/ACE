import AdminLiveMatchManager, { type AdminLiveMatch } from '@/components/AdminLiveMatchManager';
import MatchSourceManager, { type AdminMatchSource } from '@/components/MatchSourceManager';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { VERIFIED_MATCH_CHANNELS } from '@/lib/youtube-match-import';

export const dynamic = 'force-dynamic';

export default async function AdminMatchesPage() {
  await requireAdminUser('/admin/matches');
  const [matches, savedSources] = await Promise.all([
    prisma.liveMatch.findMany({ orderBy: [{ isPublished: 'asc' }, { kickoffAt: 'desc' }], include: { _count: { select: { messages: true } } } }),
    prisma.youTubeMatchSource.findMany({ orderBy: { createdAt: 'asc' } })
  ]);
  const serialized = matches.map((match) => ({ ...match, kickoffAt: match.kickoffAt.toISOString(), createdAt: match.createdAt.toISOString(), updatedAt: match.updatedAt.toISOString() })) as unknown as AdminLiveMatch[];
  const sources: AdminMatchSource[] = [
    ...VERIFIED_MATCH_CHANNELS.map((source) => ({ id: `built-in-${source.id}`, channelId: source.id, title: source.label, channelUrl: source.url ?? `https://www.youtube.com/channel/${source.id}`, sport: source.sport, lastCheckedAt: null, builtIn: true })),
    ...savedSources.filter((source) => !VERIFIED_MATCH_CHANNELS.some((builtIn) => builtIn.id === source.channelId)).map((source) => ({ id: source.id, channelId: source.channelId, title: source.title, channelUrl: source.channelUrl, sport: source.sport, lastCheckedAt: source.lastCheckedAt?.toISOString() ?? null }))
  ];

  return <DashboardShell
    title="Matches"
    eyebrow="Daily review queue"
    description="Review matches gathered from approved channels or added from a YouTube link. Imports always stay in Draft until you publish them."
    sideNav={<SideNav active="/admin/matches" items={getAdminNavItems()} />}
  >
    <div className="detail-card" style={{ marginBottom: 20 }}><span className="detail-label">Automatic review window</span><strong style={{ fontSize: '1rem' }}>Hourly · 10:00 AM–9:00 PM WAT</strong><p className="muted" style={{ marginBottom: 0 }}>GitHub Actions checks every approved channel. All discoveries remain drafts until you publish them.</p></div>
    <MatchSourceManager initialSources={sources} />
    <AdminLiveMatchManager initialMatches={serialized} />
  </DashboardShell>;
}

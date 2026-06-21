import Link from 'next/link';
import { ArrowLeft, CalendarClock, MapPin, Radio, ShieldCheck, Trophy } from '@/components/LiveIcons';
import { notFound } from 'next/navigation';
import LiveAdSlot from '@/components/LiveAdSlot';
import LiveMatchChat from '@/components/LiveMatchChat';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatKickoff } from '@/lib/live-matches';

export const dynamic = 'force-dynamic';

export default async function LiveMatchPage({ params }: { params: { slug: string } }) {
  const [match, user] = await Promise.all([
    prisma.liveMatch.findFirst({ where: { slug: params.slug, isPublished: true } }),
    getCurrentUser()
  ]);
  if (!match) notFound();
  const profile = user ? await prisma.liveChatProfile.findUnique({ where: { userId: user.sub }, select: { handle: true, avatarEmoji: true } }) : null;

  return <div className="live-watch-page">
    <div className="container live-watch-container">
      <Link className="live-back-link" href="/live"><ArrowLeft size={16} /> All live matches</Link>
      <div className="live-watch-heading"><div><div className="live-watch-labels"><span className={`live-match-status ${match.status.toLowerCase()}`}>{match.status === 'LIVE' ? <><i /> Live now</> : match.status}</span><span>{match.sport}</span><span>{match.competition}</span></div><h1>{match.homeTeam} <em>vs</em> {match.awayTeam}</h1><p>{match.title}</p></div><div className="live-watch-time"><CalendarClock size={18} /><span>Kickoff</span><strong>{formatKickoff(match.kickoffAt)}</strong></div></div>
      <div className="live-watch-grid">
        <main className="live-player-column">
          <div className="live-embed-shell">
            <div className="live-player-topbar"><span><Radio size={15} /> ACE live room</span><span><ShieldCheck size={15} /> Secure embedded player</span></div>
            <div className="live-embed-frame"><iframe src={match.embedUrl} title={`${match.homeTeam} vs ${match.awayTeam} live player`} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation" /></div>
          </div>
          <LiveAdSlot compact />
          <div className="live-match-detail-card"><div><Trophy size={18} /><span>Competition</span><strong>{match.competition}</strong></div>{match.venue ? <div><MapPin size={18} /><span>Venue</span><strong>{match.venue}</strong></div> : null}<div><CalendarClock size={18} /><span>Match time</span><strong>{formatKickoff(match.kickoffAt)}</strong></div></div>
          {match.description ? <div className="live-match-notes"><h2>Match notes</h2><p>{match.description}</p>{match.sourceLabel ? <span>Stream supplied by {match.sourceLabel}</span> : null}</div> : null}
        </main>
        <LiveMatchChat matchId={match.id} loginPath={`/live/${match.slug}`} isSignedIn={Boolean(user)} initialProfile={profile} enabled={match.chatEnabled} />
      </div>
    </div>
  </div>;
}

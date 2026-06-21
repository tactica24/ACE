import Link from 'next/link';
import { CalendarClock, ChevronRight, MessageCircle, Play, Radio, Trophy } from '@/components/LiveIcons';
import LiveAdSlot from '@/components/LiveAdSlot';
import { prisma } from '@/lib/db';
import { formatKickoff } from '@/lib/live-matches';

export const dynamic = 'force-dynamic';

function MatchCard({ match }: { match: any }) {
  return <Link href={`/live/${match.slug}`} className="live-match-card">
    <div className="live-match-poster" style={match.posterUrl ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(3,5,10,.94)), url(${match.posterUrl})` } : undefined}>
      <span className={`live-match-status ${match.status.toLowerCase()}`}>{match.status === 'LIVE' ? <><i /> Live now</> : match.status}</span>
      <span className="live-match-sport">{match.sport}</span>
      <div className="live-match-versus"><strong>{match.homeTeam}</strong><span>VS</span><strong>{match.awayTeam}</strong></div>
      <span className="live-card-play"><Play size={20} fill="currentColor" /></span>
    </div>
    <div className="live-match-card-copy"><span className="live-competition"><Trophy size={13} /> {match.competition}</span><h3>{match.title}</h3><p><CalendarClock size={14} /> {formatKickoff(match.kickoffAt)}</p><div className="live-card-footer"><span><MessageCircle size={14} /> Match conversation</span><ChevronRight size={18} /></div></div>
  </Link>;
}

export default async function LiveMatchesPage() {
  const matches = await prisma.liveMatch.findMany({ where: { isPublished: true }, orderBy: [{ kickoffAt: 'asc' }], include: { _count: { select: { messages: true } } } });
  const live = matches.filter((match) => match.status === 'LIVE');
  const upcoming = matches.filter((match) => match.status === 'UPCOMING');
  const replays = matches.filter((match) => match.status === 'ENDED');

  return <div className="live-page">
    <section className="live-hero"><div className="container"><div className="live-hero-copy"><span className="live-eyebrow"><Radio size={15} /> The stadium is open</span><h1>Live sport.<br /><em>One loud room.</em></h1><p>Watch the match and share every goal, miss, and wild prediction with the ACE community.</p>{live[0] ? <Link className="btn btn-primary" href={`/live/${live[0].slug}`}><Play size={17} fill="currentColor" /> Watch live now</Link> : <a className="btn btn-ghost" href="#upcoming"><CalendarClock size={17} /> See what&apos;s next</a>}</div><div className="live-hero-scoreboard"><span>ACE LIVE</span><strong>{live.length}</strong><p>{live.length === 1 ? 'match live now' : 'matches live now'}</p><div><i /><i /><i /></div></div></div></section>
    <div className="container live-catalog">
      {live.length ? <section><div className="live-section-title"><div><span className="live-pulse"><i /> On air</span><h2>Live now</h2></div><p>Jump in. The conversation is already moving.</p></div><div className="live-match-grid featured">{live.map((match) => <MatchCard key={match.id} match={match} />)}</div></section> : null}
      <LiveAdSlot />
      <section id="upcoming"><div className="live-section-title"><div><span>Coming up</span><h2>Upcoming matches</h2></div><p>Kickoff times are shown in your local time.</p></div>{upcoming.length ? <div className="live-match-grid">{upcoming.map((match) => <MatchCard key={match.id} match={match} />)}</div> : <div className="live-empty-state"><CalendarClock size={38} /><h3>The next fixtures are being lined up</h3><p>Check back soon for fresh match rooms.</p></div>}</section>
      {replays.length ? <section><div className="live-section-title"><div><span>Full time</span><h2>Recent matches</h2></div></div><div className="live-match-grid">{replays.map((match) => <MatchCard key={match.id} match={match} />)}</div></section> : null}
    </div>
  </div>;
}

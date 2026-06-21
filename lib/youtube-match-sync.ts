import { prisma } from '@/lib/db';
import type { CollectedYouTubeMatch } from '@/lib/youtube-match-import';

export async function saveYouTubeMatchDrafts(matches: CollectedYouTubeMatch[], createdById: string) {
  let created = 0;
  let refreshed = 0;

  for (const match of matches) {
    const existing = await prisma.liveMatch.findUnique({ where: { youtubeVideoId: match.youtubeVideoId }, select: { id: true } });
    if (existing) {
      await prisma.liveMatch.update({
        where: { id: existing.id },
        data: {
          title: match.title,
          sport: match.sport,
          competition: match.competition,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          kickoffAt: match.kickoffAt,
          status: match.status,
          embedUrl: match.embedUrl,
          posterUrl: match.posterUrl,
          description: match.description,
          sourceLabel: match.sourceLabel,
          youtubeChannelId: match.youtubeChannelId
        }
      });
      refreshed += 1;
    } else {
      await prisma.liveMatch.create({ data: { ...match, createdById, isPublished: false, chatEnabled: true } });
      created += 1;
    }
  }

  return { found: matches.length, created, refreshed, published: 0 };
}

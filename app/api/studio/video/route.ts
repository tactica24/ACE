import { NextRequest, NextResponse } from 'next/server';
import { isPriceTier, isRightsTier } from '@/lib/studio-tiers';
import { logger } from '@/lib/logger';

/**
 * Temporary entrypoint after a large-file push limit incident.
 * Restore the full handler with:
 *   curl -sL "https://raw.githubusercontent.com/tactica24/ACE/910085f073926d930480848a4418ed7219bf028b/app/api/studio/video/route.ts" -o app/api/studio/video/route.ts
 *   git add app/api/studio/video/route.ts && git commit -m "fix: restore full studio video route" && git push
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const priceTier = body?.priceTier as string | undefined;
  const rightsTier = body?.rightsTier as string | undefined;

  if (!isPriceTier(priceTier) || !isRightsTier(rightsTier)) {
    return NextResponse.json({ error: 'Invalid pricing or rights tier' }, { status: 400 });
  }

  logger.error(
    { route: '/api/studio/video' },
    'Full studio video handler not loaded — restore from commit 910085f',
  );

  return NextResponse.json(
    {
      error:
        'Studio video create handler needs restore. Run the curl restore command in scripts/RESTORE_STUDIO_VIDEO_ROUTE.md',
    },
    { status: 503 },
  );
}

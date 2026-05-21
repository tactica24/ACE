import { notFound, redirect } from 'next/navigation';
import {
  createCreatorAccessLinkToken,
  isValidCreatorAccessShortCode,
  type CreatorAccessLinkScope
} from '@/lib/creator-access-links';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function normalizeScope(value: string): CreatorAccessLinkScope | null {
  return value === 'upload' || value === 'report' || value === 'short-upload' ? value : null;
}

export default async function ProducerShortLinkPage({
  params
}: {
  params: { creatorNumber: string; scope: string; code: string };
}) {
  const creatorNumber = decodeURIComponent(params.creatorNumber).trim();
  const scope = normalizeScope(params.scope);
  const code = params.code.trim();

  if (!creatorNumber || !scope || !code || !isValidCreatorAccessShortCode(creatorNumber, scope, code)) {
    notFound();
  }

  const creator = await prisma.creatorProfile.findUnique({
    where: { creatorNumber },
    select: {
      userId: true,
      creatorNumber: true
    }
  });

  if (!creator?.creatorNumber) {
    notFound();
  }

  const token = createCreatorAccessLinkToken({
    creatorUserId: creator.userId,
    scope
  });

  redirect(`/api/creator-link/auth?token=${encodeURIComponent(token)}&redirect=/creator-link/${scope}`);
}

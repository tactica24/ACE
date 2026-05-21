import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import ShortUploadForm from '@/components/ShortUploadForm';
import { createCreatorAccessLinkToken, resolveCreatorFromAccessToken } from '@/lib/creator-access-links';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'ace_creator_link';

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreatorShortUploadLinkPage({
  searchParams
}: {
  searchParams?: { token?: string | string[] };
}) {
  const cookieStore = cookies();
  let token = cookieStore.get(COOKIE_NAME)?.value?.trim();

  const queryToken = firstValue(searchParams?.token)?.trim();
  if (queryToken && !token) {
    redirect(`/api/creator-link/auth?token=${encodeURIComponent(queryToken)}&redirect=/creator-link/short-upload`);
  }

  if (!token) {
    notFound();
  }

  const creator = await resolveCreatorFromAccessToken(token, 'short-upload');
  if (!creator) {
    notFound();
  }

  const reportToken = createCreatorAccessLinkToken({
    creatorUserId: creator.id,
    scope: 'report'
  });

  return (
    <div className="section">
      <div className="container">
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ marginTop: 0 }}>Producer upload</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            Signed in as {creator.creator?.displayName ?? creator.name ?? creator.email}
            {creator.creator?.creatorNumber ? ` (${creator.creator.creatorNumber})` : ''}. Upload titles quickly with minimal metadata.
          </p>
        </div>

        <div className="card">
          <ShortUploadForm requestHeaders={{ 'X-Ace-Creator-Link': token }} />
        </div>

      </div>
    </div>
  );
}

import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import DropboxMovieIntakeForm from '@/components/DropboxMovieIntakeForm';
import { createCreatorAccessLinkToken, resolveCreatorFromAccessToken } from '@/lib/creator-access-links';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'ace_creator_link';

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreatorUploadLinkPage({
  searchParams
}: {
  searchParams?: { token?: string | string[] };
}) {
  const cookieStore = cookies();
  let token = cookieStore.get(COOKIE_NAME)?.value?.trim();

  const queryToken = firstValue(searchParams?.token)?.trim();
  if (queryToken && !token) {
    redirect(`/api/creator-link/auth?token=${encodeURIComponent(queryToken)}&redirect=/creator-link/upload`);
  }

  if (!token) {
    notFound();
  }

  const creator = await resolveCreatorFromAccessToken(token, 'upload');
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
          <h1 style={{ marginTop: 0 }}>Create your title</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            Signed in as {creator.creator?.displayName ?? creator.name ?? creator.email}
            {creator.creator?.creatorNumber ? ` (${creator.creator.creatorNumber})` : ''}. Add the movie details, paste the Dropbox source link, and submit.
          </p>
        </div>

        <div className="card">
          <DropboxMovieIntakeForm
            requestHeaders={{ 'X-Ace-Creator-Link': token }}
            contractRedirectBasePath={null}
            successRedirectPath={`/api/creator-link/auth?token=${encodeURIComponent(reportToken)}&redirect=/creator-link/report`}
          />
        </div>
      </div>
    </div>
  );
}

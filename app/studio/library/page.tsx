import Link from 'next/link';
import { headers } from 'next/headers';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import VideoCard from '@/components/VideoCard';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { getRegionalPrice } from '@/lib/pricing';

export default async function LibraryPage() {
  const user = await requireCreatorUser('/studio/library');
  const videos = await prisma.video.findMany({ where: { creatorId: user.sub }, orderBy: { createdAt: 'desc' } });
  const requestHeaders = headers();

  return (
    <DashboardShell
      title="Your library"
      description="Review exactly how each release is stored for moderation and storefront display."
      sideNav={
        <SideNav
          active="/studio/library"
          items={[
            { href: '/studio', label: 'Overview' },
            { href: '/studio/upload', label: 'Upload' },
            { href: '/studio/library', label: 'Library' },
            { href: '/studio/contracts', label: 'Contracts' }
          ]}
        />
      }
      actions={<Link className="btn btn-primary" href="/studio/upload">Upload another title</Link>}
    >
      {videos.length ? (
        <div className="library-grid">
          {videos.map((video) => (
            <div key={video.id} className="card library-card">
              <VideoCard video={{ ...video, price: getRegionalPrice(requestHeaders, video.priceTier) }} />
              <div className="detail-grid">
                <div className="detail-card">
                  <span className="detail-label">Status</span>
                  <strong>{video.status}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Rights</span>
                  <strong>{video.rightsTier}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Uploaded</span>
                  <strong>{video.createdAt.toISOString().slice(0, 10)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <h3>No creator uploads yet</h3>
          <p className="muted">Your releases will appear here after you submit them for moderation.</p>
        </div>
      )}
    </DashboardShell>
  );
}

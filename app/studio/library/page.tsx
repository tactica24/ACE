import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { prisma } from '@/lib/db';
import { getAuthCookie, verifyAuthToken } from '@/lib/auth';
import Link from 'next/link';

export default async function LibraryPage() {
  const token = getAuthCookie();
  const user = token ? (() => {
    try {
      return verifyAuthToken(token);
    } catch {
      return null;
    }
  })() : null;

  const videos = user
    ? await prisma.video.findMany({ where: { creatorId: user.sub }, orderBy: { createdAt: 'desc' } })
    : [];

  return (
    <DashboardShell
      title="Your library"
      description="Track moderation status, pricing, and unlock performance."
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
    >
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Rights</th>
              <th>Type</th>
              <th>Category</th>
              <th>Age</th>
              <th>Price Tier</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id}>
                <td>{video.title}</td>
                <td>{video.status}</td>
                <td>{video.rightsTier}</td>
                <td>{video.videoType}</td>
                <td>{video.category}</td>
                <td>{video.ageRating}</td>
                <td>{video.priceTier}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {videos.length === 0 ? <p className="muted">No uploads yet.</p> : null}
      </div>
      <Link className="btn btn-primary" href="/studio/upload">Upload another</Link>
    </DashboardShell>
  );
}





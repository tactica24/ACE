import Link from 'next/link';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { formatContractDate } from '@/lib/contracts';
import { getStudioNavItems } from '@/lib/studio-nav';

export default async function ContractsPage() {
  const user = await requireCreatorUser('/studio/contracts');
  const creator = await prisma.creatorProfile.findUnique({ where: { userId: user.sub } });
  const contracts = creator
    ? await prisma.contract.findMany({
        where: { creatorId: creator.id },
        orderBy: { createdAt: 'desc' }
      })
    : [];
  const contractVideoIds = Array.from(new Set(contracts.map((contract) => contract.videoId).filter(Boolean)));
  const contractVideos = contractVideoIds.length
    ? await prisma.video.findMany({
        where: { id: { in: contractVideoIds } },
        select: { id: true, title: true }
      })
    : [];
  const videoTitleById = new Map<string, string>(contractVideos.map((video) => [video.id, video.title] as const));

  return (
    <DashboardShell
      title="Producer documents"
      description="Signed distribution records for each uploaded title, stored under your producer profile."
      sideNav={
        <SideNav
          active="/studio/contracts"
          items={getStudioNavItems()}
        />
      }
      actions={
        <div className="action-list">
          <Link className="btn btn-primary" href="/studio/upload">Upload title</Link>
          <Link className="btn btn-ghost" href="/studio/library">Release library</Link>
          <Link className="btn btn-ghost" href="/studio/contact">Support</Link>
        </div>
      }
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="detail-card">
          <span className="detail-label">Stored documents</span>
          <strong>{contracts.length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Signed</span>
          <strong>{contracts.filter((contract) => contract.producerAccepted).length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Awaiting signature</span>
          <strong>{contracts.filter((contract) => !contract.producerAccepted).length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Producer number</span>
          <strong>{creator?.creatorNumber ?? 'Pending'}</strong>
        </div>
      </div>

      <div className="card">
        {contracts.length === 0 ? (
          <p className="muted">No producer documents yet. Upload a title, then sign the agreement that appears after upload.</p>
        ) : (
          <div className="stack-list">
            {contracts.map((contract) => (
              <div key={contract.id} className="detail-card">
                <div className="stack-row">
                  <div>
                    <strong>{videoTitleById.get(contract.videoId) ?? 'Deleted or unavailable title'}</strong>
                    <p className="muted" style={{ margin: '6px 0 0' }}>
                      Producer number: {creator?.creatorNumber ?? 'Pending'} | Rights: {contract.rightsTier}
                    </p>
                    <p className="muted" style={{ margin: '6px 0 0' }}>
                      {contract.producerAccepted
                        ? `Signed by ${contract.producerSignedName ?? 'producer'} on ${formatContractDate(contract.effectiveDate ?? contract.producerSignedAt)}`
                        : 'Awaiting producer signature'}
                    </p>
                  </div>
                  <div className="action-list">
                    {!contract.producerAccepted ? (
                      <Link className="btn btn-ghost" href={`/studio/upload?contractVideoId=${contract.videoId}`}>
                        Finish signing
                      </Link>
                    ) : null}
                    <a className="btn btn-primary" href={`/api/studio/contracts/${contract.id}/download`}>
                      Download document
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

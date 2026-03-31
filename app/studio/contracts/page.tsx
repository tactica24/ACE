import Link from 'next/link';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { formatContractDate } from '@/lib/contracts';

export default async function ContractsPage() {
  const user = await requireCreatorUser('/studio/contracts');
  const creator = await prisma.creatorProfile.findUnique({ where: { userId: user.sub } });
  const contracts = creator
    ? await prisma.contract.findMany({
        where: { creatorId: creator.id },
        orderBy: { createdAt: 'desc' },
        include: {
          video: {
            select: { title: true }
          }
        }
      })
    : [];

  return (
    <DashboardShell
      title="Producer documents"
      description="Signed distribution records for each uploaded title, stored under your producer profile."
      sideNav={
        <SideNav
          active="/studio/contracts"
          items={[
            { href: '/studio', label: 'Overview' },
            { href: '/studio/wallet', label: 'Wallet' },
            { href: '/studio/upload', label: 'Upload' },
            { href: '/studio/library', label: 'Library' },
            { href: '/studio/contracts', label: 'Documents' },
            { href: '/studio/contact', label: 'Contact' }
          ]}
        />
      }
    >
      <div className="card">
        {contracts.length === 0 ? (
          <p className="muted">No producer documents yet. Upload a title, then sign the agreement that appears after upload.</p>
        ) : (
          <div className="stack-list">
            {contracts.map((contract) => (
              <div key={contract.id} className="detail-card">
                <div className="stack-row">
                  <div>
                    <strong>{contract.video.title}</strong>
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

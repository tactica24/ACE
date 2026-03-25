import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export default async function ContractsPage() {
  const user = await requireCreatorUser('/studio/contracts');
  const creator = await prisma.creatorProfile.findUnique({ where: { userId: user.sub } });
  const contracts = creator
    ? await prisma.contract.findMany({ where: { creatorId: creator.id }, orderBy: { createdAt: 'desc' } })
    : [];

  return (
    <DashboardShell
      title="Auto-contracts"
      description="Digital license agreements generated on upload."
      sideNav={
        <SideNav
          active="/studio/contracts"
          items={[
            { href: '/studio', label: 'Overview' },
            { href: '/studio/wallet', label: 'Wallet' },
            { href: '/studio/upload', label: 'Upload' },
            { href: '/studio/library', label: 'Library' },
            { href: '/studio/contracts', label: 'Contracts' },
            { href: '/studio/contact', label: 'Contact' }
          ]}
        />
      }
    >
      <div className="card">
        {contracts.length === 0 ? (
          <p className="muted">No contracts yet. Upload a video to generate a license agreement.</p>
        ) : (
          contracts.map((contract) => (
            <div key={contract.id} style={{ marginBottom: 24 }}>
              <strong>Contract for video {contract.videoId}</strong>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{contract.contractText}</pre>
            </div>
          ))
        )}
      </div>
    </DashboardShell>
  );
}

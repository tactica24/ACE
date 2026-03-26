import { DashboardShell, SideNav } from '@/components/DashboardShell';
import SupportContactForm from '@/components/SupportContactForm';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { creatorSupportCategories, supportCategoryLabels, supportStatusLabels } from '@/lib/support';

export default async function StudioContactPage() {
  const user = await requireCreatorUser('/studio/contact');
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.sub },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return (
    <DashboardShell
      title="Creator contact"
      description="Reach the support team directly for onboarding, upload, contracts, and operational issues."
      sideNav={
        <SideNav
          active="/studio/contact"
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
      <div className="grid">
        <div className="card">
          <SupportContactForm
            categories={creatorSupportCategories}
            title="Contact support"
            description="Raise creator-specific issues so our team can resolve onboarding, upload, or contract blockers quickly."
          />
        </div>
        <div className="card">
          <h3>Recent creator support requests</h3>
          {tickets.length === 0 ? (
            <p className="muted">No creator support requests yet.</p>
          ) : (
            <div className="stack-list">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="stack-row">
                  <div>
                    <strong>{ticket.subject}</strong>
                    <p className="muted">
                      {supportCategoryLabels[ticket.category]} | {supportStatusLabels[ticket.status]}
                    </p>
                  </div>
                  <span className="muted">{ticket.createdAt.toISOString().slice(0, 10)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

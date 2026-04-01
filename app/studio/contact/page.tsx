import { DashboardShell, SideNav } from '@/components/DashboardShell';
import SupportContactForm from '@/components/SupportContactForm';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { creatorSupportCategories, supportCategoryLabels, supportStatusLabels } from '@/lib/support';
import { getStudioNavItems } from '@/lib/studio-nav';

export default async function StudioContactPage() {
  const user = await requireCreatorUser('/studio/contact');
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.sub },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return (
    <DashboardShell
      title="Producer contact"
      description="Reach the support team directly for onboarding, upload, documents, and operational issues."
      sideNav={
        <SideNav
          active="/studio/contact"
          items={getStudioNavItems()}
        />
      }
      actions={
        <div className="action-list">
          <a className="btn btn-primary" href="#contact-form">New support request</a>
          <a className="btn btn-ghost" href="/studio/contracts">Documents</a>
          <a className="btn btn-ghost" href="/studio/library">Library</a>
        </div>
      }
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="detail-card">
          <span className="detail-label">Total tickets</span>
          <strong>{tickets.length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Open</span>
          <strong>{tickets.filter((ticket) => ticket.status === 'OPEN').length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">In progress</span>
          <strong>{tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Resolved</span>
          <strong>{tickets.filter((ticket) => ticket.status === 'RESOLVED').length}</strong>
        </div>
      </div>

      <div className="grid">
        <div className="card" id="contact-form">
          <SupportContactForm
            categories={creatorSupportCategories}
            title="Contact support"
            description="Raise producer-specific issues so our team can resolve onboarding, upload, or document blockers quickly."
          />
        </div>
        <div className="card">
          <h3>Recent producer support requests</h3>
          {tickets.length === 0 ? (
            <p className="muted">No producer support requests yet.</p>
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

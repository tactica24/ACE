import AdminDisclosureSection from '@/components/AdminDisclosureSection';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import AdminSupportInbox, { type AdminSupportTicketRow } from '@/components/AdminSupportInbox';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
  await requireAdminUser('/admin/support');

  const tickets = await prisma.supportTicket.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          signupIntent: true
        }
      }
    }
  });

  const initialTickets: AdminSupportTicketRow[] = tickets.map((ticket) => ({
    id: ticket.id,
    status: ticket.status,
    category: ticket.category,
    subject: ticket.subject,
    message: ticket.message,
    adminNotes: ticket.adminNotes,
    createdAt: ticket.createdAt.toISOString().slice(0, 10),
    user: {
      id: ticket.user.id,
      email: ticket.user.email,
      phone: ticket.user.phone,
      role: ticket.user.role,
      signupIntent: ticket.user.signupIntent
    }
  }));

  return (
    <DashboardShell
      title="Support inbox"
      description="Handle viewer and producer support requests directly from the admin dashboard."
      sideNav={
        <SideNav
          active="/admin/support"
          items={getAdminNavItems({
            creatorRequests: tickets.filter((ticket) => ticket.user.signupIntent === 'CREATOR' && ticket.user.role === 'USER').length,
            openSupport: tickets.filter((ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS').length
          })}
        />
      }
      actions={
        <div className="action-list">
          <a className="btn btn-primary" href="#support-queue">Open queue</a>
          <a className="btn btn-ghost" href="/admin/users">User accounts</a>
          <a className="btn btn-ghost" href="/admin/finance">Payment rescue</a>
        </div>
      }
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="detail-card">
          <span className="detail-label">Open</span>
          <strong>{initialTickets.filter((ticket) => ticket.status === 'OPEN').length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">In progress</span>
          <strong>{initialTickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Resolved</span>
          <strong>{initialTickets.filter((ticket) => ticket.status === 'RESOLVED').length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Producer tickets</span>
          <strong>{initialTickets.filter((ticket) => ticket.user.signupIntent === 'CREATOR').length}</strong>
        </div>
      </div>
      <AdminDisclosureSection
        title="Support queue"
        description="Expand to search, filter, and work through individual support tickets."
        badge="Queue"
        defaultOpen
      >
        <div id="support-queue">
          <AdminSupportInbox initialTickets={initialTickets} />
        </div>
      </AdminDisclosureSection>
    </DashboardShell>
  );
}

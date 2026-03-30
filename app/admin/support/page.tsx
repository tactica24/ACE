import { DashboardShell, SideNav } from '@/components/DashboardShell';
import AdminSupportInbox, { type AdminSupportTicketRow } from '@/components/AdminSupportInbox';
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
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/intake', label: 'Producer intake' },
            { href: '/admin/finance', label: 'Finance' },
            { href: '/admin/moderation', label: 'Moderation' },
            { href: '/admin/support', label: 'Support' },
            { href: '/admin/node', label: 'Infrastructure' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
    >
      <AdminSupportInbox initialTickets={initialTickets} />
    </DashboardShell>
  );
}

import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import SupportContactForm from '@/components/SupportContactForm';
import { supportCategoryLabels, supportStatusLabels, viewerSupportCategories } from '@/lib/support';

export default async function AccountContactPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="section">
        <div className="container">
          <div className="card">
            <h3>Sign in to contact support</h3>
            <Link className="btn btn-primary" href="/auth/login">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.sub },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return (
    <div className="section">
      <div className="container">
        <div className="grid">
          <div className="card">
            <SupportContactForm
              categories={viewerSupportCategories}
              title="Contact support"
              description="Ask for help with payments, catalog access, or account issues directly from your account."
            />
          </div>
          <div className="card">
            <h3>Recent support requests</h3>
            {tickets.length === 0 ? (
              <p className="muted">You have not sent any support requests yet.</p>
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
      </div>
    </div>
  );
}

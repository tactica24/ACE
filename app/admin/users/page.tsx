import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { prisma } from '@/lib/db';

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return (
    <DashboardShell
      title="User Directory"
      description="Manage roles and access across ACE Studio."
      sideNav={
        <SideNav
          active="/admin/users"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/moderation', label: 'Moderation' },
            { href: '/admin/node', label: 'Node Monitor' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
    >
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{user.role}</td>
                <td>{user.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}





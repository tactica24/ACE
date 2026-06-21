export type AdminNavCounts = {
  creatorRequests?: number;
  pendingModeration?: number;
  pendingPublish?: number;
  deletedTitles?: number;
  openSupport?: number;
  pendingPayouts?: number;
};

export function getAdminNavItems(counts: AdminNavCounts = {}) {
  return [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/users', label: 'Users' },
    {
      href: '/admin/intake',
      label: 'Producer intake',
      count: typeof counts.creatorRequests === 'number' ? `${counts.creatorRequests}` : undefined
    },
    {
      href: '/admin/support',
      label: 'Support',
      count: typeof counts.openSupport === 'number' ? `${counts.openSupport}` : undefined
    },
    {
      href: '/admin/moderation',
      label: 'Edit titles',
      count: typeof counts.pendingModeration === 'number' ? `${counts.pendingModeration}` : undefined
    },
    {
      href: '/admin/publish',
      label: 'Publish',
      count: typeof counts.pendingPublish === 'number' ? `${counts.pendingPublish}` : undefined
    },
    {
      href: '/admin/deleted',
      label: 'Deleted',
      count: typeof counts.deletedTitles === 'number' ? `${counts.deletedTitles}` : undefined
    },
    {
      href: '/admin/payments',
      label: 'Payouts',
      count: typeof counts.pendingPayouts === 'number' ? `${counts.pendingPayouts}` : undefined
    },
    { href: '/admin/transactions', label: 'Transactions' },
    { href: '/admin/upload', label: 'Create titles' },
    { href: '/admin/live', label: 'Live matches' },
    { href: '/admin/delivery-health', label: 'Delivery Health' },
    { href: '/admin/finance', label: 'Finance' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/settings', label: 'Controls' },
    { href: '/admin/referrals', label: 'Referrals' },
    { href: '/admin/node', label: 'Infrastructure' }
  ];
}

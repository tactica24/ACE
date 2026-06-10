export type AdminNavCounts = {
  creatorRequests?: number;
  pendingModeration?: number;
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
      label: 'Moderation',
      count: typeof counts.pendingModeration === 'number' ? `${counts.pendingModeration}` : undefined
    },
    {
      href: '/admin/payments',
      label: 'Payments',
      count: typeof counts.pendingPayouts === 'number' ? `${counts.pendingPayouts}` : undefined
    },
    { href: '/admin/upload', label: 'Create titles' },
    { href: '/admin/videos', label: 'Delivery' },
    { href: '/admin/live', label: 'Live movies' },
    { href: '/admin/delivery-health', label: 'Delivery Health' },
    { href: '/admin/finance', label: 'Finance' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/settings', label: 'Controls' },
    { href: '/admin/referrals', label: 'Referrals' },
    { href: '/admin/node', label: 'Infrastructure' }
  ];
}

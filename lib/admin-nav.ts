export type AdminNavCounts = {
  creatorRequests?: number;
  pendingModeration?: number;
  openSupport?: number;
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
    { href: '/admin/finance', label: 'Finance' },
    { href: '/admin/settings', label: 'Controls' },
    { href: '/admin/referrals', label: 'Referrals' },
    { href: '/admin/node', label: 'Infrastructure' }
  ];
}

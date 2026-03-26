'use client';

import SignOutButton from '@/components/SignOutButton';

export default function AccountActions() {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <SignOutButton />
    </div>
  );
}

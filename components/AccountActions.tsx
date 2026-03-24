'use client';

import { signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';

export default function AccountActions() {
  const handleLogout = async () => {
    await signOut(firebaseAuth).catch(() => null);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <button className="btn btn-ghost" onClick={handleLogout}>Sign out</button>
    </div>
  );
}

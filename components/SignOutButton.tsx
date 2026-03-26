'use client';

import { signOut } from 'firebase/auth';
import { getFirebaseAuthClient } from '@/lib/firebase';

export default function SignOutButton({
  className = 'btn btn-ghost',
  label = 'Sign out',
  onClick
}: {
  className?: string;
  label?: string;
  onClick?: () => void;
}) {
  const handleLogout = async () => {
    onClick?.();
    await signOut(getFirebaseAuthClient()).catch(() => null);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  return (
    <button className={className} type="button" onClick={handleLogout}>
      {label}
    </button>
  );
}

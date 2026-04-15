'use client';

import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { getFirebaseAuthClient } from '@/lib/firebase';

async function clearPersistedClientAuthState() {
  if (typeof window === 'undefined') {
    return;
  }

  const removeMatchingKeys = (storage: Storage) => {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (!key) continue;

      if (
        key.startsWith('firebase:') ||
        key.startsWith('ace_') ||
        key.startsWith('ace-')
      ) {
        storage.removeItem(key);
      }
    }
  };

  try {
    removeMatchingKeys(window.localStorage);
  } catch {
    // Ignore local storage cleanup failures.
  }

  try {
    removeMatchingKeys(window.sessionStorage);
  } catch {
    // Ignore session storage cleanup failures.
  }

  try {
    document.cookie = 'ace_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
  } catch {
    // Ignore manual cookie cleanup failures.
  }

  try {
    if ('indexedDB' in window) {
      window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
    }
  } catch {
    // Ignore IndexedDB cleanup failures.
  }
}

export default function SignOutButton({
  className = 'btn btn-ghost',
  label = 'Sign out',
  onClick,
  redirectTo = '/'
}: {
  className?: string;
  label?: string;
  onClick?: () => void;
  redirectTo?: string;
}) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    onClick?.();

    try {
      await signOut(getFirebaseAuthClient()).catch(() => null);

      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(() => null);

      await clearPersistedClientAuthState();
    } finally {
      window.location.replace(redirectTo);
    }
  };

  return (
    <button className={className} type="button" onClick={handleLogout} disabled={isSigningOut}>
      {isSigningOut ? 'Signing out...' : label}
    </button>
  );
}

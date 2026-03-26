'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import SignOutButton from '@/components/SignOutButton';

type UserMenuProps = {
  name: string;
  email: string;
  showCreatorStudio: boolean;
  showCreatorOnboarding: boolean;
};

export default function UserMenu({
  name,
  email,
  showCreatorStudio,
  showCreatorOnboarding
}: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="btn btn-ghost user-menu-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{name}</span>
        <span className={`user-menu-caret${open ? ' open' : ''}`} aria-hidden="true" />
      </button>

      {open ? (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-header">
            <strong>{name}</strong>
            <span className="muted">{email}</span>
          </div>

          <div className="user-menu-links">
            <Link className="user-menu-link" href="/account" onClick={() => setOpen(false)}>
              Account
            </Link>
            <Link className="user-menu-link" href="/wallet" onClick={() => setOpen(false)}>
              Wallet
            </Link>
            <Link className="user-menu-link" href="/account/contact" onClick={() => setOpen(false)}>
              Support
            </Link>
            {showCreatorStudio ? (
              <Link className="user-menu-link" href="/studio" onClick={() => setOpen(false)}>
                Creator studio
              </Link>
            ) : null}
            {showCreatorOnboarding ? (
              <Link className="user-menu-link" href="/studio/onboarding" onClick={() => setOpen(false)}>
                Continue onboarding
              </Link>
            ) : null}
          </div>

          <SignOutButton className="user-menu-signout" onClick={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

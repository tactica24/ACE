'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import SignOutButton from '@/components/SignOutButton';
import { getUiCopy, type UILanguage } from '@/lib/ui-language';
import { type RoleValue } from '@/lib/media-types';

type UserMenuProps = {
  name: string;
  email: string;
  role: RoleValue;
  showCreatorStudio: boolean;
  showCreatorOnboarding: boolean;
  showCreatorStatus: boolean;
  showSupport: boolean;
  language: UILanguage;
};

export default function UserMenu({
  name,
  email,
  role,
  showCreatorStudio,
  showCreatorOnboarding,
  showCreatorStatus,
  showSupport,
  language
}: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const copy = getUiCopy(language);

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
              {copy.account}
            </Link>
            {role === 'USER' ? (
              <Link className="user-menu-link" href="/wallet" onClick={() => setOpen(false)}>
                {copy.wallet}
              </Link>
            ) : null}
            {role === 'ADMIN' ? (
              <Link className="user-menu-link" href="/admin" onClick={() => setOpen(false)}>
                Admin dashboard
              </Link>
            ) : null}
            {showSupport ? (
              <Link className="user-menu-link" href="/account/contact" onClick={() => setOpen(false)}>
                {copy.getSupport}
              </Link>
            ) : null}
            {showCreatorStudio ? (
              <Link className="user-menu-link" href="/studio" onClick={() => setOpen(false)}>
                {copy.creatorStudio}
              </Link>
            ) : null}
            {showCreatorOnboarding ? (
              <Link className="user-menu-link" href="/studio/onboarding" onClick={() => setOpen(false)}>
                {copy.continueOnboarding}
              </Link>
            ) : null}
            {showCreatorStatus ? (
              <Link className="user-menu-link" href="/creator" onClick={() => setOpen(false)}>
                Producer status
              </Link>
            ) : null}
          </div>

          <SignOutButton className="user-menu-signout" label={copy.signOut} onClick={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UserMenu from '@/components/UserMenu';
import { getPrimaryAppPath } from '@/lib/account-routing';
import { UI_LANGUAGE_COOKIE, getUiCopy, normalizeUiLanguage, type UILanguage } from '@/lib/ui-language';
import { type CreatorAccessStatusValue, type RoleValue, type SignupIntentValue } from '@/lib/media-types';

type NavUser = {
  name?: string | null;
  email: string;
  role: RoleValue;
  signupIntent: SignupIntentValue;
  creatorAccessStatus: CreatorAccessStatusValue;
  emailVerified?: boolean;
};

function readLanguageCookie() {
  if (typeof document === 'undefined') {
    return 'en' as UILanguage;
  }

  const cookiePrefix = `${UI_LANGUAGE_COOKIE}=`;
  const cookieValue = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookiePrefix))
    ?.slice(cookiePrefix.length);

  return normalizeUiLanguage(cookieValue);
}

export default function TopNav() {
  const [user, setUser] = useState<NavUser | null>(null);
  const [language, setLanguage] = useState<UILanguage>('en');

  useEffect(() => {
    let cancelled = false;

    setLanguage(readLanguageCookie());

    const syncLanguage = () => {
      if (!cancelled) {
        setLanguage(readLanguageCookie());
      }
    };

    const loadUser = async () => {
      try {
        const response = await fetch('/api/me', {
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { user?: NavUser | null };
        if (!cancelled) {
          setUser(payload.user ?? null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      }
    };

    void loadUser();

    window.addEventListener('focus', syncLanguage);
    document.addEventListener('visibilitychange', syncLanguage);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', syncLanguage);
      document.removeEventListener('visibilitychange', syncLanguage);
    };
  }, []);

  const copy = getUiCopy(language);
  const homeHref = '/';
  const primaryHref = user ? getPrimaryAppPath(user) : '/browse';
  const primaryLabel = user
    ? user.role === 'ADMIN'
      ? 'Admin'
      : user.role === 'CREATOR'
        ? 'Studio'
        : user.signupIntent === 'CREATOR'
          ? 'Producer'
          : copy.browse
    : copy.browse;

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link className="brand" href={homeHref}>
          <span className="brand-mark brand-mark-image">
            <Image src="/ace-studio-mark.svg" alt="Ace Studio" width={38} height={38} priority />
          </span>
          <span>
            <strong>Ace Studio</strong>
          </span>
        </Link>
        <div className="nav-links">
          <Link href={homeHref}>Home</Link>
          <Link href={primaryHref}>{primaryLabel}</Link>
          {user?.role === 'USER' ? <Link href="/wallet">{copy.wallet}</Link> : null}
        </div>
        <div className="nav-actions">
          <LanguageSwitcher language={language} onChange={setLanguage} />
          {user ? (
            <UserMenu
              name={user.name ?? user.email}
              email={user.email}
              role={user.role}
              showCreatorStudio={user.role === 'CREATOR'}
              showCreatorOnboarding={
                user.signupIntent === 'CREATOR' &&
                user.role !== 'CREATOR' &&
                user.creatorAccessStatus === 'REQUESTED' &&
                Boolean(user.emailVerified)
              }
              showCreatorStatus={
                user.signupIntent === 'CREATOR' &&
                user.role !== 'CREATOR' &&
                (!user.emailVerified || user.creatorAccessStatus === 'SUBMITTED')
              }
              showSupport={user.role !== 'ADMIN'}
              language={language}
            />
          ) : (
            <div className="nav-actions-guest">
              <Link className="btn btn-ghost btn-compact nav-action-button" href="/auth/login">{copy.signIn}</Link>
              <Link className="btn btn-primary btn-compact nav-action-button" href="/auth/register">{copy.createAccount}</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

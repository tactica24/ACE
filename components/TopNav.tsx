'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Movies', href: '/browse' },
    ...(user ? [{ label: 'My Movies', href: '/account#my-movies' }] : []),
    { label: 'Series', href: '/browse?type=SERIES' },
    ...(user ? [{ label: 'Android App', href: '/download' }] : []),
    ...(user ? [{ label: copy.account, href: '/account' }] : [])
  ];

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link className="brand brand-premium" href={homeHref} aria-label="ACE Studio home">
          <span className="brand-mark brand-mark-image">
            <Image src="/ace-studio-mark.svg" alt="" width={36} height={36} priority />
          </span>
          <span className="brand-wordmark" aria-hidden="true">
            <span className="brand-wordmark-ace">ACE</span>
            <span className="brand-wordmark-studio">Studio</span>
          </span>
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className={`nav-shell${menuOpen ? ' open' : ''}`}>
          <div className="nav-links nav-links-primary">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : link.href.startsWith('/browse')
                    ? pathname?.startsWith('/browse')
                    : pathname === link.href;

              return (
                <Link key={link.label} className={`nav-link${isActive ? ' active' : ''}`} href={link.href}>
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="nav-actions nav-actions-premium">
            {user ? (
              <>
                <Link className="nav-icon-link" href="/tv" aria-label="Open TV viewing and pairing">
                  TV Pair
                </Link>
                {primaryHref !== '/browse' ? (
                  <Link className="btn btn-ghost btn-compact nav-action-button" href={primaryHref}>
                    {primaryLabel}
                  </Link>
                ) : null}
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
              </>
            ) : (
              <Link className="nav-icon-link nav-signin-link" href="/auth/login">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

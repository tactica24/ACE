'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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
    { label: 'Series', href: '/browse?type=SERIES' },
    { label: 'Android App', href: '/download' },
    { label: 'My List', href: '/#continue-watching' },
    { label: 'Categories', href: '/#categories' }
  ];

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link className="brand" href={homeHref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span className="brand-mark brand-mark-image" style={{ marginBottom: '0' }}>
            <Image src="/ace-studio-mark.svg" alt="Ace Studio" width={38} height={38} priority />
          </span>
          <span style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: '1' }}>
            Ace Studio
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
            <form className="nav-search" action="/browse" method="get">
              <input
                className="nav-search-input"
                type="search"
                name="q"
                placeholder="Search..."
                aria-label="Search the ACE Studio catalog"
                style={{ width: '180px' }}
              />
              <button className="nav-search-button" type="submit">Search</button>
            </form>
            <Link className="nav-icon-link" href="/tv" aria-label="Open TV viewing and pairing">
              TV Pair
            </Link>
            <LanguageSwitcher language={language} onChange={setLanguage} />
            {user ? (
              <>
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
              <div className="nav-actions-guest">
                <Link className="btn btn-ghost btn-compact nav-action-button" href="/auth/login">{copy.signIn}</Link>
                <Link className="btn btn-primary btn-compact nav-action-button" href="/auth/register">Start Streaming</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

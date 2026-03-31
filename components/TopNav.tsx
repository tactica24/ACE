import Image from 'next/image';
import Link from 'next/link';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getCurrentUser } from '@/lib/auth';
import { getPrimaryAppPath } from '@/lib/account-routing';
import { getPreferredUiLanguage } from '@/lib/ui-language-server';
import { getUiCopy } from '@/lib/ui-language';
import UserMenu from '@/components/UserMenu';

export default async function TopNav() {
  const user = await getCurrentUser();
  const language = await getPreferredUiLanguage();
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
          <LanguageSwitcher language={language} />
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

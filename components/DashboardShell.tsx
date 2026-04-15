import Link from 'next/link';
import SignOutButton from '@/components/SignOutButton';

export function SideNav({
  items,
  active
}: {
  items: { href: string; label: string; count?: string }[];
  active: string;
}) {
  return (
    <nav className="side-nav">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`side-link ${active === item.href ? 'active' : ''}`}
        >
          <span>{item.label}</span>
          {item.count ? <span className="badge">{item.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function DashboardShell({
  title,
  eyebrow,
  description,
  actions,
  showSignOut = true,
  sideNav,
  children
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
  showSignOut?: boolean;
  sideNav: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="section">
      <div className="container">
        <div className="dashboard-header">
          <div>
            {eyebrow ? <div className="pill">{eyebrow}</div> : null}
            <h1 className="hero-title dashboard-title">{title}</h1>
            {description ? <p className="muted dashboard-subtitle">{description}</p> : null}
          </div>
          {actions || showSignOut ? (
            <div className="dashboard-links">
              {actions}
              {showSignOut ? <SignOutButton className="btn btn-ghost" /> : null}
            </div>
          ) : null}
        </div>
        <div className="dashboard">
          {sideNav}
          <div className="dashboard-main">{children}</div>
        </div>
      </div>
    </div>
  );
}

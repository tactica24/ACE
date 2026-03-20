import Link from 'next/link';

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
  description,
  sideNav,
  children
}: {
  title: string;
  description?: string;
  sideNav: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="section">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <div className="pill">Ace Studio</div>
            <h1 className="hero-title dashboard-title">{title}</h1>
            {description ? <p className="muted dashboard-subtitle">{description}</p> : null}
          </div>
          <div className="dashboard-links">
            <Link className="btn btn-ghost" href="/admin">Admin</Link>
            <Link className="btn btn-primary" href="/creator">Creator</Link>
          </div>
        </div>
        <div className="dashboard">
          {sideNav}
          <div style={{ display: 'grid', gap: 20 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

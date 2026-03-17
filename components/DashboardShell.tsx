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
  description: string;
  sideNav: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="section">
      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <div className="pill">Ace Studio</div>
          <h1 className="hero-title" style={{ margin: '12px 0 4px' }}>{title}</h1>
          <p className="muted">{description}</p>
        </div>
        <div className="dashboard">
          {sideNav}
          <div style={{ display: 'grid', gap: 20 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}




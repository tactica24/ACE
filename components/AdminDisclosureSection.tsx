export default function AdminDisclosureSection({
  title,
  description,
  badge,
  defaultOpen = false,
  children
}: {
  title: string;
  description?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="admin-disclosure" open={defaultOpen}>
      <summary className="admin-disclosure-summary">
        <div className="admin-disclosure-copy">
          {badge ? <span className="badge">{badge}</span> : null}
          <div>
            <strong>{title}</strong>
            {description ? <p className="muted">{description}</p> : null}
          </div>
        </div>
        <span className="admin-disclosure-toggle">Open section</span>
      </summary>
      <div className="admin-disclosure-body">{children}</div>
    </details>
  );
}

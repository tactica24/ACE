export default function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card card-soft stat">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
      {hint ? <span className="muted" style={{ fontSize: '0.85rem' }}>{hint}</span> : null}
    </div>
  );
}




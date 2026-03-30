import { getInfrastructureSnapshot } from '@/lib/infrastructure';

function getStatusClass(status: 'READY' | 'ACTION' | 'OPTIONAL' | 'ERROR') {
  if (status === 'READY') return 'status-chip status-live';
  return 'status-chip status-review';
}

export default async function InfrastructureReadiness() {
  const snapshot = await getInfrastructureSnapshot();

  return (
    <div className="card">
      <div className="stack-row">
        <div>
          <h3>Infrastructure readiness</h3>
          <p className="muted">
            This confirms the producer upload, admin approval, homepage publishing, and playback path for your current setup.
          </p>
        </div>
        <div className="detail-badges">
          <span className="badge">{snapshot.creatorAccounts} creators</span>
          <span className="badge">{snapshot.pendingModeration} pending review</span>
          <span className="badge">{snapshot.approvedVideos} approved titles</span>
        </div>
      </div>

      <div className="detail-grid">
        {snapshot.checks.map((check) => (
          <div key={check.id} className="detail-card">
            <div className="stack-row">
              <span className="detail-label">{check.label}</span>
              <span className={getStatusClass(check.status)}>{check.status}</span>
            </div>
            <strong>{check.summary}</strong>
            {check.detail ? <p className="muted">{check.detail}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

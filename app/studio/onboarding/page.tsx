import CreatorApply from '@/components/CreatorApply';

export default function StudioOnboardingPage() {
  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="pill">Creator onboarding</div>
        <h1 className="hero-title" style={{ marginTop: 12 }}>Create your studio profile</h1>
        <p className="muted">Complete the profile used for creator verification, payout review, and catalog attribution.</p>
        <CreatorApply />
      </div>
    </div>
  );
}

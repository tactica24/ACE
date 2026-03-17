import CreatorApply from '@/components/CreatorApply';

export default function StudioOnboardingPage() {
  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="pill">Ace Studio Onboarding</div>
        <h1 className="hero-title" style={{ marginTop: 12 }}>Create your studio profile</h1>
        <p className="muted">Unlock creator uploads, analytics, and auto-contracts.</p>
        <CreatorApply />
      </div>
    </div>
  );
}





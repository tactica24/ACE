import CreatorApply from '@/components/CreatorApply';
import { requireCreatorOnboardingAccess } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export default async function StudioOnboardingPage() {
  const user = await requireCreatorOnboardingAccess('/studio/onboarding');
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.sub },
    select: {
      address: true,
      idCardNumber: true,
      idCardUrl: true,
      bankName: true,
      bankAccountNumber: true
    }
  });

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="pill">Creator onboarding</div>
        <h1 className="hero-title" style={{ marginTop: 12 }}>Create your studio profile</h1>
        <p className="muted">Complete this profile once. After submission, admin reviews it and unlocks your creator studio.</p>
        <CreatorApply
          lockedName={user.name ?? ''}
          initialProfile={{
            address: profile?.address ?? '',
            idCardNumber: profile?.idCardNumber ?? '',
            idCardUrl: profile?.idCardUrl ?? '',
            bankName: profile?.bankName ?? '',
            bankAccountNumber: profile?.bankAccountNumber ?? ''
          }}
        />
      </div>
    </div>
  );
}

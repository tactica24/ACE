import 'server-only';

import { redirect } from 'next/navigation';
import { getCurrentUser } from './auth';

export async function requireCurrentUser(nextPath = '/browse') {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

export async function requireCreatorUser(nextPath = '/studio') {
  const user = await requireCurrentUser(nextPath);
  if (user.role !== 'CREATOR' && user.role !== 'ADMIN') {
    redirect('/studio/onboarding');
  }
  return user;
}

export async function requireCreatorOnboardingAccess(nextPath = '/studio/onboarding') {
  const user = await requireCurrentUser(nextPath);

  if (
    user.role !== 'CREATOR' &&
    user.role !== 'ADMIN' &&
    !(user.signupIntent === 'CREATOR' && (user.creatorAccessStatus === 'INVITED' || user.creatorAccessStatus === 'SUBMITTED'))
  ) {
    redirect('/account');
  }

  return user;
}

export async function requireAdminUser(nextPath = '/admin') {
  const user = await requireCurrentUser(nextPath);
  if (user.role !== 'ADMIN') {
    redirect('/');
  }
  return user;
}

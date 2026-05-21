import { type AuthTokenPayload } from '@/lib/auth';
import { prisma } from '@/lib/db';

export type MobileViewerAccessState = {
  hasAccess: boolean;
  status: 'ACTIVE' | 'NO_ACCESS' | 'SIGN_IN_REQUIRED';
  message: string;
};

export async function getMobileViewerAccessState(
  auth: Pick<AuthTokenPayload, 'sub' | 'role'> | null | undefined,
  title: { id: string; creatorId: string }
): Promise<MobileViewerAccessState> {
  if (!auth) {
    return {
      hasAccess: false,
      status: 'SIGN_IN_REQUIRED',
      message: 'Please sign in with an account that has access.'
    };
  }

  if (auth.role === 'ADMIN' || auth.sub === title.creatorId) {
    return {
      hasAccess: true,
      status: 'ACTIVE',
      message: 'Active access is available for this account.'
    };
  }

  const unlock = await prisma.unlock.findFirst({
    where: {
      userId: auth.sub,
      videoId: title.id
    },
    select: {
      id: true
    }
  });

  if (unlock) {
    return {
      hasAccess: true,
      status: 'ACTIVE',
      message: 'Active access is available for this account.'
    };
  }

  return {
    hasAccess: false,
    status: 'NO_ACCESS',
    message: 'You do not currently have access to this title.'
  };
}

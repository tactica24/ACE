import { type CreatorAccessStatusValue, type RoleValue, type SignupIntentValue } from '@/lib/media-types';

type UserRoutingState = {
  role: RoleValue;
  signupIntent: SignupIntentValue;
  creatorAccessStatus: CreatorAccessStatusValue;
};

function isSafeNextPath(nextPath?: string | null) {
  return Boolean(nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//'));
}

export function getPrimaryAppPath(user: UserRoutingState) {
  if (user.role === 'ADMIN') {
    return '/admin';
  }

  if (user.role === 'CREATOR') {
    return '/studio';
  }

  if (user.signupIntent === 'CREATOR') {
    return '/creator';
  }

  return '/browse';
}

export function getPostLoginPath(user: UserRoutingState, nextPath?: string | null) {
  if (user.role === 'ADMIN') {
    return isSafeNextPath(nextPath) && nextPath?.startsWith('/admin') ? nextPath : '/admin';
  }

  if (user.role === 'CREATOR') {
    return isSafeNextPath(nextPath) && nextPath?.startsWith('/studio') ? nextPath : '/studio';
  }

  if (user.signupIntent === 'CREATOR') {
    return isSafeNextPath(nextPath) && nextPath?.startsWith('/creator') ? nextPath : '/creator';
  }

  if (isSafeNextPath(nextPath)) {
    return nextPath as string;
  }

  return getPrimaryAppPath(user);
}

export function getPostRegisterPath(user: UserRoutingState) {
  if (user.signupIntent === 'VIEWER') {
    return '/browse?verification=sent';
  }

  if (user.role === 'ADMIN') {
    return '/admin';
  }

  if (user.role === 'CREATOR') {
    return '/studio';
  }

  if (user.signupIntent === 'CREATOR') {
    return '/creator?verification=sent';
  }

  return '/browse?verification=sent';
}

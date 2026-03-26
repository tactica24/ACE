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

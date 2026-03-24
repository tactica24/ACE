import { firebaseAuth } from '@/lib/firebase';

export type MobileUser = {
  uid: string;
  email: string;
};

export function getMobileUser(): MobileUser | null {
  const user = firebaseAuth.currentUser;
  if (!user?.email) return null;

  return {
    uid: user.uid,
    email: user.email
  };
}

export async function signOutMobileUser() {
  await firebaseAuth.signOut();
}

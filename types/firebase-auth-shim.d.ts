declare module 'firebase/auth' {
  export type User = {
    uid?: string;
    email?: string | null;
    emailVerified: boolean;
    displayName?: string | null;
    getIdToken(forceRefresh?: boolean): Promise<string>;
    reload(): Promise<void>;
  };

  export type UserCredential = {
    user: User;
  };

  export type ActionCodeSettings = {
    url?: string;
    handleCodeInApp?: boolean;
  };

  export type Auth = {
    currentUser: User | null;
  };

  export function getAuth(app?: unknown): Auth;
  export function onAuthStateChanged(
    auth: Auth,
    nextOrObserver: (user: User | null) => void
  ): () => void;
  export function reload(user: User): Promise<void>;
  export function sendEmailVerification(
    user: User,
    actionCodeSettings?: ActionCodeSettings
  ): Promise<void>;
  export function signInWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string
  ): Promise<UserCredential>;
  export function createUserWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string
  ): Promise<UserCredential>;
  export function updateProfile(
    user: User,
    profile: { displayName?: string | null; photoURL?: string | null }
  ): Promise<void>;
  export function deleteUser(user: User): Promise<void>;
  export function signOut(auth: Auth): Promise<void>;
  export function signInWithCustomToken(auth: Auth, customToken: string): Promise<UserCredential>;
}

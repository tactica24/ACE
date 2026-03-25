'use client';

import { FirebaseError, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const firebaseConfig = {
  apiKey: firebaseEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: firebaseEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: firebaseEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined
};

export function getMissingFirebaseClientEnvKeys() {
  return Object.entries(firebaseEnv)
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);
}

export function getFirebaseClientConfigErrorMessage() {
  const missing = getMissingFirebaseClientEnvKeys();
  if (missing.length === 0) return null;

  return `Firebase web config is missing: ${missing.join(', ')}. Add these values to .env.local or your deployment environment variables.`;
}

function getFirebaseApp() {
  const errorMessage = getFirebaseClientConfigErrorMessage();
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuthClient() {
  return getAuth(getFirebaseApp());
}

export function toFirebaseAuthErrorMessage(error: unknown, fallback: string) {
  const configMessage = getFirebaseClientConfigErrorMessage();
  if (configMessage) return configMessage;

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/api-key-not-valid':
      case 'auth/app-not-authorized':
      case 'auth/invalid-api-key':
        return 'Firebase web auth is misconfigured. Check your NEXT_PUBLIC_FIREBASE_* keys and authorized domains.';
      case 'auth/operation-not-allowed':
        return 'Email/password sign-in is not enabled in Firebase Authentication. Enable the Email/Password provider in Firebase Console.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized in Firebase Authentication. Add your Vercel domain in Firebase Console -> Authentication -> Settings -> Authorized domains.';
      case 'auth/project-not-found':
        return 'The configured Firebase project could not be found. Check that your NEXT_PUBLIC_FIREBASE_* values point to the correct Firebase project.';
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'The email or password is incorrect.';
      case 'auth/email-already-in-use':
        return 'That email address is already in use.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/missing-password':
        return 'Enter your password.';
      case 'auth/weak-password':
        return 'Choose a stronger password with at least 6 characters.';
      case 'auth/network-request-failed':
        return 'The auth request could not reach Firebase. Check your internet connection and Firebase project settings.';
      case 'auth/too-many-requests':
        return 'Too many attempts were made. Please wait a moment and try again.';
      default:
        return error.message || fallback;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

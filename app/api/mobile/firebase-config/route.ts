import { NextResponse } from 'next/server';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ?? ''
};

export async function GET() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    return NextResponse.json(
      {
        error: 'Firebase mobile config is not available.',
        missing
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { firebase: firebaseConfig },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
      }
    }
  );
}

import { NextResponse } from 'next/server';
import { getConfiguredRelayTargets } from '@/lib/relay';
import { getMissingProductionEnvKeys } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const missingEnv = getMissingProductionEnvKeys();
  const relayTargets = missingEnv.length ? [] : getConfiguredRelayTargets();
  return NextResponse.json(
    {
      ok: missingEnv.length === 0,
      deliveryMode: relayTargets.length ? 'bunny-cdn+relay' : 'bunny-cdn',
      missingEnv,
      timestamp: new Date().toISOString()
    },
    {
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  );
}

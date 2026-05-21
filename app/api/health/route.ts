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
      deliveryMode: relayTargets.length ? 'relay' : 'direct-app',
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

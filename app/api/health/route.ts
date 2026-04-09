import { NextResponse } from 'next/server';
import { getConfiguredRelayTargets } from '@/lib/relay';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      deliveryMode: getConfiguredRelayTargets().length ? 'relay' : 'direct-app',
      timestamp: new Date().toISOString()
    },
    {
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getReconciliationSummary, reconcilePendingCommerce } from '@/lib/reconciliation';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = await getReconciliationSummary();
  return NextResponse.json({ ok: true, summary });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summaryBefore = await getReconciliationSummary();
  const result = await reconcilePendingCommerce();
  const summaryAfter = await getReconciliationSummary();

  return NextResponse.json({
    ok: true,
    summaryBefore,
    summaryAfter,
    result
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createStoredReportStatement,
  updateStoredReportStatementStatus
} from '@/lib/admin-reports';
import { getAuthFromRequest } from '@/lib/auth';

const createSchema = z.object({
  monthKey: z.string().optional(),
  selectedVideoIds: z.array(z.string()).min(1),
  notes: z.string().optional()
});

const updateSchema = z.object({
  statementId: z.string().min(1),
  status: z.enum(['DRAFT', 'REVIEWED', 'APPROVED', 'ISSUED', 'PAID', 'SUPERSEDED']),
  notes: z.string().optional()
});

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await req.json());
    const result = await createStoredReportStatement({
      monthKey: body.monthKey,
      selectedVideoIds: body.selectedVideoIds,
      preparedBy: auth.email,
      notes: body.notes
    });

    return NextResponse.json({
      ok: true,
      statementId: result.statement.id,
      reportCode: result.statement.reportCode
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to save report statement.' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = updateSchema.parse(await req.json());
    const statement = await updateStoredReportStatementStatus({
      statementId: body.statementId,
      status: body.status,
      actor: auth.email,
      notes: body.notes
    });

    return NextResponse.json({
      ok: true,
      statementId: statement.id,
      status: statement.status
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update report statement status.' },
      { status: 400 }
    );
  }
}

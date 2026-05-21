import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { isSupportTicketStatus } from '@/lib/support';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const ticketId = typeof body.ticketId === 'string' ? body.ticketId : '';
  const status = typeof body.status === 'string' ? body.status : '';
  const adminNotes = typeof body.adminNotes === 'string' ? body.adminNotes.trim() : '';

  if (!ticketId || !isSupportTicketStatus(status)) {
    return NextResponse.json({ error: 'Invalid support ticket update.' }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status,
      adminNotes: adminNotes || null
    },
    select: {
      id: true,
      status: true,
      adminNotes: true
    }
  });

  return NextResponse.json({ ok: true, ticket });
}

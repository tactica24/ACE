import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { isSupportTicketCategory } from '@/lib/support';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const category = typeof body.category === 'string' ? body.category : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!isSupportTicketCategory(category)) {
    return NextResponse.json({ error: 'Invalid support category.' }, { status: 400 });
  }

  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: auth.sub,
      category,
      subject,
      message
    },
    select: { id: true, status: true }
  });

  return NextResponse.json({ ok: true, ticket });
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    {
      error:
        'Legacy master attachment is retired. Use the Bunny upload desk on /admin/upload to send poster, trailer, movie, and subtitles through the active pipeline.'
    },
    { status: 410 }
  );
}

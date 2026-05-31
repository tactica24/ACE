import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Multipart uploads are disabled because ACE Studio now uses Bunny Storage. Prepare uploads with /api/uploads/sign and send the file to the returned Bunny upload URL.'
    },
    { status: 410 }
  );
}

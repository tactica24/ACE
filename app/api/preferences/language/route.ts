import { NextRequest, NextResponse } from 'next/server';
import { normalizeUiLanguage, UI_LANGUAGE_COOKIE } from '@/lib/ui-language';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const language = normalizeUiLanguage(typeof body?.language === 'string' ? body.language : undefined);
  const response = NextResponse.json({ ok: true, language });
  response.cookies.set(UI_LANGUAGE_COOKIE, language, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  });
  return response;
}

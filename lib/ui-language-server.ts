import { cookies } from 'next/headers';
import { normalizeUiLanguage, UI_LANGUAGE_COOKIE } from '@/lib/ui-language';

export async function getPreferredUiLanguage() {
  const cookieStore = await cookies();
  return normalizeUiLanguage(cookieStore.get(UI_LANGUAGE_COOKIE)?.value);
}

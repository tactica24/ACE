'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UI_LANGUAGE_OPTIONS, getUiCopy, type UILanguage } from '@/lib/ui-language';

export default function LanguageSwitcher({
  language,
  onChange
}: {
  language: UILanguage;
  onChange?: (language: UILanguage) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const copy = getUiCopy(language);

  const changeLanguage = async (nextLanguage: string) => {
    await fetch('/api/preferences/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: nextLanguage })
    });

    onChange?.(nextLanguage as UILanguage);

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <label className="language-switcher language-switcher-nav" aria-label={copy.uiLanguage}>
      <select
        className="language-switcher-select language-switcher-select-compact"
        value={language}
        onChange={(event) => {
          void changeLanguage(event.target.value);
        }}
        disabled={isPending}
      >
        {UI_LANGUAGE_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}

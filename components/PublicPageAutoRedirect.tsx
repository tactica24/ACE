'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPrimaryAppPath } from '@/lib/account-routing';
import { type CreatorAccessStatusValue, type RoleValue, type SignupIntentValue } from '@/lib/media-types';

type RedirectUser = {
  role: RoleValue;
  signupIntent: SignupIntentValue;
  creatorAccessStatus: CreatorAccessStatusValue;
};

export default function PublicPageAutoRedirect({
  allowedPath = '/browse'
}: {
  allowedPath?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const response = await fetch('/api/me', {
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { user?: RedirectUser | null };
        if (!payload.user || cancelled) {
          return;
        }

        const nextPath = getPrimaryAppPath(payload.user);
        if (nextPath !== allowedPath) {
          router.replace(nextPath);
        }
      } catch {
        // Keep the public page visible if the auth probe fails.
      }
    };

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [allowedPath, router]);

  return null;
}

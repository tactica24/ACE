'use client';

import { useEffect } from 'react';

export default function PwaRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    let cancelled = false;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      } catch {
        // Ignore registration failures and keep the web app usable.
      }
    };

    void registerServiceWorker();

    const refreshRegistration = () => {
      void navigator.serviceWorker.ready
        .then((registration) => {
          if (!cancelled) {
            return registration.update();
          }

          return undefined;
        })
        .catch(() => undefined);
    };

    window.addEventListener('online', refreshRegistration);

    return () => {
      cancelled = true;
      window.removeEventListener('online', refreshRegistration);
    };
  }, []);

  return null;
}

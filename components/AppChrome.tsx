'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';
import PwaRegistrar from '@/components/PwaRegistrar';
import TopNav from '@/components/TopNav';

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hidePublicShell = pathname?.startsWith('/admin') || pathname?.startsWith('/studio');

  return (
    <>
      <PwaRegistrar />
      <div className="app-shell">
        {!hidePublicShell ? <TopNav /> : null}
        <main style={{ flex: 1 }}>{children}</main>
        {!hidePublicShell ? <Footer /> : null}
      </div>
    </>
  );
}

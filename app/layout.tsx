import './globals.css';
import type { Metadata, Viewport } from 'next';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import PwaRegistrar from '@/components/PwaRegistrar';

export const metadata: Metadata = {
  title: 'Ace Studio',
  description: 'African Content Economy marketplace for creators.',
  applicationName: 'Ace Studio',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon',
    apple: '/apple-icon'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ace Studio'
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#070b18'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaRegistrar />
        <div className="app-shell">
          <TopNav />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

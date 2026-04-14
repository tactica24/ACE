import './globals.css';
import type { Metadata, Viewport } from 'next';
import AppChrome from '@/components/AppChrome';

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
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}

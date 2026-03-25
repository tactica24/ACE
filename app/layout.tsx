import './globals.css';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { getPreferredUiLanguage } from '@/lib/ui-language-server';

export const metadata = {
  title: 'Ace Studio',
  description: 'African Content Economy marketplace for creators.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.svg'
  }
};

export const viewport = {
  themeColor: '#070b18'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const language = await getPreferredUiLanguage();

  return (
    <html lang={language}>
      <body>
        <div className="app-shell">
          <TopNav />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

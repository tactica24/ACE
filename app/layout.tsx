import './globals.css';
import { Space_Grotesk, Sora } from 'next/font/google';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', display: 'swap' });
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' });

export const metadata = {
  title: 'ACE Studio',
  description: 'African Content Economy marketplace for creators.',
  icons: {
    icon: '/favicon.svg'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${space.variable} ${sora.variable}`}>
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





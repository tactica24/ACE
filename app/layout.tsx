import './globals.css';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Ace Studio',
  description: 'African Content Economy marketplace for creators.',
  icons: {
    icon: '/favicon.svg'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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

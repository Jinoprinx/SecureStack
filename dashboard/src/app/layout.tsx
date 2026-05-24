import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'SecureStack — AWS Security Compliance Engine',
  description: 'Self-healing security dashboard for AWS Cloud Environments.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="layout-wrapper">
          <Sidebar />
          <main className="content-container">
            <Header />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SCG - Free Cloud Shell | Powered by Magic',
  description: 'Access your cloud shell instantly. Free, fast, and powered by magic.',
  keywords: ['cloud shell', 'terminal', 'development', 'SCG'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


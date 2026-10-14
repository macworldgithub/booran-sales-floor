import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Booran Motors · Sales Floor & Inventory OS',
  description: 'Enterprise Sales Floor & Inventory Tracking Operating System for Booran Motors Group.',
  keywords: ['Booran Motors', 'Sales Floor', 'Inventory Tracker', 'CRM', 'Cheltenham', 'South Morang', 'Cranbourne', 'Berwick'],
  authors: [{ name: 'Booran Motors Group' }],
  icons: {
    icon: '/images/official-byd-melbourne-cbd-lockup.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#171b22',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

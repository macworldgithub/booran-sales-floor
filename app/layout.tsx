import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';
import ServiceWorkerRegistrar from '@/components/pwa/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'Booran Motors · Sales Floor & Inventory OS',
  description: 'Enterprise Sales Floor & Inventory Tracking Operating System for Booran Motors Group — Cheltenham, South Morang, Cranbourne & Berwick.',
  keywords: ['Booran Motors', 'Sales Floor', 'Inventory Tracker', 'CRM', 'Cheltenham', 'South Morang', 'Cranbourne', 'Berwick'],
  authors: [{ name: 'Booran Motors Group' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Booran Floor',
    startupImage: [
      {
        url: '/images/booran-splash-screen.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/images/booran-favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/images/booran-favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/booran-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/images/booran-apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#171b22',
    'msapplication-TileImage': '/images/booran-icon-144.png',
    'msapplication-config': 'none',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#171b22' },
    { media: '(prefers-color-scheme: light)', color: '#171b22' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegistrar />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}

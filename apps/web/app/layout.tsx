import type { Metadata } from 'next';
import './globals.css';

// Observability: Sentry init stub. @sentry/nextjs is configured via
// sentry.client.config.ts / sentry.server.config.ts using SENTRY_DSN.

export const metadata: Metadata = {
  title: 'Simple-POS',
  description: 'Sistem Point of Sale untuk toko ritel kecil',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

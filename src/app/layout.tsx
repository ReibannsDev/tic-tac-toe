import type { Metadata } from 'next';
import { Caveat, Patrick_Hand } from 'next/font/google';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';
import './globals.css';

const patrickHand = Patrick_Hand({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-hand',
});

const caveat = Caveat({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-hand-display',
});

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

const title = 'Paper Tic-Tac-Toe';
const description =
  'A dotted notebook paper tic-tac-toe experience, zoom-to-center play, and live score tracking.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: { title, description, type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-theme is set by the boot script before React hydrates
    <html lang="en" className={`${patrickHand.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="font-[family-name:var(--font-hand)] antialiased selection:bg-ink-x/15">
        {children}
      </body>
    </html>
  );
}

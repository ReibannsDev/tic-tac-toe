import type { Metadata } from 'next';
import { Caveat, Patrick_Hand } from 'next/font/google';
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

const title = 'Paper Tic-Tac-Toe — 35 Hand-Drawn Grids';
const description =
  'A dotted notebook paper tic-tac-toe experience with 35 hand-drawn grids, zoom-to-center play, and live score tracking.';

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
    <html lang="en" className={`${patrickHand.variable} ${caveat.variable}`}>
      <body className="font-[family-name:var(--font-hand)] antialiased selection:bg-[#1c2b4a]/15">
        {children}
      </body>
    </html>
  );
}

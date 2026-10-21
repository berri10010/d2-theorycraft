import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './light-accents.css';
import { ServiceWorkerRegistration } from '../components/ServiceWorkerRegistration';
import { ThemeProvider } from '../components/ui/ThemeProvider';
import { ResizeGuard } from '../components/ui/ResizeGuard';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'D2 Theorycraft',
  description: 'Destiny 2 weapon roll theorycrafting tool — browse perks, simulate stats, and share builds.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'D2 Theorycraft',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

// Sets data-theme for an explicit choice and data-resolved (what is actually shown, "system" included) before first paint.
const THEME_BOOT = `try{var d=document.documentElement,t=JSON.parse(localStorage.getItem('site-settings')||'{}').state;t=t&&t.theme;if(t==='light'||t==='dark')d.setAttribute('data-theme',t);d.setAttribute('data-resolved',t==='light'||t==='dark'?t:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'))}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply a saved light/dark choice before first paint (avoids a flash). "system" needs no attribute. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider />
        <ResizeGuard />
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}

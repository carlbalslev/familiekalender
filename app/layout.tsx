import type { Metadata, Viewport } from 'next';
import './style.css';
export const metadata: Metadata = { title: 'Ude & Hjemme', description: 'Carl og Hildas fælles kalender', manifest: '/manifest.webmanifest', appleWebApp: { capable: true, title: 'Ude & Hjemme', statusBarStyle: 'default' }, icons: { apple: '/icon-180.png' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f6f7f5', viewportFit: 'cover' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="da"><body>{children}</body></html>; }

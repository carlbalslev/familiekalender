import type { Metadata, Viewport } from 'next';
import './style.css';
export const metadata: Metadata = { title: 'Ude & Hjemme', description: 'Carl og Hildas fælles kalender', manifest: '/manifest.webmanifest', appleWebApp: { capable: true, title: 'Ude & Hjemme', statusBarStyle: 'default' }, icons: { apple: '/icon-180.png' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f6f7f5', viewportFit: 'cover' };
const themeInit = `(function(){var mode='system';try{var saved=localStorage.getItem('ude-hjemme-theme');if(saved==='light'||saved==='dark')mode=saved;}catch(e){}var dark=mode==='dark'||(mode==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';})();`;
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="da" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head><body>{children}</body></html>; }

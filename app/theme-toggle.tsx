'use client';

import { useEffect, useState } from 'react';

type ThemeMode = 'system' | 'light' | 'dark';
const modes: ThemeMode[] = ['system', 'light', 'dark'];
const labels: Record<ThemeMode, string> = { system: 'System', light: 'Lys', dark: 'Mørk' };
const storageKey = 'ude-hjemme-theme';
const validMode = (value: string | null): ThemeMode => modes.includes(value as ThemeMode) ? value as ThemeMode : 'system';

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setMode(validMode(localStorage.getItem(storageKey))); } catch { /* System works without browser storage. */ }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setMode(validMode(event.newValue));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && system.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141b18' : '#f6f7f5');
    };
    apply();
    system.addEventListener('change', apply);
    return () => system.removeEventListener('change', apply);
  }, [mode, ready]);

  const next = modes[(modes.indexOf(mode) + 1) % modes.length];
  function cycle() {
    setMode(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Keep the current-session choice. */ }
  }

  return <button type="button" className="theme-toggle" disabled={!ready} onClick={cycle}
    aria-label={`Tema: ${labels[mode]}. Skift til ${labels[next]}`} title={`Skift tema: System → Lys → Mørk`}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {mode === 'system' ? <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>
        : mode === 'light' ? <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></>
        : <path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z"/>}
    </svg><span>{labels[mode]}</span>
  </button>;
}

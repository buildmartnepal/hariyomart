'use client';
import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

const themes = ['system', 'light', 'dark'] as const;
type ThemeMode = (typeof themes)[number];

function applyTheme(mode: ThemeMode) {
  const dark =
    mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.themeMode = mode;
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeMode>('system');
  useEffect(() => {
    const stored = localStorage.getItem('hariyo-theme');
    const next = themes.includes(stored as ThemeMode) ? (stored as ThemeMode) : 'system';
    setTheme(next);
    applyTheme(next);
    const media = matchMedia('(prefers-color-scheme: dark)');
    const syncSystem = () =>
      document.documentElement.dataset.themeMode === 'system' && applyTheme('system');
    media.addEventListener('change', syncSystem);
    return () => media.removeEventListener('change', syncSystem);
  }, []);
  function cycle() {
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(next);
    localStorage.setItem('hariyo-theme', next);
    applyTheme(next);
  }
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  return (
    <button
      className="icon-btn theme-button"
      onClick={cycle}
      aria-label={`Theme is ${theme}. Switch theme`}
      title={`Theme: ${theme} · click to change`}
    >
      <Icon size={18} />
      <span>{theme === 'system' ? 'Auto' : theme}</span>
    </button>
  );
}

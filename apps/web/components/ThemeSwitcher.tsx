'use client';
import { useEffect, useState } from 'react';
import { Moon, Sparkles, Sun } from 'lucide-react';

const themes = ['system', 'light', 'dark'] as const;
type ThemeMode = (typeof themes)[number];

function applyTheme(mode: ThemeMode) {
  const dark =
    mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.brand = mode === 'system' ? (dark ? 'night' : 'day') : 'classic';
  return dark;
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [resolvedDark, setResolvedDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('hariyo-theme');
    const next = themes.includes(stored as ThemeMode) ? (stored as ThemeMode) : 'system';
    setTheme(next);
    setResolvedDark(applyTheme(next));
    const media = matchMedia('(prefers-color-scheme: dark)');
    const syncSystem = () => {
      if (document.documentElement.dataset.themeMode === 'system') setResolvedDark(applyTheme('system'));
    };
    media.addEventListener('change', syncSystem);
    return () => media.removeEventListener('change', syncSystem);
  }, []);
  function cycle() {
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(next);
    localStorage.setItem('hariyo-theme', next);
    setResolvedDark(applyTheme(next));
  }
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Sparkles;
  const label = theme === 'system' ? `Auto · ${resolvedDark ? 'Night' : 'Day'}` : theme === 'dark' ? 'Dark' : 'Light';
  return (
    <button
      type="button"
      className="icon-btn theme-button"
      onClick={cycle}
      aria-label={`Theme is ${label}. Switch theme`}
      title={`${label} theme · click to change`}
      aria-live="polite"
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

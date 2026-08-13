'use client';
import { useEffect, useState } from 'react';
const themes = ['forest', 'lime', 'earth'] as const;
export function ThemeSwitcher() {
  const [theme, setTheme] = useState<(typeof themes)[number]>('forest');
  useEffect(() => {
    const t = (localStorage.getItem('hariyo-theme') || 'forest') as typeof theme;
    setTheme(t);
    document.documentElement.dataset.theme = t === 'forest' ? '' : t;
  }, []);
  function cycle() {
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(next);
    localStorage.setItem('hariyo-theme', next);
    document.documentElement.dataset.theme = next === 'forest' ? '' : next;
  }
  return (
    <button
      className="icon-btn"
      onClick={cycle}
      aria-label="Switch colour theme"
      title={`Theme: ${theme}`}
    >
      ◐
    </button>
  );
}

'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('traderlog-theme') || 'dark';
    setTheme(saved);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('traderlog-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Alternar tema">
      <div className="theme-toggle-track">
        <span className="theme-icon theme-icon--sun">☀️</span>
        <span className="theme-icon theme-icon--moon">🌙</span>
        <div className="theme-toggle-thumb" />
      </div>
    </button>
  );
}

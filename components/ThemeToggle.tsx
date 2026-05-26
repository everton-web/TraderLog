'use client';
import { useEffect, useState } from 'react';
import { Moon, Monitor, Sun } from 'lucide-react';

type Pref = 'dark' | 'light' | 'auto';
const CYCLE: Pref[] = ['dark', 'light', 'auto'];

function resolveTheme(pref: Pref): 'dark' | 'light' {
  if (pref !== 'auto') return pref;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const ICONS = {
  dark:  <Moon    size={15} strokeWidth={1.75} />,
  light: <Sun     size={15} strokeWidth={1.75} />,
  auto:  <Monitor size={15} strokeWidth={1.75} />,
};
const LABELS = { dark: 'Escuro', light: 'Claro', auto: 'Automático' };

export default function ThemeToggle() {
  const [pref, setPref] = useState<Pref>('auto');

  useEffect(() => {
    const saved = (localStorage.getItem('traderlog-theme') || 'auto') as Pref;
    setPref(saved);
  }, []);

  const cycle = () => {
    const next = CYCLE[(CYCLE.indexOf(pref) + 1) % CYCLE.length];
    setPref(next);
    localStorage.setItem('traderlog-theme', next);
    const resolved = resolveTheme(next);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-pref', next);
  };

  return (
    <button
      className="theme-cycle-btn"
      onClick={cycle}
      aria-label={`Tema: ${LABELS[pref]}`}
      title={`Tema atual: ${LABELS[pref]} — clique para alternar`}
    >
      {ICONS[pref]}
    </button>
  );
}

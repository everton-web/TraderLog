'use client';
import { useEffect } from 'react';

type Pref = 'dark' | 'light' | 'auto';

function resolveTheme(pref: Pref): 'dark' | 'light' {
  if (pref !== 'auto') return pref;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeProvider() {
  useEffect(() => {
    const pref = (localStorage.getItem('traderlog-theme') || 'auto') as Pref;
    const apply = () => {
      document.documentElement.setAttribute('data-theme', resolveTheme(pref));
      document.documentElement.setAttribute('data-theme-pref', pref);
    };
    apply();

    if (pref === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => {
        if ((localStorage.getItem('traderlog-theme') || 'auto') === 'auto') apply();
      };
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
  }, []);
  return null;
}

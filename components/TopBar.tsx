'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, Plus, Search } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import type { Profile } from '@/lib/types';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Visão Geral',
  '/nova':      'Nova Operação',
  '/historico': 'Histórico',
  '/config':    'Configurações',
  '/perfil':    'Meu Perfil',
  '/admin':     'Painel Admin',
};

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day  = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default function TopBar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const [dateStr, setDateStr] = useState('');

  const pageTitle = Object.entries(PAGE_TITLES)
    .find(([key]) => pathname.startsWith(key))?.[1] ?? 'TraderLog';

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const week = getWeekNumber(now);
      const formatted = now.toLocaleDateString('pt-BR', {
        weekday: 'short', day: '2-digit', month: 'long', year: 'numeric',
      });
      const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      setDateStr(`${capitalized} · Semana ${week}`);
    };
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="top-bar">
      <div className="top-bar-title-group">
        <div className="top-bar-page-title">{pageTitle}</div>
        {dateStr && <div className="top-bar-date">{dateStr}</div>}
      </div>

      <div className="top-bar-right">
        <div className="search-bar-top">
          <Search size={13} color="var(--text-muted)" strokeWidth={2} />
          <input type="text" placeholder="Buscar operação, ativo..." />
        </div>

        <button className="icon-btn-top" title="Notificações">
          <Bell size={15} strokeWidth={1.75} />
        </button>

        <ThemeToggle />

        {pathname !== '/nova' && (
          <Link href="/nova" className="btn-cta-top">
            <Plus size={13} strokeWidth={2.5} />
            Nova Operação
          </Link>
        )}
      </div>
    </header>
  );
}

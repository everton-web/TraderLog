'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';
import type { Profile } from '@/lib/types';

export default function TopBar({ profile }: { profile: Profile | null }) {
  const [date, setDate] = useState('');

  useEffect(() => {
    const update = () => {
      setDate(new Date().toLocaleDateString('pt-BR', {
        weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
      }));
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  const initials = profile?.nome
    ? profile.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <header className="top-bar">
      <button className="menu-toggle" onClick={() => {
        const sb = document.getElementById('sidebar');
        if (sb) sb.classList.toggle('open');
      }}>☰</button>

      <div className="top-bar-right">
        <span className="date-badge">{date}</span>
        <ThemeToggle />
        <Link href="/perfil" className="user-avatar" title={profile?.nome || 'Perfil'}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" />
            : initials}
        </Link>
      </div>
    </header>
  );
}

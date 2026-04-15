'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/actions';
import { LayoutDashboard, Plus, ClipboardList, Settings, User, Crown, LogOut } from 'lucide-react';
import type { Profile } from '@/lib/types';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/nova',      icon: Plus,            label: 'Nova Operação' },
  { href: '/historico', icon: ClipboardList,   label: 'Histórico' },
  { href: '/config',    icon: Settings,        label: 'Configurações' },
  { href: '/perfil',    icon: User,            label: 'Meu Perfil' },
];

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const isAdmin = profile?.role === 'admin';

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text">
          <span className="logo-title">
            <span className="logo-bold">Trade</span>
            <span className="logo-light">Log</span>
          </span>
          <span className="logo-sub">WIN &amp; WDO</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item${pathname.startsWith(href) ? ' active' : ''}`}
          >
            <Icon size={16} className="nav-icon" strokeWidth={1.75} />
            <span className="nav-label">{label}</span>
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className={`nav-item nav-admin-divider${pathname.startsWith('/admin') ? ' active' : ''}`}
          >
            <Crown size={16} className="nav-icon" strokeWidth={1.75} />
            <span className="nav-label" style={{ color: 'var(--brand)', fontWeight: 600 }}>
              Painel do Professor
            </span>
          </Link>
        )}
      </nav>

      <div className="sidebar-footer">
        <form action={logout}>
          <button type="submit" className="btn-logout">
            <LogOut size={14} strokeWidth={1.75} /> Sair
          </button>
        </form>
      </div>
    </aside>
  );
}

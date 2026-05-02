'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/actions';
import { LayoutDashboard, Plus, ClipboardList, Settings, User, Crown, LogOut, TrendingUp, BarChart2 } from 'lucide-react';
import type { Profile } from '@/lib/types';

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
      { href: '/nova',      icon: Plus,            label: 'Nova Operação', badge: true },
    ],
  },
  {
    label: 'Análise',
    items: [
      { href: '/historico', icon: ClipboardList, label: 'Histórico' },
      { href: '/config',    icon: BarChart2,     label: 'Relatórios' },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { href: '/config',  icon: Settings, label: 'Configurações' },
      { href: '/perfil',  icon: User,     label: 'Perfil' },
    ],
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia 🌤️';
  if (h < 18) return 'Boa tarde ☀️';
  return 'Boa noite 🌙';
}

export default function Sidebar({ profile, email }: { profile: Profile | null; email?: string | null }) {
  const pathname = usePathname();
  const isAdmin  = profile?.role === 'admin';

  const firstName = profile?.nome?.split(' ')[0] ?? 'Trader';
  const initials  = profile?.nome
    ? profile.nome.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <aside className="sidebar" id="sidebar">

      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,rgba(16,185,129,0.18),rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <TrendingUp size={15} color="#10b981" strokeWidth={2.5} />
        </div>
        <div className="logo-text">
          <span className="logo-title">
            <span className="logo-bold">Trader</span>
            <span className="logo-light">Log</span>
          </span>
          <span className="logo-sub">WIN &amp; WDO · B3</span>
        </div>
      </div>

      {/* Greeting */}
      <div className="sidebar-greeting">
        <div className="greeting-hi">{getGreeting()}</div>
        <div className="greeting-name">{firstName}</div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map(({ href, icon: Icon, label, badge }) => (
              <Link
                key={`${section.label}-${href}`}
                href={href}
                className={`nav-item${pathname.startsWith(href) ? ' active' : ''}`}
              >
                <Icon size={15} className="nav-icon" strokeWidth={1.75} />
                <span className="nav-label">{label}</span>
                {badge && <span className="nav-badge-new">+</span>}
              </Link>
            ))}
          </div>
        ))}

        {isAdmin && (
          <div>
            <div className="nav-section-label nav-admin-divider">Admin</div>
            <Link
              href="/admin"
              className={`nav-item${pathname.startsWith('/admin') ? ' active' : ''}`}
            >
              <Crown size={15} className="nav-icon" strokeWidth={1.75} />
              <span className="nav-label" style={{ color: 'var(--pe-color)', fontWeight: 600 }}>
                Painel Admin
              </span>
            </Link>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="sidebar-user-footer">
        <div className="sidebar-user-avatar">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" />
            : initials}
        </div>
        <div className="sidebar-user-info-wrap">
          <div className="sidebar-user-name">{profile?.nome ?? 'Usuário'}</div>
          {email && <div className="sidebar-user-email">{email}</div>}
        </div>
        <form action={logout}>
          <button type="submit" className="btn-icon-logout" title="Sair">
            <LogOut size={14} strokeWidth={1.75} />
          </button>
        </form>
      </div>

    </aside>
  );
}

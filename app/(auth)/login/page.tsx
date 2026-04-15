'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { login } from '@/lib/actions';
import ThemeProvider from '@/components/ThemeProvider';

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <>
      <ThemeProvider />
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-title">
              <span className="logo-bold">Trade</span>
              <span className="logo-light">Log</span>
            </div>
            <p className="auth-sub">Acesse o seu diário e acompanhe resultados</p>
          </div>

          {state?.error && <div className="error-msg">{state.error}</div>}

          <form action={action}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="email">E-mail</label>
              <input
                type="email" id="email" name="email"
                className="form-input" required
                placeholder="estudante@dominio.com"
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Senha</label>
              <input
                type="password" id="password" name="password"
                className="form-input" required
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              style={{ marginTop: 24 }}
              disabled={pending}
            >
              {pending ? 'Entrando...' : 'Entrar na Plataforma'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Ainda não tem conta? <Link href="/cadastro">Criar conta</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}

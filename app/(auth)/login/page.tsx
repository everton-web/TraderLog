'use client';
import { Suspense } from 'react';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/actions';
import ThemeProvider from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';
import LogoImage from '@/components/LogoImage';

function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  return (
    <>
      {(state?.error || urlError) && (
        <div className="error-msg">{state?.error || urlError}</div>
      )}

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
        <p><Link href="/esqueci-senha">Esqueci minha senha</Link></p>
        <p style={{ marginTop: 8 }}>Ainda não tem conta? <Link href="/cadastro">Criar conta</Link></p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <>
      <ThemeProvider />
      <div className="auth-wrapper">
        <div className="auth-theme-toggle">
          <ThemeToggle />
        </div>
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo-wrap">
              <LogoImage className="auth-logo" />
            </div>
            <p className="auth-sub">Acesse o seu diário e acompanhe resultados</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}

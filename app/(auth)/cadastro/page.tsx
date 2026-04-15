'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { cadastro } from '@/lib/actions';
import ThemeProvider from '@/components/ThemeProvider';

export default function CadastroPage() {
  const [state, action, pending] = useActionState(cadastro, null);

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
            <p className="auth-sub">Crie sua conta e comece a registrar operações</p>
          </div>

          {state?.error && <div className="error-msg">{state.error}</div>}

          <form action={action}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" htmlFor="nome">Nome</label>
              <input
                type="text" id="nome" name="nome"
                className="form-input" required
                placeholder="Seu nome completo"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" htmlFor="email">E-mail</label>
              <input
                type="email" id="email" name="email"
                className="form-input" required
                placeholder="estudante@dominio.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Senha</label>
              <input
                type="password" id="password" name="password"
                className="form-input" required
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              style={{ marginTop: 24 }}
              disabled={pending}
            >
              {pending ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Já tem conta? <Link href="/login">Entrar</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}

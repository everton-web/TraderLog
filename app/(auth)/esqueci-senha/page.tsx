'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import ThemeProvider from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';
import LogoImage from '@/components/LogoImage';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

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
            <p className="auth-sub">Recupere o acesso à sua conta</p>
          </div>

          {error && <div className="error-msg">{error}</div>}

          {sent ? (
            <div className="success-msg">
              E-mail de recuperação enviado para <strong>{email}</strong>. Verifique sua caixa de entrada e spam.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="email">E-mail cadastrado</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  required
                  placeholder="estudante@dominio.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                style={{ marginTop: 24 }}
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>Lembrou a senha? <Link href="/login">Voltar ao login</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}

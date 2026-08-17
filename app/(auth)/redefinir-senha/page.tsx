'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import ThemeProvider from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';
import LogoImage from '@/components/LogoImage';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      setReady(true);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/dashboard'), 2000);
  }

  if (!ready) {
    return (
      <>
        <ThemeProvider />
        <div className="auth-wrapper" />
      </>
    );
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
            <p className="auth-sub">Crie uma nova senha para sua conta</p>
          </div>

          {error && <div className="error-msg">{error}</div>}

          {success ? (
            <div className="success-msg">
              Senha redefinida com sucesso! Redirecionando...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" htmlFor="password">Nova senha</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="form-input"
                  required
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm">Confirmar nova senha</label>
                <input
                  type="password"
                  id="confirm"
                  name="confirm"
                  className="form-input"
                  required
                  placeholder="Repita a nova senha"
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                style={{ marginTop: 24 }}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

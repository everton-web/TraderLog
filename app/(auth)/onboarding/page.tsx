'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Loader2, ArrowRight } from 'lucide-react';
import ThemeProvider from '@/components/ThemeProvider';

export default function OnboardingPage() {
  const router = useRouter();
  const [profitKey,   setProfitKey]   = useState('');
  const [profitEmail, setProfitEmail] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/bridge/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profit_key: profitKey, profit_email: profitEmail }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSaving(false); return; }
      router.push('/dashboard');
    } catch {
      setError('Erro ao salvar. Tente novamente.');
      setSaving(false);
    }
  };

  return (
    <>
      <ThemeProvider />
      <div className="auth-wrapper">
        <div className="auth-card" style={{ maxWidth: 480 }}>
          <div className="auth-header">
            <div className="auth-title">
              <span className="logo-bold">Trade</span>
              <span className="logo-light">Log</span>
            </div>
            <p className="auth-sub">Conta criada com sucesso!</p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
              Conectar com o Profit Pro
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Configure abaixo para que suas operações sejam registradas automaticamente
              quando você operar no Profit Pro. Pode pular e configurar depois em{' '}
              <strong>Integrações</strong>.
            </p>
          </div>

          {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Chave de Ativação Nelógica</label>
            <input
              type="text"
              className="form-input mono"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={profitKey}
              onChange={e => setProfitKey(e.target.value)}
            />
            <span className="field-hint">
              Fornecida pela Nelógica ao contratar o módulo Data Solution
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">E-mail do Profit Pro</label>
            <input
              type="email"
              className="form-input"
              placeholder="seu@email.com"
              value={profitEmail}
              onChange={e => setProfitEmail(e.target.value)}
            />
            <span className="field-hint">
              O app TraderLog Bridge vai pré-preencher este campo automaticamente
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-primary btn-full"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? <><Loader2 size={14} className="spin" /> Salvando...</>
                : <><Save size={14} /> Salvar e entrar no TraderLog</>}
            </button>

            <Link
              href="/dashboard"
              className="btn btn-secondary btn-full"
              style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              Pular por enquanto <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

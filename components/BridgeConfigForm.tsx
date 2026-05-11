'use client';
import { useState } from 'react';
import { Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  initialKey:   string | null;
  initialEmail: string | null;
}

export default function BridgeConfigForm({ initialKey, initialEmail }: Props) {
  const [profitKey,   setProfitKey]   = useState(initialKey   ?? '');
  const [profitEmail, setProfitEmail] = useState(initialEmail ?? '');
  const [saving,  setSaving]  = useState(false);
  const [status,  setStatus]  = useState<'idle' | 'ok' | 'error'>('idle');
  const [errMsg,  setErrMsg]  = useState('');

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    const res = await fetch('/api/bridge/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profit_key: profitKey, profit_email: profitEmail }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setStatus('error'); setErrMsg(data.error); }
    else setStatus('ok');
  };

  return (
    <div className="bridge-config-form">
      <div className="form-group">
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

      <div className="form-group">
        <label className="form-label">Email do Profit Pro</label>
        <input
          type="email"
          className="form-input"
          placeholder="seu@email.com"
          value={profitEmail}
          onChange={e => setProfitEmail(e.target.value)}
        />
        <span className="field-hint">
          O bridge vai pré-preencher este campo — o aluno só digita a senha
        </span>
      </div>

      <div className="bridge-config-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving
            ? <><Loader2 size={14} className="spin" /> Salvando...</>
            : <><Save size={14} /> Salvar configuração</>}
        </button>

        {status === 'ok' && (
          <span className="bridge-status ok">
            <CheckCircle2 size={13} /> Salvo
          </span>
        )}
        {status === 'error' && (
          <span className="bridge-status error">
            <AlertCircle size={13} /> {errMsg}
          </span>
        )}
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { Save, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  hasKey: boolean;
}

export default function AnthropicKeyForm({ hasKey }: Props) {
  const [key,    setKey]    = useState('');
  const [show,   setShow]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const handleSave = async () => {
    if (!key.trim()) return;
    setSaving(true);
    setStatus('idle');
    const res  = await fetch('/api/diario/key', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ anthropic_key: key }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setStatus('error'); setErrMsg(data.error); }
    else { setStatus('ok'); setKey(''); }
  };

  return (
    <div className="bridge-config-form">
      <div className="form-group">
        <label className="form-label">API Key da Anthropic</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type={show ? 'text' : 'password'}
            className="form-input mono"
            placeholder={hasKey ? '••••••••••••••••••••••••' : 'sk-ant-api03-...'}
            value={key}
            onChange={e => setKey(e.target.value)}
            style={{ paddingRight: 38 }}
          />
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <span className="field-hint">
          Obtenha em <strong>console.anthropic.com</strong> → API Keys.
          {hasKey && ' Já existe uma chave salva — preencha para substituir.'}
        </span>
      </div>

      <div className="bridge-config-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !key.trim()}>
          {saving
            ? <><Loader2 size={14} className="spin" /> Salvando...</>
            : <><Save size={14} /> Salvar chave</>}
        </button>

        {status === 'ok' && (
          <span className="bridge-status ok">
            <CheckCircle2 size={13} /> Chave salva
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

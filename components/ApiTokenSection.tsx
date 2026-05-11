'use client';
import { useState } from 'react';
import { Copy, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ApiTokenSection({ initialToken }: { initialToken: string | null }) {
  const [token, setToken]       = useState(initialToken);
  const [visible, setVisible]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const displayToken = token
    ? (visible ? token : token.slice(0, 8) + '••••••••••••••••••••••••••••••••••••••••••••••••••')
    : null;

  const handleCopy = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegen = async () => {
    if (!confirm('Gerar um novo token vai invalidar o atual. O script Python precisará ser atualizado. Confirmar?')) return;
    setLoading(true);
    setError(null);
    const res = await fetch('/api/token', { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    setToken(data.token);
    setVisible(true);
  };

  return (
    <div className="api-token-container">
      <p className="api-token-desc">
        Cole este token no script <code>profit_bridge.py</code> para autenticar o envio de operações.
      </p>

      {token ? (
        <div className="api-token-row">
          <code className="api-token-value">{displayToken}</code>
          <button className="btn-icon" title={visible ? 'Ocultar' : 'Mostrar'} onClick={() => setVisible(v => !v)}>
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button className="btn-icon" title="Copiar" onClick={handleCopy}>
            {copied ? <CheckCircle2 size={14} color="var(--gain)" /> : <Copy size={14} />}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleRegen} disabled={loading}>
            <RefreshCw size={12} /> Regenerar
          </button>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={handleRegen} disabled={loading}>
          {loading ? 'Gerando...' : 'Gerar token'}
        </button>
      )}

      {error && (
        <div className="pluggy-feedback error">
          <AlertCircle size={13} /> {error}
        </div>
      )}
    </div>
  );
}

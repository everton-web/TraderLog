'use client';
import { useState, useCallback } from 'react';
import { Link2, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    PluggyConnect: new (config: {
      connectToken: string;
      onSuccess: (data: { item: { id: string } }) => void;
      onError: (err: unknown) => void;
      onClose: () => void;
    }) => { init: () => void };
  }
}

interface Props {
  connected: boolean;
  lastSynced: string | null;
  pluggyConfigured: boolean;
}

export default function PluggyConnect({ connected: initialConnected, lastSynced, pluggyConfigured }: Props) {
  const [connected, setConnected] = useState(initialConnected);
  const [status, setStatus]       = useState<string | null>(null);
  const [isError, setIsError]     = useState(false);
  const [loading, setLoading]     = useState<'connect' | 'sync' | null>(null);
  const [syncDate, setSyncDate]   = useState('');

  const setMsg = (msg: string, error = false) => {
    setStatus(msg);
    setIsError(error);
  };

  const loadPluggyScript = useCallback((): Promise<void> => {
    if (window.PluggyConnect) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2/pluggy-connect.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Falha ao carregar Pluggy Connect'));
      document.head.appendChild(script);
    });
  }, []);

  const handleConnect = async () => {
    setLoading('connect');
    setStatus(null);
    try {
      await loadPluggyScript();

      const res = await fetch('/api/integrations/pluggy/connect-token', { method: 'POST' });
      const { token, error } = await res.json();
      if (error) throw new Error(error);

      const widget = new window.PluggyConnect({
        connectToken: token,
        onSuccess: async ({ item }) => {
          const save = await fetch('/api/integrations/pluggy/save-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: item.id }),
          });
          const saved = await save.json();
          if (saved.error) { setMsg('Erro ao salvar conexão: ' + saved.error, true); return; }
          setConnected(true);
          setMsg('Conta Clear conectada com sucesso!');
        },
        onError: (err) => setMsg('Erro no Pluggy: ' + String(err), true),
        onClose: () => {},
      });
      widget.init();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro ao conectar', true);
    } finally {
      setLoading(null);
    }
  };

  const handleSync = async () => {
    setLoading('sync');
    setStatus(null);
    try {
      const body: Record<string, string> = {};
      if (syncDate) { body.dateFrom = syncDate; body.dateTo = syncDate; }

      const res = await fetch('/api/integrations/pluggy/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.imported > 0) {
        setMsg(`${data.imported} operação(ões) importada(s) com sucesso!`);
      } else {
        setMsg(data.message ?? 'Nenhuma operação nova encontrada');
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro na sincronização', true);
    } finally {
      setLoading(null);
    }
  };

  if (!pluggyConfigured) {
    return (
      <div className="pluggy-notice">
        <strong>Não configurado.</strong> Para ativar, adicione{' '}
        <code>PLUGGY_CLIENT_ID</code> e <code>PLUGGY_CLIENT_SECRET</code>{' '}
        nas variáveis de ambiente do Vercel.
      </div>
    );
  }

  return (
    <div className="pluggy-container">
      {/* Status da conexão */}
      <div className="pluggy-status-row">
        <div className={`pluggy-status-badge ${connected ? 'connected' : 'disconnected'}`}>
          {connected
            ? <><CheckCircle2 size={14} /> Clear conectada</>
            : <><AlertCircle size={14} /> Sem conexão</>}
        </div>
        {connected && lastSynced && (
          <span className="pluggy-last-sync">Última sync: {lastSynced}</span>
        )}
      </div>

      {/* Aviso experimental */}
      <div className="pluggy-notice">
        <strong>Atenção:</strong> esta integração depende do suporte do Pluggy a contratos futuros
        (WIN/WDO) via Clear. Na primeira sincronização, verifique se as operações foram importadas
        corretamente. O campo <em>Stop</em> não é fornecido pelo Pluggy — preencha manualmente no
        histórico.
      </div>

      {/* Ação: conectar */}
      {!connected && (
        <button
          className="btn btn-primary"
          onClick={handleConnect}
          disabled={loading !== null}
        >
          {loading === 'connect'
            ? <><Loader2 size={14} className="spin" /> Conectando...</>
            : <><Link2 size={14} /> Conectar conta Clear</>}
        </button>
      )}

      {/* Ação: sincronizar */}
      {connected && (
        <div className="pluggy-sync-row">
          <input
            type="date"
            className="form-input"
            style={{ width: 160 }}
            value={syncDate}
            onChange={e => setSyncDate(e.target.value)}
            placeholder="Hoje"
          />
          <button
            className="btn btn-primary"
            onClick={handleSync}
            disabled={loading !== null}
          >
            {loading === 'sync'
              ? <><Loader2 size={14} className="spin" /> Sincronizando...</>
              : <><RefreshCw size={14} /> Sincronizar operações</>}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleConnect}
            disabled={loading !== null}
          >
            Reconectar
          </button>
        </div>
      )}

      {/* Feedback */}
      {status && (
        <div className={`pluggy-feedback ${isError ? 'error' : 'success'}`}>
          {isError
            ? <AlertCircle size={14} />
            : <CheckCircle2 size={14} />}
          {status}
        </div>
      )}
    </div>
  );
}

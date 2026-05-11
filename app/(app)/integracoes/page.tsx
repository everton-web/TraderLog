import { createClient } from '@/utils/supabase/server';
import PluggyConnect from '@/components/PluggyConnect';
import ApiTokenSection from '@/components/ApiTokenSection';
import { formatDate } from '@/lib/formatters';

export default async function IntegracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: conn }, { data: tokenRow }] = await Promise.all([
    supabase.from('pluggy_connections').select('item_id, updated_at').eq('user_id', user!.id).maybeSingle(),
    supabase.from('api_tokens').select('token').eq('user_id', user!.id).maybeSingle(),
  ]);

  const connected  = !!conn?.item_id;
  const lastSynced = conn?.updated_at ? formatDate(conn.updated_at.split('T')[0]) : null;

  return (
    <>
      <div className="section-header">
        <h1>Integrações</h1>
        <p className="section-desc">Sincronize operações diretamente da sua corretora</p>
      </div>

      {/* ── Profit Pro DLL ──────────────────────────────────────────────── */}
      <div className="card" style={{ maxWidth: 640, marginBottom: 16 }}>
        <div className="card-header">
          <h2 className="card-title">Profit Pro — Bridge Local (DLL)</h2>
          <p className="card-desc" style={{ marginTop: 4 }}>
            Script Python que roda na sua máquina junto com o Profit Pro.
            Quando você fechar uma operação WIN ou WDO, ela é enviada automaticamente.
          </p>
        </div>
        <div className="card-body" style={{ gap: 16 }}>

          <div>
            <div className="form-label" style={{ marginBottom: 6 }}>Token de API</div>
            <ApiTokenSection initialToken={tokenRow?.token ?? null} />
          </div>

          <div className="pluggy-notice">
            <strong>Como configurar:</strong>
            <ol className="pluggy-steps" style={{ marginTop: 6 }}>
              <li>Copie o token acima</li>
              <li>Abra <code>bridge/profit_bridge.py</code> e cole em <code>TRADERLOG_TOKEN</code></li>
              <li>Preencha também <code>PROFIT_KEY</code>, <code>PROFIT_USER</code> e <code>PROFIT_PASS</code></li>
              <li>Instale Python 32-bit + <code>pip install requests</code></li>
              <li>Copie <code>ProfitDLL.dll</code> para a pasta <code>bridge/</code></li>
              <li>Rode <code>python profit_bridge.py</code> antes de operar</li>
            </ol>
          </div>

          <div className="pluggy-notice" style={{ background: 'var(--loss-bg)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <strong>Pré-requisito:</strong> a Profit DLL requer o módulo{' '}
            <strong>Data Solution</strong> da Nelógica (assinatura separada).
            Verifique em <code>store.nelogica.com.br</code>.
          </div>
        </div>
      </div>

      {/* ── Pluggy / Clear ──────────────────────────────────────────────── */}
      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-header">
          <h2 className="card-title">Clear Corretora via Pluggy (alternativa)</h2>
          <p className="card-desc" style={{ marginTop: 4 }}>
            Sincronização cloud — sem script local. Requer conta de desenvolvedor em pluggy.ai.
          </p>
        </div>
        <div className="card-body">
          <PluggyConnect connected={connected} lastSynced={lastSynced} />
        </div>
      </div>
    </>
  );
}

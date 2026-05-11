import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import BridgeConfigForm from '@/components/BridgeConfigForm';
import ApiTokenSection from '@/components/ApiTokenSection';
import PluggyConnect from '@/components/PluggyConnect';
import { formatDate } from '@/lib/formatters';
import { Download } from 'lucide-react';

const service = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function IntegracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: bridgeCfg }, { data: conn }, { data: tokenRow }] = await Promise.all([
    service.from('bridge_config').select('profit_key, profit_email').eq('user_id', user!.id).maybeSingle(),
    service.from('pluggy_connections').select('item_id, updated_at').eq('user_id', user!.id).maybeSingle(),
    service.from('api_tokens').select('token').eq('user_id', user!.id).maybeSingle(),
  ]);

  const connected         = !!conn?.item_id;
  const lastSynced        = conn?.updated_at ? formatDate(conn.updated_at.split('T')[0]) : null;
  const pluggyConfigured  = !!(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);

  return (
    <>
      <div className="section-header">
        <h1>Integrações</h1>
        <p className="section-desc">Conecte o Profit Pro para registrar operações automaticamente</p>
      </div>

      {/* ── Profit Pro DLL ──────────────────────────────────────────────── */}
      <div className="card" style={{ maxWidth: 640, marginBottom: 16 }}>
        <div className="card-header">
          <h2 className="card-title">Profit Pro — Bridge Automático</h2>
          <p className="card-desc" style={{ marginTop: 4 }}>
            Configure abaixo e distribua o <strong>TraderLogBridge.exe</strong> para os alunos.
            Eles apenas fazem login e inserem a senha do Profit — nada mais.
          </p>
        </div>
        <div className="card-body" style={{ gap: 20 }}>

          {/* Formulário de config */}
          <BridgeConfigForm
            initialKey={bridgeCfg?.profit_key ?? null}
            initialEmail={bridgeCfg?.profit_email ?? null}
          />

          {/* Download */}
          <div className="bridge-download-box">
            <div>
              <div className="bridge-download-title">TraderLogBridge.exe</div>
              <div className="bridge-download-sub">
                Aluno abre o .exe → faz login → opera. Sem instalar nada.
              </div>
            </div>
            <a
              href="https://github.com/everton-web/TraderLog/releases/latest/download/TraderLogBridge.exe"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <Download size={14} /> Baixar .exe
            </a>
          </div>

          {/* Token técnico */}
          <details className="bridge-details">
            <summary>Configurações avançadas</summary>
            <div style={{ marginTop: 12 }}>
              <div className="form-label" style={{ marginBottom: 6 }}>Token de API</div>
              <ApiTokenSection initialToken={tokenRow?.token ?? null} />
            </div>
          </details>

        </div>
      </div>

      {/* ── Pluggy (alternativa) ─────────────────────────────────────────── */}
      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-header">
          <h2 className="card-title">Clear via Pluggy — alternativa sem bridge</h2>
          <p className="card-desc" style={{ marginTop: 4 }}>
            Sync cloud sem instalar nada. Requer conta de desenvolvedor em pluggy.ai.
          </p>
        </div>
        <div className="card-body">
          <PluggyConnect connected={connected} lastSynced={lastSynced} pluggyConfigured={pluggyConfigured} />
        </div>
      </div>
    </>
  );
}

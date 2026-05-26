import { createClient } from '@/utils/supabase/server';
import BridgeConfigForm   from '@/components/BridgeConfigForm';
import AnthropicKeyForm   from '@/components/AnthropicKeyForm';
import DiarioForm         from '@/components/DiarioForm';

export default async function IntegracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let bridgeCfg: {
    profit_key:    string | null;
    profit_email:  string | null;
    anthropic_key: string | null;
  } | null = null;

  let diarioHoje: Record<string, unknown> | null = null;

  try {
    const { data } = await supabase
      .from('bridge_config')
      .select('profit_key, profit_email, anthropic_key')
      .eq('user_id', user!.id)
      .maybeSingle();
    bridgeCfg = data;
  } catch {
    // tabela ainda não existe
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('diario_entradas')
      .select('*')
      .eq('user_id', user!.id)
      .eq('data', today)
      .maybeSingle();
    diarioHoje = data;
  } catch {
    // tabela ainda não existe
  }

  return (
    <>
      <div className="section-header">
        <h1>Integrações</h1>
        <p className="section-desc">Conecte ferramentas externas e ative o diário com análise de IA</p>
      </div>

      {/* ── Profit Pro ─────────────────────────────────────── */}
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-header">
          <h2 className="card-title">Profit Pro — Configuração</h2>
          <p className="card-desc" style={{ marginTop: 4 }}>
            Preencha os dados abaixo. O app bridge vai buscar essas informações automaticamente.
          </p>
        </div>
        <div className="card-body" style={{ gap: 20 }}>
          <BridgeConfigForm
            initialKey={bridgeCfg?.profit_key ?? null}
            initialEmail={bridgeCfg?.profit_email ?? null}
          />

          <div className="bridge-download-box">
            <div>
              <div className="bridge-download-title">TraderLog Bridge (.exe)</div>
              <div className="bridge-download-sub">
                Em breve — o app será disponibilizado aqui para download direto.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Diário com IA ──────────────────────────────────── */}
      <div className="integracoes-section-divider">
        <h2>Diário de Trader com IA</h2>
        <p className="section-desc">
          Registre seu pregão diário e receba um briefing personalizado via Claude AI para o dia seguinte.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 560, marginBottom: 16 }}>
        <div className="card-header">
          <h2 className="card-title">Claude AI — Chave de API</h2>
          <p className="card-desc" style={{ marginTop: 4 }}>
            Sua chave é usada apenas para gerar análises do diário e nunca é compartilhada.
          </p>
        </div>
        <div className="card-body">
          <AnthropicKeyForm hasKey={!!bridgeCfg?.anthropic_key} />
        </div>
      </div>

      <div className="card" style={{ maxWidth: 760 }}>
        <div className="card-header">
          <h2 className="card-title">Registro do Pregão</h2>
          <p className="card-desc" style={{ marginTop: 4 }}>
            Preencha ao final de cada dia de operação. Clique em <strong>Analisar com IA</strong> para receber o briefing.
          </p>
        </div>
        <div className="card-body">
          <DiarioForm initialEntry={diarioHoje} />
        </div>
      </div>
    </>
  );
}

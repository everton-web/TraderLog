import { createClient } from '@/utils/supabase/server';
import BridgeConfigForm from '@/components/BridgeConfigForm';

export default async function IntegracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let bridgeCfg: { profit_key: string | null; profit_email: string | null } | null = null;
  try {
    const { data } = await supabase
      .from('bridge_config')
      .select('profit_key, profit_email')
      .eq('user_id', user!.id)
      .maybeSingle();
    bridgeCfg = data;
  } catch {
    // tabela ainda não existe — formulário renderiza vazio
  }

  return (
    <>
      <div className="section-header">
        <h1>Integrações</h1>
        <p className="section-desc">Conecte o Profit Pro para registrar operações automaticamente</p>
      </div>

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
    </>
  );
}

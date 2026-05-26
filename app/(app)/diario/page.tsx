import { createClient } from '@/utils/supabase/server';
import DiarioForm from '@/components/DiarioForm';

export default async function DiarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let diarioHoje: Record<string, unknown> | null = null;
  let hasAnthropicKey = false;

  try {
    const today = new Date().toISOString().split('T')[0];
    const [entradaRes, cfgRes] = await Promise.all([
      supabase
        .from('diario_entradas')
        .select('*')
        .eq('user_id', user!.id)
        .eq('data', today)
        .maybeSingle(),
      supabase
        .from('bridge_config')
        .select('anthropic_key')
        .eq('user_id', user!.id)
        .maybeSingle(),
    ]);
    diarioHoje      = entradaRes.data;
    hasAnthropicKey = !!cfgRes.data?.anthropic_key;
  } catch {
    // tabelas ainda não existem
  }

  return (
    <>
      <div className="section-header">
        <h1>Diário de Trader</h1>
        <p className="section-desc">Registre seu pregão e receba análise via IA para o próximo dia</p>
      </div>

      {!hasAnthropicKey && (
        <div className="diario-key-warning">
          Configure sua <strong>API Key da Anthropic</strong> em{' '}
          <a href="/integracoes">Integrações</a> para ativar a análise por IA.
        </div>
      )}

      <div className="card" style={{ maxWidth: 760 }}>
        <div className="card-header">
          <h2 className="card-title">Registro do Pregão</h2>
          <p className="card-desc" style={{ marginTop: 4 }}>
            Preencha ao final de cada dia. Clique em <strong>Analisar com IA</strong> para o briefing de amanhã.
          </p>
        </div>
        <div className="card-body">
          <DiarioForm initialEntry={diarioHoje} />
        </div>
      </div>
    </>
  );
}

import { createClient } from '@/utils/supabase/server';
import DiarioHubClient from '@/components/DiarioHubClient';
import type { Configuracao } from '@/lib/types';

export default async function DiarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split('T')[0];

  const [cfgRes, entradaRes, opsRes, keyRes] = await Promise.allSettled([
    supabase.from('configuracoes').select('*').eq('user_id', user!.id).single(),
    supabase.from('diario_entradas').select('*').eq('user_id', user!.id).eq('data', today).maybeSingle(),
    supabase.from('operacoes').select('id, ativo, tipo, setup, pts_final, situacao, rs_final').eq('user_id', user!.id).eq('data', today).order('created_at'),
    supabase.from('bridge_config').select('gemini_key').eq('user_id', user!.id).maybeSingle(),
  ]);

  const config      = cfgRes.status      === 'fulfilled' ? cfgRes.value.data      as Configuracao | null : null;
  const entrada     = entradaRes.status  === 'fulfilled' ? entradaRes.value.data   : null;
  const todayOps    = opsRes.status      === 'fulfilled' ? (opsRes.value.data ?? []) : [];
  const hasGeminiKey= keyRes.status      === 'fulfilled' ? !!keyRes.value.data?.gemini_key : false;

  return (
    <>
      <div className="section-header">
        <h1>Diário</h1>
        <p className="section-desc">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {!hasGeminiKey && (
        <div className="diario-key-warning">
          Configure a <strong>API key do Google AI</strong> em{' '}
          <a href="/integracoes">Integrações</a> para ativar a análise por IA.
        </div>
      )}

      <DiarioHubClient
        config={config}
        todayOps={todayOps}
        initialEntry={entrada}
      />
    </>
  );
}

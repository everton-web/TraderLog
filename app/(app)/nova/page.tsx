import { createClient } from '@/utils/supabase/server';
import OperacaoForm from '@/components/OperacaoForm';
import type { Configuracao } from '@/lib/types';

export default async function NovaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: cfg } = await supabase.from('configuracoes').select('*').eq('user_id', user!.id).single();

  return (
    <>
      <div className="section-header">
        <h1>Nova Operação</h1>
        <p className="section-desc">Registre uma operação com cálculo automático</p>
      </div>
      <OperacaoForm config={cfg as Configuracao | null} />
    </>
  );
}

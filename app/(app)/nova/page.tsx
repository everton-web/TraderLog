import { createClient } from '@/utils/supabase/server';
import OperacaoForm from '@/components/OperacaoForm';
import type { Configuracao } from '@/lib/types';
import { getAmbiente } from '@/lib/ambiente';

export default async function NovaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: cfg }, ambiente] = await Promise.all([
    supabase.from('configuracoes').select('*').eq('user_id', user!.id).single(),
    getAmbiente(),
  ]);

  return (
    <>
      <OperacaoForm config={cfg as Configuracao | null} ambiente={ambiente} />
    </>
  );
}

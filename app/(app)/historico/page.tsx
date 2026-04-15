import { createClient } from '@/utils/supabase/server';
import HistoricoClient from './HistoricoClient';
import type { Operacao } from '@/lib/types';

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: ops } = await supabase
    .from('operacoes')
    .select('*')
    .eq('user_id', user!.id)
    .order('data', { ascending: false });

  return <HistoricoClient ops={(ops || []) as Operacao[]} />;
}

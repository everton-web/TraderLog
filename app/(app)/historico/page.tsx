import { createClient } from '@/utils/supabase/server';
import HistoricoClient from './HistoricoClient';
import type { Operacao, Configuracao } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: ops }, { data: cfg }] = await Promise.all([
    supabase
      .from('operacoes')
      .select('*')
      .eq('user_id', user!.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('configuracoes')
      .select('*')
      .eq('user_id', user!.id)
      .single(),
  ]);

  return (
    <HistoricoClient
      ops={(ops || []) as Operacao[]}
      capitalInicial={(cfg as Configuracao | null)?.capital ?? 2000}
      config={(cfg as Configuracao | null)}
    />
  );
}

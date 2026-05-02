import { createClient } from '@/utils/supabase/server';
import DashboardClient from './DashboardClient';
import type { Operacao, Configuracao } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: ops }, { data: cfg }] = await Promise.all([
    supabase.from('operacoes').select('*').eq('user_id', user!.id).order('data', { ascending: true }),
    supabase.from('configuracoes').select('*').eq('user_id', user!.id).single(),
  ]);

  const operacoes = (ops || []) as Operacao[];
  const capital   = (cfg as Configuracao | null)?.capital ?? 2000;

  return <DashboardClient ops={operacoes} capitalInicial={capital} />;
}

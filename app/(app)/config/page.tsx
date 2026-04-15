import { createClient } from '@/utils/supabase/server';
import ConfigClient from './ConfigClient';
import { calcEstatisticas } from '@/lib/calculations';
import type { Configuracao, Operacao } from '@/lib/types';

export default async function ConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: cfg }, { data: ops }] = await Promise.all([
    supabase.from('configuracoes').select('*').eq('user_id', user!.id).single(),
    supabase.from('operacoes').select('*').eq('user_id', user!.id),
  ]);

  const stat = calcEstatisticas((ops || []) as Operacao[]);

  return <ConfigClient config={cfg as Configuracao | null} stat={stat} />;
}

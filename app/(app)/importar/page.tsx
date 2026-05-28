import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ImportarClient from './ImportarClient';
import { getAmbiente } from '@/lib/ambiente';

export const metadata = { title: 'Importar do Profit | TraderLog' };

export default async function ImportarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ambiente = await getAmbiente();
  return <ImportarClient ambiente={ambiente} />;
}

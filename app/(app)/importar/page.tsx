import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ImportarClient from './ImportarClient';

export const metadata = { title: 'Importar do Profit | TraderLog' };

export default async function ImportarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <ImportarClient />;
}

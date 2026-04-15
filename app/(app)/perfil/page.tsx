import { createClient } from '@/utils/supabase/server';
import PerfilClient from './PerfilClient';
import type { Profile } from '@/lib/types';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  return <PerfilClient profile={profile as Profile} email={user!.email ?? ''} />;
}

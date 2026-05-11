import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createConnectToken } from '@/lib/pluggy';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: conn } = await supabase
      .from('pluggy_connections')
      .select('item_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const token = await createConnectToken(conn?.item_id);
    return NextResponse.json({ token });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

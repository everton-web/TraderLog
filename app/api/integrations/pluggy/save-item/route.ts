import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { itemId } = await req.json();
  if (!itemId || typeof itemId !== 'string') {
    return NextResponse.json({ error: 'itemId obrigatório' }, { status: 400 });
  }

  const { error } = await supabase
    .from('pluggy_connections')
    .upsert({ user_id: user.id, item_id: itemId, updated_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

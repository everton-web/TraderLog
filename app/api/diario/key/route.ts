import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gemini_key } = await req.json();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('bridge_config')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from('bridge_config')
        .update({ gemini_key, updated_at: now })
        .eq('user_id', user.id)
    : await supabase
        .from('bridge_config')
        .insert({ user_id: user.id, gemini_key, updated_at: now });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

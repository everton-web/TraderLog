import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as Record<string, string>;
  const now  = new Date().toISOString();

  // Aceita gemini_key e/ou finnhub_key
  const updates: Record<string, string> = { updated_at: now };
  if (body.gemini_key   != null) updates.gemini_key   = body.gemini_key;
  if (body.finnhub_key  != null) updates.finnhub_key  = body.finnhub_key;

  const { data: existing } = await supabase
    .from('bridge_config')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from('bridge_config')
        .update(updates)
        .eq('user_id', user.id)
    : await supabase
        .from('bridge_config')
        .insert({ user_id: user.id, ...updates });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

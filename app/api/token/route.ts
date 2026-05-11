import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET: retorna o token atual (ou cria um novo)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('api_tokens')
    .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select('token')
    .single();

  if (error) {
    // Se o upsert falhou por já existir, busca diretamente
    const { data: existing } = await supabase
      .from('api_tokens')
      .select('token')
      .eq('user_id', user.id)
      .single();
    if (existing) return NextResponse.json({ token: existing.token });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token: data.token });
}

// POST: gera um novo token (substitui o anterior)
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const newToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

  const { error } = await supabase
    .from('api_tokens')
    .upsert({ user_id: user.id, token: newToken, created_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token: newToken });
}

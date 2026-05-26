import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('diario_entradas')
    .select('*')
    .eq('user_id', user.id)
    .order('data', { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const payload = {
    user_id: user.id,
    data: body.data,
    ativo_ref: body.ativo_ref ?? null,
    mercado: body.mercado ?? null,
    atr_pts: body.atr_pts ?? null,
    adx_valor: body.adx_valor ?? null,
    abertura: body.abertura ?? null,
    maximo: body.maximo ?? null,
    minimo: body.minimo ?? null,
    fechamento: body.fechamento ?? null,
    plano_dia: body.plano_dia ?? null,
    operacoes: body.operacoes ?? null,
    plano_seguido: body.plano_seguido ?? null,
    emocional: body.emocional ?? null,
    ajustes: body.ajustes ?? null,
    observacoes: body.observacoes ?? null,
    resultado_pts: body.resultado_pts != null ? body.resultado_pts : null,
  };

  const { data: existing } = await supabase
    .from('diario_entradas')
    .select('id')
    .eq('user_id', user.id)
    .eq('data', body.data)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from('diario_entradas').update(payload).eq('id', existing.id)
    : await supabase.from('diario_entradas').insert(payload);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

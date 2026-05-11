import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { diaSemana } from '@/lib/formatters';

// Endpoint REST para o bridge local (Profit DLL).
// Autenticação via Bearer token gerado em /integracoes.
export async function POST(req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 401 });

  // Valida o token e obtém o user_id sem usar cookies de sessão
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: tokenRow } = await service
    .from('api_tokens')
    .select('user_id')
    .eq('token', token)
    .maybeSingle();

  if (!tokenRow) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const body = await req.json();
  const { ativo, tipo, pe, stop, saida, qtde_total, qtde_rp = 0, pts_final, rs_final, situacao, setup, obs } = body;

  if (!ativo || !tipo || pe == null || stop == null || saida == null || !qtde_total) {
    return NextResponse.json({ error: 'Campos obrigatórios: ativo, tipo, pe, stop, saida, qtde_total' }, { status: 400 });
  }

  const hoje = body.data ?? new Date().toISOString().split('T')[0];

  const { data, error } = await service.from('operacoes').insert({
    user_id:    tokenRow.user_id,
    data:       hoje,
    dia_semana: body.dia_semana ?? diaSemana(hoje),
    ativo,
    tipo,
    pe:         Number(pe),
    stop:       Number(stop ?? pe),
    qtde_rp:    Number(qtde_rp),
    qtde_total: Number(qtde_total),
    qtde_final: Number(qtde_total) - Number(qtde_rp),
    saida:      Number(saida),
    pts_final:  pts_final != null ? Number(pts_final) : null,
    situacao:   situacao ?? null,
    rs_final:   rs_final != null ? Number(rs_final) : null,
    setup:      setup ?? null,
    obs:        obs ?? 'Importado via Profit Pro',
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getInvestmentTransactions } from '@/lib/pluggy';
import { mapToOperacoes } from '@/lib/pluggyMapper';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Período opcional via body; default = hoje
  const body = await req.json().catch(() => ({}));
  const today = new Date().toISOString().split('T')[0];
  const dateFrom: string = body.dateFrom ?? today;
  const dateTo: string   = body.dateTo   ?? today;

  // Busca itemId do usuário
  const { data: conn } = await supabase
    .from('pluggy_connections')
    .select('item_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!conn?.item_id) {
    return NextResponse.json({ error: 'Nenhuma conta Clear conectada' }, { status: 400 });
  }

  // Busca configurações do usuário para os cálculos
  const { data: cfg } = await supabase
    .from('configuracoes')
    .select('capital, alvo_mult')
    .eq('user_id', user.id)
    .maybeSingle();

  const capital  = cfg?.capital  ?? 2000;
  const alvoMult = cfg?.alvo_mult ?? 1.0;

  try {
    const transactions = await getInvestmentTransactions(conn.item_id, dateFrom, dateTo);
    const ops = mapToOperacoes(transactions, user.id, capital, alvoMult);

    if (ops.length === 0) {
      return NextResponse.json({ imported: 0, message: 'Nenhuma operação WIN/WDO encontrada no período' });
    }

    // Evita duplicatas: verifica data+ativo+pe já existentes
    const { data: existing } = await supabase
      .from('operacoes')
      .select('data, ativo, pe')
      .eq('user_id', user.id)
      .gte('data', dateFrom)
      .lte('data', dateTo);

    const existingSet = new Set(
      (existing ?? []).map(o => `${o.data}_${o.ativo}_${o.pe}`)
    );

    const newOps = ops.filter(
      o => !existingSet.has(`${o.data}_${o.ativo}_${o.pe}`)
    );

    if (newOps.length === 0) {
      return NextResponse.json({ imported: 0, message: 'Operações já importadas para este período' });
    }

    const { error } = await supabase.from('operacoes').insert(newOps);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ imported: newOps.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro na sincronização';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

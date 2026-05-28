import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface OperacaoImport {
  data: string;
  dia_semana: string;
  ativo: string;
  tipo: string;
  pe: number;
  stop: number | null;
  saida: number;
  pts_final: number | null;
  rs_final: number;
  situacao: string;
  qtde_total: number;
  qtde_final: number;
  ambiente: 'real' | 'simulador';
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { operacoes } = await req.json() as { operacoes: OperacaoImport[] };

  if (!Array.isArray(operacoes) || operacoes.length === 0)
    return NextResponse.json({ error: 'Nenhuma operação para importar' }, { status: 400 });

  const rows = operacoes.map(op => ({ ...op, user_id: user.id }));

  const { data, error } = await supabase.from('operacoes').insert(rows).select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ importadas: data?.length ?? 0 });
}

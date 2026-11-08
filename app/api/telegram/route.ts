import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { gerarCodigo, hashCodigo, VALIDADE_MIN, MAX_CODIGOS_HORA, ACEITE_VERSAO } from '@/lib/telegramCodigo';

// Vínculo do Telegram pela conta (plano TraderLog, seção 11). Tudo pela sessão do usuário: o RLS só deixa
// gravar código próprio e ler ou apagar o próprio vínculo. Quem consome o código é o bot, pela função do banco.

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('telegram_vinculos')
    .select('criado_em, revogado_em')
    .eq('user_id', user.id)
    .maybeSingle();
  return NextResponse.json({ vinculo: data ?? null });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { aceite?: boolean };
  if (body.aceite !== true)
    return NextResponse.json({ error: 'Marque o aviso de privacidade para gerar o código.' }, { status: 400 });

  const umaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('telegram_codigos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('criado_em', umaHora);
  if ((count ?? 0) >= MAX_CODIGOS_HORA)
    return NextResponse.json({ error: 'Muitos códigos na última hora. Tente mais tarde.' }, { status: 429 });

  const codigo   = gerarCodigo();
  const agora    = new Date();
  const expiraEm = new Date(agora.getTime() + VALIDADE_MIN * 60 * 1000).toISOString();
  const { error } = await supabase.from('telegram_codigos').insert({
    user_id:       user.id,
    codigo_hash:   hashCodigo(codigo),
    expira_em:     expiraEm,
    aceite_em:     agora.toISOString(),
    aceite_versao: ACEITE_VERSAO,
  });
  if (error) return NextResponse.json({ error: 'Não foi possível gerar o código.' }, { status: 500 });

  // O código só aparece aqui, uma vez; o banco guarda o hash.
  return NextResponse.json({ codigo, expira_em: expiraEm });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('telegram_vinculos').delete().eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'Não foi possível desvincular.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

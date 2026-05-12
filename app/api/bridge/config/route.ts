import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// POST — salva config via cookie (web app)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { profit_key, profit_email } = await req.json();

  const { error } = await supabase.from('bridge_config').upsert({
    user_id:      user.id,
    profit_key:   profit_key   ?? null,
    profit_email: profit_email ?? null,
    updated_at:   new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// GET — retorna config para o bridge Python (usa JWT do Supabase)
export async function GET(req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  const jwt  = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user } } = await service.auth.getUser(jwt);
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data } = await service
    .from('bridge_config')
    .select('profit_key, profit_email')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json(data ?? { profit_key: null, profit_email: null });
}

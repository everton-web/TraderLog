import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const service = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function getUserFromRequest(req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  if (auth.startsWith('Bearer ')) {
    // JWT do bridge (Python)
    const { data: { user } } = await service.auth.getUser(auth.slice(7));
    return user;
  }
  // Cookie da sessão web
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await service
    .from('bridge_config')
    .select('profit_key, profit_email')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json(data ?? { profit_key: null, profit_email: null });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { profit_key, profit_email } = await req.json();

  const { error } = await service.from('bridge_config').upsert({
    user_id: user.id,
    profit_key:   profit_key   ?? null,
    profit_email: profit_email ?? null,
    updated_at:   new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

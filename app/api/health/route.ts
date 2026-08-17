import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const start = Date.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      return NextResponse.json(
        { status: 'error', message: error.message, timestamp: new Date().toISOString() },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: 'ok',
      latency_ms: latency,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: 'unreachable', message: 'Supabase não está respondendo', timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}

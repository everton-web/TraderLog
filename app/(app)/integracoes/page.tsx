import { createClient } from '@/utils/supabase/server';
import AnthropicKeyForm  from '@/components/AnthropicKeyForm';

export default async function IntegracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let geminiKey: string | null = null;
  try {
    const { data } = await supabase
      .from('bridge_config')
      .select('gemini_key')
      .eq('user_id', user!.id)
      .maybeSingle();
    geminiKey = data?.gemini_key ?? null;
  } catch {}

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <div className="card-header">
        <h2 className="card-title">Groq — Chave de API</h2>
        <p className="card-desc" style={{ marginTop: 4 }}>
          Necessária para o <a href="/diario" style={{ color: 'var(--gain)' }}>Diário com IA</a>.
          Gratuito em console.groq.com. Sua chave nunca é compartilhada.
        </p>
      </div>
      <div className="card-body">
        <AnthropicKeyForm hasKey={!!geminiKey} />
      </div>
    </div>
  );
}

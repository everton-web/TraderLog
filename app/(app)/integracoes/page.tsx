import { createClient } from '@/utils/supabase/server';
import PluggyConnect from '@/components/PluggyConnect';
import { formatDate } from '@/lib/formatters';

export default async function IntegracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: conn } = await supabase
    .from('pluggy_connections')
    .select('item_id, updated_at')
    .eq('user_id', user!.id)
    .maybeSingle();

  const connected  = !!conn?.item_id;
  const lastSynced = conn?.updated_at ? formatDate(conn.updated_at.split('T')[0]) : null;

  return (
    <>
      <div className="section-header">
        <h1>Integrações</h1>
        <p className="section-desc">Sincronize operações diretamente da sua corretora</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div className="card-header">
          <h2 className="card-title">Profit Pro · Clear Corretora</h2>
          <p className="card-desc" style={{ marginTop: 4 }}>
            Via <strong>Pluggy</strong> — Open Finance para corretoras brasileiras.
            Após conectar, sincronize as operações do dia com um clique.
          </p>
        </div>
        <div className="card-body">
          <PluggyConnect connected={connected} lastSynced={lastSynced} />
        </div>
      </div>

      <div className="card" style={{ maxWidth: 600, marginTop: 16 }}>
        <div className="card-header">
          <h2 className="card-title">Como funciona</h2>
        </div>
        <div className="card-body">
          <ol className="pluggy-steps">
            <li>Clique em <strong>Conectar conta Clear</strong> — uma janela do Pluggy vai abrir.</li>
            <li>Faça login com suas credenciais da Clear dentro do widget.</li>
            <li>Após conectar, escolha a data e clique em <strong>Sincronizar operações</strong>.</li>
            <li>As operações WIN e WDO do dia são importadas automaticamente.</li>
            <li>O campo <em>Stop</em> não vem da corretora — preencha no histórico depois.</li>
          </ol>
          <p className="pluggy-prereq">
            <strong>Pré-requisito:</strong> você precisa configurar as variáveis{' '}
            <code>PLUGGY_CLIENT_ID</code> e <code>PLUGGY_CLIENT_SECRET</code> no Vercel.
            Crie sua conta de desenvolvedor em{' '}
            <a href="https://pluggy.ai" target="_blank" rel="noopener noreferrer">pluggy.ai</a>.
          </p>
        </div>
      </div>
    </>
  );
}

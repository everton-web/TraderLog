import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { calcEstatisticas } from '@/lib/calculations';
import { fmtRS } from '@/lib/formatters';
import type { Profile, Operacao } from '@/lib/types';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  const { data: allOps }      = await supabase.from('operacoes').select('*');
  const { data: allProfiles } = await supabase.from('profiles').select('*');

  const profiles  = (allProfiles || []) as Profile[];
  const operacoes = (allOps      || []) as Operacao[];

  const hoje = new Date().toISOString().slice(0, 10);

  const alunos = profiles
    .filter(p => p.role === 'estudante')
    .map(p => {
      const ops     = operacoes.filter(o => o.user_id === p.id);
      const opsHoje = ops.filter(o => o.data === hoje);
      const stat    = calcEstatisticas(ops);
      const statHoje = calcEstatisticas(opsHoje);
      return { profile: p, ops, opsHoje, stat, statHoje };
    });

  return (
    <>
      <div className="section-header">
        <h1>Painel Geral de Alunos</h1>
        <p className="section-desc">Acompanhe a performance de cada aluno em tempo real</p>
      </div>

      <div className="table-card">
        <div className="table-wrapper">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Estudante</th>
                <th>Ops Hoje</th>
                <th>Win Rate (total)</th>
                <th>R$ Hoje</th>
                <th>R$ Total</th>
                <th>Total Ops</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {alunos.length === 0 && (
                <tr className="empty-row"><td colSpan={7}>Nenhum aluno cadastrado</td></tr>
              )}
              {alunos.map(({ profile: p, opsHoje, stat, statHoje }) => {
                const overtrade = opsHoje.length >= 10;
                const rsHoje    = statHoje.rsTotal;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.avatar_url && <img src={p.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />}
                        {p.nome || p.id.slice(0, 8)}
                      </div>
                    </td>
                    <td>{overtrade ? <span style={{ color: 'var(--loss)' }}>{opsHoje.length} ⚠️</span> : opsHoje.length}</td>
                    <td className={stat.acerto !== null && stat.acerto >= 0.5 ? 'gain-text' : 'loss-text'}>
                      {stat.acerto !== null ? (stat.acerto * 100).toFixed(1) + '%' : '—'}
                    </td>
                    <td className={rsHoje >= 0 ? 'gain-text' : 'loss-text'}>{fmtRS(rsHoje)}</td>
                    <td className={stat.rsTotal >= 0 ? 'gain-text' : 'loss-text'} style={{ fontWeight: 700 }}>{fmtRS(stat.rsTotal)}</td>
                    <td>{stat.total}</td>
                    <td>
                      {overtrade
                        ? <span className="badge badge-loss">Overtrade</span>
                        : <span className="badge badge-gain">Normal</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

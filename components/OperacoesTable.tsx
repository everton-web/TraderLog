'use client';
import { useState } from 'react';
import { deletarOperacao } from '@/lib/actions';
import { useToast } from './Toast';
import type { Operacao } from '@/lib/types';
import { formatDate, fmtRS, fmtPts, fmtPct } from '@/lib/formatters';

export default function OperacoesTable({ ops, limit }: { ops: Operacao[]; limit?: number }) {
  const { showToast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const displayed = limit ? ops.slice(0, limit) : ops;

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta operação?')) return;
    setDeletingId(id);
    const res = await deletarOperacao(id);
    if (res?.error) showToast('Erro ao excluir: ' + res.error, 'error');
    else showToast('Operação excluída', 'success');
    setDeletingId(null);
  };

  const badgeClass = (s: string | null) =>
    s === 'Gain' ? 'badge badge-gain' : s === 'Loss' ? 'badge badge-loss' : 'badge badge-pe';

  if (displayed.length === 0) {
    return (
      <table className="ops-table">
        <tbody><tr className="empty-row"><td colSpan={12}>Nenhuma operação registrada</td></tr></tbody>
      </table>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="ops-table">
        <thead>
          <tr>
            <th>#</th><th>Data</th><th>Dia</th><th>Ativo</th><th>Tipo</th>
            <th>PE</th><th>Stop</th><th>Saída</th><th>Pts</th><th>Qtde</th>
            <th>R$ Final</th><th>Situação</th><th></th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((op, i) => (
            <tr key={op.id}>
              <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
              <td>{formatDate(op.data)}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: 10 }}>{op.dia_semana}</td>
              <td><span style={{ fontWeight: 700 }}>{op.ativo}</span></td>
              <td style={{ color: op.tipo === 'Compra' ? 'var(--gain)' : 'var(--loss)' }}>{op.tipo}</td>
              <td className="mono">{op.pe?.toLocaleString('pt-BR')}</td>
              <td className="mono">{op.stop?.toLocaleString('pt-BR')}</td>
              <td className="mono">{op.saida?.toLocaleString('pt-BR') ?? '—'}</td>
              <td className={op.pts_final != null && op.pts_final > 0 ? 'gain-text' : op.pts_final != null && op.pts_final < 0 ? 'loss-text' : ''}>
                {fmtPts(op.pts_final)}
              </td>
              <td>{op.qtde_total}</td>
              <td className={op.rs_final != null && op.rs_final > 0 ? 'gain-text' : op.rs_final != null && op.rs_final < 0 ? 'loss-text' : ''} style={{ fontWeight: 700 }}>
                {fmtRS(op.rs_final)}
              </td>
              <td><span className={badgeClass(op.situacao)}>{op.situacao ?? '—'}</span></td>
              <td>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '2px 8px', fontSize: 10 }}
                  onClick={() => handleDelete(op.id)}
                  disabled={deletingId === op.id}
                >
                  {deletingId === op.id ? '...' : '✕'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

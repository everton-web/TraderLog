'use client';
import { useState } from 'react';
import { deletarOperacao } from '@/lib/actions';
import { useToast } from './Toast';
import { Trash2 } from 'lucide-react';
import type { Operacao, RowEnriquecida } from '@/lib/types';
import { formatDate, fmtRS, fmtPts, fmtPct } from '@/lib/formatters';

interface Props {
  ops?: Operacao[];
  rows?: RowEnriquecida[];
  limit?: number;
  showDrawdown?: boolean;
}

export default function OperacoesTable({ ops, rows, limit, showDrawdown = false }: Props) {
  const { showToast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Modo enriquecido (histórico com drawdown)
  if (showDrawdown && rows) {
    const displayed = limit ? rows.slice(0, limit) : rows;

    if (displayed.length === 0) {
      return (
        <table className="ops-table">
          <tbody><tr className="empty-row"><td colSpan={16}>Nenhuma operação registrada</td></tr></tbody>
        </table>
      );
    }

    return (
      <div className="table-wrapper">
        <table className="ops-table">
          <thead>
            <tr>
              <th>#</th><th>Data</th><th>Ativo</th><th>Tipo</th>
              <th>PE</th><th>Stop</th><th>Risco pts</th><th>Saída</th>
              <th>Pts</th><th>Qtde</th><th>% Risco</th><th>R$ Final</th>
              <th>Capital Ac.</th><th>Topo</th><th>DD%</th>
              <th>Sit.</th><th></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((row) => {
              const op = row.op;
              const isLoss  = op.situacao === 'Loss';
              const isHighDD = row.ddPct > 0.15;

              const rowStyle: React.CSSProperties = isHighDD
                ? { background: 'rgba(245,158,11,0.07)', borderLeft: '2px solid var(--pe-color)' }
                : isLoss
                ? { background: 'rgba(239,68,68,0.04)' }
                : {};

              return (
                <tr key={op.id} style={rowStyle}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{row.seq}</td>
                  <td>{formatDate(op.data)}</td>
                  <td><span style={{ fontWeight: 700 }}>{op.ativo}</span></td>
                  <td style={{ color: op.tipo === 'Compra' ? 'var(--gain)' : 'var(--loss)' }}>{op.tipo}</td>
                  <td className="mono">{op.pe?.toLocaleString('pt-BR')}</td>
                  <td className="mono">{op.stop?.toLocaleString('pt-BR')}</td>
                  <td className="mono" style={{ color: 'var(--text-muted)' }}>
                    {op.risco_pts != null ? op.risco_pts.toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="mono">{op.saida?.toLocaleString('pt-BR') ?? '—'}</td>
                  <td className={op.pts_final != null && op.pts_final > 0 ? 'gain-text' : op.pts_final != null && op.pts_final < 0 ? 'loss-text' : ''}>
                    {fmtPts(op.pts_final)}
                  </td>
                  <td>{op.qtde_total}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {row.pctRiscoCapital != null ? (row.pctRiscoCapital * 100).toFixed(1) + '%' : '—'}
                  </td>
                  <td className={op.rs_final != null && op.rs_final > 0 ? 'gain-text' : op.rs_final != null && op.rs_final < 0 ? 'loss-text' : ''} style={{ fontWeight: 700 }}>
                    {fmtRS(op.rs_final)}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{fmtRS(row.capitalAcumulado)}</td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtRS(row.topo)}</td>
                  <td style={{
                    fontWeight: 700,
                    fontSize: 12,
                    color: row.ddPct > 0.15 ? 'var(--pe-color)' : row.ddPct > 0 ? 'var(--loss)' : 'var(--text-muted)',
                  }}>
                    {row.ddPct > 0 ? '-' + (row.ddPct * 100).toFixed(1) + '%' : '—'}
                  </td>
                  <td><span className={badgeClass(op.situacao)}>{op.situacao ?? '—'}</span></td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '2px 8px', fontSize: 10 }}
                      onClick={() => handleDelete(op.id)}
                      disabled={deletingId === op.id}
                    >
                      {deletingId === op.id ? '...' : <Trash2 size={12} strokeWidth={1.75} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Modo simples (dashboard e outros)
  const simpleOps = ops ?? [];
  const displayed = limit ? simpleOps.slice(0, limit) : simpleOps;

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
                  {deletingId === op.id ? '...' : <Trash2 size={12} strokeWidth={1.75} />}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

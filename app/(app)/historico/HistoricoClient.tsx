'use client';
import { useState, useMemo } from 'react';
import OperacoesTable from '@/components/OperacoesTable';
import { calcEstatisticas, gerarCSV } from '@/lib/calculations';
import { fmtRS, fmtPct } from '@/lib/formatters';
import type { Operacao } from '@/lib/types';

export default function HistoricoClient({ ops }: { ops: Operacao[] }) {
  const [filterAtivo, setFilterAtivo] = useState('');
  const [filterSit,   setFilterSit]   = useState('');
  const [filterDe,    setFilterDe]    = useState('');
  const [filterAte,   setFilterAte]   = useState('');

  const filtered = useMemo(() => ops.filter(o => {
    if (filterAtivo && o.ativo !== filterAtivo) return false;
    if (filterSit   && o.situacao !== filterSit) return false;
    if (filterDe    && o.data < filterDe) return false;
    if (filterAte   && o.data > filterAte) return false;
    return true;
  }), [ops, filterAtivo, filterSit, filterDe, filterAte]);

  const stat = calcEstatisticas(filtered);

  const downloadCSV = () => {
    const csv = gerarCSV([...filtered].reverse());
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `traderlog_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="section-header">
        <h1>Histórico de Operações</h1>
        <p className="section-desc">Todas as operações registradas</p>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Ativo</label>
          <select className="filter-select" value={filterAtivo} onChange={e => setFilterAtivo(e.target.value)}>
            <option value="">Todos</option>
            <option value="WIN">WIN</option>
            <option value="WDO">WDO</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Situação</label>
          <select className="filter-select" value={filterSit} onChange={e => setFilterSit(e.target.value)}>
            <option value="">Todas</option>
            <option value="Gain">Gain</option>
            <option value="Loss">Loss</option>
            <option value="PE">PE</option>
          </select>
        </div>
        <div className="filter-group">
          <label>De</label>
          <input type="date" className="filter-input" value={filterDe} onChange={e => setFilterDe(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Até</label>
          <input type="date" className="filter-input" value={filterAte} onChange={e => setFilterAte(e.target.value)} />
        </div>
        <button className="btn btn-ghost" onClick={() => { setFilterAtivo(''); setFilterSit(''); setFilterDe(''); setFilterAte(''); }}>
          ✕ Limpar
        </button>
        <button className="btn btn-secondary" onClick={downloadCSV} style={{ marginLeft: 'auto' }}>
          ⬇️ Baixar CSV
        </button>
      </div>

      {filtered.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          {filtered.length} operações — R$ Total: <strong style={{ color: stat.rsTotal >= 0 ? 'var(--gain)' : 'var(--loss)' }}>{fmtRS(stat.rsTotal)}</strong>
          {' · '}Acerto: <strong>{stat.acerto !== null ? (stat.acerto * 100).toFixed(1) + '%' : '—'}</strong>
        </div>
      )}

      <div className="table-card">
        <OperacoesTable ops={filtered} />
      </div>
    </>
  );
}

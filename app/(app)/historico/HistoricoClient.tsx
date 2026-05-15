'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import OperacoesTable from '@/components/OperacoesTable';
import { calcEstatisticas, gerarCSV } from '@/lib/calculations';
import { enriquecerLinhas } from '@/lib/SizingEngine';
import { fmtRS } from '@/lib/formatters';
import { X, Download, Trash2, CheckSquare } from 'lucide-react';
import { deletarOperacoes } from '@/lib/actions';
import { useToast } from '@/components/Toast';
import type { Operacao } from '@/lib/types';

export default function HistoricoClient({
  ops,
  capitalInicial,
}: {
  ops: Operacao[];
  capitalInicial: number;
}) {
  const { showToast } = useToast();
  const [filterAtivo, setFilterAtivo] = useState('');
  const [filterSit,   setFilterSit]   = useState('');
  const [filterDe,    setFilterDe]    = useState('');
  const [filterAte,   setFilterAte]   = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting]       = useState(false);

  // ops chegam em ordem decrescente do servidor — inverte para cálculo acumulado
  const opsAsc = useMemo(() => [...ops].reverse(), [ops]);

  // Enriquece TODAS as linhas (capital acumulado e drawdown consideram o histórico completo)
  const todasEnriquecidas = useMemo(
    () => enriquecerLinhas(opsAsc, capitalInicial),
    [opsAsc, capitalInicial],
  );

  // Filtra e re-inverte para exibição (mais recentes no topo)
  const rowsFiltradas = useMemo(() => {
    const filtradas = todasEnriquecidas.filter(row => {
      const o = row.op;
      if (filterAtivo && o.ativo !== filterAtivo) return false;
      if (filterSit   && o.situacao !== filterSit) return false;
      if (filterDe    && o.data < filterDe) return false;
      if (filterAte   && o.data > filterAte) return false;
      return true;
    });
    return [...filtradas].reverse();
  }, [todasEnriquecidas, filterAtivo, filterSit, filterDe, filterAte]);

  // Limpa seleção quando os filtros mudam
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filterAtivo, filterSit, filterDe, filterAte]);

  const opsExibidas = rowsFiltradas.map(r => r.op);
  const stat = useMemo(() => calcEstatisticas(opsExibidas, capitalInicial), [opsExibidas, capitalInicial]);

  // ─── Seleção ────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((allIds: string[]) => {
    setSelectedIds(prev => {
      const allSelected = allIds.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) allIds.forEach(id => next.delete(id));
      else allIds.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const clearSelection = () => setSelectedIds(new Set());

  // ─── Ações em lote ──────────────────────────────────────
  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selectedIds.size} operação(ões) selecionada(s)? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    const ids = [...selectedIds];
    const res = await deletarOperacoes(ids);
    setDeleting(false);
    if (res?.error) showToast('Erro ao excluir: ' + res.error, 'error');
    else { showToast(`${ids.length} operação(ões) excluída(s)`, 'success'); clearSelection(); }
  };

  const handleBulkCSV = () => {
    const opsSelected = opsExibidas.filter(op => selectedIds.has(op.id));
    const csv = gerarCSV(opsSelected);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `traderlog_selecionadas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const csv = gerarCSV(opsExibidas);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `traderlog_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasSelection = selectedIds.size > 0;

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
          <X size={12} strokeWidth={2} /> Limpar
        </button>
        <button className="btn btn-secondary" onClick={downloadCSV} style={{ marginLeft: 'auto' }}>
          <Download size={13} strokeWidth={1.75} /> Baixar CSV
        </button>
      </div>

      {rowsFiltradas.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          {rowsFiltradas.length} operações — R$ Total:{' '}
          <strong style={{ color: stat.rsTotal >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
            {fmtRS(stat.rsTotal)}
          </strong>
          {' · '}Acerto:{' '}
          <strong>{stat.acerto !== null ? (stat.acerto * 100).toFixed(1) + '%' : '—'}</strong>
          {stat.drawdown != null && (
            <>{' · '}DD Máx: <strong style={{ color: stat.drawdown > 0.15 ? 'var(--pe-color)' : 'var(--loss)' }}>
              -{(stat.drawdown * 100).toFixed(1)}%
            </strong></>
          )}
        </div>
      )}

      {/* Toolbar de seleção */}
      {hasSelection && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          marginBottom: 10,
          borderRadius: 8,
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.25)',
          fontSize: 13,
        }}>
          <CheckSquare size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
            {selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={handleBulkCSV}
            >
              <Download size={13} strokeWidth={1.75} /> Baixar CSV
            </button>
            <button
              className="btn btn-ghost"
              style={{
                fontSize: 12, padding: '4px 12px',
                display: 'flex', alignItems: 'center', gap: 5,
                color: 'var(--loss)', opacity: deleting ? 0.5 : 1,
              }}
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              <Trash2 size={13} strokeWidth={1.75} />
              {deleting ? 'Excluindo...' : 'Excluir selecionadas'}
            </button>
          </div>
          <button
            className="btn btn-ghost"
            style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px' }}
            onClick={clearSelection}
          >
            <X size={11} /> Desmarcar
          </button>
        </div>
      )}

      <div className="table-card">
        <OperacoesTable
          rows={rowsFiltradas}
          showDrawdown
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
        />
      </div>
    </>
  );
}

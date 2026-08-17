'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Upload, FileText, CheckSquare, Square, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { fmtRS } from '@/lib/formatters';
import type { Ambiente } from '@/lib/ambiente';

const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

interface ParsedOp {
  _key:       string;
  data:       string;
  dia_semana: string;
  ativo:      'WIN' | 'WDO' | 'BIT';
  tipo:       'Compra' | 'Venda';
  pe:         number;
  stop:       number | null;
  ambiente:   Ambiente;
  saida:      number;
  pts_final:  number | null;
  rs_final:   number;
  situacao:   'Gain' | 'Loss' | 'PE';
  qtde_total: number;
  qtde_final: number;
  hora:       string;
}

function parsePTBR(s: string): number {
  const t = s.trim();
  if (!t || t === '0') return 0;
  return parseFloat(t.replace(/\./g, '').replace(',', '.')) || 0;
}

function parseProfit(text: string): { ops: ParsedOp[]; fileDate: string | null } {
  const lines = text.split(/\r?\n/);

  // Detect date from header line "Data: DD/MM/YYYY"
  let fileDate: string | null = null;
  for (const l of lines) {
    const m = l.match(/Data:\s*(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) { fileDate = `${m[3]}-${m[2]}-${m[1]}`; break; }
  }

  // Find column header line
  const headerIdx = lines.findIndex(l => l.trimStart().startsWith('Ativo'));
  if (headerIdx === -1) return { ops: [], fileDate };

  const ops: ParsedOp[] = [];

  for (const line of lines.slice(headerIdx + 1)) {
    if (!line.trim() || !line.includes(';')) continue;
    const c = line.split(';');
    if (c.length < 13) continue;

    const ticker = c[0].trim();
    const ativo: 'WIN' | 'WDO' | 'BIT' | null =
      ticker.startsWith('WIN') ? 'WIN' :
      ticker.startsWith('WDO') ? 'WDO' :
      ticker.startsWith('BIT') ? 'BIT' : null;
    if (!ativo) continue;

    // Parse entry datetime "26/05/2026 10:05:23"
    const [datePart, timePart = ''] = c[1].trim().split(' ');
    const [dd, mm, yyyy] = datePart.split('/');
    if (!dd || !mm || !yyyy) continue;
    const data = `${yyyy}-${mm}-${dd}`;
    const hora = timePart.substring(0, 5); // HH:MM

    const lado       = c[6].trim(); // 'C' | 'V'
    const precCompra = parsePTBR(c[7]);
    const precVenda  = parsePTBR(c[8]);

    // Short (V): entered by selling → pe=venda, saída=compra
    // Long  (C): entered by buying  → pe=compra, saída=venda
    const tipo:  'Compra' | 'Venda' = lado === 'C' ? 'Compra' : 'Venda';
    const pe    = lado === 'C' ? precCompra : precVenda;
    const saida = lado === 'C' ? precVenda  : precCompra;

    const rsFloat  = parsePTBR(c[11]);
    const ptsFloat = parsePTBR(c[12]);

    const rs_final  = Math.round(rsFloat  * 100) / 100;
    const pts_final = ptsFloat !== 0 ? Math.round(ptsFloat) : 0;

    const situacao: 'Gain' | 'Loss' | 'PE' =
      rs_final > 0 ? 'Gain' : rs_final < 0 ? 'Loss' : 'PE';

    const qtde = Math.max(parseInt(c[4]) || 1, parseInt(c[5]) || 1);

    const dateObj  = new Date(`${yyyy}-${mm}-${dd}T12:00:00`);
    const dia_semana = DIAS[dateObj.getDay()];

    ops.push({
      _key: `${data}-${ativo}-${pe}-${saida}-${rs_final}-${hora}`,
      data, dia_semana, ativo, tipo, pe, stop: null,
      saida, pts_final, rs_final, situacao,
      qtde_total: qtde, qtde_final: qtde, hora, ambiente: 'real' as Ambiente, // sobrescrito em doImport
    });
  }

  return { ops, fileDate };
}

type Step = 'upload' | 'preview' | 'done';

export default function ImportarClient({ ambiente }: { ambiente: Ambiente }) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [step,      setStep]      = useState<Step>('upload');
  const [dragging,  setDragging]  = useState(false);
  const [fileName,  setFileName]  = useState('');
  const [fileDate,  setFileDate]  = useState<string | null>(null);
  const [ops,       setOps]       = useState<ParsedOp[]>([]);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [imported,  setImported]  = useState(0);

  function processFile(file: File) {
    setFileName(file.name);
    setError('');
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const { ops: parsed, fileDate: fd } = parseProfit(text);
      if (parsed.length === 0) {
        setError('Nenhuma operação encontrada. Verifique se é um CSV do Profit.');
        return;
      }
      setOps(parsed);
      setFileDate(fd);
      setSelected(new Set(parsed.map(o => o._key)));
      setStep('preview');
    };
    reader.readAsText(file, 'windows-1252');
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleAll() {
    setSelected(s => s.size === ops.length ? new Set() : new Set(ops.map(o => o._key)));
  }

  function toggleOne(key: string) {
    setSelected(s => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  async function doImport() {
    setLoading(true);
    setError('');
    const toImport = ops
      .filter(o => selected.has(o._key))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ _key, hora, ...rest }) => ({ ...rest, ambiente }));

    try {
      const res  = await fetch('/api/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operacoes: toImport }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erro ao importar'); return; }
      setImported(data.importadas);
      setStep('done');
    } finally {
      setLoading(false);
    }
  }

  const fmtDataBR = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const countSel = selected.size;

  // ── Upload ─────────────────────────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="page-content" style={{ maxWidth: 560 }}>
      <div className="dash-chart-card">
        <div style={{ marginBottom: 20 }}>
          <div className="dash-chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Upload size={16} style={{ color: 'var(--gain)' }} /> Importar do Profit
          </div>
          <div className="dash-chart-sub">Selecione o arquivo CSV exportado pelo Profit Pro / Profit Chart</div>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragging ? 'var(--gain)' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'rgba(16,185,129,0.05)' : 'var(--bg-surface)',
            transition: 'all .15s',
          }}
        >
          <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 4 }}>
            Arraste o CSV aqui ou clique para selecionar
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Arquivo .csv exportado do Profit</div>
        </div>

        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={onFileInput} />

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 'var(--text-sm)', color: 'var(--loss)' }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Como exportar no Profit:</strong><br />
          Relatórios → Operações do Dia → Exportar CSV
        </div>
      </div>
    </div>
  );

  // ── Preview ────────────────────────────────────────────────────────────────
  if (step === 'preview') {
    const totalRS  = ops.filter(o => selected.has(o._key)).reduce((s, o) => s + o.rs_final, 0);
    const gains    = ops.filter(o => selected.has(o._key) && o.situacao === 'Gain').length;
    const losses   = ops.filter(o => selected.has(o._key) && o.situacao === 'Loss').length;

    return (
      <div className="page-content">
        {/* Header card */}
        <div className="dash-chart-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="dash-chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <FileText size={15} style={{ color: 'var(--gain)' }} /> {fileName}
              </div>
              <div className="dash-chart-sub">
                {fileDate ? fmtDataBR(fileDate) : '—'} · {ops.length} operações encontradas
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ fontSize: 'var(--text-xs)' }} onClick={() => { setStep('upload'); setError(''); }}>
                <X size={12} /> Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ fontSize: 'var(--text-xs)' }}
                onClick={doImport}
                disabled={loading || countSel === 0}
              >
                {loading
                  ? <><Loader2 size={12} className="spin" /> Importando...</>
                  : <><Upload size={12} /> Importar {countSel} operaç{countSel === 1 ? 'ão' : 'ões'}</>}
              </button>
            </div>
          </div>

          {/* Mini stats */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Selecionadas</span>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{countSel}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gains / Losses</span>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                <span style={{ color: 'var(--gain)' }}>{gains}G</span>
                {' · '}
                <span style={{ color: 'var(--loss)' }}>{losses}L</span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Resultado</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: totalRS >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                {totalRS >= 0 ? '+' : ''}{fmtRS(totalRS)}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 'var(--text-sm)', color: 'var(--loss)' }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">Prévia das operações</span>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 'var(--text-xs)' }}
              onClick={toggleAll}
            >
              {countSel === ops.length
                ? <><Square size={12} /> Desmarcar todos</>
                : <><CheckSquare size={12} /> Marcar todos</>}
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="ops-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Hora</th>
                  <th>Ativo</th>
                  <th>Tipo</th>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th>Pts</th>
                  <th>R$</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {ops.map(op => {
                  const sel = selected.has(op._key);
                  const sitColor = op.situacao === 'Gain' ? 'var(--gain)' : op.situacao === 'Loss' ? 'var(--loss)' : 'var(--pe-color)';
                  return (
                    <tr
                      key={op._key}
                      onClick={() => toggleOne(op._key)}
                      style={{ cursor: 'pointer', opacity: sel ? 1 : 0.4 }}
                    >
                      <td>
                        {sel
                          ? <CheckSquare size={14} style={{ color: 'var(--gain)' }} />
                          : <Square size={14} style={{ color: 'var(--text-muted)' }} />}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{op.hora}</td>
                      <td>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: '#fff',
                          background: op.ativo === 'WIN' ? '#2563eb' : '#7c3aed',
                          borderRadius: 4, padding: '1px 6px',
                        }}>
                          {op.ativo}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{op.tipo}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {op.pe.toLocaleString('pt-BR')}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {op.saida.toLocaleString('pt-BR')}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: sitColor }}>
                        {op.pts_final != null ? `${op.pts_final > 0 ? '+' : ''}${op.pts_final}` : '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: sitColor }}>
                        {op.rs_final >= 0 ? '+' : ''}{fmtRS(op.rs_final)}
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, color: sitColor }}>
                          {op.situacao}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  return (
    <div className="page-content" style={{ maxWidth: 480 }}>
      <div className="dash-chart-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <CheckCircle2 size={48} style={{ color: 'var(--gain)', marginBottom: 16 }} />
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 6 }}>
          {imported} {imported === 1 ? 'operação importada' : 'operações importadas'}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 24 }}>
          {fileDate ? `Pregão de ${fmtDataBR(fileDate)}` : ''} registrado no TraderLog.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost"
            onClick={() => { setStep('upload'); setFileName(''); setOps([]); setError(''); }}
          >
            Importar outro arquivo
          </button>
          <Link href="/historico" className="btn btn-primary">
            Ver no Histórico →
          </Link>
        </div>
      </div>
    </div>
  );
}

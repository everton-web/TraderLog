'use client';
import { useState, useCallback } from 'react';
import { salvarOperacao } from '@/lib/actions';
import { calcular } from '@/lib/calculations';
import { useToast } from './Toast';
import { hojeISO, diaSemana, fmtRS, fmtPts, fmtPct } from '@/lib/formatters';
import type { Ativo, TipoOp, Configuracao } from '@/lib/types';

export default function OperacaoForm({ config }: { config: Configuracao | null }) {
  const { showToast } = useToast();
  const [ativo, setAtivo]       = useState<Ativo>('WIN');
  const [tipo, setTipo]         = useState<TipoOp>('Compra');
  const [data, setData]         = useState(hojeISO());
  const [pe, setPe]             = useState('');
  const [stop, setStop]         = useState('');
  const [saida, setSaida]       = useState('');
  const [qtdeRP, setQtdeRP]     = useState('0');
  const [qtdeTotal, setQtdeTotal] = useState(config?.mao_fixa ? String(config.contratos_fixos || 1) : '1');
  const [setup, setSetup]       = useState('');
  const [obs, setObs]           = useState('');
  const [saving, setSaving]     = useState(false);

  const capital = config ? config.capital : 2000;
  const alvoMult = config?.alvo_mult ?? 1.0;

  const calc = calcular({
    ativo, tipo,
    pe:   pe    ? Number(pe)    : null,
    stop: stop  ? Number(stop)  : null,
    saida: saida ? Number(saida) : null,
    qtdeRP:    Number(qtdeRP) || 0,
    qtdeTotal: Number(qtdeTotal) || 1,
    alvoMult,
    capital,
  });

  const reset = useCallback(() => {
    setAtivo('WIN'); setTipo('Compra'); setData(hojeISO());
    setPe(''); setStop(''); setSaida('');
    setQtdeRP('0'); setQtdeTotal(config?.mao_fixa ? String(config.contratos_fixos || 1) : '1');
    setSetup(''); setObs('');
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pe || !stop || !saida || !data) { showToast('Preencha PE, Stop e Saída', 'error'); return; }
    setSaving(true);
    const res = await salvarOperacao({
      data, dia_semana: diaSemana(data),
      ativo, tipo,
      pe: Number(pe), stop: Number(stop),
      risco_pts: calc.riscoPts,
      alvo1: calc.alvo1,
      qtde_rp:    Number(qtdeRP) || 0,
      qtde_total: Number(qtdeTotal) || 1,
      qtde_final: calc.qtdeFinal,
      saida: Number(saida),
      pts_final: calc.ptsFinal,
      situacao:  calc.situacao,
      rs_final:  calc.rsFinal,
      pct_risco: calc.pctRisco,
      setup, obs,
    });
    setSaving(false);
    if (res?.error) showToast('Erro: ' + res.error, 'error');
    else { showToast('Operação salva com sucesso!', 'success'); reset(); }
  };

  const showPreview = pe || saida;

  return (
    <form onSubmit={handleSubmit} className="form-container" autoComplete="off">
      {/* Row 1 */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Ativo</label>
          <div className="toggle-group">
            <button type="button" className={`toggle-btn${ativo === 'WIN' ? ' active' : ''}`} onClick={() => setAtivo('WIN')}>WIN</button>
            <button type="button" className={`toggle-btn${ativo === 'WDO' ? ' active' : ''}`} onClick={() => setAtivo('WDO')}>WDO</button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="data">Data</label>
          <input type="date" id="data" className="form-input" value={data} onChange={e => setData(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Direção</label>
          <div className="toggle-group">
            <button type="button" className={`toggle-btn toggle-compra${tipo === 'Compra' ? ' active' : ''}`} onClick={() => setTipo('Compra')}>▲ Compra</button>
            <button type="button" className={`toggle-btn toggle-venda${tipo === 'Venda' ? ' active' : ''}`} onClick={() => setTipo('Venda')}>▼ Venda</button>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="pe">PE (Entrada)</label>
          <input type="number" id="pe" className="form-input mono" placeholder="130.000" step="1" value={pe} onChange={e => setPe(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="stop">Stop</label>
          <input type="number" id="stop" className="form-input mono" placeholder="129.500" step="1" value={stop} onChange={e => setStop(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Risco (pts) <span className="auto-badge">AUTO</span></label>
          <div className={`auto-value${calc.riscoPts !== null ? ' filled' : ''}`}>
            {calc.riscoPts !== null ? calc.riscoPts.toLocaleString('pt-BR') : '—'}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Alvo 1 <span className="auto-badge">AUTO</span></label>
          <div className={`auto-value${calc.alvo1 !== null ? ' filled' : ''}`}>
            {calc.alvo1 !== null ? calc.alvo1.toLocaleString('pt-BR') : '—'}
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="qtdeTotal">Qtde Total</label>
          <input type="number" id="qtdeTotal" className="form-input mono" min="1" step="1" value={qtdeTotal} onChange={e => setQtdeTotal(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="qtdeRP">Qtde RP</label>
          <input type="number" id="qtdeRP" className="form-input mono" min="0" step="1" value={qtdeRP} onChange={e => setQtdeRP(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="saida">Saída Final</label>
          <input type="number" id="saida" className="form-input mono" placeholder="130.100" step="1" value={saida} onChange={e => setSaida(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Qtde Final <span className="auto-badge">AUTO</span></label>
          <div className="auto-value filled">{calc.qtdeFinal}</div>
        </div>
      </div>

      {/* Row 4 */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Situação <span className="auto-badge">AUTO</span></label>
          <div className={`situacao-display${calc.situacao ? ' ' + calc.situacao.toLowerCase() : ''}`}>
            {calc.situacao === 'Gain' ? '✅ GAIN' : calc.situacao === 'Loss' ? '❌ LOSS' : calc.situacao === 'PE' ? '🟡 PE' : '—'}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Pts Final <span className="auto-badge">AUTO</span></label>
          <div className={`auto-value${calc.ptsFinal !== null ? ' filled ' + (calc.ptsFinal > 0 ? 'gain-value' : calc.ptsFinal < 0 ? 'loss-value' : '') : ''}`}>
            {fmtPts(calc.ptsFinal)}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">R$ Final <span className="auto-badge">AUTO</span></label>
          <div className={`auto-value large-value${calc.rsFinal !== null ? ' filled ' + (calc.rsFinal > 0 ? 'gain-value' : calc.rsFinal < 0 ? 'loss-value' : '') : ''}`}>
            {fmtRS(calc.rsFinal)}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">% Risco <span className="auto-badge">AUTO</span></label>
          <div className={`auto-value${calc.pctRisco !== null ? ' filled' : ''}`}>
            {fmtPct(calc.pctRisco)}
          </div>
        </div>
      </div>

      {/* Row 5 - Setup / Obs */}
      <div className="form-row">
        <div className="form-group form-group--wide">
          <label className="form-label" htmlFor="setup">Setup (opcional)</label>
          <input type="text" id="setup" className="form-input" placeholder="IFR2, Rompimento, Topo Duplo..." value={setup} onChange={e => setSetup(e.target.value)} />
        </div>
        <div className="form-group form-group--wide">
          <label className="form-label" htmlFor="obs">Observações (opcional)</label>
          <input type="text" id="obs" className="form-input" placeholder="Notas sobre a operação..." value={obs} onChange={e => setObs(e.target.value)} />
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="preview-card visible">
          <div className="preview-title">Preview da Operação</div>
          <div className="preview-grid">
            {[
              ['Ativo', ativo], ['Tipo', tipo], ['Data', data],
              ['PE', pe || '—'], ['Stop', stop || '—'],
              ['Risco pts', calc.riscoPts?.toLocaleString('pt-BR') ?? '—'],
              ['Alvo 1', calc.alvo1?.toLocaleString('pt-BR') ?? '—'],
              ['Qtde Total', qtdeTotal],
              ['Saída', saida || '—'],
              ['Pts Final', fmtPts(calc.ptsFinal)],
              ['Situação', calc.situacao ?? '—'],
              ['R$ Final', fmtRS(calc.rsFinal)],
            ].map(([label, value]) => (
              <div key={label} className="preview-item">
                <span className="preview-item-label">{label}</span>
                <span className={`preview-item-value${label === 'R$ Final' && calc.rsFinal != null ? (calc.rsFinal > 0 ? ' gain-text' : ' loss-text') : ''}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={reset}>🗑 Limpar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : '✅ Salvar Operação'}
        </button>
      </div>
    </form>
  );
}

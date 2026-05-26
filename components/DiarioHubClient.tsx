'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Save, Sparkles, Loader2, CheckCircle2, AlertCircle, FileDown, Sunrise } from 'lucide-react';
import OperacaoForm from './OperacaoForm';
import type { Configuracao } from '@/lib/types';

type Mercado      = 'lateral' | 'tendencia_alta' | 'tendencia_baixa' | 'volatil';
type PlanoSeguido = 'sim' | 'parcialmente' | 'nao';

interface TodayOp {
  id:        string;
  ativo:     string;
  tipo:      string;
  setup:     string | null;
  pts_final: number | null;
  situacao:  string | null;
  rs_final:  number | null;
}

interface InitialEntry {
  mercado?:       string | null;
  atr_pts?:       number | null;
  adx_valor?:     number | null;
  ativo_ref?:     string | null;
  abertura?:      number | null;
  maximo?:        number | null;
  minimo?:        number | null;
  fechamento?:    number | null;
  plano_dia?:     string | null;
  plano_seguido?: string | null;
  emocional?:     number | null;
  ajustes?:       string | null;
  observacoes?:   string | null;
  analise_ia?:    string | null;
}

interface Props {
  config:       Configuracao | null;
  todayOps:     TodayOp[];
  initialEntry: InitialEntry | null;
}

const MERCADO_OPTIONS: { value: Mercado; label: string }[] = [
  { value: 'lateral',         label: 'Lateral' },
  { value: 'tendencia_alta',  label: 'Tend. Alta' },
  { value: 'tendencia_baixa', label: 'Tend. Baixa' },
  { value: 'volatil',         label: 'Volátil' },
];

const PLANO_OPTIONS: { value: PlanoSeguido; label: string }[] = [
  { value: 'sim',          label: 'Sim' },
  { value: 'parcialmente', label: 'Parcialmente' },
  { value: 'nao',          label: 'Não' },
];

const EMOCIONAL_LABEL: Record<number, string> = {
  1: 'Péssimo', 2: 'Ruim', 3: 'Neutro', 4: 'Bom', 5: 'Excelente',
};

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function renderAnalise(text: string) {
  return text.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} style={{ height: 5 }} />;
    if (/^##\s/.test(t))
      return <p key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: i === 0 ? 0 : 14, fontSize: 'var(--text-base)', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>{t.replace(/^#+\s/, '')}</p>;
    if (/^#\s/.test(t))
      return <p key={i} style={{ fontWeight: 800, color: 'var(--text-primary)', marginTop: i === 0 ? 0 : 16, fontSize: 'var(--text-md)' }}>{t.replace(/^#+\s/, '')}</p>;
    if (/^\*\*.*\*\*$/.test(t))
      return <p key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, fontSize: 'var(--text-base)' }}>{t.replace(/\*\*/g, '')}</p>;
    if (/^\d+\.\s/.test(t))
      return <p key={i} style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 8, fontSize: 'var(--text-base)' }}>{t.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
    if (/^[-•*]\s/.test(t))
      return <p key={i} style={{ paddingLeft: 14, color: 'var(--text-secondary)', fontSize: 'var(--text-base)', marginTop: 4, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 2, color: 'var(--gain)' }}>•</span>
        {t.replace(/^[-•*]\s/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
      </p>;
    return <p key={i} style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', marginTop: 3 }}>{t.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
  });
}

export default function DiarioHubClient({ config, todayOps, initialEntry }: Props) {
  const router = useRouter();
  const today  = getToday();

  // Visibilidade do form de operação
  const [showForm, setShowForm] = useState(false);

  // Contexto de mercado
  const [ativoRef,    setAtivoRef]    = useState(initialEntry?.ativo_ref  ?? 'WIN');
  const [mercado,     setMercado]     = useState<Mercado | ''>((initialEntry?.mercado as Mercado) ?? '');
  const [atrPts,      setAtrPts]      = useState(initialEntry?.atr_pts?.toString()    ?? '');
  const [adxValor,    setAdxValor]    = useState(initialEntry?.adx_valor?.toString()  ?? '');
  const [abertura,    setAbertura]    = useState(initialEntry?.abertura?.toString()    ?? '');
  const [maximo,      setMaximo]      = useState(initialEntry?.maximo?.toString()      ?? '');
  const [minimo,      setMinimo]      = useState(initialEntry?.minimo?.toString()      ?? '');
  const [fechamento,  setFechamento]  = useState(initialEntry?.fechamento?.toString()  ?? '');

  // Plano do dia
  const [planoDia, setPlanoDia] = useState(initialEntry?.plano_dia ?? '');

  // Pós-mercado
  const [plano,       setPlano]       = useState<PlanoSeguido | ''>((initialEntry?.plano_seguido as PlanoSeguido) ?? '');
  const [emocional,   setEmocional]   = useState<number | null>(initialEntry?.emocional ?? null);
  const [ajustes,     setAjustes]     = useState(initialEntry?.ajustes      ?? '');
  const [observacoes, setObservacoes] = useState(initialEntry?.observacoes  ?? '');
  const [analise,     setAnalise]     = useState(initialEntry?.analise_ia   ?? '');

  // Status
  const [saving,         setSaving]         = useState(false);
  const [analyzing,      setAnalyzing]      = useState(false);
  const [exporting,      setExporting]      = useState(false);
  const [briefing,       setBriefing]       = useState('');
  const [loadingBriefing,setLoadingBriefing]= useState(false);
  const [briefingError,  setBriefingError]  = useState('');
  const [saveStatus,     setSaveStatus]     = useState<'idle' | 'ok' | 'error'>('idle');
  const [analyzeError,   setAnalyzeError]   = useState('');

  function buildPayload() {
    return {
      data:          today,
      ativo_ref:     ativoRef,
      mercado:       mercado    || null,
      atr_pts:       atrPts     ? parseInt(atrPts)          : null,
      adx_valor:     adxValor   ? parseInt(adxValor)        : null,
      abertura:      abertura   ? parseFloat(abertura)      : null,
      maximo:        maximo     ? parseFloat(maximo)        : null,
      minimo:        minimo     ? parseFloat(minimo)        : null,
      fechamento:    fechamento ? parseFloat(fechamento)    : null,
      plano_dia:     planoDia   || null,
      plano_seguido: plano      || null,
      emocional,
      ajustes:       ajustes    || null,
      observacoes:   observacoes || null,
    };
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus('idle');
    const res  = await fetch('/api/diario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) });
    const data = await res.json();
    setSaving(false);
    setSaveStatus(data.error ? 'error' : 'ok');
  }

  async function runAnalyze() {
    await fetch('/api/diario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) });
    setAnalyzing(true);
    setAnalyzeError('');
    const res  = await fetch('/api/diario/analise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entrada: buildPayload() }) });
    const data = await res.json();
    setAnalyzing(false);
    if (data.error) setAnalyzeError(data.error);
    else { setAnalise(data.analise); setSaveStatus('ok'); }
  }

  async function handleOpSuccess() {
    setShowForm(false);
    router.refresh();
    await runAnalyze();
  }

  async function handleBriefing() {
    setLoadingBriefing(true);
    setBriefingError('');
    const res  = await fetch('/api/diario/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const data = await res.json();
    setLoadingBriefing(false);
    if (data.error) setBriefingError(data.error);
    else setBriefing(data.briefing);
  }

  async function handleExport() {
    setExporting(true);
    const res  = await fetch(`/api/exportar?data=${today}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `diario-${today}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  const rangeOHLC = abertura && maximo && minimo
    ? `Range: ${(parseFloat(maximo) - parseFloat(minimo)).toFixed(0)} pts`
    : null;

  return (
    <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── 0. Briefing matinal ────────────────────────── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: briefing ? 12 : 0, paddingBottom: briefing ? 12 : 0, borderBottom: briefing ? '1px solid var(--border)' : 'none' }}>
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Sunrise size={15} style={{ color: 'var(--pe-color)' }} /> Briefing Matinal
            </h2>
            <p className="card-desc" style={{ marginTop: 3 }}>Analisa ontem e orienta o pregão de hoje</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 'var(--text-sm)', padding: '6px 12px' }}
            onClick={handleBriefing}
            disabled={loadingBriefing}
          >
            {loadingBriefing
              ? <><Loader2 size={13} className="spin" /> Analisando...</>
              : briefing
                ? <><Sunrise size={13} /> Regerar</>
                : <><Sunrise size={13} /> Gerar briefing</>}
          </button>
        </div>
        {briefingError && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--loss)', paddingTop: 8 }}>{briefingError}</p>
        )}
        {briefing && (
          <div className="diario-analise-body">
            {renderAnalise(briefing)}
          </div>
        )}
      </div>

      {/* ── 1. Mercado — OHLC + contexto ──────────────── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Mercado</h2>
          <p className="card-desc" style={{ marginTop: 3 }}>Dados do pregão — preencha durante ou após o mercado</p>
        </div>
        <div className="card-body" style={{ gap: 14 }}>

          {/* Ativo + tipo de mercado */}
          <div className="form-row" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Ativo</label>
              <div className="toggle-group">
                {['WIN', 'WDO'].map(a => (
                  <button key={a} type="button" className={`toggle-btn${ativoRef === a ? ' active' : ''}`} onClick={() => setAtivoRef(a)}>{a}</button>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Tipo de mercado</label>
              <div className="toggle-group">
                {MERCADO_OPTIONS.map(o => (
                  <button key={o.value} type="button" className={`toggle-btn${mercado === o.value ? ' active' : ''}`} onClick={() => setMercado(mercado === o.value ? '' : o.value)}>{o.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* OHLC */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              OHLC
              {rangeOHLC && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{rangeOHLC}</span>}
            </label>
            <div className="form-row" style={{ marginBottom: 0 }}>
              {[
                { label: 'Abertura', value: abertura,   set: setAbertura },
                { label: 'Máximo',   value: maximo,     set: setMaximo },
                { label: 'Mínimo',   value: minimo,     set: setMinimo },
                { label: 'Fechamento', value: fechamento, set: setFechamento },
              ].map(({ label, value, set }) => (
                <div key={label} className="form-group">
                  <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>{label}</label>
                  <input type="number" className="form-input mono" placeholder="—" step="1" value={value} onChange={e => set(e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* ATR + ADX */}
          <div className="form-row" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">ATR (pts)</label>
              <input type="number" className="form-input mono" placeholder="ex: 280" value={atrPts} onChange={e => setAtrPts(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">ADX</label>
              <input type="number" className="form-input mono" placeholder="ex: 22" value={adxValor} onChange={e => setAdxValor(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Plano do dia ───────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Plano do Dia</h2>
          <p className="card-desc" style={{ marginTop: 3 }}>O que você planeja operar — setups, níveis, regras a seguir</p>
        </div>
        <div className="card-body">
          <textarea
            className="form-input"
            rows={4}
            placeholder={`Ex:\n- Operar somente se ADX > 25\n- Setup: rompimento de máxima anterior acima de 130.500\n- Stop máximo do dia: -500 pts\n- Não operar após 11h se já tiver 2 operações`}
            value={planoDia}
            onChange={e => setPlanoDia(e.target.value)}
            style={{ resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>
      </div>

      {/* ── 3. Operações do dia ───────────────────────── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0, paddingBottom: todayOps.length > 0 || showForm ? 12 : 0, borderBottom: todayOps.length > 0 || showForm ? '1px solid var(--border)' : 'none' }}>
          <h2 className="card-title">Operações do Dia</h2>
          <button type="button" className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`} style={{ fontSize: 'var(--text-sm)', padding: '6px 12px' }} onClick={() => setShowForm(v => !v)}>
            {showForm ? <><X size={13} /> Cancelar</> : <><Plus size={13} /> Registrar</>}
          </button>
        </div>

        {todayOps.length > 0 && (
          <div className="diario-ops-list">
            {todayOps.map(op => {
              const cls      = op.situacao === 'Gain' ? 'gain' : op.situacao === 'Loss' ? 'loss' : 'pe';
              const ptsColor = op.situacao === 'Gain' ? 'var(--gain)' : op.situacao === 'Loss' ? 'var(--loss)' : 'var(--pe-color)';
              return (
                <div key={op.id} className="diario-op-row">
                  <div className={`rp-feed-dot ${cls}`} style={{ flexShrink: 0, marginTop: 0 }} />
                  <span className="diario-op-ativo">{op.ativo} · {op.tipo}</span>
                  {op.setup && <span className="diario-op-setup">{op.setup}</span>}
                  <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 'var(--text-sm)', color: ptsColor, fontVariantNumeric: 'tabular-nums' }}>
                    {op.pts_final != null ? `${op.pts_final > 0 ? '+' : ''}${op.pts_final} pts` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {todayOps.length === 0 && !showForm && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', paddingTop: 12 }}>Nenhuma operação registrada hoje.</p>
        )}

        {showForm && (
          <div className="diario-op-form-wrap">
            <OperacaoForm config={config} onSuccess={handleOpSuccess} />
          </div>
        )}
      </div>

      {/* ── 4. Pós-mercado ────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Pós-Mercado</h2>
          <p className="card-desc" style={{ marginTop: 3 }}>Reflexão após o fechamento</p>
        </div>
        <div className="card-body" style={{ gap: 16 }}>

          <div className="form-group">
            <label className="form-label">Plano Seguido</label>
            <div className="toggle-group">
              {PLANO_OPTIONS.map(o => (
                <button key={o.value} type="button" className={`toggle-btn${plano === o.value ? ' active' : ''}`} onClick={() => setPlano(plano === o.value ? '' : o.value)}>{o.label}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Estado Emocional</label>
            <div className="diario-emocional">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" className={`diario-emocional-btn${emocional === n ? ' active' : ''}`} onClick={() => setEmocional(emocional === n ? null : n)}>{n}</button>
              ))}
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {emocional ? EMOCIONAL_LABEL[emocional] : '1 = péssimo · 5 = excelente'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">O que foi diferente do plano</label>
            <textarea className="form-input" rows={3}
              placeholder="O que divergiu? Por quê? O que você faria diferente?"
              value={ajustes}
              onChange={e => setAjustes(e.target.value)}
              style={{ resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Observações livres</label>
            <textarea className="form-input" rows={2}
              placeholder="Qualquer anotação adicional..."
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              style={{ resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleSave} disabled={saving || analyzing}>
              {saving ? <><Loader2 size={14} className="spin" /> Salvando...</> : <><Save size={14} /> Salvar</>}
            </button>
            <button className="btn btn-primary" onClick={runAnalyze} disabled={saving || analyzing}>
              {analyzing
                ? <><Loader2 size={14} className="spin" /> Analisando...</>
                : analise
                  ? <><Sparkles size={14} /> Regenerar análise</>
                  : <><Sparkles size={14} /> Analisar com IA</>}
            </button>
            <button className="btn btn-secondary" onClick={handleExport} disabled={exporting || saving || analyzing} title="Exportar relatório do dia em Markdown">
              {exporting ? <><Loader2 size={14} className="spin" /> Exportando...</> : <><FileDown size={14} /> Exportar .md</>}
            </button>
            {saveStatus === 'ok' && !analyzing && (
              <span className="bridge-status ok"><CheckCircle2 size={13} /> Salvo</span>
            )}
            {analyzeError && (
              <span className="bridge-status error"><AlertCircle size={13} /> {analyzeError}</span>
            )}
          </div>

          {analyzing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              <Loader2 size={13} className="spin" /> Gemini analisando seu dia e histórico...
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Análise IA ──────────────────────────────── */}
      {analise && (
        <div className="diario-analise">
          <div className="diario-analise-header">
            <Sparkles size={13} /> Briefing — análise do dia e plano para amanhã
          </div>
          <div className="diario-analise-body">
            {renderAnalise(analise)}
          </div>
        </div>
      )}

    </div>
  );
}

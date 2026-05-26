'use client';
import { useState } from 'react';
import { Save, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type Mercado     = 'lateral' | 'tendencia_alta' | 'tendencia_baixa' | 'volatil';
type PlanoSeguido = 'sim' | 'parcialmente' | 'nao';

interface DiarioEntrada {
  data:          string;
  mercado:       Mercado | '';
  atr_pts:       string;
  adx_valor:     string;
  operacoes:     string;
  plano_seguido: PlanoSeguido | '';
  emocional:     number | null;
  observacoes:   string;
  resultado_pts: string;
  analise_ia:    string;
}

interface InitialEntry {
  data?:          string;
  mercado?:       string | null;
  atr_pts?:       number | null;
  adx_valor?:     number | null;
  operacoes?:     string | null;
  plano_seguido?: string | null;
  emocional?:     number | null;
  observacoes?:   string | null;
  resultado_pts?: number | null;
  analise_ia?:    string | null;
}

interface Props {
  initialEntry?: InitialEntry | null;
}

const MERCADO_OPTIONS: { value: Mercado; label: string }[] = [
  { value: 'lateral',         label: 'Lateral' },
  { value: 'tendencia_alta',  label: 'Tendência Alta' },
  { value: 'tendencia_baixa', label: 'Tendência Baixa' },
  { value: 'volatil',         label: 'Volátil' },
];

const PLANO_OPTIONS: { value: PlanoSeguido; label: string }[] = [
  { value: 'sim',          label: 'Sim' },
  { value: 'parcialmente', label: 'Parcialmente' },
  { value: 'nao',          label: 'Não' },
];

const EMOCIONAL_LABEL: Record<number, string> = {
  1: 'Péssimo',
  2: 'Ruim',
  3: 'Neutro',
  4: 'Bom',
  5: 'Excelente',
};

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function renderAnalise(text: string) {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} style={{ height: 6 }} />;

    // Heading: ## or #
    if (/^#{1,3}\s/.test(trimmed)) {
      return (
        <p key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: i === 0 ? 0 : 10, fontSize: 'var(--text-base)' }}>
          {trimmed.replace(/^#+\s/, '')}
        </p>
      );
    }

    // Numbered list: 1. **Title** or 1. text
    if (/^\d+\.\s/.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '$1');
      return (
        <p key={i} style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 8, fontSize: 'var(--text-base)' }}>
          {trimmed.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, (_, m) => m)}
        </p>
      );
    }

    // Bullet list
    if (/^[-•*]\s/.test(trimmed)) {
      return (
        <p key={i} style={{ paddingLeft: 12, color: 'var(--text-secondary)', fontSize: 'var(--text-base)', marginTop: 3 }}>
          {'• ' + trimmed.replace(/^[-•*]\s/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
        </p>
      );
    }

    // Bold-only line (e.g. **Análise do dia**)
    if (/^\*\*.*\*\*$/.test(trimmed)) {
      return (
        <p key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, fontSize: 'var(--text-base)' }}>
          {trimmed.replace(/\*\*/g, '')}
        </p>
      );
    }

    return (
      <p key={i} style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', marginTop: 3 }}>
        {trimmed.replace(/\*\*(.*?)\*\*/g, '$1')}
      </p>
    );
  });
}

export default function DiarioForm({ initialEntry }: Props) {
  const [form, setForm] = useState<DiarioEntrada>({
    data:          initialEntry?.data          ?? getToday(),
    mercado:       (initialEntry?.mercado      as Mercado)      ?? '',
    atr_pts:       initialEntry?.atr_pts?.toString()             ?? '',
    adx_valor:     initialEntry?.adx_valor?.toString()           ?? '',
    operacoes:     initialEntry?.operacoes                       ?? '',
    plano_seguido: (initialEntry?.plano_seguido as PlanoSeguido) ?? '',
    emocional:     initialEntry?.emocional                       ?? null,
    observacoes:   initialEntry?.observacoes                     ?? '',
    resultado_pts: initialEntry?.resultado_pts?.toString()        ?? '',
    analise_ia:    initialEntry?.analise_ia                       ?? '',
  });

  const [saving,       setSaving]       = useState(false);
  const [analyzing,    setAnalyzing]    = useState(false);
  const [saveStatus,   setSaveStatus]   = useState<'idle' | 'ok' | 'error'>('idle');
  const [analyzeError, setAnalyzeError] = useState('');

  function setField<K extends keyof DiarioEntrada>(k: K, v: DiarioEntrada[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function buildPayload() {
    return {
      data:          form.data,
      mercado:       form.mercado       || null,
      atr_pts:       form.atr_pts       ? parseInt(form.atr_pts)       : null,
      adx_valor:     form.adx_valor     ? parseInt(form.adx_valor)     : null,
      operacoes:     form.operacoes     || null,
      plano_seguido: form.plano_seguido || null,
      emocional:     form.emocional,
      observacoes:   form.observacoes   || null,
      resultado_pts: form.resultado_pts !== '' ? parseInt(form.resultado_pts) : null,
    };
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus('idle');
    const res  = await fetch('/api/diario', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(buildPayload()),
    });
    const data = await res.json();
    setSaving(false);
    setSaveStatus(data.error ? 'error' : 'ok');
  }

  async function handleAnalyze() {
    // Salva automaticamente antes de analisar
    await fetch('/api/diario', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(buildPayload()),
    });

    setAnalyzing(true);
    setAnalyzeError('');

    const res  = await fetch('/api/diario/analise', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ entrada: buildPayload() }),
    });
    const data = await res.json();
    setAnalyzing(false);

    if (data.error) {
      setAnalyzeError(data.error);
    } else {
      setField('analise_ia', data.analise);
      setSaveStatus('ok');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Data + Resultado */}
      <div className="form-row" style={{ marginBottom: 0 }}>
        <div className="form-group">
          <label className="form-label">Data</label>
          <input
            type="date"
            className="form-input mono"
            value={form.data}
            onChange={e => setField('data', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Resultado (pts)</label>
          <input
            type="number"
            className="form-input mono"
            placeholder="ex: -500 ou 800"
            value={form.resultado_pts}
            onChange={e => setField('resultado_pts', e.target.value)}
          />
        </div>
      </div>

      {/* Mercado */}
      <div className="form-group">
        <label className="form-label">Contexto do Mercado</label>
        <div className="toggle-group">
          {MERCADO_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              className={`toggle-btn${form.mercado === o.value ? ' active' : ''}`}
              onClick={() => setField('mercado', form.mercado === o.value ? '' : o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* ATR + ADX */}
      <div className="form-row" style={{ marginBottom: 0 }}>
        <div className="form-group">
          <label className="form-label">ATR (pts)</label>
          <input
            type="number"
            className="form-input mono"
            placeholder="ex: 280"
            value={form.atr_pts}
            onChange={e => setField('atr_pts', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">ADX</label>
          <input
            type="number"
            className="form-input mono"
            placeholder="ex: 22"
            value={form.adx_valor}
            onChange={e => setField('adx_valor', e.target.value)}
          />
        </div>
      </div>

      {/* Operações */}
      <div className="form-group">
        <label className="form-label">Operações do Dia</label>
        <textarea
          className="form-input"
          rows={4}
          placeholder="Descreva as operações: setup, entrada, saída, resultado..."
          value={form.operacoes}
          onChange={e => setField('operacoes', e.target.value)}
          style={{ resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      {/* Plano seguido */}
      <div className="form-group">
        <label className="form-label">Plano Seguido</label>
        <div className="toggle-group">
          {PLANO_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              className={`toggle-btn${form.plano_seguido === o.value ? ' active' : ''}`}
              onClick={() => setField('plano_seguido', form.plano_seguido === o.value ? '' : o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Emocional */}
      <div className="form-group">
        <label className="form-label">Estado Emocional</label>
        <div className="diario-emocional">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              className={`diario-emocional-btn${form.emocional === n ? ' active' : ''}`}
              onClick={() => setField('emocional', form.emocional === n ? null : n)}
            >
              {n}
            </button>
          ))}
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {form.emocional ? EMOCIONAL_LABEL[form.emocional] : '1 = péssimo · 5 = excelente'}
          </span>
        </div>
      </div>

      {/* Observações */}
      <div className="form-group">
        <label className="form-label">Observações</label>
        <textarea
          className="form-input"
          rows={3}
          placeholder="O que aprendeu hoje? O que faria diferente?"
          value={form.observacoes}
          onChange={e => setField('observacoes', e.target.value)}
          style={{ resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={handleSave} disabled={saving || analyzing}>
          {saving
            ? <><Loader2 size={14} className="spin" /> Salvando...</>
            : <><Save size={14} /> Salvar</>}
        </button>
        <button className="btn btn-primary" onClick={handleAnalyze} disabled={saving || analyzing}>
          {analyzing
            ? <><Loader2 size={14} className="spin" /> Analisando...</>
            : <><Sparkles size={14} /> Analisar com IA</>}
        </button>

        {saveStatus === 'ok' && !analyzing && (
          <span className="bridge-status ok"><CheckCircle2 size={13} /> Salvo</span>
        )}
        {analyzeError && (
          <span className="bridge-status error"><AlertCircle size={13} /> {analyzeError}</span>
        )}
      </div>

      {/* Análise */}
      {form.analise_ia && (
        <div className="diario-analise">
          <div className="diario-analise-header">
            <Sparkles size={13} />
            <span>Briefing para o próximo pregão</span>
          </div>
          <div className="diario-analise-body">
            {renderAnalise(form.analise_ia)}
          </div>
        </div>
      )}
    </div>
  );
}

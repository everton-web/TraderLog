'use client';
import { useActionState, useState } from 'react';
import { salvarConfig } from '@/lib/actions';
import { useToast } from '@/components/Toast';
import { fmtRS } from '@/lib/formatters';
import type { Configuracao, Estatisticas } from '@/lib/types';

export default function ConfigClient({ config, stat }: { config: Configuracao | null; stat: Estatisticas }) {
  const { showToast } = useToast();
  const [capital, setCapital]     = useState(String(config?.capital ?? 2000));
  const [riscoPct, setRiscoPct]   = useState(String(config?.risco_pct ?? 3));
  const [maoFixa, setMaoFixa]     = useState(config?.mao_fixa ?? false);
  const [contratos, setContratos] = useState(String(config?.contratos_fixos ?? 5));
  const [alvoMult, setAlvoMult]   = useState(String(config?.alvo_mult ?? 1.0));
  const [saving, setSaving]       = useState(false);

  const riscoRS = capital && riscoPct
    ? Number(capital) * (Number(riscoPct) / 100) : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.set('capital',          capital);
    fd.set('risco_pct',        riscoPct);
    fd.set('mao_fixa',         String(maoFixa));
    fd.set('contratos_fixos',  contratos);
    fd.set('alvo_mult',        alvoMult);
    const res = await salvarConfig(null, fd);
    setSaving(false);
    if (res?.error) showToast('Erro: ' + res.error, 'error');
    else showToast('Configurações salvas!', 'success');
  };

  return (
    <>
      <div className="section-header">
        <h1>Configurações</h1>
        <p className="section-desc">Parâmetros da sua conta</p>
      </div>

      <div className="config-container">
        {/* Capital */}
        <form onSubmit={handleSave}>
          <div className="config-card">
            <h2 className="config-card-title">💰 Gestão de Capital</h2>
            <div className="config-row">
              <div className="config-group">
                <label className="form-label" htmlFor="capital">Capital Inicial (R$)</label>
                <input type="number" id="capital" className="form-input mono" min="0" step="100" value={capital} onChange={e => setCapital(e.target.value)} />
              </div>
              <div className="config-group">
                <label className="form-label" htmlFor="riscoPct">% Risco por Operação</label>
                <input type="number" id="riscoPct" className="form-input mono" min="0" max="100" step="0.5" value={riscoPct} onChange={e => setRiscoPct(e.target.value)} />
              </div>
              <div className="config-group">
                <label className="form-label">Risco R$ <span className="auto-badge">AUTO</span></label>
                <div className={`auto-value large-value${riscoRS !== null ? ' filled' : ''}`}>
                  {riscoRS !== null ? fmtRS(riscoRS) : '—'}
                </div>
              </div>
            </div>
            <div className="config-info">
              <div className="info-item"><span className="info-label">WIN</span><span className="info-value">R$ 0,20 / ponto</span></div>
              <div className="info-item"><span className="info-label">WDO</span><span className="info-value">R$ 10,00 / ponto</span></div>
            </div>
            <div className="config-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : '✅ Salvar Capital'}</button>
            </div>
          </div>

          {/* Setup */}
          <div className="config-card" style={{ marginTop: 20 }}>
            <h2 className="config-card-title">⚙️ Setup Operacional</h2>
            <div className="config-row">
              <div className="config-group" style={{ flex: 2 }}>
                <label className="form-label">Estratégia</label>
                <div className="toggle-group">
                  <button type="button" className={`toggle-btn${!maoFixa ? ' active' : ''}`} onClick={() => setMaoFixa(false)}>Risco Variável (%)</button>
                  <button type="button" className={`toggle-btn${maoFixa ? ' active' : ''}`} onClick={() => setMaoFixa(true)}>Mão Fixa</button>
                </div>
              </div>
              {maoFixa && (
                <div className="config-group">
                  <label className="form-label" htmlFor="contratos">Contratos Padrão</label>
                  <input type="number" id="contratos" className="form-input mono" min="1" step="1" value={contratos} onChange={e => setContratos(e.target.value)} />
                </div>
              )}
              <div className="config-group">
                <label className="form-label" htmlFor="alvoMult">Alvo / Risk-Reward</label>
                <input type="number" id="alvoMult" className="form-input mono" min="0.1" step="0.1" value={alvoMult} onChange={e => setAlvoMult(e.target.value)} />
              </div>
            </div>
            <div className="config-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : '✅ Atualizar Setup'}</button>
            </div>
          </div>
        </form>

        {/* Stats */}
        <div className="config-card">
          <h2 className="config-card-title">📊 Estatísticas Gerais</h2>
          <div className="stats-grid">
            <div className="stat-item"><span className="stat-label">Total</span><span className="stat-val">{stat.total}</span></div>
            <div className="stat-item"><span className="stat-label">Gains</span><span className="stat-val gain-text">{stat.gains}</span></div>
            <div className="stat-item"><span className="stat-label">Losses</span><span className="stat-val loss-text">{stat.losses}</span></div>
            <div className="stat-item"><span className="stat-label">Empates (PE)</span><span className="stat-val">{stat.pes}</span></div>
            <div className="stat-item"><span className="stat-label">Taxa de Acerto</span><span className="stat-val">{stat.acerto !== null ? (stat.acerto * 100).toFixed(1) + '%' : '—'}</span></div>
            <div className="stat-item"><span className="stat-label">R$ Total</span><span className="stat-val">{fmtRS(stat.rsTotal)}</span></div>
            <div className="stat-item"><span className="stat-label">Média Gain</span><span className="stat-val gain-text">{stat.mediaGain !== null ? fmtRS(stat.mediaGain) : '—'}</span></div>
            <div className="stat-item"><span className="stat-label">Média Loss</span><span className="stat-val loss-text">{stat.mediaLoss !== null ? fmtRS(stat.mediaLoss) : '—'}</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

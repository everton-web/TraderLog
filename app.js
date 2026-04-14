/* ============================================================
   APP.JS — TraderLog WIN/WDO
   Lógica, cálculos, localStorage, charts
   ============================================================ */

'use strict';

// ===================== CONSTANTES =====================
const WIN_TICK  = 0.20;   // R$ por ponto no WIN
const WDO_TICK  = 10.00;  // R$ por ponto no WDO
const DIAS_SEMANA = ['DOMINGO','SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO'];
const STORAGE_KEY_OPS    = 'traderlog_ops';
const STORAGE_KEY_CONFIG = 'traderlog_config';
const STORAGE_KEY_THEME  = 'traderlog_theme';

// ===================== ESTADO GLOBAL =====================
let state = {
  ativo:  'WIN',
  tipo:   'Compra',
  config: { capital: 2000, riscoPct: 3, maoFixa: false, contratosFixos: 5, alvoMult: 1.0 },
  ops:    [],
  editando: null,
};

let chartCapital = null;
let chartDias    = null;
let currentUserRole = null; // Armazena a sessão (Supabase/Auth em dev)

// ===================== AUTH & SESSION (MOCKUP SUPABASE) =====================
function fazerLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.toLowerCase();
  
  // Demonstração (Enquanto a integração com as API Keys do DB não ocorrem)
  if (email.includes('admin') || email.includes('prof')) {
    demoLogin('admin');
  } else {
    demoLogin('estudante');
  }
}

function demoLogin(role) {
  currentUserRole = role;
  document.getElementById('login-overlay').style.display = 'none'; // Desbloqueia sistema

  const admNavBtn = document.getElementById('nav-admin');
  if (role === 'admin') {
    admNavBtn.style.display = 'flex';
    showSection('admin');
  } else {
    admNavBtn.style.display = 'none';
    showSection('dashboard');
  }

  showToast('Autenticado com sucesso como ' + role.toUpperCase(), 'success');
}

function fazerLogout() {
  currentUserRole = null;
  document.getElementById('login-overlay').style.display = '';
  document.getElementById('login-email').value = '';
  document.getElementById('login-senha').value = '';
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  carregarStorage();
  setDataHoje();
  atualizarDateBadge();
  renderDashboard();
  renderHistorico();
  preencherConfig();
  calcular();
});

// ===================== TEMA =====================
function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEY_THEME);
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem(STORAGE_KEY_THEME, next);

  // Re-render charts com cores corretas
  if (chartCapital || chartDias) {
    renderDashboard();
  }
}

// ===================== NAVEGAÇÃO =====================
function showSection(nome) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('section-' + nome).classList.add('active');
  document.getElementById('nav-' + nome).classList.add('active');
  document.getElementById('top-bar-title').textContent = {
    dashboard: 'Dashboard',
    nova:      'Nova Operação',
    historico: 'Histórico',
    config:    'Configurações',
  }[nome] || nome;

  if (nome === 'dashboard')  { renderDashboard(); }
  if (nome === 'historico')  { renderHistorico(); }
  if (nome === 'config')     { preencherConfig(); }
  
  if (nome === 'nova' && state.config.maoFixa && state.editando === null) {
      document.getElementById('input-qtde-total').value = state.config.contratosFixos || 5;
      document.getElementById('input-qtde-rp').value = state.config.contratosFixos || 5;
      calcular();
  }

  // Fechar sidebar no mobile
  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('open');
  }

  return false;
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (window.innerWidth <= 900) {
    sb.classList.toggle('open');
  } else {
    sb.classList.toggle('collapsed');
    document.querySelector('.main-content').classList.toggle('expanded');
  }
}

// ===================== DATA / UTILS =====================
function setDataHoje() {
  const inp = document.getElementById('input-data');
  inp.value = hojeISO();
}

function hojeISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function atualizarDateBadge() {
  const el = document.getElementById('date-today');
  const d = new Date();
  el.textContent = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  setTimeout(atualizarDateBadge, 60000);
}

function diaSemana(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return DIAS_SEMANA[dt.getDay()];
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function fmtPts(n) {
  if (n == null || isNaN(n)) return '—';
  return (n >= 0 ? '+' : '') + Number(n).toLocaleString('pt-BR');
}

function fmtRS(n) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '—';
  return (n * 100).toFixed(2) + '%';
}

function tickValue(ativo) {
  return ativo === 'WIN' ? WIN_TICK : WDO_TICK;
}

// ===================== ATIVO / TIPO =====================
function setAtivo(v) {
  state.ativo = v;
  document.getElementById('btn-win').classList.toggle('active', v === 'WIN');
  document.getElementById('btn-wdo').classList.toggle('active', v === 'WDO');
  calcular();
}

function setTipo(v) {
  state.tipo = v;
  document.getElementById('btn-compra').classList.toggle('active', v === 'Compra');
  document.getElementById('btn-venda').classList.toggle('active', v === 'Venda');
  calcular();
}

// ===================== CÁLCULO AUTOMÁTICO =====================
function calcular() {
  const pe         = parseFloat(document.getElementById('input-pe').value)    || null;
  const stop       = parseFloat(document.getElementById('input-stop').value)  || null;
  const qtdeRP     = parseFloat(document.getElementById('input-qtde-rp').value) || 0;
  const qtdeTotal  = parseFloat(document.getElementById('input-qtde-total').value) || 0;
  const saida      = parseFloat(document.getElementById('input-saida').value) || null;
  const tipo       = state.tipo;
  const ativo      = state.ativo;
  const capital    = state.config.capital + rsAcumuladoTotal();

  // --- Risco points ---
  let riscoPts = null;
  if (pe !== null && stop !== null) {
    riscoPts = Math.abs(pe - stop);
  }

  // --- Alvo 1 ---
  let alvo1 = null;
  if (pe !== null && riscoPts !== null) {
    const mult = (state.config.alvoMult && state.config.alvoMult > 0) ? state.config.alvoMult : 1.0;
    const alvoPts = riscoPts * mult;
    alvo1 = tipo === 'Compra' ? pe + alvoPts : pe - alvoPts;
  }

  // --- Qtde final ---
  const qtdeFinal = qtdeTotal - qtdeRP;

  // --- Pts Final ---
  let ptsFinal = null;
  if (saida !== null && pe !== null) {
    ptsFinal = tipo === 'Compra' ? saida - pe : pe - saida;
  }

  // --- Situação ---
  let situacao = null;
  if (ptsFinal !== null) {
    if (ptsFinal > 0)      situacao = 'Gain';
    else if (ptsFinal < 0) situacao = 'Loss';
    else                   situacao = 'PE';
  }

  // --- R$ Final (cálculo com RP) ---
  let rsFinal = null;
  if (ptsFinal !== null && riscoPts !== null && pe !== null && saida !== null) {
    const tick = tickValue(ativo);
    if (qtdeTotal > 1 && situacao === 'Gain') {
      // RP: alvo1 atingido com qtdeRP contratos
      const ptsRP = riscoPts; // pts até alvo1
      const rsFinalRP = ptsRP * qtdeRP * tick;
      const rsFinalResto = (ptsFinal - 0) * qtdeFinal * tick; // restante até saída real
      // Simplificado: resultado total = pts finais × qtde total × tick (caso saída geral)
      rsFinal = ptsFinal * qtdeTotal * tick;
    } else if (situacao === 'Loss') {
      rsFinal = ptsFinal * qtdeTotal * tick; // ptsFinal já é negativo
    } else if (situacao === 'PE') {
      rsFinal = 0;
    } else {
      rsFinal = (ptsFinal || 0) * qtdeTotal * tick;
    }
  }

  // --- % Risco ---
  let pctRisco = null;
  if (riscoPts !== null && capital > 0) {
    const tick = tickValue(ativo);
    pctRisco = (riscoPts * qtdeTotal * tick) / capital;
  }

  // ---- Atualizar UI ----
  setAutoVal('auto-risco',      riscoPts !== null ? riscoPts.toLocaleString('pt-BR') : null);
  setAutoVal('auto-alvo',       alvo1    !== null ? alvo1.toLocaleString('pt-BR')    : null);
  setAutoVal('auto-qtde-final', qtdeFinal !== null && qtdeTotal > 0 ? qtdeFinal.toLocaleString('pt-BR') : null);
  setAutoVal('auto-pts-final',  ptsFinal  !== null ? fmtPts(ptsFinal) : null,
    ptsFinal > 0 ? 'gain-value' : ptsFinal < 0 ? 'loss-value' : '');
  setAutoVal('auto-pct-risco',  pctRisco !== null ? fmtPct(pctRisco) : null);

  // R$ Final — colorido
  const rsEl = document.getElementById('auto-rs-final');
  if (rsFinal !== null) {
    rsEl.textContent = fmtRS(rsFinal);
    rsEl.className = 'auto-value large-value filled ' + (rsFinal > 0 ? 'gain-value' : rsFinal < 0 ? 'loss-value' : '');
  } else {
    rsEl.textContent = '—';
    rsEl.className = 'auto-value large-value';
  }

  // Situação
  const sitEl   = document.getElementById('situacao-display');
  const sitIcons = { Gain: '✅ GAIN', Loss: '❌ LOSS', PE: '🟡 PE' };
  if (situacao) {
    sitEl.textContent = sitIcons[situacao] || situacao;
    sitEl.className   = 'situacao-display ' + situacao.toLowerCase();
  } else {
    sitEl.textContent = '—';
    sitEl.className   = 'situacao-display';
  }

  // Preview
  atualizarPreview({ pe, stop, riscoPts, alvo1, qtdeRP, qtdeTotal, qtdeFinal, saida, ptsFinal, situacao, rsFinal, pctRisco });

  return { pe, stop, riscoPts, alvo1, qtdeRP, qtdeTotal, qtdeFinal, saida, ptsFinal, situacao, rsFinal, pctRisco };
}

function setAutoVal(id, val, extraClass = '') {
  const el = document.getElementById(id);
  if (!el) return;
  if (val !== null && val !== undefined) {
    el.textContent = val;
    el.className = 'auto-value filled ' + extraClass;
  } else {
    el.textContent = '—';
    el.className = 'auto-value';
  }
}

function atualizarPreview(v) {
  const card = document.getElementById('preview-card');
  const grid = document.getElementById('preview-grid');
  const ativo = state.ativo;
  const tipo  = state.tipo;
  const data  = document.getElementById('input-data').value;

  if (!v.pe && !v.saida) { card.classList.remove('visible'); return; }
  card.classList.add('visible');

  const items = [
    { label: 'Ativo',       value: ativo },
    { label: 'Tipo',        value: tipo },
    { label: 'Data',        value: formatDate(data) },
    { label: 'PE',          value: v.pe?.toLocaleString('pt-BR') || '—' },
    { label: 'Stop',        value: v.stop?.toLocaleString('pt-BR') || '—' },
    { label: 'Risco pts',   value: v.riscoPts?.toLocaleString('pt-BR') || '—' },
    { label: 'Alvo 1',      value: v.alvo1?.toLocaleString('pt-BR') || '—' },
    { label: 'Qtde Total',  value: v.qtdeTotal?.toLocaleString('pt-BR') || '—' },
    { label: 'Saída',       value: v.saida?.toLocaleString('pt-BR') || '—' },
    { label: 'Pts Final',   value: v.ptsFinal != null ? fmtPts(v.ptsFinal) : '—' },
    { label: 'Situação',    value: v.situacao || '—' },
    { label: 'R$ Final',    value: v.rsFinal != null ? fmtRS(v.rsFinal) : '—' },
  ];

  grid.innerHTML = items.map(i => `
    <div class="preview-item">
      <span class="preview-item-label">${i.label}</span>
      <span class="preview-item-value ${i.label === 'R$ Final' && v.rsFinal > 0 ? 'gain-text' : i.label === 'R$ Final' && v.rsFinal < 0 ? 'loss-text' : ''}">${i.value}</span>
    </div>
  `).join('');
}

// ===================== SALVAR OPERAÇÃO =====================
function salvarOperacao(e) {
  e.preventDefault();
  const calc = calcular();
  const data    = document.getElementById('input-data').value;
  const setup   = document.getElementById('input-setup').value.trim();
  const obs     = document.getElementById('input-obs').value.trim();

  if (!data) { showToast('Informe a data da operação.', 'error'); return; }
  if (!calc.pe || !calc.stop) { showToast('Informe PE e Stop.', 'error'); return; }
  if (!calc.saida)    { showToast('Informe a Saída Final.', 'error'); return; }
  if (!calc.qtdeTotal || calc.qtdeTotal < 1) { showToast('Qtde Total deve ser ≥ 1.', 'error'); return; }

  const op = {
    id:        Date.now() + Math.random(),
    data,
    diaSemana: diaSemana(data),
    ativo:     state.ativo,
    tipo:      state.tipo,
    pe:        calc.pe,
    stop:      calc.stop,
    riscoPts:  calc.riscoPts,
    alvo1:     calc.alvo1,
    qtdeRP:    calc.qtdeRP,
    qtdeTotal: calc.qtdeTotal,
    qtdeFinal: calc.qtdeFinal,
    saida:     calc.saida,
    ptsFinal:  calc.ptsFinal,
    situacao:  calc.situacao,
    rsFinal:   calc.rsFinal,
    pctRisco:  calc.pctRisco,
    setup,
    obs,
    createdAt: Date.now(),
  };

  state.ops.push(op);
  salvarStorage();
  limparFormulario();
  renderDashboard();
  showToast('✅ Operação salva com sucesso!', 'success');
}

function limparFormulario() {
  document.getElementById('form-op').reset();
  setDataHoje();
  setAtivo('WIN');
  setTipo('Compra');
  calcular();
  document.getElementById('preview-card').classList.remove('visible');
}

// ===================== STORAGE =====================
function carregarStorage() {
  try {
    const ops = localStorage.getItem(STORAGE_KEY_OPS);
    const cfg = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (ops) state.ops = JSON.parse(ops);
    if (cfg) {
      const c = JSON.parse(cfg);
      state.config = { ...state.config, ...c };
    }
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    state.ops = [];
  }
}

function salvarStorage() {
  localStorage.setItem(STORAGE_KEY_OPS, JSON.stringify(state.ops));
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(state.config));
}

// ===================== EXPORT / IMPORT =====================
function exportData() {
  const data = { config: state.config, ops: state.ops, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `traderlog_backup_${hojeISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Dados exportados!', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.ops) { state.ops = data.ops; }
      if (data.config) { state.config = { ...state.config, ...data.config }; }
      salvarStorage();
      renderDashboard();
      renderHistorico();
      preencherConfig();
      showToast('✅ Dados importados com sucesso!', 'success');
    } catch (err) {
      showToast('❌ Arquivo inválido.', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ===================== ESTATÍSTICAS =====================
function calcEstatisticas(ops) {
  const total  = ops.length;
  const gains  = ops.filter(o => o.situacao === 'Gain').length;
  const losses = ops.filter(o => o.situacao === 'Loss').length;
  const pes    = ops.filter(o => o.situacao === 'PE').length;
  const acerto = total > 0 ? gains / total : null;

  const rsTotal = ops.reduce((acc, o) => acc + (o.rsFinal || 0), 0);

  const gainOps = ops.filter(o => o.situacao === 'Gain' && o.rsFinal > 0);
  const lossOps = ops.filter(o => o.situacao === 'Loss' && o.rsFinal < 0);

  const mediaGain = gainOps.length > 0 ? gainOps.reduce((a, o) => a + o.rsFinal, 0) / gainOps.length : null;
  const mediaLoss = lossOps.length > 0 ? Math.abs(lossOps.reduce((a, o) => a + o.rsFinal, 0) / lossOps.length) : null;

  const payoff = mediaGain !== null && mediaLoss !== null && mediaLoss > 0
    ? mediaGain / mediaLoss
    : null;

  return { total, gains, losses, pes, acerto, rsTotal, mediaGain, mediaLoss, payoff };
}

function rsAcumuladoTotal() {
  return state.ops.reduce((acc, o) => acc + (o.rsFinal || 0), 0);
}

// ===================== DASHBOARD =====================
function renderDashboard() {
  const ops  = state.ops;
  const stat = calcEstatisticas(ops);
  const capitalAtual = state.config.capital + stat.rsTotal;

  // KPIs
  setText('kpi-capital',   fmtRS(capitalAtual));
  setText('kpi-ops',       stat.total.toString());
  setText('kpi-ops-delta', 'Total realizadas');
  setText('kpi-acerto',    stat.acerto !== null ? (stat.acerto * 100).toFixed(1) + '%' : '—');
  setText('kpi-payoff',    stat.payoff !== null ? stat.payoff.toFixed(2) + 'x' : '—');
  setText('kpi-gains',     stat.gains.toString());
  setText('kpi-losses',    stat.losses.toString());

  const capitalDeltaVal = capitalAtual - state.config.capital;
  const capitalDeltaEl = document.getElementById('kpi-capital-delta');
  if (capitalDeltaVal !== 0) {
    capitalDeltaEl.textContent = (capitalDeltaVal >= 0 ? '▲ +' : '▼ ') + fmtRS(capitalDeltaVal);
    capitalDeltaEl.style.color = capitalDeltaVal > 0 ? 'var(--gain)' : 'var(--loss)';
  } else {
    capitalDeltaEl.textContent = 'Capital inicial: ' + fmtRS(state.config.capital);
    capitalDeltaEl.style.color = '';
  }

  if (stat.acerto !== null) {
    setText('kpi-acerto-delta', stat.gains + ' G / ' + stat.losses + ' L ' + (stat.pes > 0 ? '/ ' + stat.pes + ' PE' : ''));
  }
  if (stat.payoff !== null) {
    setText('kpi-payoff-delta', stat.mediaGain ? 'Média G: ' + fmtRS(stat.mediaGain) : '');
  }

  const mediaGainEl = document.getElementById('kpi-gains-media');
  const mediaLossEl = document.getElementById('kpi-losses-media');
  mediaGainEl.textContent = stat.mediaGain !== null ? 'Média: ' + fmtRS(stat.mediaGain) : '';
  mediaLossEl.textContent = stat.mediaLoss !== null ? 'Média: ' + fmtRS(stat.mediaLoss) : '';

  renderCharts(ops);
  renderTabelaRecentes(ops.slice(-10).reverse());
}

function renderCharts(ops) {
  // Agrupar por data
  const diasMap = {};
  ops.forEach(o => {
    if (!diasMap[o.data]) diasMap[o.data] = 0;
    diasMap[o.data] += o.rsFinal || 0;
  });

  const sortedDatas = Object.keys(diasMap).sort();
  const rsPorDia    = sortedDatas.map(d => diasMap[d]);
  const labels      = sortedDatas.map(d => formatDate(d));

  // Curva de capital
  const capitalInicial = state.config.capital;
  const curvaCapital   = [];
  let acc = capitalInicial;
  sortedDatas.forEach(d => {
    acc += diasMap[d];
    curvaCapital.push(acc);
  });
  const labelsCapital = ['Inicial', ...labels];
  const dataCapital   = [capitalInicial, ...curvaCapital];

  const hasData = sortedDatas.length > 0;

  // Chart capital
  const ctxC = document.getElementById('chart-capital');
  const emptyC = document.getElementById('chart-capital-empty');
  if (!hasData) {
    ctxC.style.display = 'none';
    emptyC.classList.add('visible');
  } else {
    ctxC.style.display = '';
    emptyC.classList.remove('visible');
    if (chartCapital) chartCapital.destroy();
    chartCapital = new Chart(ctxC, {
      type: 'line',
      data: {
        labels: labelsCapital,
        datasets: [{
          label: 'Capital',
          data: dataCapital,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 4,
          borderWidth: 2,
        }]
      },
      options: chartOptions('R$'),
    });
  }

  // Chart dias
  const ctxD = document.getElementById('chart-dias');
  const emptyD = document.getElementById('chart-dias-empty');
  if (!hasData) {
    ctxD.style.display = 'none';
    emptyD.classList.add('visible');
  } else {
    ctxD.style.display = '';
    emptyD.classList.remove('visible');
    if (chartDias) chartDias.destroy();
    chartDias = new Chart(ctxD, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'R$/Dia',
          data: rsPorDia,
          backgroundColor: rsPorDia.map(v => v >= 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'),
          borderColor:     rsPorDia.map(v => v >= 0 ? '#10b981' : '#ef4444'),
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: chartOptions('R$'),
    });
  }
}

function chartOptions(prefix) {
  const style = getComputedStyle(document.documentElement);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const mutedColor = style.getPropertyValue('--text-muted').trim();
  const borderColor = style.getPropertyValue('--border').trim();

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1c2333' : '#ffffff',
        borderColor: borderColor,
        borderWidth: 1,
        titleColor: mutedColor,
        bodyColor: style.getPropertyValue('--text-primary').trim(),
        padding: 12,
        callbacks: {
          label: ctx => ' ' + ctx.raw.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        }
      }
    },
    scales: {
      x: {
        ticks: { color: mutedColor, font: { size: 10 } },
        grid: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
        border: { color: borderColor },
      },
      y: {
        ticks: {
          color: mutedColor,
          font: { size: 10 },
          callback: v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
        },
        grid: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
        border: { color: borderColor },
      }
    }
  };
}

function renderTabelaRecentes(ops) {
  const tbody = document.getElementById('tbody-recentes');
  if (ops.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="12">Nenhuma operação registrada</td></tr>';
    return;
  }
  tbody.innerHTML = ops.map((op, i) => rowHtml(op, i + 1, false)).join('');
}

// ===================== HISTÓRICO =====================
function renderHistorico() {
  let ops = [...state.ops];

  const filterAtivo   = document.getElementById('filter-ativo')?.value || '';
  const filterSit     = document.getElementById('filter-situacao')?.value || '';
  const filterDe      = document.getElementById('filter-de')?.value || '';
  const filterAte     = document.getElementById('filter-ate')?.value || '';

  if (filterAtivo) ops = ops.filter(o => o.ativo === filterAtivo);
  if (filterSit)   ops = ops.filter(o => o.situacao === filterSit);
  if (filterDe)    ops = ops.filter(o => o.data >= filterDe);
  if (filterAte)   ops = ops.filter(o => o.data <= filterAte);

  // Ordenar por data asc, depois por createdAt
  ops.sort((a, b) => a.data.localeCompare(b.data) || a.createdAt - b.createdAt);

  // Resumo filtro
  const sumEl = document.getElementById('filter-summary');
  if (filterAtivo || filterSit || filterDe || filterAte) {
    const stat = calcEstatisticas(ops);
    sumEl.textContent = `${ops.length} operação(s) | R$ ${stat.rsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Acerto: ${stat.acerto !== null ? (stat.acerto * 100).toFixed(1) + '%' : '—'}`;
    sumEl.classList.add('visible');
  } else {
    sumEl.classList.remove('visible');
  }

  const tbody = document.getElementById('tbody-historico');
  if (ops.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="19">Nenhuma operação encontrada</td></tr>';
    return;
  }

  // Agrupar por dia
  const grupos = {};
  ops.forEach(op => {
    if (!grupos[op.data]) grupos[op.data] = [];
    grupos[op.data].push(op);
  });

  let html = '';
  let numGlobal = 1;
  Object.keys(grupos).sort().forEach(data => {
    const gOps = grupos[data];
    const rsDia = gOps.reduce((a, o) => a + (o.rsFinal || 0), 0);
    const ptsDia = gOps.reduce((a, o) => a + (o.ptsFinal || 0), 0);
    html += `<tr class="day-row">
      <td colspan="19">
        📅 ${formatDate(data)} &nbsp;—&nbsp; ${diaSemana(data)} &nbsp;|&nbsp;
        ${gOps.length} op${gOps.length > 1 ? 's' : ''} &nbsp;|&nbsp;
        Resultado: <span style="color:${rsDia >= 0 ? 'var(--gain)' : 'var(--loss)'}">${fmtRS(rsDia)}</span>
        &nbsp;(${fmtPts(ptsDia)} pts)
      </td>
    </tr>`;
    gOps.forEach(op => {
      html += rowHtmlFull(op, numGlobal++);
    });
  });

  tbody.innerHTML = html;
}

function limparFiltros() {
  document.getElementById('filter-ativo').value = '';
  document.getElementById('filter-situacao').value = '';
  document.getElementById('filter-de').value = '';
  document.getElementById('filter-ate').value = '';
  renderHistorico();
}

// ===================== LINHAS DE TABELA =====================
function rowHtml(op, num, showDel = true) {
  const badge = badgeHtml(op.situacao);
  const rsColor = op.rsFinal > 0 ? 'gain-text' : op.rsFinal < 0 ? 'loss-text' : '';
  return `<tr>
    <td>${num}</td>
    <td>${formatDate(op.data)}</td>
    <td><strong>${op.ativo}</strong></td>
    <td>${op.tipo}</td>
    <td>${op.pe?.toLocaleString('pt-BR') || '—'}</td>
    <td>${op.stop?.toLocaleString('pt-BR') || '—'}</td>
    <td>${op.saida?.toLocaleString('pt-BR') || '—'}</td>
    <td>${op.riscoPts?.toLocaleString('pt-BR') || '—'}</td>
    <td><span class="${op.ptsFinal > 0 ? 'gain-text' : op.ptsFinal < 0 ? 'loss-text' : ''}">${fmtPts(op.ptsFinal)}</span></td>
    <td>${op.qtdeTotal?.toLocaleString('pt-BR') || '—'}</td>
    <td class="${rsColor}">${fmtRS(op.rsFinal)}</td>
    <td>${badge}</td>
  </tr>`;
}

function rowHtmlFull(op, num) {
  const badge = badgeHtml(op.situacao);
  const rsColor = op.rsFinal > 0 ? 'gain-text' : op.rsFinal < 0 ? 'loss-text' : '';
  return `<tr data-id="${op.id}">
    <td>${num}</td>
    <td>${formatDate(op.data)}</td>
    <td>${op.diaSemana || diaSemana(op.data)}</td>
    <td><strong>${op.ativo}</strong></td>
    <td>${op.tipo}</td>
    <td>${op.pe?.toLocaleString('pt-BR') || '—'}</td>
    <td>${op.stop?.toLocaleString('pt-BR') || '—'}</td>
    <td>${op.riscoPts?.toLocaleString('pt-BR') || '—'}</td>
    <td>${op.alvo1?.toLocaleString('pt-BR') || '—'}</td>
    <td>${op.qtdeRP?.toLocaleString('pt-BR') || '—'}</td>
    <td>${op.qtdeTotal?.toLocaleString('pt-BR') || '—'}</td>
    <td>${op.saida?.toLocaleString('pt-BR') || '—'}</td>
    <td><span class="${op.ptsFinal > 0 ? 'gain-text' : op.ptsFinal < 0 ? 'loss-text' : ''}">${fmtPts(op.ptsFinal)}</span></td>
    <td>${op.qtdeFinal?.toLocaleString('pt-BR') || '—'}</td>
    <td>${badge}</td>
    <td class="${rsColor}">${fmtRS(op.rsFinal)}</td>
    <td style="color:var(--text-muted)">${op.pctRisco ? fmtPct(op.pctRisco) : '—'}</td>
    <td style="color:var(--text-secondary);max-width:120px;overflow:hidden;text-overflow:ellipsis;font-family:'Inter',sans-serif;font-size:11px">${op.setup || '—'}</td>
    <td><button class="btn-del" onclick="confirmarDeletar('${op.id}')" title="Excluir">🗑</button></td>
  </tr>`;
}

function badgeHtml(situacao) {
  const map = {
    Gain: '<span class="badge badge-gain">✅ Gain</span>',
    Loss: '<span class="badge badge-loss">❌ Loss</span>',
    PE:   '<span class="badge badge-pe">🟡 PE</span>',
  };
  return map[situacao] || situacao || '—';
}

// ===================== DELETAR =====================
function confirmarDeletar(id) {
  abrirModal({
    icon: '🗑',
    title: 'Excluir Operação',
    desc: 'Tem certeza que deseja excluir esta operação? Esta ação não pode ser desfeita.',
    confirmText: 'Excluir',
    onConfirm: () => deletarOp(id),
  });
}

function deletarOp(id) {
  state.ops = state.ops.filter(o => String(o.id) !== String(id));
  salvarStorage();
  renderHistorico();
  renderDashboard();
  fecharModal();
  showToast('🗑 Operação excluída.', 'info');
}

// ===================== CONFIG =====================
function preencherConfig() {
  const cfg = state.config;
  const cfgCapital = document.getElementById('cfg-capital');
  const cfgRisco   = document.getElementById('cfg-risco-pct');
  const cfgContratos = document.getElementById('cfg-contratos');
  const cfgAlvoMult = document.getElementById('cfg-alvo-mult');

  if (cfgCapital) cfgCapital.value = cfg.capital || '';
  if (cfgRisco)   cfgRisco.value   = cfg.riscoPct || '';
  if (cfgContratos) cfgContratos.value = cfg.contratosFixos || 5;
  if (cfgAlvoMult) cfgAlvoMult.value = cfg.alvoMult || 1.0;
  
  // Atualiza Visual do Toggle
  setEstrategiaConfig(cfg.maoFixa ? 'fixa' : 'risco', false);

  updateConfigPreview();

  // Stats
  const stat = calcEstatisticas(state.ops);
  setText('stat-total',    stat.total.toString());
  setText('stat-gains',    stat.gains.toString());
  setText('stat-losses',   stat.losses.toString());
  setText('stat-pe',       stat.pes.toString());
  setText('stat-acerto',   stat.acerto !== null ? (stat.acerto * 100).toFixed(1) + '%' : '—');
  setText('stat-rs-total', fmtRS(stat.rsTotal));
  setText('stat-media-gain', stat.mediaGain !== null ? fmtRS(stat.mediaGain) : '—');
  setText('stat-media-loss', stat.mediaLoss !== null ? fmtRS(stat.mediaLoss) : '—');
}

function updateConfigPreview() {
  const cap  = parseFloat(document.getElementById('cfg-capital')?.value) || 0;
  const pct  = parseFloat(document.getElementById('cfg-risco-pct')?.value) || 0;
  const risco = cap * pct / 100;
  const el = document.getElementById('cfg-risco-rs');
  if (el) {
    el.textContent = risco > 0 ? fmtRS(risco) : '—';
    el.className = risco > 0 ? 'auto-value large-value filled' : 'auto-value large-value';
  }
}

function setEstrategiaConfig(tipo, save = true) {
  state.config.maoFixa = (tipo === 'fixa');
  document.getElementById('btn-cfg-risco').classList.toggle('active', tipo === 'risco');
  document.getElementById('btn-cfg-fixa').classList.toggle('active', tipo === 'fixa');
  
  const contGroup = document.getElementById('group-cfg-contratos');
  if (tipo === 'fixa') {
    contGroup.style.display = 'block';
  } else {
    contGroup.style.display = 'none';
  }
  
  if (save) salvarStorage();
}

function salvarConfig() {
  const cap = parseFloat(document.getElementById('cfg-capital')?.value);
  const pct = parseFloat(document.getElementById('cfg-risco-pct')?.value);
  const cont = parseInt(document.getElementById('cfg-contratos')?.value);
  const mult = parseFloat(document.getElementById('cfg-alvo-mult')?.value);

  if (!cap || cap <= 0) { showToast('Capital inválido.', 'error'); return; }
  if (!pct || pct <= 0 || pct > 100) { showToast('% Risco inválido (1-100).', 'error'); return; }
  
  state.config.capital  = cap;
  state.config.riscoPct = pct;
  state.config.contratosFixos = cont || 5;
  state.config.alvoMult = mult || 1.0;
  
  salvarStorage();
  preencherConfig();
  showToast('✅ Setup Operacional atualizado!', 'success');
}

function confirmarLimparTudo() {
  abrirModal({
    icon: '⚠️',
    title: 'Apagar Todos os Dados',
    desc: `Isso vai apagar permanentemente TODAS as ${state.ops.length} operação(s) registradas. Esta ação não pode ser desfeita.`,
    confirmText: 'Apagar Tudo',
    onConfirm: () => {
      state.ops = [];
      salvarStorage();
      renderDashboard();
      renderHistorico();
      fecharModal();
      showToast('🗑 Todos os dados foram apagados.', 'info');
    },
  });
}

// ===================== MODAL =====================
let _modalCallback = null;

function abrirModal({ icon, title, desc, confirmText, onConfirm }) {
  document.getElementById('modal-icon').textContent  = icon;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-desc').textContent  = desc;
  const btn = document.getElementById('modal-confirm-btn');
  btn.textContent = confirmText || 'Confirmar';
  _modalCallback = onConfirm;
  btn.onclick = () => { if (_modalCallback) _modalCallback(); };
  document.getElementById('modal-overlay').classList.add('open');
}

function fecharModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  _modalCallback = null;
}

// ===================== TOAST =====================
let _toastTimer = null;
function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast toast-${type} show`;
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ===================== HELPERS =====================
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

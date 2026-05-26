import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  CalendarDays,
  ClipboardCheck,
  TrendingUp,
  Link2,
  Settings,
  Sparkles,
  BarChart2,
  Target,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  LineChart,
} from 'lucide-react';

export const metadata = {
  title: 'Instruções | TraderLog',
};

function Section({
  icon: Icon,
  title,
  subtitle,
  color = '#10b981',
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="instrucoes-section">
      <div className="instrucoes-section-header">
        <div className="instrucoes-section-icon" style={{ color, borderColor: `${color}30`, background: `${color}12` }}>
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="instrucoes-section-title">{title}</h2>
          <p className="instrucoes-section-sub">{subtitle}</p>
        </div>
      </div>
      <div className="instrucoes-section-body">{children}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="instrucoes-step">
      <div className="instrucoes-step-n">{n}</div>
      <div>
        <div className="instrucoes-step-title">{title}</div>
        <div className="instrucoes-step-desc">{desc}</div>
      </div>
    </div>
  );
}

function Tip({ type = 'info', children }: { type?: 'info' | 'warn' | 'ok'; children: React.ReactNode }) {
  const cfg = {
    info: { icon: Info,          color: '#3b82f6', bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.2)' },
    warn: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)' },
    ok:   { icon: CheckCircle2,  color: '#10b981', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)' },
  }[type];
  const Icon = cfg.icon;
  return (
    <div className="instrucoes-tip" style={{ background: cfg.bg, borderColor: cfg.border }}>
      <Icon size={14} color={cfg.color} style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{ color: cfg.color, fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-normal)' }}>{children}</span>
    </div>
  );
}

function FieldRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="instrucoes-field">
      <span className="instrucoes-field-label">{label}</span>
      <span className="instrucoes-field-desc">{desc}</span>
    </div>
  );
}

export default function InstrucoesPage() {
  return (
    <div className="instrucoes-page">

      {/* Hero */}
      <div className="instrucoes-hero">
        <div className="instrucoes-hero-icon">
          <BookOpen size={28} color="#10b981" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="instrucoes-hero-title">Guia do TraderLog</h1>
          <p className="instrucoes-hero-sub">
            Entenda cada funcionalidade e tire o máximo do seu diário de trading.
          </p>
        </div>
      </div>

      {/* Índice rápido */}
      <div className="instrucoes-index">
        {[
          { href: '#diario',      label: 'Diário' },
          { href: '#dashboard',   label: 'Dashboard' },
          { href: '#historico',   label: 'Histórico' },
          { href: '#calendario',  label: 'Calendário' },
          { href: '#checklist',   label: 'Checklist' },
          { href: '#plano',       label: 'Plano de Capital' },
          { href: '#integracoes', label: 'Integrações' },
          { href: '#fluxo',       label: 'Fluxo ideal' },
        ].map(({ href, label }) => (
          <a key={href} href={href} className="instrucoes-index-link">{label}</a>
        ))}
      </div>

      <div className="instrucoes-content">

        {/* ─── DIÁRIO ─── */}
        <span id="diario" className="instrucoes-anchor" />
        <Section icon={BookOpen} title="Diário" subtitle="O hub central do seu pregão — registre tudo em um só lugar.">
          <p className="instrucoes-p">
            O Diário é a principal ferramenta do TraderLog. Ele reúne o contexto do mercado,
            seu plano, as operações e a reflexão pós-mercado — tudo em um único registro diário,
            com análise de IA gerada automaticamente ao final.
          </p>

          <h3 className="instrucoes-h3">Card 1 — Mercado</h3>
          <FieldRow label="Ativo de referência" desc="WIN (mini índice) ou WDO (mini dólar) — define o contexto da análise de IA." />
          <FieldRow label="Tipo de mercado" desc="Lateral, Tendência de Alta, Tendência de Baixa ou Volátil — como você classificou o dia." />
          <FieldRow label="OHLC" desc="Abertura, Máximo, Mínimo e Fechamento do ativo no pregão. O range é calculado automaticamente (Máx − Mín)." />
          <FieldRow label="ATR (pts)" desc="Average True Range em pontos — volatilidade média do ativo." />
          <FieldRow label="ADX" desc="Average Directional Index — força da tendência (acima de 25 indica tendência relevante)." />

          <h3 className="instrucoes-h3" style={{ marginTop: 20 }}>Card 2 — Plano do Dia</h3>
          <p className="instrucoes-p">
            Escreva seu plano antes de abrir posição: setups que vai operar, níveis de suporte/resistência,
            regras do dia (ex: máx. 2 operações, stop em 150 pts, não operar nos primeiros 15 min).
            Quanto mais específico, mais útil será o feedback da IA sobre aderência ao plano.
          </p>

          <h3 className="instrucoes-h3" style={{ marginTop: 20 }}>Card 3 — Operações do Dia</h3>
          <p className="instrucoes-p">
            Lista as operações já registradas para hoje. Use o botão <strong>+ Registrar operação</strong> para
            abrir o formulário inline — ao salvar, a IA é acionada automaticamente com os dados atualizados.
          </p>
          <Tip type="ok">
            Cada operação salva dispara uma nova análise de IA sem você precisar clicar em nada.
          </Tip>

          <h3 className="instrucoes-h3" style={{ marginTop: 20 }}>Card 4 — Pós-Mercado</h3>
          <FieldRow label="Plano seguido" desc="Sim / Parcialmente / Não — avalie sua aderência ao que planejou." />
          <FieldRow label="Emocional" desc="Nota de 1 a 5 para como você se sentiu durante o pregão. Afeta a análise de risco emocional da IA." />
          <FieldRow label="Ajustes" desc="O que foi diferente do plano? Por quê? Documente decisões fora do script." />
          <FieldRow label="Observações" desc="Campo livre: insights, percepções, o que aprendeu." />

          <h3 className="instrucoes-h3" style={{ marginTop: 20 }}>Análise de IA</h3>
          <p className="instrucoes-p">
            Após salvar uma operação (ou clicar em <strong>Analisar</strong>), a IA gera um briefing com 5 seções:
          </p>
          <div className="instrucoes-ai-sections">
            {[
              ['1. Análise do dia',       'Comparação OHLC com ontem, contexto do mercado, o que funcionou.'],
              ['2. Plano vs. Execução',   'Aderência ao plano, o que divergiu e por quê.'],
              ['3. Onde estou',           'Sua posição nos últimos 30 dias: acerto, resultado, sequência atual.'],
              ['4. O que ajustar',        'Até 3 ajustes concretos e mensuráveis para os próximos pregões.'],
              ['5. Amanhã',               'Níveis OHLC de hoje como referência, o que observar no próximo pregão.'],
            ].map(([t, d]) => (
              <div key={t} className="instrucoes-ai-row">
                <span className="instrucoes-ai-label">{t}</span>
                <span className="instrucoes-ai-desc">{d}</span>
              </div>
            ))}
          </div>
          <Tip type="warn">
            A IA usa o Google Gemini — configure sua API Key em <strong>Integrações</strong> antes de usar.
          </Tip>
        </Section>

        {/* ─── DASHBOARD ─── */}
        <span id="dashboard" className="instrucoes-anchor" />
        <Section icon={LayoutDashboard} title="Dashboard" subtitle="Visão geral do seu desempenho em tempo real." color="#3b82f6">
          <p className="instrucoes-p">
            A tela inicial mostra seus principais indicadores de performance e um resumo das operações recentes.
          </p>
          <FieldRow label="KPIs do topo" desc="Total de pontos, resultado em R$, taxa de acerto e número de operações — calculados sobre o período selecionado." />
          <FieldRow label="Gráfico de equity" desc="Evolução do resultado acumulado em pontos ao longo do tempo." />
          <FieldRow label="Distribuição de setups" desc="Quais setups estão gerando mais resultado e quais estão drenando." />
          <FieldRow label="Coach IA" desc="Widget no painel direito com 3 insights gerados pelo Gemini sobre seu padrão recente de operações." />
          <Tip type="info">
            O Coach IA no dashboard é diferente da análise do Diário — ele foca em padrões estatísticos
            das suas operações (melhor dia, setup mais lucrativo, horários).
          </Tip>
        </Section>

        {/* ─── HISTORICO ─── */}
        <span id="historico" className="instrucoes-anchor" />
        <Section icon={ClipboardList} title="Histórico" subtitle="Tabela completa de todas as suas operações." color="#8b5cf6">
          <p className="instrucoes-p">
            Acesse, filtre e edite qualquer operação registrada. A tabela exibe: data, ativo, tipo (C/V),
            setup, PE, stop, saída, pontos, resultado em R$ e situação (Gain / Loss / PE).
          </p>
          <FieldRow label="Filtros" desc="Filtre por ativo, tipo, setup, situação e intervalo de datas." />
          <FieldRow label="Edição" desc="Clique em qualquer linha para abrir o formulário de edição. Alterações são salvas imediatamente." />
          <FieldRow label="Totais" desc="Rodapé da tabela mostra totais e médias do período filtrado." />
        </Section>

        {/* ─── CALENDÁRIO ─── */}
        <span id="calendario" className="instrucoes-anchor" />
        <Section icon={CalendarDays} title="Calendário" subtitle="Visão mensal dos seus resultados por dia." color="#f59e0b">
          <p className="instrucoes-p">
            Cada célula do calendário representa um dia de pregão. A cor indica o resultado:
            verde para dias positivos, vermelho para negativos, cinza para dias sem operação.
          </p>
          <FieldRow label="Hover"   desc="Passe o mouse sobre um dia para ver o resumo: total de operações, pontos e R$ do dia." />
          <FieldRow label="Meses"   desc="Navegue entre meses com as setas. O resumo do mês aparece no topo do calendário." />
          <Tip type="info">
            Use o calendário para identificar padrões: dias da semana melhores, início/fim do mês, etc.
          </Tip>
        </Section>

        {/* ─── CHECKLIST ─── */}
        <span id="checklist" className="instrucoes-anchor" />
        <Section icon={ClipboardCheck} title="Checklist de Entrada" subtitle="Validação pré-operação para evitar entradas impulsivas." color="#06b6d4">
          <p className="instrucoes-p">
            O checklist funciona como um protocolo de decolagem: só opere quando todos os
            itens estiverem marcados. Itens marcados como <strong>trava absoluta</strong> bloqueiam
            a operação independente de qualquer outro fator.
          </p>
          <FieldRow label="Como usar" desc="Antes de entrar em uma operação, abra o checklist e marque cada item. Se alguma trava falhar, não opere." />
          <FieldRow label="Resetar" desc="O checklist resetar automaticamente para o próximo uso — não é salvo permanentemente." />
          <Tip type="warn">
            Pular o checklist por pressa é a causa mais comum de operações fora do plano.
            Reserve 2 minutos antes de cada entrada.
          </Tip>
        </Section>

        {/* ─── PLANO DE CAPITAL ─── */}
        <span id="plano" className="instrucoes-anchor" />
        <Section icon={TrendingUp} title="Plano de Capital" subtitle="Cálculo de tamanho de posição e gestão de risco." color="#ec4899">
          <p className="instrucoes-p">
            Define quanto você pode arriscar por operação com base no seu capital e tolerância a perda,
            respeitando limites de drawdown diário e mensal.
          </p>
          <FieldRow label="Capital total"      desc="Seu capital disponível para trading." />
          <FieldRow label="Risco por operação" desc="Percentual máximo do capital que você aceita perder em uma única operação (ex: 1%)." />
          <FieldRow label="Drawdown diário"    desc="Perda máxima no dia antes de parar de operar (ex: 3% do capital)." />
          <FieldRow label="Drawdown mensal"    desc="Perda máxima no mês antes de reduzir tamanho ou pausar (ex: 8% do capital)." />
          <FieldRow label="Contratos"          desc="Número de contratos calculado automaticamente com base nos parâmetros acima e no stop em pontos." />
          <Tip type="ok">
            A gestão de risco é o único fator que você controla 100%. Use este plano rigorosamente.
          </Tip>
        </Section>

        {/* ─── INTEGRAÇÕES ─── */}
        <span id="integracoes" className="instrucoes-anchor" />
        <Section icon={Link2} title="Integrações" subtitle="Conecte ferramentas externas ao TraderLog." color="#f97316">
          <h3 className="instrucoes-h3">Google Gemini (IA)</h3>
          <p className="instrucoes-p">
            O TraderLog usa o Google Gemini para gerar análises do Diário e insights no Dashboard.
            A integração é gratuita com o plano Free do Google AI Studio (1.500 chamadas/dia).
          </p>
          <div className="instrucoes-steps-list">
            <Step n={1} title="Acesse o Google AI Studio" desc="Vá em aistudio.google.com e faça login com sua conta Google." />
            <Step n={2} title="Crie uma API Key" desc='Clique em "Get API Key" → "Create API key in new project". Copie a chave gerada (começa com AIza...).' />
            <Step n={3} title="Cole no TraderLog" desc='Em Integrações, cole a chave no campo "Google Gemini API Key" e clique em Salvar.' />
          </div>
          <Tip type="ok">A chave é armazenada com segurança e usada apenas para suas próprias análises.</Tip>

          <h3 className="instrucoes-h3" style={{ marginTop: 24 }}>Profit Pro (importação)</h3>
          <p className="instrucoes-p">
            Configure sua conta Profit Pro para importar operações automaticamente via integração Bridge,
            sem precisar digitar cada trade manualmente.
          </p>
          <FieldRow label="Profit Email" desc="E-mail da sua conta Profit Pro." />
          <FieldRow label="Profit Key"   desc="Chave de integração gerada no painel da Nelogica/Profit." />
        </Section>

        {/* ─── FLUXO IDEAL ─── */}
        <span id="fluxo" className="instrucoes-anchor" />
        <Section icon={Zap} title="Fluxo ideal de uso" subtitle="Como usar o TraderLog no dia a dia para extrair o máximo valor." color="#10b981">
          <div className="instrucoes-fluxo">
            {[
              {
                momento: 'Pré-mercado',
                icon: Target,
                cor: '#3b82f6',
                itens: [
                  'Abra o Checklist e revise os critérios do dia',
                  'Vá ao Diário → preencha o Mercado (OHLC do dia anterior como referência)',
                  'Escreva seu Plano do Dia com setups, níveis e regras',
                ],
              },
              {
                momento: 'Durante o pregão',
                icon: LineChart,
                cor: '#f59e0b',
                itens: [
                  'Antes de cada entrada, execute o Checklist',
                  'Registre cada operação no Diário → botão "+ Registrar operação"',
                  'A IA analisa automaticamente após cada registro',
                ],
              },
              {
                momento: 'Pós-mercado',
                icon: BarChart2,
                cor: '#10b981',
                itens: [
                  'Volte ao Diário → preencha o OHLC final do dia',
                  'Avalie o emocional, se seguiu o plano e o que ajustaria',
                  'Leia a análise da IA e anote o insight mais relevante em Observações',
                ],
              },
              {
                momento: 'Revisão semanal',
                icon: CalendarDays,
                cor: '#8b5cf6',
                itens: [
                  'Acesse o Calendário para ver o padrão da semana',
                  'Filtre o Histórico por setup para ver o que está funcionando',
                  'Revise o Coach IA no Dashboard para ajustar seu plano da próxima semana',
                ],
              },
            ].map(({ momento, icon: Icon, cor, itens }) => (
              <div key={momento} className="instrucoes-fluxo-card">
                <div className="instrucoes-fluxo-header">
                  <div className="instrucoes-fluxo-icon" style={{ color: cor, background: `${cor}15`, borderColor: `${cor}30` }}>
                    <Icon size={14} strokeWidth={1.75} />
                  </div>
                  <span className="instrucoes-fluxo-label" style={{ color: cor }}>{momento}</span>
                </div>
                <ul className="instrucoes-fluxo-list">
                  {itens.map(item => (
                    <li key={item} className="instrucoes-fluxo-item">
                      <CheckCircle2 size={12} color={cor} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* ─── CONFIG / PERFIL ─── */}
        <Section icon={Settings} title="Configurações & Perfil" subtitle="Ajustes pessoais e da conta." color="#6b7280">
          <FieldRow label="Configurações" desc="Parâmetros globais do sistema: valor do ponto, corretagem padrão e preferências de exibição." />
          <FieldRow label="Perfil" desc="Altere seu nome, foto de perfil e senha. Seu nome aparece na saudação da sidebar." />
        </Section>

      </div>
    </div>
  );
}

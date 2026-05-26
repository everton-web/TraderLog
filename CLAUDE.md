@AGENTS.md

# TraderLog — Contexto para o Claude

> Arquivo lido automaticamente pelo Claude Code em cada sessão.
> Mantido via Obsidian em `D:\00. AGENCIA\Obsidian Claude\traderlog-claude\CLAUDE.md`.
> Após cada feature relevante, atualize as seções abaixo.

---

## Visão Geral

**TraderLog** é um diário de trading para day traders brasileiros operando contratos futuros WIN (mini índice) e WDO (mini dólar) na B3.

- **URL produção:** `trader-log-2026.vercel.app`
- **Deploy:** Vercel (CLI `vercel --prod`, deploy manual — sem CI/CD automático)
- **Dev:** `Everton Brito` · `evertonbrito94@gmail.com`

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16.2.3 (App Router, Turbopack) |
| Runtime | React 19.2.4 |
| Linguagem | TypeScript |
| Banco | Supabase (PostgreSQL + Auth + RLS) |
| Estilo | CSS custom properties — **SEM Tailwind** |
| Ícones | Lucide React |
| Charts | Chart.js + react-chartjs-2 |
| Deploy | Vercel (CLI manual com `vercel --prod`) |

---

## Estrutura de Pastas

```
TraderLog/
├── app/
│   ├── (app)/                  ← rotas protegidas (requerem auth)
│   │   ├── layout.tsx          ← Sidebar + TopBar + ThemeProvider + SidebarOverlay
│   │   ├── dashboard/          ← visão geral, KPIs, curva de capital, right panel
│   │   ├── nova/               ← formulário de nova operação
│   │   ├── historico/          ← tabela completa de operações
│   │   ├── calendario/         ← calendário mensal de resultados
│   │   ├── checklist/          ← checklist pré-entrada interativo
│   │   ├── plano/              ← calculadora de capital + SizingEngine
│   │   ├── diario/             ← diário diário com análise por IA (Gemini)
│   │   ├── config/             ← configurações de capital e risco
│   │   ├── perfil/             ← perfil do usuário
│   │   ├── integracoes/        ← Bridge API + token de API
│   │   ├── instrucoes/         ← manual do sistema
│   │   └── admin/              ← painel admin (role: admin)
│   ├── (auth)/                 ← rotas públicas
│   │   ├── login/page.tsx      ← login com logo SVG + ThemeToggle
│   │   ├── cadastro/page.tsx   ← cadastro com logo SVG + ThemeToggle
│   │   └── onboarding/         ← onboarding pós-cadastro
│   ├── api/                    ← API routes (server-side)
│   │   ├── operacoes/          ← CRUD operações
│   │   ├── diario/             ← CRUD diario_entradas
│   │   ├── diario/analise/     ← análise IA (Gemini)
│   │   ├── diario/key/         ← verificar Gemini key
│   │   ├── ia/insights/        ← dashboard coach IA
│   │   ├── bridge/config/      ← configuração Bridge
│   │   ├── integrations/       ← integrações externas
│   │   └── token/              ← API token do usuário
│   ├── layout.tsx              ← root layout (viewport, Inter, globals.css)
│   ├── globals.css             ← design system completo (CSS custom properties)
│   └── page.tsx                ← redirect para /login ou /dashboard
├── components/
│   ├── Sidebar.tsx             ← navegação lateral (client component)
│   ├── TopBar.tsx              ← barra superior (hamburger mobile, ThemeToggle)
│   ├── SidebarOverlay.tsx      ← overlay para fechar sidebar no mobile
│   ├── ThemeProvider.tsx       ← aplica data-theme no html (3 modos)
│   ├── ThemeToggle.tsx         ← botão dark/light/auto (ícone cíclico)
│   ├── LogoImage.tsx           ← logo SVG reativa ao tema (MutationObserver)
│   ├── Toast.tsx               ← sistema de notificações
│   ├── OperacaoForm.tsx        ← formulário de operação
│   ├── OperacoesTable.tsx      ← tabela de operações
│   ├── DiarioForm.tsx          ← formulário do diário
│   ├── DiarioHubClient.tsx     ← hub do diário
│   ├── DashboardInsight.tsx    ← coach IA no dashboard
│   ├── ChecklistEntrada.tsx    ← checklist interativo
│   ├── CalculadoraCapital.tsx  ← calculadora dinâmica
│   ├── BridgeConfigForm.tsx    ← configuração Bridge
│   ├── AnthropicKeyForm.tsx    ← configuração chave IA
│   └── charts/                 ← componentes de gráficos (Chart.js)
├── lib/
│   ├── types.ts                ← interfaces TypeScript (Profile, Operacao, etc.)
│   ├── actions.ts              ← Server Actions (login, cadastro, logout)
│   ├── calculations.ts         ← calcEstatisticas, calculos de performance
│   ├── formatters.ts           ← fmtRS, fmtPct
│   └── SizingEngine.ts         ← algoritmos de sizing (Kelly, Fixed Ratio, etc.)
├── public/
│   ├── TraderLog.svg           ← logo dark (Trader verde + Log branco)
│   └── TraderLog-1.svg         ← logo light (Trader verde + Log #0C0C0C)
└── supabase/
    └── migration_diario.sql    ← migration da tabela diario_entradas (aplicar no Supabase)
```

---

## Sistema de Tema

- **3 modos:** `dark` | `light` | `auto` (segue `prefers-color-scheme`)
- **Armazenamento:** `localStorage` com chave `traderlog-theme`
- **Aplicação:** `data-theme` no `<html>` via ThemeProvider
- **Default:** `auto` (novo padrão após refactor)
- **LogoImage:** componente client que usa `MutationObserver` para trocar SVG quando tema muda
- **ThemeToggle:** ícone cíclico (Moon → Sun → Monitor) presente no TopBar E nas páginas de auth

---

## Design System (globals.css)

**Sem Tailwind.** Tudo via CSS custom properties:

```css
/* Tamanhos de texto */
--text-xs: 11px   --text-sm: 13px   --text-base: 15px
--text-md: 17px   --text-lg: 20px   --text-xl: 25px   --text-2xl: 30px

/* Layout */
--sidebar-w: 248px    --right-w: 288px    --topbar-h: 60px

/* Cores temáticas via data-theme="dark|light" */
--bg-base  --bg-surface  --bg-card  --bg-input
--text-primary  --text-secondary  --text-muted
--gain: #10b981   --loss: #ef4444   --pe-color: #f59e0b
```

**Classes principais:** `.app-wrapper`, `.sidebar`, `.main-content`, `.top-bar`, `.page-content`, `.auth-wrapper`, `.auth-card`, `.btn`, `.btn-primary`, `.form-input`, `.form-label`, `.kpi-card`, `.bento-grid`, `.table-card`, `.right-panel`, `.dash-kpi-row`, `.dash-chart-card`

**Responsividade:** Seções de media query **no final** do arquivo (crítico — CSS cascade):
- `@media (max-width: 900px)`: sidebar off-screen, right-panel hidden, hamburger visível
- `@media (max-width: 640px)`: search hidden, title compact, KPI 2 colunas

---

## Banco de Dados (Supabase)

### `profiles`
| campo | tipo |
|-------|------|
| id | uuid (FK auth.users) |
| nome | text |
| role | text ('estudante' \| 'admin') |
| avatar_url | text |
| created_at | timestamptz |

### `operacoes`
| campo | tipo | descrição |
|-------|------|-----------|
| id | uuid PK | |
| user_id | uuid FK | |
| data | date | |
| dia_semana | text | |
| ativo | text | 'WIN' \| 'WDO' |
| tipo | text | 'Compra' \| 'Venda' |
| pe | numeric | preço de entrada |
| stop | numeric | |
| risco_pts | integer | calculado |
| alvo1 | numeric | calculado |
| qtde_rp | integer | contratos no risco/parcial |
| qtde_total | integer | total de contratos |
| qtde_final | integer | |
| saida | numeric | |
| pts_final | integer | |
| situacao | text | 'Gain' \| 'Loss' \| 'PE' |
| rs_final | numeric | resultado em R$ |
| pct_risco | numeric | |
| setup | text | |
| obs | text | |

### `configuracoes`
Capital, risco_pct, mao_fixa, contratos_fixos, alvo_mult por user.

### `bridge_config`
Configuração da integração Bridge (token, gemini_key).

### `diario_entradas`
| campo | tipo |
|-------|------|
| id | uuid PK |
| user_id | uuid FK |
| data | date (unique por user) |
| mercado | text ('lateral' \| 'tendencia_alta' \| 'tendencia_baixa' \| 'volatil') |
| atr_pts | integer |
| adx_valor | integer |
| operacoes | text |
| plano_seguido | text ('sim' \| 'parcialmente' \| 'nao') |
| emocional | integer (1–5) |
| observacoes | text |
| resultado_pts | integer |
| analise_ia | text |
| analise_gerada_em | timestamptz |

> **ATENÇÃO:** `migration_diario.sql` precisa ser aplicada no Supabase Dashboard → SQL Editor se ainda não foi.

---

## Convenções de Código

- Componentes client: `'use client';` no topo
- Server Actions em `lib/actions.ts`
- Supabase server: `createClient()` de `@/utils/supabase/server`
- Supabase client: `createClient()` de `@/utils/supabase/client`
- **Sem comentários** no código (exceto WHY não-óbvio)
- Sem `console.log` em produção
- CSS via classes do design system — sem `style={{}}` exceto para valores dinâmicos

---

## Histórico de Features

| Data | Feature | Status |
|------|---------|--------|
| Abr/2026 | Estrutura base, auth, CRUD operações | ✅ |
| Mai/2026 | Dashboard com bento grid + right panel | ✅ |
| Mai/2026 | Checklist + Calculadora + Plano de Capital | ✅ |
| Mai/2026 | SizingEngine (Kelly, Fixed Ratio, Híbrido) | ✅ |
| Mai/2026 | Deploy Vercel + env vars | ✅ |
| Mai/2026 | Diário do Trader + análise Gemini AI | ✅ |
| Mai/2026 | Página /instrucoes | ✅ |
| Mai/2026 | Logo SVG + sistema de tema 3 modos | ✅ |
| Mai/2026 | Responsividade mobile (sidebar hamburger, right panel hidden) | ✅ |
| Pendente | Aplicar migration_diario.sql no Supabase | ⚠️ |

# TraderLog

Diário de operações para traders de contratos futuros **WIN** e **WDO** da B3. Registre trades, acompanhe sua curva de capital e analise métricas de desempenho em tempo real.

**Acesso:** [trader-log-eight.vercel.app](https://trader-log-eight.vercel.app)

---

## O que é

O TraderLog é uma plataforma web para estudantes e professores de trading monitorarem operações de day trade. Cada operação registrada gera automaticamente todos os dados derivados — risco, resultado, situação — sem que o usuário precise calcular nada manualmente.

Professores (role `admin`) têm um painel separado com visão de todos os alunos, incluindo alertas de overtrade.

---

## Funcionalidades

### Para o trader

| Módulo | O que faz |
|--------|-----------|
| **Dashboard** | KPIs em tempo real (capital, acerto, expectativa, drawdown), curva de capital e distribuição Gain/Loss/PE |
| **Nova Operação** | Formulário com cálculo automático de risco, alvo, resultado e situação ao digitar |
| **Histórico** | Listagem completa com filtros por ativo, situação e período + exportação em CSV |
| **Configurações** | Define capital inicial, % de risco, estratégia (mão fixa ou variável) e alvo/risk-reward |
| **Perfil** | Edita nome, e-mail, senha e foto de perfil |

### Para o professor (admin)

- Painel com todos os alunos, operações do dia, win rate e resultado
- Alerta visual de **overtrade** (>= 10 operações no dia)

---

## Cálculos automáticos

Ao registrar uma operação, os seguintes valores são calculados:

```
Risco (pts)     = |PE - Stop|
Alvo 1          = PE + (Risco × Multiplicador)   // Compra
                = PE - (Risco × Multiplicador)   // Venda

Resultado (pts) = Saída - PE   // Compra
               = PE - Saída   // Venda

R$ Final        = Resultado × Contratos × Tick
                  WIN: R$ 0,20 / ponto
                  WDO: R$ 10,00 / ponto

Situação        = Gain | Loss | PE

% Risco         = (Risco pts × Contratos × Tick) / Capital Inicial
```

**Estatísticas do dashboard:**

```
Taxa de Acerto         = Gains / Total
Payoff                 = Média Gain / Média Loss
Expectativa Matemática = (Média Gain × Acerto) − (Média Loss × Taxa de Erro)
Drawdown Máximo        = Maior queda % desde o pico acumulado de capital
```

---

## Stack

- **Next.js 16.2.3** — App Router, React Server Components, Turbopack
- **React 19 / TypeScript**
- **Supabase** — Autenticação, banco PostgreSQL e storage de avatars
- **Chart.js 4 + react-chartjs-2** — Gráficos
- **Lucide React** — Ícones
- **Vercel** — Deploy e hosting

---

## Banco de dados

```
profiles          — dados do usuário (nome, role, avatar)
configuracoes     — capital, % risco, estratégia, alvo (1 por usuário)
operacoes         — registro de cada trade
avatars           — bucket de storage para fotos de perfil
```

Roles disponíveis: `estudante` (padrão) e `admin`.

O schema completo está em [`supabase/schema.sql`](supabase/schema.sql).

---

## Rodando localmente

### Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com)

### Instalação

```bash
git clone https://github.com/seu-usuario/traderlog.git
cd traderlog
npm install
```

### Variáveis de ambiente

Crie um arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Essas chaves estão disponíveis em **Supabase > Project Settings > API**.

### Banco de dados

Execute o schema no SQL Editor do Supabase:

```bash
# Cole o conteúdo de supabase/schema.sql no SQL Editor do Supabase
# ou use a CLI do Supabase:
supabase db push
```

### Iniciando

```bash
npm run dev
# Acesse http://localhost:3000
```

---

## Promover um usuário a admin

No SQL Editor do Supabase:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = 'uuid-do-usuario';
```

---

## Deploy

O projeto faz deploy automático via Vercel ao fazer push para `main`.

Para deploy manual:

```bash
npm i -g vercel
vercel --prod
```

---

## Estrutura do projeto

```
app/
├── (auth)/          # Login e cadastro
└── (app)/           # Área autenticada
    ├── dashboard/   # Visão geral + KPIs
    ├── nova/        # Registro de operação
    ├── historico/   # Histórico + exportação
    ├── config/      # Configurações do trader
    ├── perfil/      # Dados do usuário
    └── admin/       # Painel do professor

components/
├── charts/          # CapitalChart, MesesChart, DistribuicaoChart...
├── OperacaoForm.tsx # Formulário com cálculos em tempo real
├── OperacoesTable.tsx
├── Sidebar.tsx
└── TopBar.tsx

lib/
├── calculations.ts  # Toda a lógica de cálculo
├── actions.ts       # Server actions (auth, CRUD)
├── types.ts
└── formatters.ts
```

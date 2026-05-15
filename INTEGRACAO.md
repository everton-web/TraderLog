# Integração no TraderLog

## Arquivos

```
components/ChecklistEntrada.tsx      ← checklist pré-operação
components/CalculadoraCapital.tsx    ← calculadora de capital interativa
app/(app)/checklist/page.tsx         ← rota /checklist
app/(app)/plano/page.tsx             ← rota /plano
```

## Passos

### 1. Copiar os arquivos

```
components/ChecklistEntrada.tsx   → components/
components/CalculadoraCapital.tsx → components/
app/(app)/checklist/page.tsx      → app/(app)/checklist/
app/(app)/plano/page.tsx          → app/(app)/plano/
```

### 2. Adicionar links na Sidebar

```tsx
import { ClipboardCheck, TrendingUp } from "lucide-react";

// Dentro do array/lista de links de navegação:
{
  href: "/checklist",
  label: "Checklist",
  icon: <ClipboardCheck size={18} />,
},
{
  href: "/plano",
  label: "Plano de Capital",
  icon: <TrendingUp size={18} />,
}
```

### 3. Dependências

Nenhuma nova. Usa apenas:
- React (useState) — já presente
- lucide-react — já presente
- Classes Tailwind — já configurado

## O que cada módulo faz

### Checklist de Entrada (/checklist)
- 4 seções com 10 itens clicáveis (pré-entrada, setup, risco, pós-operação)
- 3 travas absolutas que bloqueiam a entrada se ativadas
- Barra de progresso com cor dinâmica
- Veredito visual: autorizado / trava ativa / itens pendentes
- Botão de reset para nova operação

### Calculadora de Capital (/plano)
- 3 sliders interativos: stop (100–500 pts), R:R (1.0–3.0), loss diário (1–4 stops)
- 4 métricas calculadas em tempo real: risco, alvo, loss diário, colchão
- Capital recomendado em 3 faixas: mínimo, ideal, confortável
- 4 fases do plano recalculadas dinamicamente
- Botão de reset dos parâmetros

## Comportamento

- Estado em memória (useState) — reseta ao navegar
- Não persiste no banco
- Totalmente responsivo e suporta dark mode
- Funciona no celular via Vercel (link compartilhável)

"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  Target,
  ShieldAlert,
  BookOpen,
  Ban,
} from "lucide-react";

type Item = {
  id: string;
  texto: string;
  sub?: string;
};

type Secao = {
  id: string;
  label: string;
  cor: "blue" | "green" | "amber" | "purple" | "red";
  icone: React.ReactNode;
  itens: Item[];
  isKiller?: boolean;
};

const SECOES: Secao[] = [
  {
    id: "pre",
    label: "Pré-entrada",
    cor: "blue",
    icone: <TrendingUp size={14} />,
    itens: [
      {
        id: "pre-1",
        texto: "Defini o contexto do dia",
        sub: "Tendência, lateralização ou indefinido. Se lateral → não opero.",
      },
      {
        id: "pre-2",
        texto: "Identifiquei os níveis relevantes",
        sub: "Máxima/mínima anterior, pivôs, abertura do dia.",
      },
      {
        id: "pre-3",
        texto: "Não estou operando no emocional",
        sub: "Loss do dia dentro do limite. Não estou tentando recuperar.",
      },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    cor: "green",
    icone: <Target size={14} />,
    itens: [
      {
        id: "setup-1",
        texto: "Movimento a favor da tendência maior",
        sub: "Não compro em tendência de baixa, não vendo em tendência de alta.",
      },
      {
        id: "setup-2",
        texto: "Pullback/pivot em região de valor",
        sub: "Preço retornou a suporte/resistência relevante, não no meio do nada.",
      },
      {
        id: "setup-3",
        texto: "Há confirmação de price action no nível",
        sub: "Rejeição, engolfo, pin bar — sinal claro antes de entrar.",
      },
    ],
  },
  {
    id: "risco",
    label: "Risco",
    cor: "amber",
    icone: <ShieldAlert size={14} />,
    itens: [
      {
        id: "risco-1",
        texto: "Stop definido antes da entrada",
        sub: "Ponto exato no gráfico. Máximo 500 pts.",
      },
      {
        id: "risco-2",
        texto: "Alvo mínimo de 1:1.5",
        sub: "Stop 400 pts → alvo mínimo 600 pts. Abaixo disso não vale.",
      },
      {
        id: "risco-3",
        texto: "Ainda tenho limite diário disponível",
        sub: "Não ultrapassei meu loss máximo do dia.",
      },
    ],
  },
  {
    id: "pos",
    label: "Pós-operação",
    cor: "purple",
    icone: <BookOpen size={14} />,
    itens: [
      {
        id: "pos-1",
        texto: "Vou registrar no TraderLog imediatamente",
        sub: "Não saio da operação sem abrir o diário.",
      },
    ],
  },
];

const TRAVAS: Item[] = [
  { id: "trava-1", texto: "Mercado está em lateralização clara" },
  { id: "trava-2", texto: "Já bati o loss máximo do dia" },
  { id: "trava-3", texto: "Estou entrando por impulso / sem setup definido" },
];

const TOTAL_MAIN = SECOES.reduce((acc, s) => acc + s.itens.length, 0);

const COR_MAP = {
  blue: {
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    check: "text-blue-500",
  },
  green: {
    badge: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    check: "text-green-500",
  },
  amber: {
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    check: "text-amber-500",
  },
  purple: {
    badge:
      "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    check: "text-purple-500",
  },
  red: {
    badge: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    check: "text-red-500",
  },
};

export function ChecklistEntrada() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [travas, setTravas] = useState<Set<string>>(new Set());

  const totalChecked = [...checked].filter((id) =>
    SECOES.flatMap((s) => s.itens).some((i) => i.id === id)
  ).length;

  const pct = Math.round((totalChecked / TOTAL_MAIN) * 100);
  const killerAtivo = travas.size > 0;
  const completo = totalChecked === TOTAL_MAIN && !killerAtivo;

  function toggleItem(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTrava(id: string) {
    setTravas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function resetar() {
    setChecked(new Set());
    setTravas(new Set());
  }

  return (
    <div className="space-y-6">
      {/* Progresso */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progresso
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalChecked} / {TOTAL_MAIN}
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-3">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: killerAtivo
                ? "#ef4444"
                : completo
                ? "#22c55e"
                : "#3b82f6",
            }}
          />
        </div>

        {/* Veredito */}
        {killerAtivo && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2">
            <Ban size={15} className="text-red-500 shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-400 font-medium">
              Trava ativa — não opere independente do setup.
            </span>
          </div>
        )}
        {!killerAtivo && completo && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 px-3 py-2">
            <CheckCircle2 size={15} className="text-green-500 shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-400 font-medium">
              Checklist completo — entrada autorizada. Registre no TraderLog.
            </span>
          </div>
        )}
        {!killerAtivo && !completo && totalChecked >= 7 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <AlertTriangle size={15} className="text-amber-500 shrink-0" />
            <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              {TOTAL_MAIN - totalChecked} iten(s) pendente(s) — revise antes de
              entrar.
            </span>
          </div>
        )}
      </div>

      {/* Seções principais */}
      {SECOES.map((secao) => (
        <div key={secao.id} className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                COR_MAP[secao.cor].badge
              }`}
            >
              {secao.icone}
              {secao.label}
            </span>
          </div>

          {secao.itens.map((item) => {
            const isChecked = checked.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all duration-150 ${
                  isChecked
                    ? "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-60"
                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isChecked ? (
                    <CheckCircle2
                      size={18}
                      className={COR_MAP[secao.cor].check}
                    />
                  ) : (
                    <Circle size={18} className="text-gray-300 dark:text-gray-600" />
                  )}
                </div>
                <div>
                  <p
                    className={`text-sm font-medium leading-snug ${
                      isChecked
                        ? "line-through text-gray-400 dark:text-gray-500"
                        : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {item.texto}
                  </p>
                  {item.sub && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">
                      {item.sub}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}

      {/* Travas absolutas */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
            <XCircle size={14} />
            Travas absolutas
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Se qualquer uma for verdadeira → não opere
          </span>
        </div>

        {TRAVAS.map((trava) => {
          const isAtiva = travas.has(trava.id);
          return (
            <button
              key={trava.id}
              onClick={() => toggleTrava(trava.id)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 ${
                isAtiva
                  ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-red-200 dark:hover:border-red-900"
              }`}
            >
              <div className="shrink-0">
                {isAtiva ? (
                  <XCircle size={18} className="text-red-500" />
                ) : (
                  <Circle size={18} className="text-gray-300 dark:text-gray-600" />
                )}
              </div>
              <p
                className={`text-sm font-medium ${
                  isAtiva
                    ? "text-red-700 dark:text-red-400"
                    : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {trava.texto}
              </p>
            </button>
          );
        })}
      </div>

      {/* Rodapé */}
      <div className="flex justify-end pt-2">
        <button
          onClick={resetar}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <RotateCcw size={14} />
          Reiniciar checklist
        </button>
      </div>
    </div>
  );
}

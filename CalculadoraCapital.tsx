"use client";

import { useState } from "react";
import {
  TrendingUp,
  ShieldAlert,
  Target,
  Wallet,
  RotateCcw,
} from "lucide-react";

function fmt(v: number): string {
  return "R$ " + Math.round(v).toLocaleString("pt-BR");
}

export function CalculadoraCapital() {
  const [stop, setStop] = useState(500);
  const [rrRaw, setRrRaw] = useState(15);
  const [maxStops, setMaxStops] = useState(2);

  const rr = rrRaw / 10;
  const risco = stop * 2 * 0.2;
  const alvo = stop * rr * 2 * 0.2;
  const lossD = risco * maxStops;
  const diasRuins = 3;
  const colchao = lossD * diasRuins;
  const margem = 310;

  const capMin = margem + colchao;
  const capIdeal = capMin + lossD * 2;
  const capConf = capIdeal * 1.4;

  const metaDia = Math.round(alvo * 0.7);
  const metaSem = metaDia * 3;
  const metaMes1 = Math.round(metaSem * 4 * 0.6);
  const metaMes2 = Math.round(metaSem * 4 * 0.8);

  function resetar() {
    setStop(500);
    setRrRaw(15);
    setMaxStops(2);
  }

  return (
    <div className="space-y-4">
      {/* Parâmetros */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Parâmetros da operação
        </p>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Stop por operação (pts)
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {stop}
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={500}
              step={50}
              value={stop}
              onChange={(e) => setStop(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Alvo mínimo (R:R)
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {rr.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={30}
              step={1}
              value={rrRaw}
              onChange={(e) => setRrRaw(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Loss máx. diário (stops)
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {maxStops}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={maxStops}
              onChange={(e) => setMaxStops(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2">
        {[
          {
            label: "Risco por operação",
            valor: fmt(risco),
            sub: `${stop} pts × 2 contr.`,
            icon: <ShieldAlert size={14} className="text-amber-500" />,
          },
          {
            label: "Alvo por operação",
            valor: fmt(alvo),
            sub: `${Math.round(stop * rr)} pts × 2 contr.`,
            icon: <Target size={14} className="text-green-500" />,
          },
          {
            label: "Loss máximo diário",
            valor: fmt(lossD),
            sub: `${maxStops} stop(s)`,
            icon: <TrendingUp size={14} className="text-red-500" />,
          },
          {
            label: "Colchão (3 dias ruins)",
            valor: fmt(colchao),
            sub: `${diasRuins} dias × ${fmt(lossD)}/dia`,
            icon: <Wallet size={14} className="text-blue-500" />,
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              {m.icon}
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {m.label}
              </span>
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {m.valor}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {m.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Capital Recomendado */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Capital recomendado
        </p>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-gray-800 dark:text-gray-200">
                Mínimo absoluto
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Margem + 3 dias de loss máximo.
              </p>
            </div>
            <div className="text-right">
              <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                {fmt(capMin)}
              </p>
              <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                mínimo
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 -mx-4 px-4 bg-gray-50 dark:bg-gray-800/30">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Capital ideal ★
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                + margem psicológica (2 dias de loss).
              </p>
            </div>
            <div className="text-right">
              <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                {fmt(capIdeal)}
              </p>
              <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400">
                adequado
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-gray-800 dark:text-gray-200">
                Capital confortável
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Opera sem ansiedade de capital.
              </p>
            </div>
            <div className="text-right">
              <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                {fmt(capConf)}
              </p>
              <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400">
                confortável
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fases do plano */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Fases do plano
        </p>

        <div className="space-y-3">
          {[
            {
              cor: "border-blue-500",
              label: "Fase 1 — agora",
              titulo: "Simulador (2–4 semanas)",
              desc: `2 contratos no replay. Meta: 60%+ de acerto com R:R ${rr.toFixed(1)} em 50 operações. Registrar tudo no TraderLog.`,
            },
            {
              cor: "border-amber-500",
              label: "Fase 2 — capital mínimo",
              titulo: `Juntar ${fmt(capMin)} → 1 contrato real`,
              desc: `1 contrato até atingir ${fmt(capIdeal)}. Risco por op: ${fmt(risco / 2)}. Loss diário máx: ${fmt(lossD / 2)}. Reinveste os lucros.`,
            },
            {
              cor: "border-green-500",
              label: "Fase 3 — capital ideal",
              titulo: `Com ${fmt(capIdeal)} → 2 contratos`,
              desc: `Risco por op: ${fmt(risco)}. Loss diário máx: ${fmt(lossD)}. Meta conservadora: ${fmt(metaDia)}/dia — ${fmt(metaSem)}/semana.`,
            },
            {
              cor: "border-purple-500",
              label: "Fase 4 — crescimento",
              titulo: `Acima de ${fmt(capConf)} → consistência`,
              desc: `Meta mensal realista: ${fmt(metaMes1)}–${fmt(metaMes2)}. Nunca sacar abaixo de ${fmt(capIdeal)}.`,
            },
          ].map((fase) => (
            <div
              key={fase.label}
              className={`border-l-2 ${fase.cor} pl-3 py-1`}
            >
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {fase.label}
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                {fase.titulo}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
                {fase.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div className="flex justify-end">
        <button
          onClick={resetar}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <RotateCcw size={14} />
          Resetar parâmetros
        </button>
      </div>
    </div>
  );
}

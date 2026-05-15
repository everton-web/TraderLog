import { CalculadoraCapital } from "@/components/CalculadoraCapital";
import { TrendingUp } from "lucide-react";

export const metadata = {
  title: "Plano de Capital | TraderLog",
};

export default function PlanoPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
          <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Plano de capital
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            WIN · 2 contratos · ajuste os parâmetros
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 pl-11">
        Mova os sliders para simular cenários diferentes de stop, alvo e loss
        diário. O capital recomendado recalcula em tempo real.
      </p>

      <CalculadoraCapital />
    </div>
  );
}

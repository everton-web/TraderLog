import { ChecklistEntrada } from "@/components/ChecklistEntrada";
import { ClipboardCheck } from "lucide-react";

export const metadata = {
  title: "Checklist de Entrada | TraderLog",
};

export default function ChecklistPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
          <ClipboardCheck size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Checklist de entrada
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Execute antes de cada operação no WIN
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 pl-11">
        Todos os itens precisam estar marcados antes de entrar. Travas absolutas
        bloqueiam a operação independente do setup.
      </p>

      <ChecklistEntrada />
    </div>
  );
}

import { CalculadoraCapital } from "@/components/CalculadoraCapital";

export const metadata = {
  title: "Plano de Capital | TraderLog",
};

export default function PlanoPage() {
  return (
    <>
      <div className="section-header">
        <h1>Plano de Capital</h1>
        <p className="section-desc">
          Ajuste os parâmetros e simule cenários de stop, alvo e loss diário. Capital recomendado recalcula em tempo real.
        </p>
      </div>
      <CalculadoraCapital />
    </>
  );
}

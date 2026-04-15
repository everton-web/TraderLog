export const fmtRS = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const fmtPts = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return '—';
  return (n >= 0 ? '+' : '') + Number(n).toLocaleString('pt-BR');
};

export const fmtPct = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return '—';
  return (n * 100).toFixed(2) + '%';
};

export const formatDate = (isoDate: string): string => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

export const hojeISO = (): string => new Date().toISOString().slice(0, 10);

const DIAS_SEMANA = ['DOMINGO','SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO'];
export const diaSemana = (isoDate: string): string => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return DIAS_SEMANA[dt.getDay()];
};

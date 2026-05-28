import { cookies } from 'next/headers';

export type Ambiente = 'real' | 'simulador';
export const AMBIENTE_COOKIE = 'traderlog-ambiente';

export async function getAmbiente(): Promise<Ambiente> {
  const store = await cookies();
  return store.get(AMBIENTE_COOKIE)?.value === 'simulador' ? 'simulador' : 'real';
}

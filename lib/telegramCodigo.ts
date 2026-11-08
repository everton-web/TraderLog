import { createHash, randomInt } from 'node:crypto';

// Sem 0/O e 1/I: o código é digitado no Telegram.
export const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const TAMANHO = 8;
export const VALIDADE_MIN = 10;
export const MAX_CODIGOS_HORA = 5;
export const ACEITE_VERSAO = 'v1-2026-11-08';

export function gerarCodigo(sortear: (max: number) => number = randomInt): string {
  let c = '';
  for (let i = 0; i < TAMANHO; i++) c += ALFABETO[sortear(ALFABETO.length)];
  return c;
}

// Igual ao banco: encode(digest(upper(btrim(codigo)), 'sha256'), 'hex') em vincular_telegram.
export function hashCodigo(codigo: string): string {
  return createHash('sha256').update(codigo.trim().toUpperCase()).digest('hex');
}

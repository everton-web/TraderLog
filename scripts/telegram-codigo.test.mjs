// node --test scripts/telegram-codigo.test.mjs   (Node 24 roda o .ts direto)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gerarCodigo, hashCodigo, ALFABETO, TAMANHO } from '../lib/telegramCodigo.ts';

test('código tem 8 caracteres do alfabeto sem 0/O/1/I', () => {
  for (let i = 0; i < 500; i++) {
    const c = gerarCodigo();
    assert.equal(c.length, TAMANHO);
    assert.match(c, /^[A-HJ-NP-Z2-9]{8}$/);
  }
  assert.ok(!/[01OI]/.test(ALFABETO));
});

test('códigos variam', () => {
  const s = new Set(Array.from({ length: 1000 }, () => gerarCodigo()));
  assert.ok(s.size > 995);
});

test('sortear determinístico monta o código esperado', () => {
  let i = 0;
  assert.equal(gerarCodigo(() => i++), 'ABCDEFGH');
});

test('hash bate com o do banco: sha256 hex de upper(btrim(codigo))', () => {
  const esperado = createHash('sha256').update('ABCD2345').digest('hex');
  assert.equal(hashCodigo('ABCD2345'), esperado);
  assert.equal(hashCodigo('  abcd2345 '), esperado);
  assert.match(hashCodigo('X'), /^[0-9a-f]{64}$/);
});

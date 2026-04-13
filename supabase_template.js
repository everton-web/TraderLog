/**
 * ============================================================
 *   SUPABASE CONFIGURATION TEMPLATE (NUVEM BÁSICA)
 * ============================================================
 * 
 * Instruções para Prod/Online:
 * 1. Crie uma conta no supabase.com
 * 2. Cole aqui sua URL e o seu ANON_KEY gerados pelo sistema
 * 3. Remova as funções "demoLogin" do app.js e adicione a chamada `supabase.auth.signInWithPassword()`
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 1. Substitua com a sua URL e Key
const SUPABASE_URL = 'https://sua-url-do-projeto.supabase.co';
const SUPABASE_KEY = 'sua-anon-key-aqui';

// Inicializa a conexão Client do JS para a Nuvem
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * ==========================================
 * Funções Prontas Substitutas para o APP.JS
 * ==========================================
 */

// Faz o Login Real Checando no DB
export async function logarEstudante(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error('Erro no login:', error.message);
    return false;
  }
  
  return data.user;
}

// Salva a Operação na Tabela Nuvem enves do localStorage
export async function sincronizarOperacaoNuvem(operacao) {
  const userId = (await supabase.auth.getUser()).data.user.id;
  
  const { data, error } = await supabase
    .from('operacoes')
    .insert([
      { 
        user_id: userId,
        ativo: operacao.ativo,
        tipo: operacao.tipo,
        risco_financeiro: operacao.risco, // etc..
      }
    ]);
    
  return data;
}

// Busca a visão do Professor (ADM) puxando todos da tabela em lote
export async function fetchTabelaAdmin() {
  const { data, error } = await supabase
    .from('operacoes')
    .select(`
      *,
      usuarios (nome, role)
    `);
    
  if (error) throw error;
  return data; // Array com todos os estudantes mesclados
}

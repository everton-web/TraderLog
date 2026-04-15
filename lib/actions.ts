'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Ativo, TipoOp, Situacao } from './types';

// ─── AUTH ───────────────────────────────────────────────
export async function login(_: unknown, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });
  if (error) return { error: error.message };
  redirect('/dashboard');
}

export async function cadastro(_: unknown, formData: FormData) {
  const supabase = await createClient();
  const nome = formData.get('nome') as string;
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: { data: { nome } },
  });
  if (error) return { error: error.message };
  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// ─── OPERAÇÕES ──────────────────────────────────────────
export async function salvarOperacao(op: {
  data: string; dia_semana: string; ativo: Ativo; tipo: TipoOp;
  pe: number; stop: number; risco_pts: number | null; alvo1: number | null;
  qtde_rp: number; qtde_total: number; qtde_final: number;
  saida: number; pts_final: number | null; situacao: Situacao | null;
  rs_final: number | null; pct_risco: number | null;
  setup: string; obs: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };
  const { error } = await supabase.from('operacoes').insert([{ ...op, user_id: user.id }]);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/historico');
  return { success: true };
}

export async function deletarOperacao(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('operacoes').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/historico');
  return { success: true };
}

// ─── CONFIG ─────────────────────────────────────────────
export async function salvarConfig(_: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const config = {
    user_id: user.id,
    capital: Number(formData.get('capital')),
    risco_pct: Number(formData.get('risco_pct')),
    mao_fixa: formData.get('mao_fixa') === 'true',
    contratos_fixos: Number(formData.get('contratos_fixos')),
    alvo_mult: Number(formData.get('alvo_mult')),
  };

  const { error } = await supabase
    .from('configuracoes')
    .upsert([config], { onConflict: 'user_id' });

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/config');
  return { success: true };
}

// ─── PERFIL ─────────────────────────────────────────────
export async function atualizarPerfil(_: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const nome  = formData.get('nome') as string;
  const email = formData.get('email') as string;
  const senha = formData.get('senha') as string;

  const { error: pe } = await supabase.from('profiles').update({ nome }).eq('id', user.id);
  if (pe) return { error: pe.message };

  if (email && email !== user.email) {
    const { error: ee } = await supabase.auth.updateUser({ email });
    if (ee) return { error: ee.message };
  }
  if (senha && senha.length >= 6) {
    const { error: se } = await supabase.auth.updateUser({ password: senha });
    if (se) return { error: se.message };
  }

  revalidatePath('/perfil');
  return { success: true };
}

export async function uploadAvatar(_: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const file = formData.get('avatar') as File;
  if (!file || !file.size) return { error: 'Nenhum arquivo selecionado' };

  const ext  = file.name.split('.').pop();
  const path = `${user.id}/avatar.${ext}`;

  const { error: ue } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (ue) return { error: ue.message };

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);

  revalidatePath('/perfil');
  return { success: true, url: publicUrl };
}

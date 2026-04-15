'use client';
import { useState, useRef } from 'react';
import { atualizarPerfil, uploadAvatar } from '@/lib/actions';
import { useToast } from '@/components/Toast';
import { Camera, Check } from 'lucide-react';
import type { Profile } from '@/lib/types';

export default function PerfilClient({ profile, email }: { profile: Profile; email: string }) {
  const { showToast } = useToast();
  const [nome,    setNome]    = useState(profile.nome || '');
  const [emailV,  setEmailV]  = useState(email);
  const [senha,   setSenha]   = useState('');
  const [avatar,  setAvatar]  = useState(profile.avatar_url);
  const [saving,  setSaving]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = nome
    ? nome.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.set('nome',  nome);
    fd.set('email', emailV);
    fd.set('senha', senha);
    const res = await atualizarPerfil(null, fd);
    setSaving(false);
    if (res?.error) showToast('Erro: ' + res.error, 'error');
    else { showToast('Perfil atualizado!', 'success'); setSenha(''); }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.set('avatar', file);
    const res = await uploadAvatar(null, fd);
    setUploading(false);
    if (res?.error) showToast('Erro: ' + res.error, 'error');
    else { setAvatar(res.url ?? null); showToast('Foto atualizada!', 'success'); }
  };

  return (
    <>
      <div className="section-header">
        <h1>Meu Perfil</h1>
        <p className="section-desc">Gerencie suas informações pessoais</p>
      </div>

      <div className="perfil-container">
        <div className="config-card">
          <div className="avatar-wrapper">
            <div className="avatar-large" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }} title="Clique para trocar a foto">
              {avatar ? <img src={avatar} alt="avatar" /> : initials}
            </div>
            <div className="avatar-info">
              <h3>{nome || 'Sem nome'}</h3>
              <p>{email}</p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 8, fontSize: 11, padding: '4px 10px' }}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Enviando...' : <><Camera size={12} strokeWidth={1.75} /> Trocar foto</>}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatar}
            />
          </div>

          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group form-group--wide">
                <label className="form-label" htmlFor="nome">Nome</label>
                <input type="text" id="nome" className="form-input" value={nome} onChange={e => setNome(e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group form-group--wide">
                <label className="form-label" htmlFor="email">E-mail</label>
                <input type="email" id="email" className="form-input" value={emailV} onChange={e => setEmailV(e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group form-group--wide">
                <label className="form-label" htmlFor="senha">Nova Senha <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(deixe em branco para manter)</span></label>
                <input type="password" id="senha" className="form-input" placeholder="Mínimo 6 caracteres" value={senha} onChange={e => setSenha(e.target.value)} minLength={6} />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : <><Check size={13} strokeWidth={2.5} /> Salvar Alterações</>}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Perfil: <strong style={{ color: 'var(--text-secondary)' }}>{profile.role}</strong></span>
              <span>Desde: <strong style={{ color: 'var(--text-secondary)' }}>{new Date(profile.created_at).toLocaleDateString('pt-BR')}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

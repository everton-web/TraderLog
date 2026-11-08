'use client';
import { useEffect, useState } from 'react';
import { Send, Copy, CheckCircle2, AlertCircle, Loader2, Unlink } from 'lucide-react';

const BOT = 'Orion_traderlog_bot';

type Vinculo = { criado_em: string; revogado_em: string | null } | null;

export default function TelegramVinculo({ vinculoInicial }: { vinculoInicial: Vinculo }) {
  const [vinculo, setVinculo] = useState<Vinculo>(vinculoInicial);
  const [aceite, setAceite]   = useState(false);
  const [codigo, setCodigo]   = useState<string | null>(null);
  const [expira, setExpira]   = useState<number | null>(null);
  const [agora, setAgora]     = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro]       = useState<string | null>(null);

  useEffect(() => {
    if (!expira) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expira]);

  const restante = expira ? Math.max(0, Math.floor((expira - agora) / 1000)) : 0;
  const vencido  = !!codigo && restante === 0;

  const gerar = async () => {
    setLoading(true);
    setErro(null);
    const res  = await fetch('/api/telegram', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aceite }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setErro(data.error); return; }
    setCodigo(data.codigo);
    setExpira(new Date(data.expira_em).getTime());
    setAgora(Date.now());
  };

  const copiar = async () => {
    if (!codigo) return;
    await navigator.clipboard.writeText(`/vincular ${codigo}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const desvincular = async () => {
    if (!confirm('Desvincular o Telegram desta conta? O bot para de mandar mensagens para você.')) return;
    setLoading(true);
    const res = await fetch('/api/telegram', { method: 'DELETE' });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setErro(data.error); return; }
    setVinculo(null);
    setCodigo(null);
  };

  if (vinculo && !vinculo.revogado_em) {
    return (
      <div className="api-token-container">
        <div className="api-feedback success">
          <CheckCircle2 size={13} /> Telegram vinculado desde {new Date(vinculo.criado_em).toLocaleDateString('pt-BR')}.
        </div>
        <button className="btn btn-secondary btn-sm" onClick={desvincular} disabled={loading}>
          <Unlink size={12} /> Desvincular
        </button>
        {erro && <div className="api-feedback error"><AlertCircle size={13} /> {erro}</div>}
      </div>
    );
  }

  if (vinculo?.revogado_em) {
    return (
      <div className="api-feedback error">
        <AlertCircle size={13} /> O acesso deste chat foi encerrado pelo administrador.
      </div>
    );
  }

  return (
    <div className="api-token-container">
      <div className="card-desc">
        <p><strong>Antes de vincular o Telegram.</strong> O TraderLog é um projeto pessoal e gratuito de Everton Brito,
          que é o responsável pelos seus dados. Para mandar mensagens, vamos guardar seu e-mail, o ID do seu chat no
          Telegram e as operações que você mesmo registrar. Usamos esses dados só para enviar a leitura de mercado e o
          resumo das suas operações.</p>
        <p style={{ marginTop: 8 }}>Seus dados ficam em servidores fora do Brasil. O Telegram também recebe as
          mensagens e tem política própria. Ao marcar abaixo, você concorda com essa transferência.</p>
        <p style={{ marginTop: 8 }}>As mensagens são informativas. Não são recomendação de investimento nem
          consultoria, e o autor não é analista credenciado na CVM.</p>
        <p style={{ marginTop: 8 }}>Você pode desvincular a qualquer momento aqui, apagar a conta (isso apaga o
          vínculo) ou pedir acesso ou exclusão dos seus dados ao Everton.</p>
      </div>

      <label className="form-label" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} /> Li e aceito.
      </label>

      {codigo && !vencido ? (
        <>
          <p className="api-token-desc">
            Mande esta mensagem para <strong>@{BOT}</strong> no Telegram. O código vale por {Math.floor(restante / 60)}:
            {String(restante % 60).padStart(2, '0')} e só funciona uma vez.
          </p>
          <div className="api-token-row">
            <code className="api-token-value">/vincular {codigo}</code>
            <button className="btn-icon" title="Copiar" onClick={copiar}>
              {copiado ? <CheckCircle2 size={14} color="var(--gain)" /> : <Copy size={14} />}
            </button>
          </div>
        </>
      ) : (
        <button className="btn btn-primary" onClick={gerar} disabled={!aceite || loading} style={{ marginTop: 8 }}>
          {loading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
          {vencido ? ' Gerar outro código' : ' Gerar código de vínculo'}
        </button>
      )}

      {erro && <div className="api-feedback error"><AlertCircle size={13} /> {erro}</div>}
    </div>
  );
}

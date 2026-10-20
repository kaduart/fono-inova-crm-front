import { useEffect, useState } from 'react';
import API from '../../../services/api';

type Reply = { id: string; title: string; when: string; text: string };
export default function CommercialQuickReplies() {
  const [items, setItems] = useState<Reply[]>([]);
  const [selected, setSelected] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  const load = () => { setError(false); API.get('/leads/commercial-playbook').then(res => {
    setItems(res.data.data); setStatus('');
  }).catch(() => setError(true)); };
  useEffect(load, []);
  const reply = items.find(item => item.id === selected);
  return <details className="border border-slate-200 rounded-xl p-4 bg-white">
    <summary className="cursor-pointer font-semibold text-slate-800">Respostas rápidas do comercial</summary>
    <div className="mt-3 space-y-3">
      <p className="text-sm text-slate-600">Escolha, adapte ao contexto e copie. Esta ação não envia mensagens nem agenda retomadas automáticas.</p>
      {error ? <button type="button" onClick={load} className="text-emerald-700 underline">Não foi possível carregar. Tentar novamente</button> :
      <select aria-label="Modelo de resposta" value={selected} onChange={e => {
        setSelected(e.target.value); setText(items.find(i => i.id === e.target.value)?.text ?? ''); setStatus('');
      }} className="w-full border border-slate-300 rounded-lg p-2 text-sm">
        <option value="">{items.length ? 'Selecione uma resposta' : 'Carregando respostas…'}</option>
        {items.map(i => <option key={i.id} value={i.id}>/{i.id} — {i.title}</option>)}
      </select>}
      {reply && <><p className="text-sm text-slate-600">Quando usar: {reply.when}</p>
      <label className="block text-sm font-medium text-slate-700" htmlFor="commercial-reply">Mensagem para revisar</label>
      <textarea id="commercial-reply" rows={5} value={text} onChange={e => {setText(e.target.value); setStatus('');}} className="w-full border border-slate-300 rounded-lg p-3 text-sm" />
      <p className="text-sm text-slate-600">Preencha os campos entre colchetes. A duração de uma hora refere-se somente à Fonoaudiologia.</p>
      <button type="button" disabled={!text.trim() || /\[[^\]]+\]/.test(text)} onClick={async () => {
        try { await navigator.clipboard.writeText(text); setStatus('Mensagem copiada. Revise a conversa antes de enviar.'); }
        catch {setStatus('Não foi possível copiar. Selecione o texto e copie manualmente.');}
      }} className="bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">Copiar mensagem revisada</button></>}
      <p role="status" className="text-sm text-slate-700">{status}</p>
    </div>
  </details>;
}

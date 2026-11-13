import React, { useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Check, ChevronDown, LoaderCircle, RotateCcw, X } from 'lucide-react';
import './preview.css';

const ease = [0.22, 1, 0.36, 1] as const;
const examples = [
  { id: 'modal', title: 'Abrir um atendimento', where: 'Agenda · detalhes do atendimento', description: 'A proposta entra com escala discreta e fecha mais rápido. Compare também o fechamento.', recipe: 'Modal open/close · 250 ms / 150 ms' },
  { id: 'tabs', title: 'Trocar de aba', where: 'Agenda · seções do atendimento', description: 'O indicador acompanha a escolha. Clique nas abas ou use as setas do teclado.', recipe: 'Tabs sliding · 250 ms' },
  { id: 'save', title: 'Salvar uma alteração', where: 'Agenda · edição do atendimento', description: 'Simulação de salvamento: o texto muda suavemente e confirma o término. Nenhum dado é enviado.', recipe: 'Text states swap · 150 ms' },
  { id: 'toast', title: 'Receber uma confirmação', where: 'Notificações · Pix, chat e pré-agendamento', description: 'A proposta preserva a saída animada. Mostre a notificação e depois feche no ×.', recipe: 'Toast open/close · 350 ms / 250 ms' },
  { id: 'accordion', title: 'Consultar horários', where: 'Profissionais · horários disponíveis', description: 'A proposta anima a expansão e o recolhimento. Abra e feche para comparar.', recipe: 'Accordion · 250 ms' },
] as const;
type Kind = typeof examples[number]['id'];

function Demo({ kind, proposed, reset }: { kind: Kind; proposed: boolean; reset: number }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const uid = useId();
  useEffect(() => {
    setOpen(false); setTab(0); setSaving(0); clearTimeout(timer.current);
    return () => clearTimeout(timer.current);
  }, [reset]);
  useEffect(() => { if (kind === 'modal' && open) close.current?.focus(); }, [open, kind]);
  const dismiss = () => { setOpen(false); trigger.current?.focus(); };

  if (kind === 'tabs') return <div className="tab-demo">
    <div className="tab-list" role="tablist" aria-label={`Seções, ${proposed ? 'proposta' : 'atual'}`}>
      {['Detalhes', 'Confirmar', 'Editar'].map((label, index) => <button key={label} id={`${uid}-tab-${index}`} role="tab" aria-selected={tab === index} aria-controls={`${uid}-panel`} tabIndex={tab === index ? 0 : -1}
        onClick={() => setTab(index)} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (tab + 1) % 3 : event.key === 'ArrowLeft' ? (tab + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null;
          if (next !== null) { event.preventDefault(); setTab(next); (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus(); }
        }}>
        {tab === index && (proposed ? <motion.span className="tab-indicator" layoutId={`${uid}-indicator`} transition={{ duration: .25, ease }} /> : <span className="tab-indicator" />)}
        <span>{label}</span>
      </button>)}
    </div>
    <div className="tab-content" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
      <strong>{['Atendimento de demonstração', 'Confirmação do atendimento', 'Editar informações'][tab]}</strong>
      <p>{['Fonoaudiologia · 14h às 14h50', 'Revise os dados antes de confirmar.', 'As alterações deste exemplo são fictícias.'][tab]}</p>
    </div>
  </div>;

  if (kind === 'save') return <div className="save-demo">
    <p className="field-label">Observação do atendimento</p><div className="fake-input">Retorno combinado com a família.</div>
    <button className="primary save-button" disabled={saving === 1} onClick={() => {
      setSaving(1); clearTimeout(timer.current); timer.current = setTimeout(() => setSaving(2), 1200);
    }}>
      {saving === 1 ? <LoaderCircle size={16} className="spin" /> : saving === 2 ? <Check size={16} /> : null}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={saving} initial={proposed ? { opacity: 0, y: 4, filter: 'blur(2px)' } : false} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={proposed ? { opacity: 0, y: -4, filter: 'blur(2px)' } : {}} transition={{ duration: proposed ? .15 : 0 }}>
          {['Salvar alteração', 'Salvando…', 'Salvo'][saving]}
        </motion.span>
      </AnimatePresence>
    </button><span role="status" className="status-text">{saving === 2 ? 'Alteração fictícia concluída.' : 'Simulação local'}</span>
  </div>;

  if (kind === 'accordion') return <div className={`accordion ${proposed ? 'smooth' : ''}`} data-open={open}>
    <button aria-expanded={open} aria-controls={`${uid}-hours`} onClick={() => setOpen(!open)}>Horários de demonstração <ChevronDown size={18} /></button>
    {proposed ? <div className="accordion-track" id={`${uid}-hours`} inert={!open ? true : undefined}><div><Hours /></div></div> : open && <motion.div id={`${uid}-hours`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ duration: .2 }}><Hours /></motion.div>}
  </div>;

  const surface = <motion.div key="surface" className={kind === 'modal' ? 'demo-modal' : 'demo-toast'}
    role={kind === 'modal' ? 'dialog' : 'status'} aria-labelledby={kind === 'modal' ? `${uid}-title` : undefined}
    initial={proposed ? { opacity: 0, scale: kind === 'modal' ? .96 : .97, y: kind === 'toast' ? 16 : 0 } : kind === 'toast' ? { opacity: 0, scale: .9, y: 40 } : false}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: kind === 'modal' ? .96 : .97, y: kind === 'toast' ? 16 : 0, transition: { duration: kind === 'modal' ? .15 : .25, ease } }}
    transition={proposed ? { duration: kind === 'modal' ? .25 : .35, ease } : { type: 'spring', damping: 25, stiffness: 400 }}
    onKeyDown={event => { if (event.key === 'Escape') dismiss(); }}>
    <div className="surface-heading"><strong id={`${uid}-title`}>{kind === 'modal' ? 'Detalhes do atendimento' : 'Pagamento confirmado'}</strong><button ref={close} className="icon-button" aria-label="Fechar exemplo" onClick={dismiss}><X size={17} /></button></div>
    <p>{kind === 'modal' ? 'Paciente de demonstração' : 'Pix de demonstração · R$ 150,00'}</p>
    {kind === 'modal' && <><div className="appointment-info">Fonoaudiologia <span>14h – 14h50</span></div><button className="secondary" onClick={dismiss}>Voltar à agenda</button></>}
  </motion.div>;

  return <>
    <button ref={trigger} className="secondary" onClick={() => setOpen(!open)}>{kind === 'modal' ? 'Abrir atendimento' : open ? 'Fechar notificação' : 'Mostrar notificação'}</button>
    <div className={`stage ${kind}`}>
      {kind === 'modal' && <div className="calendar-ghost" aria-hidden="true"><span>14h</span><div>Atendimento de demonstração</div><span>15h</span><div>Horário disponível</div></div>}
      {!open && kind === 'toast' && <p className="empty-hint">A confirmação aparecerá aqui.</p>}
      {proposed ? <AnimatePresence>{open && surface}</AnimatePresence> : open && surface}
    </div>
  </>;
}

function Hours() { return <div className="hours">{['09h00', '10h00', '14h00'].map(t => <span key={t}>{t}</span>)}<p>Horários ilustrativos, sem vínculo com a agenda.</p></div>; }

function App() {
  const [reduced, setReduced] = useState(false);
  const [reset, setReset] = useState(0);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const count = Object.keys(votes).length;
  return <MotionConfig reducedMotion={reduced ? 'always' : 'user'}><main className={`preview ${reduced ? 'reduce-motion' : ''}`}>
    <header><a className="brand" href="/">Fono Inova <span>Gestão clínica</span></a><span className="local-label">Demonstração · dados fictícios</span></header>
    <section className="intro"><h1>Como o CRM pode se mover.</h1><p>Experimente cada interação, compare os dois lados e escolha o que faz sentido no seu dia a dia.</p></section>
    <div className="toolbar"><label><input type="checkbox" checked={reduced} onChange={e => setReduced(e.target.checked)} /> Reduzir movimento</label><button className="text-button" onClick={() => setReset(v => v + 1)}><RotateCcw size={15} /> Reiniciar exemplos</button><span>{count} de {examples.length} avaliados</span></div>
    <p className="comparison-note">“Atual” reproduz de forma simplificada o comportamento do código revisado. A proposta adapta as receitas Transitions.dev à identidade do CRM. A preferência de movimento reduzido do sistema também é respeitada.</p>
    {examples.map(example => <section key={example.id} className="example" id={example.id}>
      <div className="example-heading"><div><h2>{example.title}</h2><p className="where">{example.where}</p></div><span className="recipe">{example.recipe}</span></div>
      <p className="description">{example.description}</p>
      <div className="comparison">{[false, true].map(proposed => <div className={`comparison-side ${proposed ? 'proposed' : ''}`} key={String(proposed)}><h3>{proposed ? 'Proposta' : 'Atual simplificado'}</h3><Demo key={`${reset}-${example.id}-${reduced}`} kind={example.id} proposed={proposed} reset={reset} /></div>)}</div>
      <div className="feedback"><span>Sua preferência</span>{['Gostei da proposta', 'Ajustar movimento', 'Manter atual'].map(option => <button key={option} aria-pressed={votes[example.id] === option} onClick={() => setVotes(v => ({ ...v, [example.id]: option }))}>{votes[example.id] === option && <Check size={14} />}{option}</button>)}</div>
    </section>)}
    <footer><h2>Suas escolhas</h2><p>As marcações ficam apenas nesta página e se perdem ao recarregar. Nenhuma alteração é aplicada ao CRM.</p>{count ? <ul>{examples.filter(e => votes[e.id]).map(e => <li key={e.id}><strong>{e.title}:</strong> {votes[e.id]}</li>)}</ul> : <p>Marque uma preferência nos exemplos acima.</p>}<p>Você pode me enviar suas escolhas pelo chat para orientar os próximos ajustes.</p></footer>
  </main></MotionConfig>;
}

createRoot(document.getElementById('root')!).render(<App />);

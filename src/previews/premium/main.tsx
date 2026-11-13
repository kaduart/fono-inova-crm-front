import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import '../../index.css';
import '../../App.css';
import API from '../../services/api';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { WorkflowSteps } from '../../components/ui/WorkflowSteps';
import { LandingPagePerformance } from '../../components/Dashboard/analytics/LandingPagePerformance';
import AnapolisSEOPagesCard from '../../components/Dashboard/AnapolisSEOPagesCard';
import CashflowDayRuler from '../../pages/Financial/components/CashflowDayRuler';
import AppointmentDetailModal from '../../components/calendar/appointmentDetailModal';
import type { SelectedEvent, IDoctor } from '../../utils/types/types';

// This separate development entry never talks to the backend or saves patient data.
if (import.meta.env.DEV) API.defaults.adapter = async config => ({ data: [], status: 200, statusText: 'OK', headers: {}, config });
const pages = [
  { slug: 'fono', title: 'Fonoaudiologia', category: 'fonoaudiologia', views: 208, leads: 13 },
  { slug: 'psico', title: 'Psicologia infantil e acompanhamento do desenvolvimento', category: 'psicologia', views: 126, leads: 7 },
  { slug: 'to', title: 'Terapia ocupacional', category: 'terapia_ocupacional', views: 58, leads: 0 },
  { slug: 'lingua', title: 'Teste da linguinha', category: 'fonoaudiologia', views: 34, leads: 2 },
];
const event = {
  id: 'demo-appointment', patient: { id: 'demo-patient', fullName: 'Paciente de demonstração' },
  doctor: { id: 'demo-doctor', fullName: 'Profissional de demonstração' },
  date: new Date('2026-11-13T12:00:00Z'), startTime: '10:00', start: '2026-11-13T10:00:00',
  formattedDate: '13/11/2026', operationalStatus: 'scheduled', clinicalStatus: 'pending', reason: 'Sessão de demonstração',
  billingType: 'particular', paymentMethod: 'pix', serviceType: 'individual_session', sessionValue: 150, paymentAmount: 150,
} as unknown as SelectedEvent;
const doctors = [{ _id: 'demo-doctor', fullName: 'Profissional de demonstração', specialty: 'fonoaudiologia' }] as IDoctor[];
const appointments = [
  { id: 'a', time: '09:00', professionalName: 'Profissional Ana — nome completo', patientName: 'Paciente de demonstração A', operationalStatus: 'completed' },
  { id: 'b', time: '09:00', professionalName: 'Profissional Ana — nome completo', patientName: 'Paciente de demonstração B', operationalStatus: 'completed', billingType: 'convenio' },
  { id: 'c', time: '10:00', professionalName: 'Profissional Ana — nome completo', patientName: 'Paciente de demonstração C', operationalStatus: 'completed' },
  { id: 'd', time: '11:00', professionalName: 'Profissional Bruno — nome completo', patientName: 'Paciente de demonstração D', operationalStatus: 'completed', package: { id: 'demo-package' } },
  { id: 'e', time: '14:00', professionalName: 'Profissional Bruno — nome completo', patientName: 'Paciente de demonstração E', operationalStatus: 'scheduled' },
];

function Preview() {
  const [tab, setTab] = useState('analytics');
  const [empty, setEmpty] = useState(false);
  const [dark, setDark] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  return <ThemeProvider theme={theme}><MotionConfig reducedMotion={reduced ? 'always' : 'user'}><div className={dark ? 'dark' : ''}>
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Revisão local do CRM</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Componentes reais · dados fictícios · nenhuma gravação no sistema</p></div>
          <div className="flex flex-wrap gap-4 text-sm"><label><input type="checkbox" checked={dark} onChange={e => setDark(e.target.checked)} /> Tema escuro</label><label><input type="checkbox" checked={reduced} onChange={e => setReduced(e.target.checked)} /> Reduzir movimento</label></div></header>
        <SegmentedTabs label="Áreas da demonstração" value={tab} onValueChange={setTab} options={[{ id: 'analytics', label: 'Analytics' }, { id: 'caixa', label: 'Caixa' }, { id: 'fluxos', label: 'Agenda e pacote' }]} />
        {tab === 'analytics' && <div className="space-y-6"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={empty} onChange={e => setEmpty(e.target.checked)} /> Simular período sem tráfego</label><LandingPagePerformance pages={empty ? pages.map(p => ({ ...p, views: 0, leads: 0 })) : pages} /><AnapolisSEOPagesCard pages={empty ? [] : [{ path: '/fonoaudiologia-anapolis', views: 72, users: 41, bounceRate: 7, leads: 4 }, { path: '/psicologia-infantil-anapolis', views: 27, users: 13, bounceRate: 8, leads: 0 }]} /></div>}
        {tab === 'caixa' && <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><CashflowDayRuler appointments={appointments} isCompleted={a => a.operationalStatus === 'completed'} pendingIds={new Set(['c'])} isToday={false} onState={setSelected} values={{ sem: 'R$ 150,00', conv: 'R$ 80,00' }} /><p role="status" className="mt-5 text-sm text-slate-500 dark:text-slate-400">{selected ? `Filtro acionado: ${selected}. No Caixa real, abre a lista correspondente.` : 'Selecione um atendimento ou um filtro.'}</p></section>}
        {tab === 'fluxos' && <section className="space-y-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div><h2 className="mb-5 text-lg font-semibold">Etapas do pacote</h2><WorkflowSteps labels={['Profissional', 'Pacote', 'Agenda', 'Financeiro']} current={step} onSelect={setStep} /><p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Só o indicador é demonstrado aqui; os campos e as validações reais continuam no formulário.</p></div><button className="min-h-10 rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white" onClick={() => setOpen(true)}>Abrir atendimento de demonstração</button></section>}
        <AppointmentDetailModal isOpen={open} onClose={() => setOpen(false)} doctors={doctors} event={event}
          onCancelAppointment={async () => setOpen(false)} onCompleteAppointment={async () => setOpen(false)}
          onEditAppointment={async () => { await new Promise(resolve => setTimeout(resolve, 700)); setOpen(false); }} />
      </div>
    </main>
  </div></MotionConfig></ThemeProvider>;
}

createRoot(document.getElementById('root')!).render(import.meta.env.DEV ? <Preview /> : <p>Demonstração disponível apenas no ambiente local.</p>);

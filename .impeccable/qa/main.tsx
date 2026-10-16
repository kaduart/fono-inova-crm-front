import RescheduleDialog from '../../src/components/calendar/RescheduleDialog';
import EnhancedCalendar from '../../src/components/calendar/EnhancedCalendar';
import AppointmentCancellationModal from '../../src/components/calendar/AppointmentCancellationModal';
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ThemeProvider} from '@mui/material/styles';
import theme from '../../src/theme';
import '../../src/index.css';
import API from '../../src/services/api';
import CancellationsReport from '../../src/components/admin/CancellationsReport';
import AppointmentDetailModal from '../../src/components/calendar/appointmentDetailModal';
const report: any = {
    period: { startDate: '2026-10-01', endDate: '2026-10-31' },
    summary: { totalAppointments: 200, totalCanceled: 100, cancelRate: 50, lessThan24h: 12, absences: 7, automaticCancellations: 3, unspecified: 0, unspecifiedByChannel: {} },
    coverage: { total: 100, identified: 100, percent: 100 },
    byRequester: [
        { requester: 'patient', label: 'Paciente/responsável', count: 70, percent: 70, lessThan24h: 8 },
        { requester: 'professional', label: 'Profissional', count: 25, percent: 25, lessThan24h: 4 },
        { requester: 'clinic', label: 'Clínica', count: 5, percent: 5, lessThan24h: 0 },
        { requester: 'unspecified', label: 'Não informado', count: 0, percent: 0, lessThan24h: 0 },
    ],
    comparison: {
        previousPeriod: { startDate: '2026-09-01', endDate: '2026-09-30' },
        total: { current: 100, previous: 90, diff: 10 },
        byRequester: [
            { requester: 'patient', current: 70, previous: 60, diff: 10 },
            { requester: 'professional', current: 25, previous: 28, diff: -3 },
            { requester: 'clinic', current: 5, previous: 2, diff: 3 },
            { requester: 'unspecified', current: 0, previous: 0, diff: 0 },
        ],
        coverage: { current: { total: 100, identified: 100, percent: 100 }, previous: { total: 90, identified: 90, percent: 100 } },
        byRequesterReliable: true,
    },
    professionals: [
        { doctorId: 'd1', name: 'Dra. Ana', specialty: 'fonoaudiologia', totalAppointments: 20, canceledTotal: 9, requestedByProfessional: 5, requestedByPatients: 4, requestedByClinic: 0, unspecified: 0, lessThan24hByProfessional: 2, lastRequestedByProfessional: '2026-10-14', professionalRate: 25, agendaCancelRate: 45 },
        { doctorId: 'd2', name: 'Dr. Só Pacientes', specialty: null, totalAppointments: 10, canceledTotal: 3, requestedByProfessional: 0, requestedByPatients: 3, requestedByClinic: 0, unspecified: 0, lessThan24hByProfessional: 0, professionalRate: 0, agendaCancelRate: 30 },
    ],
    patients: [
        { patientId: 'p1', name: 'Maria Souza', totalAppointments: 10, canceledTotal: 4, requestedByPatient: 3, requestedByProfessional: 1, requestedByClinic: 0, unspecified: 0, lessThan24hByPatient: 1, lastRequestedByPatient: '2026-10-10', patientRate: 30 },
        { patientId: 'p2', name: 'João Lima', totalAppointments: 8, canceledTotal: 1, requestedByPatient: 1, requestedByProfessional: 0, requestedByClinic: 0, unspecified: 0, lessThan24hByPatient: 0, lastRequestedByPatient: '2026-10-02', patientRate: 12 },
        { patientId: 'p3', name: 'Só Profissional', totalAppointments: 8, canceledTotal: 2, requestedByPatient: 0, requestedByProfessional: 2, requestedByClinic: 0, unspecified: 0, lessThan24hByPatient: 0, patientRate: 0 },
    ],
};

const detail = {
    appointmentId: 'a1', date: '2026-09-10', time: '10:00', specialty: 'fonoaudiologia',
    patientId: 'p2', patientName: 'Paciente Dois', doctorId: 'd1', doctorName: 'Dra. Ana',
    requester: 'professional', requesterLabel: 'Profissional', reason: 'Congresso',
    requestedAt: null, requestedAtApproximate: true, registeredAt: '2026-09-10T09:00:00.000Z', registeredBy: 'Secretária Maria',
    hoursInAdvance: 4, lessThan24h: true,
};


const params=new URLSearchParams(location.search);const state=params.get('state')||'filled';
API.interceptors.request.clear();
API.defaults.adapter=async(config:any)=>{
 let data:any=[];
 if(config.url?.includes('/cancellations')) {
  let value=structuredClone(report);
  if(state==='empty'){value.summary={...value.summary,totalCanceled:0,unspecified:0,absences:0};value.coverage={total:0,identified:0,percent:0};value.byRequester=value.byRequester.map((r:any)=>({...r,count:0,percent:0}));value.patients=[];value.professionals=[];}
  if(state==='unknown'){value.summary={...value.summary,totalCanceled:58,unspecified:58};value.coverage={total:58,identified:0,percent:0};value.byRequester=value.byRequester.map((r:any)=>({...r,count:r.requester==='unspecified'?58:0,percent:r.requester==='unspecified'?100:0}));}
  data={data:config.url.endsWith('/details')?{items:state==='empty'?[]:[detail]}:value};
 }
 return {data,status:200,statusText:'OK',headers:{},config};
};
const event:any={id:'qa-1',patient:{id:'qa-patient',fullName:'Maria Souza — paciente fictício'},doctor:{id:'qa-doctor',fullName:'Dra. Ana Oliveira'},date:new Date('2026-10-20T13:00:00Z'),startTime:'10:00',formattedDate:'20/10/2026',start:'2026-10-20T10:00:00',operationalStatus:'scheduled',clinicalStatus:'pending',reason:'Sessão de fonoaudiologia',billingType:'particular',paymentMethod:'pix',paymentAmount:150,sessionValue:150,backgroundColor:'#fff',borderColor:'#ddd'};
const qaAppointment:any={_id:'qa-1',id:'qa-1',patient:{_id:'qa-patient',id:'qa-patient',fullName:'Maria Souza — paciente fictício'},doctor:{_id:'qa-doctor',id:'qa-doctor',fullName:'Dra. Ana Oliveira'},date:'2026-10-20',time:'10:00',duration:40,operationalStatus:'scheduled',clinicalStatus:'pending',sessionType:'fonoaudiologia',specialty:'fonoaudiologia',billingType:'particular',paymentMethod:'pix',sessionValue:150,paymentAmount:150,serviceType:'individual_session'};
const rescheduleSlots=async()=>[{time:'08:00',available:true},{time:'08:40',available:false},{time:'09:20',available:false},{time:'10:00',available:false},{time:'10:40',available:false},{time:'11:20',available:false},{time:'14:00',available:true},{time:'14:40',available:false},{time:'15:20',available:false},{time:'16:00',available:false},{time:'16:40',available:true},{time:'17:20',available:false},{time:'18:00',available:false}] as any;
function App(){const [open,setOpen]=useState(true);return <ThemeProvider theme={theme}><main className="min-h-screen bg-gray-50 p-4 sm:p-8"><div className="mx-auto max-w-6xl"><p className="mb-6 text-xs text-gray-500">Clínica Fono Inova · Ambiente de validação · Dados fictícios</p>{params.get('view')==='reschedule'?<RescheduleDialog target={open?{id:'qa-1',patientName:'Maria Souza — paciente fictício',doctorId:'qa-doctor',doctorName:'Dra. Ana Oliveira',specialtyLabel:'Fonoaudiologia',currentDate:'2026-10-21',currentTime:'08:40'}:null} onClose={()=>setOpen(false)} onFetchAvailableSlots={rescheduleSlots} onConfirm={async()=>{}}/>:params.get('view')==='calendar'?<EnhancedCalendar appointments={[qaAppointment]} doctors={[qaAppointment.doctor]} patients={[qaAppointment.patient]} onDateClick={()=>{}} onNewAppointment={async()=>{}} onCancelAppointment={async()=>{await new Promise(r=>setTimeout(r,200));}} onCompleteAppointment={async()=>{}} onEditAppointment={async()=>{}} onFetchAvailableSlots={async()=>[]} />:params.get('view')==='report'?<CancellationsReport/>:params.get('tab')==='cancel'?<>{open&&<AppointmentCancellationModal event={event} onClose={()=>setOpen(false)} onCancelAppointment={async()=>{await new Promise(r=>setTimeout(r,200));}}/>}</>:<AppointmentDetailModal isOpen={open} onClose={()=>setOpen(false)} doctors={[event.doctor]} event={event} initialTab={(params.get('tab')||'cancel') as any} onCancelAppointment={async()=>{await new Promise(r=>setTimeout(r,600));}} onCompleteAppointment={async()=>{}} onEditAppointment={async()=>{}}/>}</div></main></ThemeProvider>};
createRoot(document.getElementById('root')!).render(<App/>);

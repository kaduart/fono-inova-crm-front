/**
 * Helpers puros da lista de espera de convênios (sem React, fáceis de testar).
 */

import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { WaitlistConvenio, WaitlistEntry, WaitlistStatus, WhatsappDeepScanRun, WhatsappScanRun } from '../services/convenioWaitlistService';

export const CONVENIO_OPTIONS: Array<{ value: WaitlistConvenio; label: string }> = [
  { value: 'geap', label: 'GEAP' },
  { value: 'unimed', label: 'Unimed' },
  { value: 'ipasgo', label: 'IPASGO' },
  { value: 'bradesco', label: 'Bradesco Saúde' },
];

export type ChipColor = 'default' | 'warning' | 'info' | 'success' | 'error';

export const STATUS_META: Record<WaitlistStatus, { label: string; color: ChipColor; hint: string }> = {
  aguardando: { label: 'Aguardando', color: 'warning', hint: 'Interesse registrado, ainda sem contato' },
  contatado: { label: 'Contatado', color: 'info', hint: 'A equipe já falou com a pessoa' },
  agendado: { label: 'Agendado', color: 'success', hint: 'Virou agendamento' },
  descartado: { label: 'Descartado', color: 'default', hint: 'Saiu da lista (desistiu, telefone errado...)' },
};

export const STATUS_ORDER: WaitlistStatus[] = ['aguardando', 'contatado', 'agendado', 'descartado'];

// Mesmas opções do formulário do site (ConvenioEmBreve) — o backend filtra por igualdade exata
export const ESPECIALIDADE_OPTIONS = [
  'Fonoaudiologia',
  'Psicologia infantil',
  'Terapia Ocupacional',
  'Fisioterapia',
  'Psicopedagogia',
  'Neuropediatria',
  'Ainda não sei / preciso de orientação',
];

export const convenioLabel = (slug: string): string =>
  CONVENIO_OPTIONS.find((option) => option.value === slug)?.label ?? slug;

const onlyDigits = (value: string): string => value.replace(/\D/g, '');

/** 5562992013573 → +55 (62) 99201-3573 (celular) | 556237063924 → +55 (62) 3706-3924 (fixo) */
export const formatPhoneBR = (phone: string | null | undefined): string => {
  if (!phone) return '—';
  const digits = onlyDigits(phone);
  const national = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  if (national.length === 11) return `+55 (${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  if (national.length === 10) return `+55 (${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  return phone;
};

/** 5562992013573 → (62) 99201-3573 — sem "+" na frente (na exportação CSV um "+" inicial seria tratado como fórmula). */
export const formatPhoneNational = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const digits = onlyDigits(phone);
  const national = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  if (national.length === 11) return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  if (national.length === 10) return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  return phone;
};

export const firstName = (name: string): string => name.trim().split(/\s+/)[0] || name;

/** Nome padrão que o back usa quando o contato do WhatsApp não tem nome salvo. */
export const WHATSAPP_PLACEHOLDER_NAME = 'Contato do WhatsApp';

export const isFromWhatsapp = (entry: Pick<WaitlistEntry, 'channel'>): boolean => entry.channel === 'whatsapp_web';

const greeting = (name: string): string =>
  name === WHATSAPP_PLACEHOLDER_NAME ? 'Olá!' : `Olá, ${firstName(name)}!`;

/** Mensagem neutra e honesta: a equipe edita antes de enviar e só deve usar depois da confirmação do credenciamento. */
export const buildContactMessage = (entry: Pick<WaitlistEntry, 'name' | 'convenioLabel' | 'channel'>): string =>
  isFromWhatsapp(entry)
    ? `${greeting(entry.name)} Aqui é da Clínica Fono Inova. Você nos perguntou aqui pelo WhatsApp sobre o atendimento pelo ${entry.convenioLabel}. ` +
      `Estou entrando em contato para atualizar você sobre o atendimento pelo plano. Podemos conversar agora?`
    : `${greeting(entry.name)} Aqui é da Clínica Fono Inova. Você registrou interesse no convênio ${entry.convenioLabel} na nossa lista de interesse. ` +
      `Estou entrando em contato para atualizar você sobre o atendimento pelo plano. Podemos conversar agora?`;

export const buildWhatsAppUrl = (entry: Pick<WaitlistEntry, 'name' | 'phone' | 'convenioLabel' | 'channel'>): string => {
  const digits = onlyDigits(entry.phone);
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(buildContactMessage(entry))}`;
};

export const formatDateTimeBR = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const date = parseISO(iso);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'dd/MM/yyyy HH:mm');
};

export const formatDateBR = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const date = parseISO(iso);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'dd/MM/yyyy');
};

/** "hoje" | "há 1 dia" | "há 12 dias" — dias corridos, não 24h */
export const waitingLabel = (createdAt: string, now: Date = new Date()): string => {
  const date = parseISO(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  const days = differenceInCalendarDays(now, date);
  if (days <= 0) return 'hoje';
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
};

export const formatAge = (age: number | null | undefined): string => {
  if (age === null || age === undefined) return '—';
  return age === 1 ? '1 ano' : `${age} anos`;
};

// ─── CSV (Excel pt-BR: separador ";" + BOM UTF-8) ───────────────────────────────────────────────

const CSV_COLUMNS: Array<{ header: string; value: (entry: WaitlistEntry) => string }> = [
  { header: 'Cadastro', value: (e) => formatDateTimeBR(e.createdAt) },
  { header: 'Nome', value: (e) => e.name },
  { header: 'Telefone', value: (e) => formatPhoneNational(e.phone) },
  { header: 'E-mail', value: (e) => e.email ?? '' },
  { header: 'Convênio', value: (e) => e.convenioLabel },
  { header: 'Especialidade', value: (e) => e.especialidade ?? '' },
  { header: 'Idade da criança', value: (e) => (e.idadeCrianca === null ? '' : String(e.idadeCrianca)) },
  { header: 'Período', value: (e) => e.periodo ?? '' },
  { header: 'Status', value: (e) => STATUS_META[e.status]?.label ?? e.status },
  { header: 'Contatado em', value: (e) => (e.notifiedAt ? formatDateTimeBR(e.notifiedAt) : '') },
  { header: 'Cadastros enviados', value: (e) => String(e.requestCount ?? 1) },
  { header: 'Consentimento em', value: (e) => (e.consent?.acceptedAt ? formatDateTimeBR(e.consent.acceptedAt) : '') },
  { header: 'Versão do consentimento', value: (e) => e.consent?.version ?? '' },
  { header: 'Notas', value: (e) => e.notes ?? '' },
  { header: 'Origem', value: (e) => (isFromWhatsapp(e) ? 'WhatsApp' : 'Site') },
  { header: 'Trecho da conversa', value: (e) => e.whatsapp?.snippet ?? '' },
  { header: 'Já é paciente', value: (e) => (e.patientMatch ? e.patientMatch.patientName : '') },
  { header: 'Próxima sessão', value: (e) => (e.patientMatch?.nextAppointmentAt ? formatDateTimeBR(e.patientMatch.nextAppointmentAt) : '') },
];

/**
 * Escapa uma célula. Os dados vêm de um formulário público, então células que começam com = + - @
 * (fórmulas no Excel/Sheets) recebem um apóstrofo na frente para não serem executadas.
 */
export const escapeCsvCell = (raw: string): string => {
  const text = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replace(/"/g, '""')}"`;
};

export const buildWaitlistCsv = (entries: WaitlistEntry[]): string => {
  const header = CSV_COLUMNS.map((column) => escapeCsvCell(column.header)).join(';');
  const rows = entries.map((entry) => CSV_COLUMNS.map((column) => escapeCsvCell(column.value(entry))).join(';'));
  return `﻿${[header, ...rows].join('\r\n')}`;
};

export const csvFileName = (now: Date = new Date()): string => `interesse-convenios-${format(now, 'yyyy-MM-dd')}.csv`;

/**
 * Oferta do particular enquanto o convênio não sai. Valor antes do preço,
 * horário genérico e 1 💚 no final (regras comerciais da clínica).
 */
export const buildPrivateOfferMessage = (entry: Pick<WaitlistEntry, 'name' | 'convenioLabel' | 'especialidade'>): string => {
  const esp = entry.especialidade ? ` de ${entry.especialidade.toLowerCase()}` : '';
  const oi = entry.name === WHATSAPP_PLACEHOLDER_NAME ? 'Oi!' : `Oi, ${firstName(entry.name)}!`;
  return `${oi} Aqui é da Clínica Fono Inova. O credenciamento com o ${entry.convenioLabel} ainda está em andamento e não queremos que vocês fiquem esperando. ` +
    `Começar cedo faz diferença no desenvolvimento, então dá para iniciar o atendimento${esp} no particular e passar para o plano quando ele sair. ` +
    `No pacote de 1x por semana cada sessão sai por R$ 180 (cerca de R$ 720 por mês). Tenho horário quinta de manhã ou amanhã à tarde. Quer que eu reserve? 💚`;
};

export const buildPrivateOfferUrl = (entry: Pick<WaitlistEntry, 'name' | 'phone' | 'convenioLabel' | 'especialidade'>): string => {
  const digits = onlyDigits(entry.phone);
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(buildPrivateOfferMessage(entry))}`;
};

/** Texto do andamento da busca no WhatsApp (para a faixa acima da lista). */
export const scanStatusText = (run: Pick<WhatsappScanRun, 'status' | 'stats' | 'error'> & { convenioLabel: string }): string => {
  if (run.status === 'queued') return `Busca de ${run.convenioLabel} no WhatsApp na fila. Começa assim que o WhatsApp da clínica estiver conectado.`;
  if (run.status === 'running') return `Buscando ${run.convenioLabel} nas conversas do WhatsApp… pode levar alguns minutos.`;
  if (run.status === 'failed') return `A busca de ${run.convenioLabel} no WhatsApp falhou${run.error ? `: ${run.error}` : ''}. Tente de novo com o WhatsApp conectado.`;
  const s = run.stats ?? {};
  const contatos = s.contacts ?? 0;
  if (!contatos) return `Busca de ${run.convenioLabel} no WhatsApp concluída: ninguém falou de ${run.convenioLabel} nas conversas sincronizadas.`;
  return `Busca de ${run.convenioLabel} no WhatsApp concluída: ${contatos} ${contatos === 1 ? 'contato' : 'contatos'}, ` +
    `${s.created ?? 0} ${s.created === 1 ? 'novo' : 'novos'} na lista, ${s.updated ?? 0} já estavam e ${s.closed ?? 0} já tratados (agendado/descartado).`;
};

/** Texto da varredura profunda (histórico inteiro, os 4 convênios). */
export const deepScanStatusText = (run: Pick<WhatsappDeepScanRun, 'status' | 'stats' | 'error'>): string => {
  const s = run.stats ?? {};
  const progresso = s.total ? `${s.done ?? 0} de ${s.total} conversas` : '';
  const ate = s.oldest ? ` Histórico lido até ${new Date(s.oldest).toLocaleDateString('pt-BR')}.` : '';
  const porConvenio = Object.entries(s.byConvenio ?? {})
    .map(([slug, n]) => `${CONVENIO_OPTIONS.find((o) => o.value === slug)?.label ?? slug} ${n}`)
    .join(' · ');
  const achados = s.contacts ? ` ${s.contacts} ${s.contacts === 1 ? 'contato' : 'contatos'} (${porConvenio}), ${s.created ?? 0} novos na lista.` : '';
  if (run.status === 'queued') {
    return progresso
      ? `Busca completa pausada em ${progresso}; continua sozinha quando o WhatsApp da clínica voltar.${achados}`
      : 'Busca completa no WhatsApp na fila. Começa assim que o WhatsApp da clínica estiver conectado.';
  }
  if (run.status === 'running') return `Busca completa no WhatsApp: ${progresso || 'começando'}… pode levar horas, os interessados já vão entrando na lista.${achados}${ate}`;
  if (run.status === 'failed') return `A busca completa no WhatsApp falhou${run.error ? `: ${run.error}` : ''}${progresso ? ` (parou em ${progresso})` : ''}.${achados}`;
  return `Busca completa no WhatsApp concluída: ${s.total ?? 0} conversas lidas.${achados || ' Ninguém falou dos convênios.'}${ate}`;
};

/** Dias desde o cadastro (para destacar quem está esfriando na lista). */
export const daysOnList = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86_400_000);
};

/** Selos de envio pela tela: quem já recebeu (e quando), quem está na fila, quem foi pulado e por quê. */
export interface SendBadge { label: string; color: ChipColor; tooltip: string }
const SEND_KIND_LABEL = { offer: 'Retomar contato', announce: 'Agora atendemos' } as const;

export const sendBadgesFor = (entry: Pick<WaitlistEntry, 'offer' | 'announce'>): SendBadge[] => {
  const out: SendBadge[] = [];
  (['offer', 'announce'] as const).forEach((field) => {
    const info = entry[field];
    const kind = SEND_KIND_LABEL[field];
    if (!info?.queuedAt) return;
    if (info.sentAt) {
      out.push({ label: `${kind} enviado ${formatDateBR(info.sentAt)}`, color: 'success', tooltip: `Mensagem "${kind}" enviada pelo WhatsApp da clínica em ${formatDateTimeBR(info.sentAt)}` });
    } else if (info.skippedAt) {
      out.push({ label: `${kind} não enviado`, color: 'default', tooltip: info.skipReason || 'A clínica já tinha conversado com a pessoa há pouco, então não mandamos.' });
    } else if (info.error) {
      out.push({ label: `${kind}: falhou`, color: 'error', tooltip: info.error });
    } else {
      const when = info.scheduledFor || info.queuedAt;
      out.push({ label: `${kind} agendado ${formatDateBR(when)}`, color: 'warning', tooltip: `Sai pelo WhatsApp da clínica por volta de ${formatDateTimeBR(when)}. Antes de enviar o sistema confere se alguém já falou com a pessoa.` });
    }
  });
  return out;
};

/**
 * Helpers puros da lista de espera de convênios (sem React, fáceis de testar).
 */

import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { WaitlistConvenio, WaitlistEntry, WaitlistStatus } from '../services/convenioWaitlistService';

export const CONVENIO_OPTIONS: Array<{ value: WaitlistConvenio; label: string }> = [
  { value: 'geap', label: 'GEAP' },
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

/** Mensagem neutra e honesta: a equipe edita antes de enviar e só deve usar depois da confirmação do credenciamento. */
export const buildContactMessage = (entry: Pick<WaitlistEntry, 'name' | 'convenioLabel'>): string =>
  `Olá, ${firstName(entry.name)}! Aqui é da Clínica Fono Inova. Você registrou interesse no convênio ${entry.convenioLabel} na nossa lista de interesse. ` +
  `Estou entrando em contato para atualizar você sobre o atendimento pelo plano. Podemos conversar agora?`;

export const buildWhatsAppUrl = (entry: Pick<WaitlistEntry, 'name' | 'phone' | 'convenioLabel'>): string => {
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

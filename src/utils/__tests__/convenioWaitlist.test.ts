import { describe, expect, it } from 'vitest';
import type { WaitlistEntry } from '../../services/convenioWaitlistService';
import {
  buildContactMessage,
  buildWaitlistCsv,
  buildWhatsAppUrl,
  convenioLabel,
  csvFileName,
  escapeCsvCell,
  firstName,
  formatAge,
  formatPhoneBR,
  formatPhoneNational,
  STATUS_META,
  STATUS_ORDER,
  waitingLabel,
} from '../convenioWaitlist';

const entry = (overrides: Partial<WaitlistEntry> = {}): WaitlistEntry => ({
  _id: '1',
  name: 'Maria da Silva',
  phone: '5562992013573',
  email: 'maria@email.com',
  convenio: 'geap',
  convenioLabel: 'GEAP',
  especialidade: 'Terapia Ocupacional',
  idadeCrianca: 4,
  periodo: 'Manhã',
  status: 'aguardando',
  notifiedAt: null,
  notes: '',
  requestCount: 1,
  submissions: [],
  consent: { accepted: true, acceptedAt: '2026-09-21T15:00:00.000Z', version: 'convenio-interesse-2026-09' },
  createdAt: '2026-09-21T15:00:00.000Z',
  updatedAt: '2026-09-21T15:00:00.000Z',
  ...overrides,
});

describe('formatPhoneBR', () => {
  it('formata celular e fixo E.164', () => {
    expect(formatPhoneBR('5562992013573')).toBe('+55 (62) 99201-3573');
    expect(formatPhoneBR('556237063924')).toBe('+55 (62) 3706-3924');
  });
  it('aceita número sem 55 e devolve o texto original quando não reconhece', () => {
    expect(formatPhoneBR('62992013573')).toBe('+55 (62) 99201-3573');
    expect(formatPhoneBR('123')).toBe('123');
    expect(formatPhoneBR(null)).toBe('—');
  });
});

describe('formatPhoneNational', () => {
  it('formata sem DDI/+ e devolve vazio para ausente', () => {
    expect(formatPhoneNational('5562992013573')).toBe('(62) 99201-3573');
    expect(formatPhoneNational('556237063924')).toBe('(62) 3706-3924');
    expect(formatPhoneNational(null)).toBe('');
  });
});

describe('WhatsApp', () => {
  it('monta o link wa.me com DDI 55 e mensagem neutra em nome da clínica', () => {
    const url = buildWhatsAppUrl(entry());
    expect(url.startsWith('https://wa.me/5562992013573?text=')).toBe(true);
    const text = decodeURIComponent(url.split('?text=')[1]);
    expect(text).toContain('Olá, Maria!');
    expect(text).toContain('Clínica Fono Inova');
    expect(text).toContain('registrou interesse no convênio GEAP');
    expect(text).not.toMatch(/já atendemos|aceitamos|garantid/i); // nunca promete cobertura
  });

  it('acrescenta o 55 quando o telefone salvo não tem', () => {
    expect(buildWhatsAppUrl(entry({ phone: '62992013573' })).startsWith('https://wa.me/5562992013573?')).toBe(true);
  });

  it('firstName tolera espaços extras', () => {
    expect(firstName('  Ana   Paula Souza ')).toBe('Ana');
    expect(buildContactMessage({ name: 'Bruno Lima', convenioLabel: 'IPASGO' })).toContain('Olá, Bruno!');
  });
});

describe('rótulos e datas', () => {
  it('convenioLabel devolve o rótulo ou o próprio slug', () => {
    expect(convenioLabel('bradesco')).toBe('Bradesco Saúde');
    expect(convenioLabel('outro')).toBe('outro');
  });

  it('waitingLabel usa dias corridos', () => {
    const now = new Date(2026, 8, 21, 10, 0, 0);
    expect(waitingLabel(new Date(2026, 8, 21, 8, 0, 0).toISOString(), now)).toBe('hoje');
    expect(waitingLabel(new Date(2026, 8, 20, 23, 0, 0).toISOString(), now)).toBe('há 1 dia');
    expect(waitingLabel(new Date(2026, 8, 9, 12, 0, 0).toISOString(), now)).toBe('há 12 dias');
    expect(waitingLabel('data-invalida', now)).toBe('');
  });

  it('formatAge trata singular e ausência', () => {
    expect(formatAge(1)).toBe('1 ano');
    expect(formatAge(4)).toBe('4 anos');
    expect(formatAge(0)).toBe('0 anos');
    expect(formatAge(null)).toBe('—');
  });

  it('status têm rótulo, cor e ordem consistentes', () => {
    expect(STATUS_ORDER).toEqual(['aguardando', 'contatado', 'agendado', 'descartado']);
    STATUS_ORDER.forEach((status) => {
      expect(STATUS_META[status].label).toBeTruthy();
      expect(STATUS_META[status].hint).toBeTruthy();
    });
  });
});

describe('CSV', () => {
  it('escapa aspas e neutraliza fórmulas de planilha (dados vêm de formulário público)', () => {
    expect(escapeCsvCell('Ana "Paula"')).toBe('"Ana ""Paula"""');
    expect(escapeCsvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(escapeCsvCell('+55 62')).toBe('"\'+55 62"');
    expect(escapeCsvCell('-1+1')).toBe('"\'-1+1"');
    expect(escapeCsvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"');
    expect(escapeCsvCell('texto normal')).toBe('"texto normal"');
  });

  it('gera BOM, cabeçalho e linhas com ";" e colunas de consentimento', () => {
    const csv = buildWaitlistCsv([entry(), entry({ _id: '2', name: '=cmd|calc', notes: 'linha1\nlinha2', consent: undefined })]);
    expect(csv.startsWith('﻿')).toBe(true);

    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toContain('"Nome";"Telefone"');
    expect(lines[0]).toContain('"Consentimento em";"Versão do consentimento"');
    expect(lines[1]).toContain('"Maria da Silva"');
    expect(lines[1]).toContain('"(62) 99201-3573"'); // telefone nacional, sem "+" (não vira fórmula nem ganha apóstrofo)
    expect(lines[1]).not.toContain(`'(62)`);
    expect(lines[1]).toContain('"convenio-interesse-2026-09"');
    // a segunda entrada começa com "=" e não pode virar fórmula
    expect(csv).toContain(`"'=cmd|calc"`);
    expect(csv).toContain('"linha1\nlinha2"');
  });

  it('nome do arquivo usa a data', () => {
    expect(csvFileName(new Date(2026, 8, 21))).toBe('interesse-convenios-2026-09-21.csv');
  });
});

// Datas no fuso de São Paulo sem moment/dayjs (o app fica só com date-fns).
// O Brasil não tem horário de verão desde 2019, então o fuso é fixo em -03:00.
import { endOfMonth, format, startOfMonth } from 'date-fns';

export const SP_OFFSET = '-03:00';

/** "Agora" com o relógio de São Paulo (campos locais = horário de Brasília). */
export function nowSP(): Date {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return new Date(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second'));
}

/** Mês (1–12) e ano atuais em São Paulo. */
export const monthSP = () => nowSP().getMonth() + 1;
export const yearSP = () => nowSP().getFullYear();

/** 'YYYY-MM-DD' do primeiro e do último dia do mês da data dada (padrão: hoje em SP). */
export const monthStartYmd = (d: Date = nowSP()) => format(startOfMonth(d), 'yyyy-MM-dd');
export const monthEndYmd = (d: Date = nowSP()) => format(endOfMonth(d), 'yyyy-MM-dd');

/** ISO (UTC) do início/fim de um dia de São Paulo dado em 'YYYY-MM-DD'. */
export const spDayStartISO = (ymd: string) => new Date(`${ymd}T00:00:00.000${SP_OFFSET}`).toISOString();
export const spDayEndISO = (ymd: string) => new Date(`${ymd}T23:59:59.999${SP_OFFSET}`).toISOString();

/** ISO (UTC) do início/fim do mês (month 0–11) em São Paulo — equivale a moment.tz(...).startOf/endOf('month'). */
export function spMonthRangeISO(year: number, month0: number) {
  const first = new Date(year, month0, 1);
  return { start: spDayStartISO(monthStartYmd(first)), end: spDayEndISO(monthEndYmd(first)) };
}

/** Data → 'DD/MM/YYYY' no fuso de São Paulo. */
export const fmtDateSP = (d: string | Date) =>
  new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });

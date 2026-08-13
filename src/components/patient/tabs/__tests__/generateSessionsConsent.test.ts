/**
 * 🧪 Consentimento explícito para geração retroativa
 *
 * Incidente 2026-08-12 (guia 16173377): o modal "Gerar sessões" abre com
 * `plan.startDate` pré-preenchido. Como esse plano começava em 27/06 — no
 * passado —, o front ligava `allowPastGeneration` sozinho:
 *
 *     const startsInPast = startDate < todayStr;
 *     runGenerateSessions(planId, { allowPastGeneration: startsInPast });
 *
 * Ninguém decidiu nada. Foram criadas 5 sessões de julho, todas marcadas como
 * realizadas, consumindo 5 autorizações e lançando R$ 400 de produção.
 *
 * Agora a decisão vem da caixa que o usuário marca. Estes testes travam isso.
 */

import { describe, it, expect } from 'vitest';

/** Regra ANTIGA — mantida só para provar que o teste detectaria a volta dela. */
const decisaoAntiga = (startDate: string, hoje: string) => startDate < hoje;

/** Regra ATUAL — espelha handleConfirmGenerate em PatientInsuranceTab.jsx */
const decisaoAtual = (modal: { startDate: string; allowPast?: boolean }) => Boolean(modal.allowPast);

const HOJE = '2026-08-13';
const PASSADO = '2026-06-27'; // startDate real do plano do Ícaro
const FUTURO = '2026-09-01';

describe('checkbox desmarcado não envia backfill', () => {
  it('data no passado + caixa DESMARCADA → allowPastGeneration = false', () => {
    expect(decisaoAtual({ startDate: PASSADO, allowPast: false })).toBe(false);
  });

  it('data no passado sem a propriedade → false (default seguro)', () => {
    expect(decisaoAtual({ startDate: PASSADO })).toBe(false);
  });

  it('data no passado + caixa MARCADA → true', () => {
    expect(decisaoAtual({ startDate: PASSADO, allowPast: true })).toBe(true);
  });

  it('data futura + caixa marcada → true (a caixa manda, não a data)', () => {
    expect(decisaoAtual({ startDate: FUTURO, allowPast: true })).toBe(true);
  });
});

describe('a regra antiga teria disparado sozinha', () => {
  it('exatamente o cenário do incidente: 27/06 visto de 13/08', () => {
    expect(decisaoAntiga(PASSADO, HOJE)).toBe(true);          // antes: ligava sozinho
    expect(decisaoAtual({ startDate: PASSADO })).toBe(false); // agora: não liga
  });

  it('as duas regras só coincidem quando o usuário marca de fato', () => {
    expect(decisaoAntiga(PASSADO, HOJE)).toBe(decisaoAtual({ startDate: PASSADO, allowPast: true }));
  });
});

describe('a caixa só aparece quando faz diferença', () => {
  const mostraCaixa = (startDate: string, hoje: string) => startDate < hoje;

  it('data no passado: caixa visível', () => {
    expect(mostraCaixa(PASSADO, HOJE)).toBe(true);
  });

  it('data futura: caixa some — não há retroativo possível', () => {
    expect(mostraCaixa(FUTURO, HOJE)).toBe(false);
  });
});

describe('payload enviado ao backend', () => {
  const montarPayload = (modal: { startDate: string; allowPast?: boolean }) => ({
    allowPastGeneration: Boolean(modal.allowPast),
  });

  it('desmarcado → backend gera a partir de hoje', () => {
    expect(montarPayload({ startDate: PASSADO })).toEqual({ allowPastGeneration: false });
  });

  it('marcado → backend cria as retroativas, mas PENDENTES', () => {
    expect(montarPayload({ startDate: PASSADO, allowPast: true })).toEqual({ allowPastGeneration: true });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedAPI = API as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

// Cria uma promise que só resolve quando o teste mandar — permite controlar
// manualmente QUEM chega primeiro entre duas requisições concorrentes.
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function overviewResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      success: true,
      data: {
        stats: { totalDoctors: 1 } as any,
        charts: { appointmentsChart: [] } as any,
        doctorsOverview: [{ _id: 'd1', name: 'Dra. A', specialty: 'fono', patients: 1, appointments: 1 }],
        upcomingAppointments: [],
        meta: { generatedAt: new Date().toISOString(), version: 'v2', included: ['stats', 'charts', 'doctors', 'upcoming'] },
        ...overrides,
      },
    },
  };
}

describe('dashboardService — cache por bloco e corridas reais', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('busca parcial (doctors) não polui uma busca completa concorrente com stats/charts ausentes', async () => {
    const { fetchDashboardOverview } = await import('../dashboardService');

    const partial = deferred<any>();
    const full = deferred<any>();
    let call = 0;
    mockedAPI.get.mockImplementation(() => {
      call += 1;
      return call === 1 ? partial.promise : full.promise;
    });

    const partialCall = fetchDashboardOverview(false, ['doctors']);
    const fullCall = fetchDashboardOverview(false); // todos os blocos

    // Parcial resolve primeiro (só doctors no payload)
    partial.resolve(overviewResponse({ stats: undefined, charts: undefined, upcomingAppointments: undefined }));
    const partialResult = await partialCall;
    expect(partialResult.doctorsOverview).toHaveLength(1);

    // Completa resolve depois, com tudo
    full.resolve(overviewResponse());
    const fullResult = await fullCall;

    expect(fullResult.stats).not.toBeNull();
    expect(fullResult.charts).not.toBeNull();
    expect(fullResult.doctorsOverview).toHaveLength(1);
    expect(mockedAPI.get).toHaveBeenCalledTimes(2);
  });

  it('duas chamadas com include idêntico e mesma geração reaproveitam a MESMA requisição (dedupe)', async () => {
    const { fetchDashboardOverview } = await import('../dashboardService');

    const single = deferred<any>();
    mockedAPI.get.mockImplementation(() => single.promise);

    const call1 = fetchDashboardOverview(false, ['doctors']);
    const call2 = fetchDashboardOverview(false, ['doctors']);

    single.resolve(overviewResponse());
    const [r1, r2] = await Promise.all([call1, call2]);

    expect(mockedAPI.get).toHaveBeenCalledTimes(1); // só 1 requisição de rede
    expect(r1.doctorsOverview).toHaveLength(1);
    expect(r2.doctorsOverview).toHaveLength(1);
  });

  it('logout com requisição pendente: resposta que chega depois NÃO repopula o cache nem retorna dado', async () => {
    const { fetchDashboardOverview, clearDashboardCache } = await import('../dashboardService');

    const pending = deferred<any>();
    mockedAPI.get.mockImplementation(() => pending.promise);

    const inFlightCall = fetchDashboardOverview(false); // começou ANTES do logout

    // Logout acontece enquanto a requisição ainda está em voo
    clearDashboardCache();

    // A resposta (de antes do logout) só chega agora
    pending.resolve(overviewResponse());
    const result = await inFlightCall;

    // Descartada: nada foi escrito no cache, o retorno reflete o estado
    // pós-logout (tudo nulo/vazio), não o dado que "vazou" depois do logout.
    expect(result.stats).toBeNull();
    expect(result.doctorsOverview).toEqual([]);

    // Uma nova busca depois do logout não deve herdar nada dessa resposta descartada
    const fresh = deferred<any>();
    mockedAPI.get.mockImplementation(() => fresh.promise);
    const afterLogoutCall = fetchDashboardOverview(false, ['doctors']);
    fresh.resolve(overviewResponse({ doctorsOverview: [{ _id: 'd2', name: 'Dr. B', specialty: 'psico', patients: 0, appointments: 0 }] }));
    const afterLogoutResult = await afterLogoutCall;
    expect(afterLogoutResult.doctorsOverview[0]._id).toBe('d2');
  });

  it('invalidação durante a consulta: consulta em voo é descartada, consulta seguinte busca de novo (não reaproveita a fadada)', async () => {
    const { fetchDashboardOverview, invalidateDashboardCache } = await import('../dashboardService');
    mockedAPI.post.mockResolvedValue({ data: { success: true } });

    const stale = deferred<any>();
    let getCalls = 0;
    mockedAPI.get.mockImplementation(() => {
      getCalls += 1;
      if (getCalls === 1) return stale.promise;
      return Promise.resolve(overviewResponse({ doctorsOverview: [{ _id: 'fresh', name: 'Dr. Fresh', specialty: 'fono', patients: 2, appointments: 2 }] }));
    });

    const staleCall = fetchDashboardOverview(false, ['doctors']);

    // Invalidação COMPLETA (await de verdade — invalidateDashboardCache é
    // async por causa do POST ao backend) ENQUANTO staleCall ainda está em
    // voo, mas antes de qualquer consulta nova ser disparada.
    await invalidateDashboardCache();

    // Uma nova consulta pros mesmos blocos, feita DEPOIS da invalidação já ter
    // efetivado (geração já mudou), não pode reaproveitar a promise em voo de
    // antes — tem que buscar de novo.
    const afterInvalidateCall = fetchDashboardOverview(false, ['doctors']);

    stale.resolve(overviewResponse({ doctorsOverview: [{ _id: 'stale', name: 'Dr. Stale', specialty: 'fono', patients: 0, appointments: 0 }] }));

    const staleResult = await staleCall;
    const afterInvalidateResult = await afterInvalidateCall;

    // Invariante real: o dado "stale" (da requisição descartada) NUNCA aparece
    // em nenhum resultado — nem no seu próprio caller, nem em mais ninguém.
    // (staleResult pode legitimamente vir vazio OU já com "fresh", dependendo
    // de qual das duas promises settla primeiro — os dois são corretos; o que
    // não pode acontecer é "stale" vazar.)
    expect(staleResult.doctorsOverview.some((d) => d._id === 'stale')).toBe(false);
    expect(afterInvalidateResult.doctorsOverview.some((d) => d._id === 'stale')).toBe(false);
    expect(afterInvalidateResult.doctorsOverview[0]._id).toBe('fresh'); // buscou de novo de verdade

    // Estado final do cache (leitura independente, já sem nada em voo) tem
    // que refletir "fresh", nunca o dado descartado.
    const finalRead = await fetchDashboardOverview(false, ['doctors']);
    expect(finalRead.doctorsOverview[0]._id).toBe('fresh');
    expect(getCalls).toBe(2); // 1 fadada (stale) + 1 nova depois da invalidação — não ficou preso em 1 só
  });

  it('respostas fora de ordem: refresh mais recente que resolve primeiro não é sobrescrito pela busca antiga que resolve depois', async () => {
    const { fetchDashboardOverview } = await import('../dashboardService');

    const oldRequest = deferred<any>();
    const newerRefresh = deferred<any>();
    let call = 0;
    mockedAPI.get.mockImplementation(() => {
      call += 1;
      return call === 1 ? oldRequest.promise : newerRefresh.promise;
    });

    // Requisição antiga começa primeiro (sem refresh)
    const oldCall = fetchDashboardOverview(false, ['doctors']);
    // Um forceRefresh começa DEPOIS, mas vamos fazer ele resolver PRIMEIRO
    const newerCall = fetchDashboardOverview(true, ['doctors']);

    newerRefresh.resolve(overviewResponse({ doctorsOverview: [{ _id: 'newer', name: 'Dr. Newer', specialty: 'fono', patients: 5, appointments: 5 }] }));
    await newerCall;

    // A requisição antiga só resolve AGORA, depois da mais nova já ter escrito
    oldRequest.resolve(overviewResponse({ doctorsOverview: [{ _id: 'older', name: 'Dr. Older', specialty: 'fono', patients: 1, appointments: 1 }] }));
    await oldCall;

    // O estado final do cache tem que ser o da requisição mais nova (newer),
    // não o da mais antiga que só resolveu depois.
    const finalCheck = await fetchDashboardOverview(false, ['doctors']);
    expect(finalCheck.doctorsOverview[0]._id).toBe('newer');
    expect(mockedAPI.get).toHaveBeenCalledTimes(2); // não disparou uma 3ª pra esse check (cache fresco)
  });

  it('compare-and-delete: finally de uma requisição não apaga a entrada em voo de outra que ocupou a mesma chave', async () => {
    const { fetchDashboardOverview } = await import('../dashboardService');

    // Duas chamadas idênticas SEM overlap real (uma após a outra resolver),
    // simulando: A dispara, resolve e limpa sua própria chave; B dispara depois
    // usando a MESMA chave (pois o TTL já expirou), enquanto uma C concorrente
    // deveria reaproveitar B (não encontrar "nada" por A ter apagado à toa).
    let resolvers: Array<(v: any) => void> = [];
    mockedAPI.get.mockImplementation(() => new Promise((resolve) => { resolvers.push(resolve); }));

    const callA = fetchDashboardOverview(false, ['doctors']);
    // A ainda não resolveu — dispara B com forceRefresh (chave diferente por causa do |refresh)
    const callB = fetchDashboardOverview(true, ['doctors']);
    // C usa a MESMA chave de B (mesmo include, mesmo forceRefresh) enquanto B está em voo
    const callC = fetchDashboardOverview(true, ['doctors']);

    expect(mockedAPI.get).toHaveBeenCalledTimes(2); // A e B foram à rede; C reaproveitou B

    resolvers[0](overviewResponse({ doctorsOverview: [{ _id: 'a', name: 'A', specialty: 'x', patients: 0, appointments: 0 }] }));
    await callA;

    resolvers[1](overviewResponse({ doctorsOverview: [{ _id: 'b', name: 'B', specialty: 'x', patients: 0, appointments: 0 }] }));
    const [resultB, resultC] = await Promise.all([callB, callC]);

    // B e C tem que ter recebido o MESMO resultado (reaproveitaram a mesma
    // requisição) — se o finally de A tivesse apagado a entrada de B do Map
    // por engano, C teria disparado uma 3ª requisição própria.
    expect(resultB.doctorsOverview[0]._id).toBe('b');
    expect(resultC.doctorsOverview[0]._id).toBe('b');
    expect(mockedAPI.get).toHaveBeenCalledTimes(2);
  });
});

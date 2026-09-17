/**
 * 🚀 Dashboard Service - API V2
 *
 * Serviço consolidado para estatísticas do dashboard admin.
 * Fonte única: /v2/admin/dashboard/overview
 */

import API from './api';

// ── Interfaces V2 ───────────────────────────────────────────────────────────

export interface DashboardStats {
    totalDoctors: number;
    totalPatients: number;
    activePatients: number;
    todayAppointments: number;
    weekAppointments: number;
    todayRevenue: number;
    monthRevenue: number;
    pendingPayments: number;
    monthLeads: number;
    leadsByStatus: Record<string, number>;
    calculatedAt: string;
}

export interface DashboardCharts {
    appointmentsChart: Array<{ date: string; count: number }>;
    revenueChart: Array<{ date: string; value: number }>;
    leadsByOrigin: Array<{ _id: string; count: number }>;
    patientsBySpecialty: Array<{ _id: string; count: number }>;
    calculatedAt: string;
}

export interface DoctorOverview {
    _id: string;
    name: string;
    specialty: string;
    patients: number;
    appointments: number;
}

export interface UpcomingAppointment {
    _id: string;
    date: string;
    time: string;
    reason: string;
    status: string;
    patientName: string;
    professionalName: string;
    specialty?: string;
}

export interface DashboardMeta {
    generatedAt: string;
    version: string;
    included: string[];
}

export interface DashboardOverview {
    stats: DashboardStats | null;
    charts: DashboardCharts | null;
    doctorsOverview: DoctorOverview[];
    upcomingAppointments: UpcomingAppointment[];
    meta: DashboardMeta;
}

// ── Cache local granular por bloco ──────────────────────────────────────────
//
// 🐛 FIX (2026-09-17, parte 1): o cache antigo era um blob único
// (`cache.overview`), sem distinguir busca parcial (`include=doctors`) de
// busca completa. Se uma busca parcial resolvesse primeiro, ela preenchia o
// blob inteiro e uma busca completa posterior recebia esse cache incompleto
// de volta em vez de buscar o que faltava.
//
// 🐛 FIX (2026-09-17, parte 2 — corridas de verdade, não só o caso feliz):
// a correção da parte 1 sozinha ainda tinha 3 janelas de corrida reais:
//   (a) uma resposta que começou ANTES de um logout/troca de usuário podia
//       resolver DEPOIS da limpeza e repopular o cache com dado do usuário
//       errado — corrigido com `generation`: todo request carimba a geração
//       vigente no início; se a geração mudou até ele resolver, a escrita
//       é descartada e nem entra no cache.
//   (b) duas respostas para o mesmo bloco podiam resolver fora de ordem
//       (ex: um refresh forçado mais recente terminando ANTES de uma busca
//       antiga que já estava em voo) — a mais antiga sobrescrevendo a mais
//       nova. Corrigido com `seq`: contador monotônico por request; um
//       bloco só é escrito se `seq` for maior que o que já está lá.
//   (c) o dedupe por chave (`inFlightByBlocks`) fazia `delete(key)` no
//       finally sem checar se a entrada ainda era A DELE — se uma segunda
//       chamada (ex: forceRefresh) reaproveitasse a mesma chave enquanto a
//       primeira ainda rodava, o finally da primeira apagava o rastro da
//       segunda do Map, e uma terceira chamada logo depois não encontrava
//       nada em voo e disparava uma quarta requisição redundante. Corrigido
//       comparando identidade antes de apagar (padrão compare-and-delete).
//   Bônus: a chave de dedupe agora inclui `generation` — uma consulta feita
//   depois de uma invalidação nunca reaproveita uma requisição em voo de
//   antes da invalidação (que está fadada a ser descartada por (a)), sempre
//   dispara uma busca nova de verdade.
//
// O backend (`services/adminDashboard/index.js`) já cacheia cada bloco
// separado no Redis, com TTL próprio (stats 120s, charts 300s, doctors 120s,
// upcoming 60s) — este cache local espelha exatamente essa granularidade,
// só evitando round-trips repetidos dentro da janela de TTL.

type BlockName = 'stats' | 'charts' | 'doctors' | 'upcoming';

const ALL_BLOCKS: BlockName[] = ['stats', 'charts', 'doctors', 'upcoming'];

const BLOCK_TTL_MS: Record<BlockName, number> = {
    stats: 120_000,
    charts: 300_000,
    doctors: 120_000,
    upcoming: 60_000,
};

interface BlockCacheEntry<T> {
    data: T;
    timestamp: number;
    seq: number; // request (por ordem de início) que escreveu este valor por último
}

const blockCache: {
    stats: BlockCacheEntry<DashboardStats> | null;
    charts: BlockCacheEntry<DashboardCharts> | null;
    doctors: BlockCacheEntry<DoctorOverview[]> | null;
    upcoming: BlockCacheEntry<UpcomingAppointment[]> | null;
} = {
    stats: null,
    charts: null,
    doctors: null,
    upcoming: null,
};

// Geração da sessão/cache — incrementada em logout e em invalidação explícita.
// Uma resposta cuja geração de início não bate mais com a atual é descartada:
// nunca repopula o cache nem chega a atualizar consumidor nenhum.
let cacheGeneration = 0;

// Contador monotônico por request — usado só pra ordenar escritas (não é
// timestamp de parede, evita empate/skew de relógio). Cresce a cada request
// que efetivamente vai à rede (blocksToFetch não-vazio).
let requestSeq = 0;

// Dedupe de requisições em andamento — chave inclui a geração vigente E a
// lista ordenada dos blocos realmente sendo buscados nesta chamada (não a
// lista pedida pelo caller, que pode incluir blocos já frescos em cache).
// O valor guarda o próprio objeto-promise pra permitir compare-and-delete no
// finally (ver nota acima, item c).
const inFlightByBlocks = new Map<string, Promise<void>>();

function isBlockFresh(block: BlockName): boolean {
    const entry = blockCache[block];
    if (!entry) return false;
    return Date.now() - entry.timestamp < BLOCK_TTL_MS[block];
}

function composeOverview(included: BlockName[]): DashboardOverview {
    return {
        stats: blockCache.stats?.data ?? null,
        charts: blockCache.charts?.data ?? null,
        doctorsOverview: blockCache.doctors?.data ?? [],
        upcomingAppointments: blockCache.upcoming?.data ?? [],
        meta: {
            generatedAt: new Date().toISOString(),
            version: 'v2',
            included,
        },
    };
}

/**
 * 🎯 Busca visão completa (ou parcial) do dashboard V2
 *
 * @param forceRefresh — ignora cache local E força o backend a recalcular
 * @param include — blocos a carregar: 'stats' | 'charts' | 'doctors' | 'upcoming'.
 *                  Omitido = todos. Blocos já frescos em cache não disparam
 *                  requisição nova (a menos que forceRefresh).
 */
export const fetchDashboardOverview = async (
    forceRefresh = false,
    include?: BlockName[]
): Promise<DashboardOverview> => {
    const requested = (include && include.length > 0) ? include : ALL_BLOCKS;
    const myGeneration = cacheGeneration;

    const blocksToFetch = forceRefresh
        ? requested
        : requested.filter(b => !isBlockFresh(b));

    if (blocksToFetch.length > 0) {
        const mySeq = ++requestSeq;
        const key = `${myGeneration}|${blocksToFetch.slice().sort().join(',')}${forceRefresh ? '|refresh' : ''}`;
        const existing = inFlightByBlocks.get(key);

        let ownEntry: Promise<void>;
        if (existing) {
            console.log('⏳ dashboardService: reaproveitando requisição em andamento para', blocksToFetch);
            ownEntry = existing;
        } else {
            ownEntry = (async () => {
                try {
                    const params: Record<string, string> = { include: blocksToFetch.join(',') };
                    if (forceRefresh) {
                        params.refresh = 'true';
                    }

                    console.log('🌐 dashboardService: buscando blocos', blocksToFetch, forceRefresh ? '(refresh)' : '');
                    const response = await API.get<{ success: boolean; data: DashboardOverview }>(
                        '/v2/admin/dashboard/overview',
                        { params }
                    );

                    // (a) Resposta chegou depois de um logout/invalidação — descarta,
                    // nunca escreve no cache nem "vaza" pro composeOverview de ninguém.
                    if (cacheGeneration !== myGeneration) {
                        console.log('🗑️ dashboardService: resposta descartada (geração mudou — logout/invalidação no meio do caminho)', blocksToFetch);
                        return;
                    }

                    const dashboardData = (response.data as any)?.data || response.data;
                    const now = Date.now();

                    // (b) Só escreve se ninguém mais novo (seq maior) já escreveu nesse
                    // bloco enquanto esta request estava em voo — impede resposta antiga
                    // sobrescrever um refresh mais recente que resolveu primeiro.
                    const maybeWrite = <T,>(block: BlockName, data: T | undefined) => {
                        if (data === undefined) return;
                        const current = (blockCache as any)[block] as BlockCacheEntry<T> | null;
                        if (current && current.seq > mySeq) {
                            console.log(`🗑️ dashboardService: escrita de '${block}' descartada (seq ${mySeq} mais antiga que a já cacheada, seq ${current.seq})`);
                            return;
                        }
                        (blockCache as any)[block] = { data, timestamp: now, seq: mySeq };
                    };

                    maybeWrite('stats', dashboardData.stats);
                    maybeWrite('charts', dashboardData.charts);
                    maybeWrite('doctors', dashboardData.doctorsOverview);
                    maybeWrite('upcoming', dashboardData.upcomingAppointments);
                } finally {
                    // (c) Compare-and-delete: só remove a própria entrada, nunca a de
                    // outra chamada que tenha ocupado a mesma chave nesse meio tempo.
                    if (inFlightByBlocks.get(key) === ownEntry) {
                        inFlightByBlocks.delete(key);
                    }
                }
            })();
            inFlightByBlocks.set(key, ownEntry);
        }

        await ownEntry;
    }

    // Sempre compõe a partir do estado ATUAL do cache — se a própria resposta
    // desta chamada foi descartada por (a) ou (b), o que volta aqui já reflete
    // corretamente o que de fato está válido agora (inclusive "tudo nulo" se
    // um logout limpou tudo no meio do caminho), sem precisar de sinalização
    // extra pro chamador.
    return composeOverview(requested);
};

/**
 * 🗑️ Invalida cache no backend V2 e limpa cache local (todos os blocos)
 */
export const invalidateDashboardCache = async (): Promise<void> => {
    await API.post('/v2/admin/dashboard/invalidate-cache');
    clearDashboardCache();
};

export const getCacheState = () => {
    const entries = Object.entries(blockCache) as [BlockName, BlockCacheEntry<any> | null][];
    const cachedEntries = entries.filter(([, v]) => v !== null) as [BlockName, BlockCacheEntry<any>][];
    return {
        hasData: cachedEntries.length > 0,
        generation: cacheGeneration,
        blocks: Object.fromEntries(entries.map(([k, v]) => [k, v ? { age: Date.now() - v.timestamp, fresh: isBlockFresh(k), seq: v.seq } : null])),
        isLoading: inFlightByBlocks.size > 0,
    };
};

export const clearDashboardCache = (): void => {
    // Bump ANTES de limpar: qualquer request em voo que carimbou a geração
    // anterior vai se ver descartado quando resolver (ver comentário (a)
    // acima), mesmo que a limpeza em si só afete o snapshot local agora.
    cacheGeneration += 1;
    blockCache.stats = null;
    blockCache.charts = null;
    blockCache.doctors = null;
    blockCache.upcoming = null;
    // Não mexe em inFlightByBlocks aqui de propósito: requests em voo continuam
    // rodando normalmente (não são cancelados de verdade, XHR não tem abort
    // aqui) — só o resultado delas é que fica inofensivo ao chegar, via (a).
    console.log('🧹 Cache do dashboardService limpo (geração', cacheGeneration, ')');
};

if (typeof window !== 'undefined') {
    (window as any).clearDashboardCache = clearDashboardCache;
    (window as any).getDashboardCache = getCacheState;

    // 🐛 FIX (2026-09-17): cache local não era limpo no logout — mesmo padrão
    // já usado por PatientsContext/DoctorsContext/ContactsContext (evento
    // disparado em AuthContext.logout()). Sem isso, trocar de usuário no
    // mesmo navegador podia mostrar dados do dashboard do usuário anterior
    // até o TTL expirar.
    window.addEventListener('authLogout', clearDashboardCache);
}

/**
 * systemHealthResolver.ts
 *
 * Transforma dados brutos de 4 endpoints de observabilidade em um
 * "painel de decisão operacional" — status claro, score único e
 * ações sugeridas.
 *
 * Fontes:
 *   - GET /api/health/full
 *   - GET /api/observability/metrics
 *   - GET /api/observability/domains
 *   - GET /api/observability/alerts
 */

// import React/axios removidos — useSystemHealthCtx substitui o hook legado

// ─── Tipos dos payloads brutos ────────────────────────────────────────────────

export interface RawHealth {
    status: string;
    memory: { heapUsedMB: number; heapTotalMB: number; heapPercent: string; rssMB: number; status: string };
    queues: Record<string, { waiting: number; active: number; completed: number; failed: number; delayed: number }>;
    node: { version: string; uptimeSeconds: number; pid: number };
    packageV2?: { status: string; summary: { avgResponseTime: number; grade: string } };
}

export interface RawMetrics {
    overview: {
        totalEvents: number;
        lastHour: number;
        lastDay: number;
        errorsLastHour: number;
        deadLetters: number;
    };
    byStatus: { processed: number; pending: number; dead_letter: number; failed: number; processing: number };
    byDomain: Record<string, number>;
}

export interface RawDomain {
    domain: string;
    counts: { total: number; processed: number; failed: number; processing: number };
    successRate: string | number;
    avgProcessingTime: number;
}

export interface RawAlert {
    level: 'error' | 'warning' | 'info';
    type: string;
    message: string;
    count?: number;
}

// ─── Tipos resolvidos (output do resolver) ────────────────────────────────────

export type GlobalStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface DomainHealth {
    /** Chave técnica do domínio */
    key: string;
    /** Nome exibível ao operador */
    label: string;
    /** Emoji/ícone semântico */
    icon: string;
    status: 'ok' | 'slow' | 'failing' | 'idle' | 'unknown';
    successRate: number;       // 0–100
    totalEvents: number;
    failedEvents: number;
    pendingEvents: number;
    avgProcessingMs: number;
    /** Texto de impacto em linguagem natural */
    impact: string | null;
    /** Ação recomendada */
    action: string | null;
}

export interface InfraHealth {
    memory: { usedMB: number; totalMB: number; percent: number; status: 'ok' | 'warning' | 'critical' };
    redis: 'ok' | 'error' | 'unknown';
    mongo: 'ok' | 'error' | 'unknown';
    uptimeSeconds: number;
    nodeVersion: string;
    queueBacklog: number;   // total de jobs waiting+delayed
}

export interface SystemAlert {
    level: 'error' | 'warning' | 'info';
    title: string;
    detail: string;
    action: string;
}

export interface SystemHealth {
    /** Status global legível */
    status: GlobalStatus;
    /** Score de 0 a 100 (100 = perfeito) */
    score: number;
    /** Frase de resumo para o topo do dashboard */
    headline: string;
    domains: DomainHealth[];
    infra: InfraHealth;
    alerts: SystemAlert[];
    /** Timestamp da coleta */
    collectedAt: string;
    /** Verdade quando alguma fonte falhou */
    partial: boolean;
}

// ─── Mapeamento de domínios técnicos → exibição clínica ──────────────────────

const DOMAIN_MAP: Record<string, { label: string; icon: string }> = {
    payment:          { label: 'Financeiro / Pagamentos', icon: '💳' },
    appointment:      { label: 'Agendamentos',             icon: '📅' },
    session:          { label: 'Sessões Clínicas',         icon: '🩺' },
    patient:          { label: 'Cadastro de Pacientes',    icon: '👤' },
    lead:             { label: 'Leads / CRM',              icon: '📊' },
    followup:         { label: 'Follow-up',                icon: '📩' },
    notification:     { label: 'Notificações',             icon: '🔔' },
    package:          { label: 'Planos / Pacotes',         icon: '📦' },
    expense:          { label: 'Despesas',                 icon: '🧾' },
    balance:          { label: 'Saldo / Conta',            icon: '💰' },
    system:           { label: 'Sistema Interno',          icon: '⚙️'  },
    insurance_batch:  { label: 'Convênios (lote)',         icon: '🏥' },
};

// ─── Lógica de impacto por domínio ───────────────────────────────────────────

function domainImpact(d: RawDomain): { impact: string | null; action: string | null } {
    const rate = Number(d.successRate);
    const pending = d.counts.total - d.counts.processed - d.counts.failed;

    if (d.domain === 'appointment' && rate < 30) {
        return {
            impact: `Apenas ${rate.toFixed(0)}% dos agendamentos foram processados — confirmações podem estar atrasadas`,
            action: 'Verificar workers de appointment e reprocessar fila no Bull Board',
        };
    }
    if (d.domain === 'payment' && rate < 50) {
        return {
            impact: `Apenas ${rate.toFixed(0)}% dos pagamentos foram processados — conciliação financeira pode estar desatualizada`,
            action: 'Checar fila payment no Bull Board e revisar jobs com falha',
        };
    }
    if (d.domain === 'patient' && pending > 50) {
        return {
            impact: `${pending} eventos de pacientes aguardando rebuild de view — buscas podem retornar dados desatualizados`,
            action: 'Verificar worker patient-view-rebuild',
        };
    }
    if (d.domain === 'session' && d.counts.total > 0 && d.counts.processed === 0) {
        return {
            impact: 'Nenhuma sessão clínica processada — histórico de consultas pode estar incompleto',
            action: 'Verificar consumer do domínio session',
        };
    }
    if (d.counts.failed > 0) {
        return {
            impact: `${d.counts.failed} eventos com falha em "${d.domain}"`,
            action: 'Inspecionar dead letters e logs do worker',
        };
    }
    if (pending > 0) {
        return {
            impact: `${pending} evento(s) pendente(s) no domínio "${d.domain}" — worker está com atraso`,
            action: 'Verificar se o worker está ativo e se a memória do servidor está elevada (heap alto = workers mais lentos)',
        };
    }
    return { impact: null, action: null };
}

function domainStatus(d: RawDomain): DomainHealth['status'] {
    const rate = Number(d.successRate);
    if (d.counts.total === 0) return 'idle';
    if (d.counts.failed > 5 || rate < 20) return 'failing';
    if (rate < 60 || d.avgProcessingTime > 15000) return 'slow';
    return 'ok';
}

// ─── Resolver principal ───────────────────────────────────────────────────────

export function resolveSystemHealth(
    health: RawHealth | null,
    metrics: RawMetrics | null,
    domains: RawDomain[],
    rawAlerts: RawAlert[],
): SystemHealth {
    const collectedAt = new Date().toISOString();
    const partial = !health || !metrics;

    // ── Infra ────────────────────────────────────────────────────────────────
    // Usa RSS como métrica principal (mais representativa do uso real de RAM)
    const rssMB = health?.memory.rssMB ?? 0;
    const rssPercent = health?.memory.heapTotalMB
        ? Math.round((rssMB / (health.memory.heapTotalMB * 2 + 512)) * 100) // heurística visual
        : 0;

    const memStatus: InfraHealth['memory']['status'] =
        rssMB >= 2048 ? 'critical' :
        rssMB >= 1024 ? 'warning' : 'ok';

    const queueBacklog = health
        ? Object.values(health.queues).reduce((sum, q) => sum + (q.waiting ?? 0) + (q.delayed ?? 0), 0)
        : 0;

    const infra: InfraHealth = {
        memory: {
            usedMB: rssMB,
            totalMB: health?.memory.heapTotalMB ? health.memory.heapTotalMB * 2 + 512 : 0,
            percent: Math.min(100, rssPercent),
            status: memStatus,
        },
        redis: 'unknown',   // health/full não retorna redis separado — mantém unknown
        mongo: 'unknown',
        uptimeSeconds: health?.node.uptimeSeconds ?? 0,
        nodeVersion: health?.node.version ?? '?',
        queueBacklog,
    };

    // ── Domínios ─────────────────────────────────────────────────────────────
    const resolvedDomains: DomainHealth[] = domains.map((d) => {
        const meta = DOMAIN_MAP[d.domain] ?? { label: d.domain, icon: '🔧' };
        const pending = Math.max(0, d.counts.total - d.counts.processed - d.counts.failed);
        const { impact, action } = domainImpact(d);

        return {
            key: d.domain,
            label: meta.label,
            icon: meta.icon,
            status: domainStatus(d),
            successRate: Number(Number(d.successRate).toFixed(1)),
            totalEvents: d.counts.total,
            failedEvents: d.counts.failed,
            pendingEvents: pending,
            avgProcessingMs: Math.round(d.avgProcessingTime),
            impact,
            action,
        };
    });

    // ── Alertas ──────────────────────────────────────────────────────────────
    const alerts: SystemAlert[] = [];

    if (memStatus === 'critical') {
        alerts.push({
            level: 'error',
            title: `Memória crítica (${rssPercent}%)`,
            detail: 'RSS acima de 2GB — risco de instabilidade em jobs longos e filas de processamento',
            action: 'Monitorar; reiniciar serviço se subir para 95%+',
        });
    } else if (memStatus === 'warning') {
        alerts.push({
            level: 'warning',
            title: `Memória elevada (${rssPercent}%)`,
            detail: 'RSS acima de 1GB — fique atento a memory leaks',
            action: 'Observar tendência nos próximos 30 minutos',
        });
    }

    const deadLetters = metrics?.overview.deadLetters ?? 0;
    if (deadLetters > 0) {
        const affectedDomains = resolvedDomains
            .filter(d => d.failedEvents > 0)
            .map(d => `${d.icon} ${d.label}`)
            .join(', ') || 'domínio desconhecido';

        alerts.push({
            level: 'error',
            title: `${deadLetters} evento(s) em dead letter`,
            detail: `Eventos que não serão reprocessados automaticamente. Afeta: ${affectedDomains}`,
            action: 'Reprocessar dead letters via Bull Board em /admin/queues',
        });
    }

    if (queueBacklog > 20) {
        alerts.push({
            level: 'warning',
            title: `Backlog de fila elevado (${queueBacklog} jobs)`,
            detail: 'Jobs waiting + delayed acima do esperado',
            action: 'Verificar workers activos no Bull Board',
        });
    }

    for (const raw of rawAlerts) {
        // evita duplicar alertas já gerados acima
        if (raw.type === 'dead_letters' || raw.type === 'memory') continue;
        alerts.push({
            level: raw.level,
            title: raw.message,
            detail: `Tipo: ${raw.type}`,
            action: 'Verificar logs do sistema',
        });
    }

    // ── Score (0–100) ────────────────────────────────────────────────────────
    let score = 100;

    // memória
    if (memStatus === 'critical') score -= 25;
    else if (memStatus === 'warning') score -= 10;

    // dead letters
    score -= Math.min(20, deadLetters * 5);

    // domínios com falha
    const failingDomains = resolvedDomains.filter(d => d.status === 'failing');
    score -= failingDomains.length * 10;

    const slowDomains = resolvedDomains.filter(d => d.status === 'slow');
    score -= slowDomains.length * 5;

    // backlog de fila
    if (queueBacklog > 50) score -= 10;
    else if (queueBacklog > 20) score -= 5;

    // erros recentes
    const errorsLastHour = metrics?.overview.errorsLastHour ?? 0;
    if (errorsLastHour > 10) score -= 10;
    else if (errorsLastHour > 0) score -= 5;

    score = Math.max(0, Math.min(100, score));

    // ── Status global ────────────────────────────────────────────────────────
    let status: GlobalStatus =
        score >= 85 ? 'healthy' :
        score >= 60 ? 'degraded' : 'critical';

    if (partial) status = 'unknown';

    // ── Headline ─────────────────────────────────────────────────────────────
    const errorAlerts = alerts.filter(a => a.level === 'error');
    let headline: string;

    if (status === 'healthy') {
        headline = 'Sistema operando normalmente';
    } else if (status === 'unknown') {
        headline = 'Não foi possível coletar todas as métricas';
    } else if (errorAlerts.length > 0) {
        const titles = errorAlerts.map(a => a.title).join(' · ');
        headline = `${status === 'critical' ? '🔴' : '🟡'} ${titles}`;
    } else {
        const sluggish = [...failingDomains, ...slowDomains].map(d => d.label).join(', ');
        headline = sluggish
            ? `Sistema lento — impacto em: ${sluggish}`
            : 'Sistema degradado — sem impacto direto identificado';
    }

    return { status, score, headline, domains: resolvedDomains, infra, alerts, collectedAt, partial };
}

// ─── Hook legado REMOVIDO ───────────────────────────────────────────────────
// Use SystemHealthContext (useSystemHealthCtx) em vez disso.
// Ele consome /api/observability/system-health (1 call) em vez de 4 calls separadas.

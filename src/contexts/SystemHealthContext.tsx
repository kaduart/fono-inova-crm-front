/**
 * SystemHealthContext
 *
 * Centraliza as chamadas de observabilidade para que
 * SystemUnifiedDashboard compartilhe
 * os mesmos dados sem duplicar requests.
 *
 * 🔥 OTIMIZAÇÃO: usa /api/observability/system-health (1 call)
 * em vez de metrics + domains + alerts + recent (4 calls).
 *
 * Provedor: AdminDashboard
 * Consumidores: useSystemHealthCtx()
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import API from '../services/api';
import {
    resolveSystemHealth,
    type SystemHealth,
    type RawHealth,
    type RawMetrics,
    type RawDomain,
    type RawAlert,
} from '../utils/systemHealthResolver';

export type { RawMetrics, RawDomain, RawAlert };

export interface RawMonitorData {
    timestamp: string;
    uptimeSeconds: number;
    memory: { rss: string; heapUsed: string; heapTotal: string };
    redis:   { status: string; connected?: boolean; message?: string };
    mongodb: { status: string; ping?: boolean; message?: string };
    queues: {
        name: string;
        waiting?: number; active?: number; completed?: number;
        failed?: number; delayed?: number; total?: number; error?: string;
    }[];
    totalQueues: number;
}

export interface ObsRecent {
    eventType: string;
    status: string;
    timestamp: string;
    correlationId?: string;
}

interface SystemHealthApiResponse {
    timestamp: string;
    summary: {
        totalEvents: number;
        deadLetters: number;
        stuckProcessing: number;
        throughputPerHour: number;
    };
    successRate: { last1h: number; last24h: number };
    errorRate: { last1h: number; last24h: number };
    processingTime: { avgMs: number; p95Ms: number };
    topFailingEventTypes: { eventType: string; count: number }[];
    domains: {
        domain: string;
        total: number;
        processed: number;
        failed: number;
        successRate: string | number;
    }[];
    appointment: { retryableNotFound: number; permanentNotFound: number };
    recentEvents: ObsRecent[];
    overview: RawMetrics['overview'];
    byStatus: RawMetrics['byStatus'];
    byDomain: RawMetrics['byDomain'];
    alerts: RawAlert[];
    status: 'healthy' | 'warning' | 'critical';
    healthScore: number;
}

export interface HealthExtras {
    successRate: { last1h: number; last24h: number } | null;
    errorRate: { last1h: number; last24h: number } | null;
    processingTime: { avgMs: number; p95Ms: number } | null;
    topFailingEventTypes: { eventType: string; count: number }[];
    appointmentStats: { retryableNotFound: number; permanentNotFound: number } | null;
}

export interface WhatsAppHealth {
    status: 'healthy' | 'warning' | 'critical';
    timestamp: string;
    checks: {
        workersEnabled: boolean;
        redisConnected: boolean;
        inboundQueueOk: boolean;
        persistenceQueueOk: boolean;
        pendingEventsCritical: number;
        pendingEventsWarning: number;
        recentFailures: number;
    };
}

interface SystemHealthContextValue {
    health:        SystemHealth | null;
    monitor:       RawMonitorData | null;
    rawMetrics:    RawMetrics | null;
    rawDomains:    RawDomain[];
    rawAlerts:     RawAlert[];
    recent:        ObsRecent[];
    healthScore:   number | null;
    systemStatus:  'healthy' | 'warning' | 'critical' | null;
    extras:        HealthExtras;
    loadingHealth: boolean;
    loadingMonitor: boolean;
    refresh: () => void;
    lastFetchAt: Date | null;
    whatsappHealth: WhatsAppHealth | null;
    loadingWhatsapp: boolean;
}

const SystemHealthContext = createContext<SystemHealthContextValue | null>(null);

const HEALTH_INTERVAL  = 60_000;
const MONITOR_INTERVAL = 30_000;

export function SystemHealthProvider({ children }: { children: ReactNode }) {
    const [health,         setHealth]         = useState<SystemHealth | null>(null);
    const [monitor,        setMonitor]        = useState<RawMonitorData | null>(null);
    const [rawMetrics,     setRawMetrics]     = useState<RawMetrics | null>(null);
    const [rawDomains,     setRawDomains]     = useState<RawDomain[]>([]);
    const [rawAlerts,      setRawAlerts]      = useState<RawAlert[]>([]);
    const [recent,         setRecent]         = useState<ObsRecent[]>([]);
    const [healthScore,    setHealthScore]    = useState<number | null>(null);
    const [systemStatus,   setSystemStatus]   = useState<'healthy' | 'warning' | 'critical' | null>(null);
    const [extras,         setExtras]         = useState<HealthExtras>({ successRate: null, errorRate: null, processingTime: null, topFailingEventTypes: [], appointmentStats: null });
    const [loadingHealth,  setLoadingHealth]  = useState(true);
    const [loadingMonitor, setLoadingMonitor] = useState(true);
    const [lastFetchAt,    setLastFetchAt]    = useState<Date | null>(null);
    const [whatsappHealth, setWhatsappHealth] = useState<WhatsAppHealth | null>(null);
    const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);

    const fetchHealth = useCallback(async () => {
        try {
            const [shRes, healthRes] = await Promise.allSettled([
                API.get<{ data: SystemHealthApiResponse }>('/observability/system-health'),
                API.get<{ data?: RawHealth } & RawHealth>('/health/full'),
            ]);

            const sh = shRes.status === 'fulfilled' ? shRes.value.data.data : null;
            const rawHealth = healthRes.status === 'fulfilled' ? healthRes.value.data as unknown as RawHealth : null;

            if (sh) {
                const metrics: RawMetrics = {
                    overview: sh.overview,
                    byStatus: sh.byStatus,
                    byDomain: sh.byDomain,
                };

                const domains: RawDomain[] = sh.domains.map(d => ({
                    domain: d.domain,
                    counts: {
                        total: d.total,
                        processed: d.processed,
                        failed: d.failed,
                        processing: 0,
                    },
                    successRate: d.successRate,
                    avgProcessingTime: 0,
                }));

                // Enriquece alertas do backend com dados do system-health
                const alerts: RawAlert[] = [...sh.alerts];

                if (sh.appointment?.retryableNotFound > 0) {
                    const exists = alerts.some(a => a.type === 'race_condition_detected');
                    if (!exists) {
                        alerts.push({
                            level: 'warning',
                            type: 'race_condition_detected',
                            message: `${sh.appointment.retryableNotFound} evento(s) aguardando consistência (race condition)`,
                            count: sh.appointment.retryableNotFound,
                        });
                    }
                }
                if (sh.appointment?.permanentNotFound > 0) {
                    const exists = alerts.some(a => a.type === 'appointment_not_found');
                    if (!exists) {
                        alerts.push({
                            level: 'error',
                            type: 'appointment_not_found',
                            message: `${sh.appointment.permanentNotFound} evento(s) com APPOINTMENT_NOT_FOUND definitivo`,
                            count: sh.appointment.permanentNotFound,
                        });
                    }
                }

                setRawMetrics(metrics);
                setRawDomains(domains);
                setRawAlerts(alerts);
                setRecent(sh.recentEvents ?? []);
                setHealthScore(sh.healthScore ?? null);
                setSystemStatus(sh.status ?? null);
                setExtras({
                    successRate: sh.successRate ?? null,
                    errorRate: sh.errorRate ?? null,
                    processingTime: sh.processingTime ?? null,
                    topFailingEventTypes: sh.topFailingEventTypes ?? [],
                    appointmentStats: sh.appointment ?? null,
                });
                setHealth(resolveSystemHealth(rawHealth, metrics, domains, alerts));
            }

            setLastFetchAt(new Date());
        } catch {
            // mantém último estado
        } finally {
            setLoadingHealth(false);
        }
    }, []);

    const fetchMonitor = useCallback(async () => {
        try {
            const res = await API.get('/admin/system-monitor', { timeout: 8000 });
            setMonitor(res.data);
        } catch {
            // mantém último estado
        } finally {
            setLoadingMonitor(false);
        }
    }, []);

    const fetchWhatsappHealth = useCallback(async () => {
        try {
            const res = await API.get<{ success: boolean; status: string; checks: WhatsAppHealth['checks'] }>('/observability/whatsapp-health');
            setWhatsappHealth({
                status: res.data.status as WhatsAppHealth['status'],
                timestamp: new Date().toISOString(),
                checks: res.data.checks,
            });
        } catch {
            setWhatsappHealth({
                status: 'critical',
                timestamp: new Date().toISOString(),
                checks: {
                    workersEnabled: false,
                    redisConnected: false,
                    inboundQueueOk: false,
                    persistenceQueueOk: false,
                    pendingEvents: 0,
                    recentFailures: 0,
                },
            });
        } finally {
            setLoadingWhatsapp(false);
        }
    }, []);

    const refresh = useCallback(() => {
        fetchHealth();
        fetchMonitor();
        fetchWhatsappHealth();
    }, [fetchHealth, fetchMonitor, fetchWhatsappHealth]);

    useEffect(() => {
        fetchHealth();
        const id = setInterval(fetchHealth, HEALTH_INTERVAL);
        return () => clearInterval(id);
    }, [fetchHealth]);

    useEffect(() => {
        fetchMonitor();
        const id = setInterval(fetchMonitor, MONITOR_INTERVAL);
        return () => clearInterval(id);
    }, [fetchMonitor]);

    // 🔄 Polling adaptativo do WhatsApp health
    useEffect(() => {
        fetchWhatsappHealth();
        const interval =
            whatsappHealth?.status === 'critical' ? 5_000 :
            whatsappHealth?.status === 'warning' ? 10_000 :
            15_000;
        const id = setInterval(fetchWhatsappHealth, interval);
        return () => clearInterval(id);
    }, [fetchWhatsappHealth, whatsappHealth?.status]);

    return (
        <SystemHealthContext.Provider value={{
            health, monitor, rawMetrics, rawDomains, rawAlerts, recent,
            healthScore, systemStatus, extras,
            loadingHealth, loadingMonitor,
            refresh, lastFetchAt,
            whatsappHealth, loadingWhatsapp,
        }}>
            {children}
        </SystemHealthContext.Provider>
    );
}

export function useSystemHealthCtx(): SystemHealthContextValue {
    const ctx = useContext(SystemHealthContext);
    if (!ctx) throw new Error('useSystemHealthCtx deve ser usado dentro de <SystemHealthProvider>');
    return ctx;
}

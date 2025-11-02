// src/hooks/useLeadMetrics.ts
import { useCallback, useEffect, useState } from "react";
import { leadService } from "../services/leadService";

export function useLeadMetrics(params?: { startDate?: string; endDate?: string; year?: number | string; month?: number | string }) {
    const [sheet, setSheet] = useState<any>(null);
    const [weekly, setWeekly] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [m1, m2] = await Promise.all([
                leadService.getSheetMetrics({ startDate: params?.startDate, endDate: params?.endDate }),
                leadService.getWeeklyMetrics({
                    year: params?.year ?? new Date().getFullYear(),
                    month: params?.month ?? String(new Date().getMonth() + 1).padStart(2, "0"),
                })
            ]);
            if (!m1.success) throw new Error(m1.error?.message || "erro sheet-metrics");
            if (!m2.success) throw new Error(m2.error?.message || "erro weekly-metrics");
            setSheet(m1.data);
            setWeekly(m2.data);
        } catch (e: any) {
            setError(e?.message || "Erro ao buscar métricas");
            setSheet(null); setWeekly([]);
        } finally {
            setLoading(false);
        }
    }, [params?.startDate, params?.endDate, params?.year, params?.month]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    return { sheet, weekly, loading, error, refetch: fetchAll };
}

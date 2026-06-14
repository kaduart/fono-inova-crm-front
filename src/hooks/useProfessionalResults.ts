// src/hooks/useProfessionalResults.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  professionalResultsService,
  ProfessionalRankingItem,
  ProfessionalSummary,
  PatientBreakdownItem,
  SettlementItem,
  FinancialIssue,
} from '../services/professionalResultsService';
import { toast } from 'react-toastify';

function getCurrentMonthRange() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { startDate: start, endDate: end };
}

export type TabValue = 'ranking' | 'result' | 'patients' | 'settlements' | 'health';

interface UseProfessionalResultsReturn {
  activeTab: TabValue;
  setActiveTab: (tab: TabValue) => void;
  period: { startDate: string; endDate: string };
  setPeriod: (period: { startDate: string; endDate: string }) => void;
  selectedDoctorId: string | null;
  setSelectedDoctorId: (id: string | null) => void;

  ranking: ProfessionalRankingItem[];
  loadingRanking: boolean;

  summary: ProfessionalSummary | null;
  loadingSummary: boolean;

  patients: PatientBreakdownItem[];
  loadingPatients: boolean;

  settlements: SettlementItem[];
  loadingSettlements: boolean;

  issues: FinancialIssue[];
  loadingIssues: boolean;

  refresh: () => void;
}

export function useProfessionalResults(): UseProfessionalResultsReturn {
  const [activeTab, setActiveTab] = useState<TabValue>('ranking');
  const [period, setPeriod] = useState(getCurrentMonthRange());
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  const [ranking, setRanking] = useState<ProfessionalRankingItem[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);

  const [summary, setSummary] = useState<ProfessionalSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [previousSummary, setPreviousSummary] = useState<ProfessionalSummary | null>(null);
  const [loadingPreviousSummary, setLoadingPreviousSummary] = useState(false);

  const [patients, setPatients] = useState<PatientBreakdownItem[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);

  const [issues, setIssues] = useState<FinancialIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  const lastFetchPeriod = useRef<string | null>(null);

  const fetchRanking = useCallback(async () => {
    setLoadingRanking(true);
    try {
      const data = await professionalResultsService.getRanking(period.startDate, period.endDate);
      setRanking(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar ranking');
    } finally {
      setLoadingRanking(false);
    }
  }, [period]);

  const fetchSummary = useCallback(async () => {
    if (!selectedDoctorId) return;
    setLoadingSummary(true);
    try {
      const data = await professionalResultsService.getSummary(selectedDoctorId, period.startDate, period.endDate);
      setSummary(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar resumo do profissional');
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedDoctorId, period]);

  const fetchPreviousSummary = useCallback(async () => {
    if (!selectedDoctorId) return;
    setLoadingPreviousSummary(true);
    try {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      const prevStart = new Date(prevEnd.getTime() - diffDays * 24 * 60 * 60 * 1000);

      const prevStartStr = prevStart.toISOString().split('T')[0];
      const prevEndStr = prevEnd.toISOString().split('T')[0];

      const data = await professionalResultsService.getSummary(selectedDoctorId, prevStartStr, prevEndStr);
      setPreviousSummary(data);
    } catch (err) {
      // Não exibe toast para período anterior — não é crítico
      setPreviousSummary(null);
    } finally {
      setLoadingPreviousSummary(false);
    }
  }, [selectedDoctorId, period]);

  const fetchPatients = useCallback(async () => {
    if (!selectedDoctorId) return;
    setLoadingPatients(true);
    try {
      const data = await professionalResultsService.getPatientsBreakdown(selectedDoctorId, period.startDate, period.endDate);
      setPatients(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar pacientes');
    } finally {
      setLoadingPatients(false);
    }
  }, [selectedDoctorId, period]);

  const fetchSettlements = useCallback(async () => {
    if (!selectedDoctorId) return;
    setLoadingSettlements(true);
    try {
      const data = await professionalResultsService.getSettlements(selectedDoctorId);
      setSettlements(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar fechamentos');
    } finally {
      setLoadingSettlements(false);
    }
  }, [selectedDoctorId]);

  const fetchIssues = useCallback(async () => {
    setLoadingIssues(true);
    try {
      const data = await professionalResultsService.getFinancialIssues(period.startDate, period.endDate, 50);
      setIssues(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar problemas financeiros');
    } finally {
      setLoadingIssues(false);
    }
  }, [period]);

  useEffect(() => {
    const periodKey = `${period.startDate}|${period.endDate}`;
    if (lastFetchPeriod.current === periodKey) return;
    lastFetchPeriod.current = periodKey;
    fetchRanking();
    fetchIssues();
  }, [fetchRanking, fetchIssues, period]);

  useEffect(() => {
    if (!selectedDoctorId) return;
    fetchSummary();
    fetchPreviousSummary();
    fetchPatients();
    fetchSettlements();
  }, [selectedDoctorId, fetchSummary, fetchPreviousSummary, fetchPatients, fetchSettlements]);

  const refresh = useCallback(() => {
    fetchRanking();
    fetchIssues();
    if (selectedDoctorId) {
      fetchSummary();
      fetchPreviousSummary();
      fetchPatients();
      fetchSettlements();
    }
  }, [fetchRanking, fetchIssues, selectedDoctorId, fetchSummary, fetchPreviousSummary, fetchPatients, fetchSettlements]);

  return {
    activeTab,
    setActiveTab,
    period,
    setPeriod,
    selectedDoctorId,
    setSelectedDoctorId,
    ranking,
    loadingRanking,
    summary,
    loadingSummary,
    previousSummary,
    loadingPreviousSummary,
    patients,
    loadingPatients,
    settlements,
    loadingSettlements,
    issues,
    loadingIssues,
    refresh,
  };
}

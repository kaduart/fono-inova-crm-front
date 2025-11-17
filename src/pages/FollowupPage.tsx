// src/pages/FollowupPage.tsx
import { Paper, Typography, useTheme } from "@mui/material";
import { AnimatePresence } from "framer-motion";
import {
  BarChart3,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

// ✅ IMPORT DO SERVICE
import { followupService } from "../services/followupService";

// Componentes
import FollowupConversionChart from "../components/Dashboard/FollowupConversionChart";
import { FollowupFilters } from "../components/Dashboard/FollowupFilters";
import FollowupInsights from "../components/Dashboard/FollowupInsights";
import FollowupStats from "../components/Dashboard/FollowupStats";
import FollowupTrendChart from "../components/Dashboard/FollowupTrendChart";
import MarketingDashboard from "../components/Dashboard/MarketingDashboard";

// Hooks customizados
import { useFollowupAnalytics } from "../hooks/useFollowupAnalytics";
import { useLeads } from "../hooks/useLeads";

// UI Components
import { ScoreBadge } from "../components/mkt/leads/ScoreBadge";
import { SegmentBadge } from "../components/mkt/leads/ SegmentBadge";
import TimelineModal from "../components/mkt/leads/TimelineModal";
import { Button } from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { WhatsAppDiagnostic } from '../pages/Settings/WhatsAppDiagnostic'; // ⬅️ ADICIONAR

/** -------- Modal completo de "Novo Lead" -------- */
type NewLeadPayload = {
  name: string;
  phone: string;
  origin: "WhatsApp" | "Site" | "Indicação" | "Outro" | "Tráfego pago" | "Google" | "Instagram" | "Meta Ads";
  seekingFor: "Adulto +18 anos" | "Infantil" | "Graduação";
  modality: "Online" | "Presencial";
  healthPlan: "Graduação" | "Mensalidade" | "Dependente";
  scheduledDate?: string;
};

function sanitizePhone(input: string) {
  return (input || "").replace(/\D/g, "");
}

function NewLeadModal({
  open,
  onClose,
  onSubmit,
  defaultOrigin = "Tráfego pago",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: NewLeadPayload) => Promise<void> | void;
  defaultOrigin?: NewLeadPayload["origin"];
}) {
  const [form, setForm] = useState<NewLeadPayload>({
    name: "",
    phone: "",
    origin: defaultOrigin,
    seekingFor: "Adulto +18 anos",
    modality: "Online",
    healthPlan: "Mensalidade",
    scheduledDate: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const canSubmit = useMemo(() => form.name.trim() && sanitizePhone(form.phone).length >= 10, [form]);

  useEffect(() => {
    if (!open) {
      setForm({
        name: "",
        phone: "",
        origin: defaultOrigin,
        seekingFor: "Adulto +18 anos",
        modality: "Online",
        healthPlan: "Mensalidade",
        scheduledDate: "",
      });
      setSubmitting(false);
    }
  }, [open, defaultOrigin]);

  const handleChange = (field: keyof NewLeadPayload, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = async () => {
    try {
      if (!canSubmit) {
        toast.error("Preencha nome e telefone válido.");
        return;
      }
      setSubmitting(true);
      await onSubmit({
        ...form,
        phone: sanitizePhone(form.phone),
        scheduledDate: form.scheduledDate || undefined,
      });
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar lead");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Criar Novo Lead</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm text-slate-600">Nome*</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Ex.: Ana Beatriz"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Telefone* (com DDD)</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="6299XXXXXXX"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Origem</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-xl"
                value={form.origin}
                onChange={(e) => handleChange("origin", e.target.value as NewLeadPayload["origin"])}
              >
                <option>Tráfego pago</option>
                <option>WhatsApp</option>
                <option>Site</option>
                <option>Indicação</option>
                <option>Google</option>
                <option>Instagram</option>
                <option>Meta Ads</option>
                <option>Outro</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-600">Agendar para</label>
              <input
                type="date"
                className="w-full mt-1 px-3 py-2 border rounded-xl"
                value={form.scheduledDate}
                onChange={(e) => handleChange("scheduledDate", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-600">Buscando</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-xl"
                value={form.seekingFor}
                onChange={(e) => handleChange("seekingFor", e.target.value as NewLeadPayload["seekingFor"])}
              >
                <option>Adulto +18 anos</option>
                <option>Infantil</option>
                <option>Graduação</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-600">Modalidade</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-xl"
                value={form.modality}
                onChange={(e) => handleChange("modality", e.target.value as NewLeadPayload["modality"])}
              >
                <option>Online</option>
                <option>Presencial</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-600">Plano</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-xl"
                value={form.healthPlan}
                onChange={(e) => handleChange("healthPlan", e.target.value as NewLeadPayload["healthPlan"])}
              >
                <option>Mensalidade</option>
                <option>Graduação</option>
                <option>Dependente</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={onClose} className="flex-1 bg-slate-200 text-slate-800">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-emerald-600 text-white disabled:opacity-60"
            disabled={!canSubmit || submitting}
          >
            {submitting ? "Criando..." : "Criar Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}
/** -------- Fim do modal -------- */

const FollowupPage = () => {
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");

  const theme = useTheme();

  const {
    leads,
    loading: leadsLoading,
    error: leadsError,
    createLeadFromSheet,
    updateLeadStatus,
    refetch: refetchLeads
  } = useLeads({ search });

  const {
    data: analyticsData,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useFollowupAnalytics();

  // ✅ REMOVIDO: fetchLeadFollowups, resendFollowup, estado de followups
  // Agora o TimelineModal gerencia tudo via hook useFollowup

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchLeads(), refetchAnalytics()]);
      toast.success("Dados atualizados!");
    } catch (error) {
      toast.error("Erro ao atualizar dados");
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  }, [refetchLeads, refetchAnalytics]);

  const openLeadTimeline = useCallback((lead: any) => {
    setSelectedLead(lead);
    setShowTimelineModal(true);
    // ✅ REMOVIDO: fetchLeadFollowups - o TimelineModal carrega os dados automaticamente
  }, []);

  const closeTimelineModal = useCallback(() => {
    setShowTimelineModal(false);
    setSelectedLead(null);
    // ✅ REMOVIDO: setFollowups([]) - não é mais necessário
  }, []);

  const handleCreateLead = useCallback(async (leadData: any) => {
    try {
      await createLeadFromSheet(leadData);
      setShowCreateModal(false);
      toast.success("Lead criado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar lead");
    }
  }, [createLeadFromSheet]);

  const handleStatusUpdate = async (leadId: string, newStatus: any) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      toast.success("Status atualizado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status");
    }
  };

  // ✅ SUBSTITUÍDO: agora usa followupService
  const handleFilter = async (filters: any) => {
    try {
      const result = await followupService.filter(filters);

      if (result.success) {
        const uniqueLeads = Array.from(
          new Map(result.data.map((f: any) => [f.lead._id, f.lead])).values()
        );
        console.log("Leads filtrados:", uniqueLeads);
      }
    } catch (error: any) {
      toast.error("Erro ao filtrar follow-ups");
    }
  };

  useEffect(() => {
    refetchLeads();
    refetchAnalytics();
  }, [search, refetchLeads, refetchAnalytics]);

  useEffect(() => {
    if (activeTab === "timeline") {
      const interval = setInterval(() => {
        refetchLeads();
        refetchAnalytics();
        // ✅ REMOVIDO: recarregar followups - o TimelineModal faz isso automaticamente
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, refetchLeads, refetchAnalytics]);

  return (
    <div className="min-h-screen bg-slate-50/30 p-6">
      {/* CABEÇALHO */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 6,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}08, ${theme.palette.secondary.main}05)`,
          border: `1px solid ${theme.palette.grey[200]}`,
        }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Users size={28} className="text-emerald-600" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" color="grey.800" className="mb-1">
                Gestão de Leads & Follow-ups
              </Typography>
              <Typography variant="body2" color="grey.600" className="max-w-2xl">
                Acompanhe leads, automatize follow-ups e converta mais pacientes
              </Typography>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus size={18} />
              Novo Lead
            </Button>

            <Button
              onClick={handleRefresh}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              Atualizar
            </Button>
          </div>
        </div>
      </Paper>

      {/* ESTATÍSTICAS */}
      <FollowupStats
        data={analyticsData?.stats}
        loading={analyticsLoading}
        error={analyticsError}
      />

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 flex gap-1 p-1.5">
          <TabsTrigger
            value="timeline"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
          >
            <MessageCircle size={16} />
            Timeline
            {leads.length > 0 && (
              <span className="bg-emerald-100 text-emerald-600 text-xs px-1.5 py-0.5 rounded-full ml-1">
                {leads.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="analytics"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
          >
            <BarChart3 size={16} />
            Insights
          </TabsTrigger>

          <TabsTrigger
            value="marketing"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 data-[state=active]:bg-purple-500 data-[state=active]:text-white"
          >
            <TrendingUp size={16} />
            Marketing
          </TabsTrigger>

          <TabsTrigger
            value="diagnostic"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            <RefreshCw size={16} />
            Diagnóstico
          </TabsTrigger>
        </TabsList>

        {/* ABA TIMELINE */}
        <TabsContent value="timeline" className="space-y-6">
          <FollowupFilters onFilter={handleFilter} />

          {/* BARRA DE BUSCA */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou telefone..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={() => refetchLeads()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Search size={16} />
                Buscar
              </button>
            </div>
          </div>

          {/* TABELA DE LEADS */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-semibold text-slate-700 text-left">Nome</th>
                  <th className="p-4 font-semibold text-slate-700 text-left">Origem</th>
                  <th className="p-4 font-semibold text-slate-700 text-center">Score</th>
                  <th className="p-4 font-semibold text-slate-700 text-center">Segmento</th>
                  <th className="p-4 font-semibold text-slate-700 text-left">Status</th>
                  <th className="p-4 font-semibold text-slate-700 text-left">Contato</th>
                  <th className="p-4 font-semibold text-slate-700 text-center">Timeline</th>
                </tr>
              </thead>
              <tbody>
                {leadsLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="p-4"><Skeleton className="h-4 w-40 rounded" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24 rounded" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-20 rounded" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-20 rounded" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-20 rounded" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-28 rounded" /></td>
                      <td className="p-4 text-center"><Skeleton className="h-8 w-24 rounded mx-auto" /></td>
                    </tr>
                  ))
                ) : (
                  leads.map((lead: any) => (
                    <tr
                      key={lead._id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4 font-medium text-slate-800">{lead.name}</td>
                      <td className="p-4 text-slate-600">{lead.origin}</td>
                      <td className="p-4 text-center"><ScoreBadge score={lead.conversionScore} /></td>
                      <td className="p-4 text-center"><SegmentBadge segment={lead.segment} /></td>
                      <td className="p-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusUpdate(lead._id, e.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-emerald-500 ${lead.status === 'novo' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-800' :
                              lead.status === 'virou_paciente' ? 'bg-green-100 text-green-800' :
                                lead.status === 'lead_frio' ? 'bg-gray-100 text-gray-800' :
                                  'bg-slate-100 text-slate-800'
                            }`}
                        >
                          <option value="novo">Novo</option>
                          <option value="em_andamento">Em Andamento</option>
                          <option value="virou_paciente">Virou Paciente</option>
                          <option value="lead_frio">Lead Frio</option>
                          <option value="perdido">Perdido</option>
                        </select>
                      </td>
                      <td className="p-4">
                        {lead.contact?.phone ? (
                          <a
                            href={`https://wa.me/${lead.contact.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline flex items-center gap-1"
                          >
                            {lead.contact.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="text-center p-4">
                        <Button
                          onClick={() => openLeadTimeline(lead)}
                          disabled={showTimelineModal && selectedLead?._id === lead._id}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${showTimelineModal && selectedLead?._id === lead._id
                            ? "bg-slate-100 text-slate-600 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl"
                            }`}
                        >
                          {showTimelineModal && selectedLead?._id === lead._id ? "Aberto" : "Abrir Timeline"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {leads.length === 0 && !leadsLoading && (
              <div className="text-center py-8">
                <MessageCircle size={48} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Nenhum lead encontrado</p>
                <p className="text-slate-400 text-xs mt-1">Tente ajustar os filtros ou criar um novo lead</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA ANALYTICS */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <FollowupInsights data={analyticsData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FollowupTrendChart data={analyticsData?.trend} />
              <FollowupConversionChart data={analyticsData?.conversion} />
            </div>
          </div>
        </TabsContent>

        {/* ABA MARKETING */}
        <TabsContent value="marketing">
          <MarketingDashboard />
        </TabsContent>

        <TabsContent value="diagnostic">
          <WhatsAppDiagnostic />
        </TabsContent>
      </Tabs>

      {/* MODAL TIMELINE */}
      <AnimatePresence>
        {showTimelineModal && selectedLead && (
          <TimelineModal
            lead={selectedLead}
            onClose={closeTimelineModal}
            onFollowupCreated={() => {
              // ✅ SIMPLIFICADO: só recarrega os leads
              // O TimelineModal já recarrega seus próprios follow-ups via hook
              refetchLeads();
            }}
          />
        )}
      </AnimatePresence>

      {/* MODAL CRIAR LEAD */}
      <AnimatePresence>
        {showCreateModal && (
          <NewLeadModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateLead}
            defaultOrigin="Tráfego pago"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FollowupPage;
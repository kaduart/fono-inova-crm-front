// src/pages/FollowupPage.tsx - VERSÃO COMPLETA
import { Paper, Typography, useTheme } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
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
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

// Componentes
import FollowupComposer from "../components/Dashboard/FollowupComposer";
import FollowupConversionChart from "../components/Dashboard/FollowupConversionChart";
import { FollowupFilters } from "../components/Dashboard/FollowupFilters";
import FollowupInsights from "../components/Dashboard/FollowupInsights";
import FollowupStats from "../components/Dashboard/FollowupStats";
import FollowupTrendChart from "../components/Dashboard/FollowupTrendChart";
import MarketingDashboard from "../components/Dashboard/MarketingDashboard";
import FollowupTimelineItem from "../components/FollowupTimelineItem";

// Hooks customizados
import { useFollowupAnalytics } from "../hooks/useFollowupAnalytics";
import { useLeads } from "../hooks/useLeads";

// UI Components
import { Button } from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import API from "../services/api";

const FollowupPage = () => {
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");
  const [followups, setFollowups] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const theme = useTheme();

  // 🎯 Hooks customizados
  const {
    leads,
    loading: leadsLoading,
    error: leadsError,
    createLead,
    updateLeadStatus,
    refetch: refetchLeads
  } = useLeads({ search });

  const {
    data: analyticsData,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useFollowupAnalytics();

  // 🎯 Funções de Timeline
  const fetchLeadFollowups = useCallback(async (leadId: string) => {
    try {
      setLoadingTimeline(true);
      const res = await API.get(`/followups`, { params: { lead: leadId } });
      setFollowups(res.data.data || res.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar follow-ups");
      console.error("Erro:", error);
    } finally {
      setLoadingTimeline(false);
    }
  }, []);

  const resendFollowup = async (id: string) => {
    try {
      await API.post(`/followups/resend/${id}`);
      toast.success("Follow-up reenviado para fila!");
      if (selectedLead?._id) fetchLeadFollowups(selectedLead._id);
    } catch (error: any) {
      toast.error("Erro ao reenviar follow-up");
    }
  };

  // 🎯 Funções principais
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchLeads(), refetchAnalytics()]);
      if (showTimelineModal && selectedLead?._id) {
        await fetchLeadFollowups(selectedLead._id);
      }
      toast.success("Dados atualizados!");
    } catch (error) {
      toast.error("Erro ao atualizar dados");
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  }, [refetchLeads, refetchAnalytics, showTimelineModal, selectedLead, fetchLeadFollowups]);

  const openLeadTimeline = useCallback(async (lead: any) => {
    setSelectedLead(lead);
    setShowTimelineModal(true);
    await fetchLeadFollowups(lead._id);
  }, [fetchLeadFollowups]);

  const closeTimelineModal = useCallback(() => {
    setShowTimelineModal(false);
    setSelectedLead(null);
    setFollowups([]);
  }, []);

  const handleCreateLead = useCallback(async (leadData: any) => {
    try {
      await createLead(leadData);
      setShowCreateModal(false);
      toast.success("Lead criado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar lead");
    }
  }, [createLead]);

  const handleStatusUpdate = async (leadId: string, newStatus: string) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      toast.success("Status atualizado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status");
    }
  };

  const handleFilter = async (filters: any) => {
    try {
      const res = await API.get("/followups/filter", { params: filters });
      const uniqueLeads = Array.from(
        new Map(res.data.data.map((f: any) => [f.lead._id, f.lead])).values()
      );
      // Aqui você precisaria atualizar o estado de leads
      // Em produção, isso seria integrado com o hook useLeads
      console.log("Leads filtrados:", uniqueLeads);
    } catch (error: any) {
      toast.error("Erro ao filtrar follow-ups");
    }
  };

  // 🎯 Efeitos
  useEffect(() => {
    refetchLeads();
    refetchAnalytics();
  }, [search, refetchLeads, refetchAnalytics]);

  // Realtime para aba ativa
  useEffect(() => {
    if (activeTab === "timeline") {
      const interval = setInterval(() => {
        refetchLeads();
        refetchAnalytics();
        if (showTimelineModal && selectedLead?._id) {
          fetchLeadFollowups(selectedLead._id);
        }
      }, 30000); // 30 segundos
      return () => clearInterval(interval);
    }
  }, [activeTab, refetchLeads, refetchAnalytics, showTimelineModal, selectedLead, fetchLeadFollowups]);

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
                  <th className="p-4 font-semibold text-slate-700 text-left">Status</th>
                  <th className="p-4 font-semibold text-slate-700 text-left">Contato</th>
                  <th className="p-4 font-semibold text-slate-700 text-center">Timeline</th>
                </tr>
              </thead>
              <tbody>
                {leadsLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="p-4">
                        <Skeleton className="h-4 w-40 rounded" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-24 rounded" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-20 rounded" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-28 rounded" />
                      </td>
                      <td className="p-4 text-center">
                        <Skeleton className="h-8 w-24 rounded mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead._id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4 font-medium text-slate-800">{lead.name}</td>
                      <td className="p-4 text-slate-600">{lead.origin}</td>
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
                          {showTimelineModal && selectedLead?._id === lead._id
                            ? "Aberto"
                            : "Abrir Timeline"}
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
                <p className="text-slate-400 text-xs mt-1">
                  Tente ajustar os filtros ou criar um novo lead
                </p>
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
      </Tabs>

      {/* MODAL TIMELINE */}
      <AnimatePresence>
        {showTimelineModal && selectedLead && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col"
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {/* CABEÇALHO DO MODAL */}
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-white flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Timeline de {selectedLead.name}
                  </h2>
                  <button
                    onClick={closeTimelineModal}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="text-emerald-100 text-sm mt-1">
                  Histórico completo de interações
                </p>
              </div>

              {/* CONTEÚDO DO MODAL */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingTimeline ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="pl-4 border-l-2 border-slate-200">
                        <Skeleton className="h-3 w-24 mb-2 rounded" />
                        <Skeleton className="h-4 w-64 rounded" />
                      </div>
                    ))}
                  </div>
                ) : followups.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle size={48} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">
                      Nenhum follow-up encontrado.
                    </p>
                  </div>
                ) : (
                  <ol className="relative border-l-2 border-emerald-200 pl-4 space-y-6">
                    {followups.map((fu) => (
                      <FollowupTimelineItem
                        key={fu._id}
                        fu={fu}
                        onResend={resendFollowup}
                      />
                    ))}
                  </ol>
                )}

                {selectedLead?._id && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <FollowupComposer
                      lead={selectedLead}
                      onCreated={() => {
                        fetchLeadFollowups(selectedLead._id);
                        refetchLeads();
                      }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CRIAR LEAD (simplificado - você já tem o componente completo) */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Criar Novo Lead</h3>
              <p className="text-slate-600 mb-4">
                Modal de criação de lead será implementado aqui
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-200 text-slate-800"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-emerald-600 text-white"
                >
                  Criar
                </Button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FollowupPage;
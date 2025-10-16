// src/pages/FollowupPage.tsx
import { Paper, Typography, useTheme } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, RefreshCw, X, Search, BarChart3, TrendingUp, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import FollowupAvgTimeCard from "../components/Dashboard/FollowupAvgTimeCard";
import FollowupComposer from "../components/Dashboard/FollowupComposer";
import FollowupConversionChart from "../components/Dashboard/FollowupConversionChart";
import { FollowupFilters } from "../components/Dashboard/FollowupFilters";
import FollowupInsights from "../components/Dashboard/FollowupInsights";
import FollowupStats from "../components/Dashboard/FollowupStats";
import FollowupTrendChart from "../components/Dashboard/FollowupTrendChart";
import MarketingDashboard from "../components/Dashboard/MarketingDashboard";
import FollowupTimelineItem from "../components/FollowupTimelineItem";
import { Button } from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import API from "../services/api";

const FollowupPage = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [followups, setFollowups] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const theme = useTheme();

  /** ======================
   * FETCHERS
   * ====================== */

  const fetchStats = async () => {
    try {
      const res = await API.get("/followups/stats");
      setStats(res.data.data);
    } catch {
      toast.error("Erro ao carregar estatísticas");
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await API.get("/leads", { params: { search } });
      setLeads(res.data.data || []);
    } catch {
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadFollowups = async (leadId: string) => {
    try {
      setLoadingTimeline(true);
      const res = await API.get(`/followups`, { params: { lead: leadId } });
      setFollowups(res.data.data || res.data || []);
    } catch {
      toast.error("Erro ao carregar follow-ups");
    } finally {
      setLoadingTimeline(false);
    }
  };

  /** ======================
   * EVENT HANDLERS
   * ====================== */

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLeads(), fetchStats()]);
    if (showModal && selectedLead?._id) await fetchLeadFollowups(selectedLead._id);
    setTimeout(() => setRefreshing(false), 600);
  };

  const openLeadTimeline = (lead: any) => {
    setSelectedLead(lead);
    setShowModal(true);
    fetchLeadFollowups(lead._id);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLead(null);
    setFollowups([]);
  };

  const resendFollowup = async (id: string) => {
    try {
      await API.post(`/followups/resend/${id}`);
      toast.success("Follow-up reenviado para fila!");
      if (selectedLead?._id) fetchLeadFollowups(selectedLead._id);
    } catch {
      toast.error("Erro ao reenviar follow-up");
    }
  };

  const handleFilter = async (filters: any) => {
    try {
      const res = await API.get("/followups/filter", { params: filters });
      const uniqueLeads = Array.from(
        new Map(res.data.data.map((f: any) => [f.lead._id, f.lead])).values()
      );
      setLeads(uniqueLeads);
    } catch {
      toast.error("Erro ao filtrar follow-ups");
    }
  };

  /** ======================
   * EFFECTS
   * ====================== */

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [search]);

  // Realtime simples (atualiza a cada 15s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeads();
      fetchStats();
      if (showModal && selectedLead?._id) fetchLeadFollowups(selectedLead._id);
    }, 15000);
    return () => clearInterval(interval);
  }, [showModal, selectedLead]);

  /** ======================
   * RENDER
   * ====================== */

  return (
    <div className="min-h-screen bg-slate-50/30 p-6">
      {/* CABEÇALHO ELEGANTE */}
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
                                    <div className="p-2 bg-primary/10 rounded-lg">

              <Megaphone size={28} className="text-emerald-600" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" color="grey.800" className="mb-1">
                Gestão de Leads
              </Typography>
              <Typography variant="body2" color="grey.600" className="max-w-2xl">
                Gerencie seus leads, campanhas e automações de atendimento com clareza e eficiência.
              </Typography>
            </div>
          </div>
          
          <Button
            onClick={handleRefresh}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            Atualizar
          </Button>
        </div>
      </Paper>

      {/* ESTATÍSTICAS */}
      {stats ? (
        <FollowupStats data={stats} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-200 h-24 rounded-xl"></div>
          ))}
        </div>
      )}

      {/* TABS ELEGANTES */}
      <Tabs defaultValue="timeline">
        <TabsList className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 flex gap-1 p-1.5">
          <TabsTrigger
            value="timeline"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
          >
            <MessageCircle size={16} />
            Timeline
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
          >
            <BarChart3 size={16} />
            Insights
          </TabsTrigger>
          <TabsTrigger
            value="marketing"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
          >
            <TrendingUp size={16} />
            Marketing
          </TabsTrigger>
        </TabsList>

        {/* ================================== */}
        {/* 📋 ABA TIMELINE */}
        {/* ================================== */}
        <TabsContent value="timeline" className="space-y-6">
          <FollowupFilters onFilter={handleFilter} />

          {/* BARRA DE BUSCA ELEGANTE */}
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
                onClick={fetchLeads}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Search size={16} />
                Buscar
              </button>
            </div>
          </div>

          {/* TABELA ELEGANTE */}
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
                {loading ? (
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          lead.status === 'ativo' ? 'bg-emerald-100 text-emerald-800' :
                          lead.status === 'inativo' ? 'bg-slate-100 text-slate-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {lead.status}
                        </span>
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
                          disabled={showModal && selectedLead?._id === lead._id}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                            showModal && selectedLead?._id === lead._id
                              ? "bg-slate-100 text-slate-600 cursor-not-allowed"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl"
                          }`}
                        >
                          {showModal && selectedLead?._id === lead._id
                            ? "Aberto"
                            : "Abrir Timeline"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ================================== */}
        {/* 📈 ABA INSIGHTS */}
        {/* ================================== */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <FollowupInsights />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FollowupTrendChart />
              <FollowupConversionChart />
            </div>
            <FollowupAvgTimeCard />
          </div>
        </TabsContent>

        {/* ================================== */}
        {/* 📊 ABA MARKETING DASHBOARD */}
        {/* ================================== */}
        <TabsContent value="marketing">
          <div className="space-y-6">
            <MarketingDashboard />
          </div>
        </TabsContent>
      </Tabs>

      {/* ===================== */}
      {/* MODAL TIMELINE ELEGANTE */}
      {/* ===================== */}
      <AnimatePresence>
        {showModal && selectedLead && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden border border-slate-200"
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {/* CABEÇALHO DO MODAL */}
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Timeline de {selectedLead.name}
                  </h2>
                  <button
                    onClick={closeModal}
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
              <div className="max-h-[60vh] overflow-y-auto p-6">
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
                      onCreated={() => fetchLeadFollowups(selectedLead._id)}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FollowupPage;
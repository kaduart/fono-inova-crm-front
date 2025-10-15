// src/pages/FollowupPage.tsx
import { Paper, Typography, useTheme } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, RefreshCw, Users, X } from "lucide-react";
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
    <div className="container mx-auto p-4">
     <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
      }}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Ícone e título */}
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'rgba(55,171,135,0.15)' }}
          >
            <Megaphone size={24} style={{ color: '#00C087' }} />
          </div>

          <div>
            <Typography variant="h4" fontWeight="bold" color="grey.800">
              Leads e Marketing
            </Typography>
            <Typography variant="body2" color="grey.600">
              Gerencie seus leads, campanhas e automações de atendimento com clareza e eficiência.
            </Typography>
          </div>
        </div>
      </div>
    </Paper>


      {/* Painel de Estatísticas */}
      {
        stats ? (
          <FollowupStats data={stats} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-gray-200 h-20 rounded-lg"
              ></div>
            ))}
          </div>
        )
      }

      {/* Tabs principais */}
      <Tabs defaultValue="timeline">
        <TabsList className="bg-white rounded-lg shadow mb-6 flex gap-4 p-2">
          <TabsTrigger
            value="timeline"
            className="px-4 py-2 rounded-md text-sm font-medium"
          >
            📋 Timeline
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="px-4 py-2 rounded-md text-sm font-medium"
          >
            📈 Insights
          </TabsTrigger>
          <TabsTrigger
            value="marketing"
            className="px-4 py-2 rounded-md text-sm font-medium"
          >
            📊 Marketing
          </TabsTrigger>

        </TabsList>

        {/* ================================== */}
        {/* 📋 ABA TIMELINE */}
        {/* ================================== */}
        <TabsContent value="timeline">
          <div className="flex justify-end mb-4">
            <Button
              onClick={handleRefresh}
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded flex items-center gap-2 text-sm shadow-sm"
            >
              <RefreshCw
                size={14}
                className={`${refreshing ? "animate-spin" : ""}`}
              />{" "}
              Atualizar agora
            </Button>
          </div>

          <FollowupFilters onFilter={handleFilter} />

          <div className="bg-white p-4 rounded shadow mb-6 flex justify-between items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="border p-2 rounded w-full mr-4 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
            <button
              onClick={fetchLeads}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <RefreshCw size={16} /> Buscar
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-blue-50 text-left">
                  <th className="p-3 font-semibold text-blue-700">Nome</th>
                  <th className="p-3 font-semibold text-blue-700">Origem</th>
                  <th className="p-3 font-semibold text-blue-700">Status</th>
                  <th className="p-3 font-semibold text-blue-700">Contato</th>
                  <th className="p-3 font-semibold text-blue-700 text-center">
                    Timeline
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      <td className="p-3">
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="p-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="p-3">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="p-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="p-3 text-center">
                        <Skeleton className="h-8 w-24 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead._id}
                      className="border-b hover:bg-blue-50 transition"
                    >
                      <td className="p-3">{lead.name}</td>
                      <td className="p-3">{lead.origin}</td>
                      <td className="p-3 capitalize">{lead.status}</td>
                      <td className="p-3">
                        {lead.contact?.phone ? (
                          <a
                            href={`https://wa.me/${lead.contact.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:underline"
                          >
                            {lead.contact.phone}
                          </a>
                        ) : (
                          lead.contact?.email || "-"
                        )}
                      </td>
                      <td className="text-center p-3">
                        <Button
                          onClick={() => openLeadTimeline(lead)}
                          disabled={
                            showModal && selectedLead?._id === lead._id
                          }
                          className={`px-3 py-1 rounded text-sm transition ${showModal && selectedLead?._id === lead._id
                            ? "bg-blue-200 text-blue-800 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
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
            {/* KPIs principais */}
            <FollowupInsights />

            {/* Gráficos principais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FollowupTrendChart />
              <FollowupConversionChart />
            </div>

            {/* Tempo médio de resposta */}
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
      {/* MODAL TIMELINE */}
      {/* ===================== */}
      <AnimatePresence>
        {showModal && selectedLead && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md relative overflow-y-auto max-h-[90vh]"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={closeModal}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-800"
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Timeline de {selectedLead.name}
              </h2>

              {loadingTimeline ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="pl-3 border-l border-blue-200">
                      <Skeleton className="h-3 w-24 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  ))}
                </div>
              ) : followups.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  Nenhum follow-up encontrado.
                </p>
              ) : (
                <ol className="relative border-l border-blue-200 pl-3">
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
                <div className="mt-6">
                  <FollowupComposer
                    lead={selectedLead}
                    onCreated={() => fetchLeadFollowups(selectedLead._id)}
                  />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default FollowupPage;

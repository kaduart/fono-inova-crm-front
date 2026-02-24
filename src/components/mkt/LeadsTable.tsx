// src/components/mkt/LeadsTable.tsx
import { Mail, MessageCircle, Phone } from "lucide-react";
import React from "react";
import { Button } from "../ui/Button";
import Skeleton from "../ui/Skeleton";

interface LeadTableProps {
    leads: any[];
    loading: boolean;
    onOpenTimeline: (lead: any) => void;
    onStatusUpdate: (leadId: string, status: string) => void;
    selectedLeadId?: string;
    showModal: boolean;
}

const LeadTable: React.FC<LeadTableProps> = ({
    leads,
    loading,
    onOpenTimeline,
    onStatusUpdate,
    selectedLeadId,
    showModal,
}) => {
    const getStatusColor = (status: string) => {
        const colors = {
            novo: "bg-blue-100 text-blue-800 border-blue-200",
            em_andamento: "bg-yellow-100 text-yellow-800 border-yellow-200",
            atendimento: "bg-purple-100 text-purple-800 border-purple-200",
            virou_paciente: "bg-green-100 text-green-800 border-green-200",
            lead_frio: "bg-gray-100 text-gray-800 border-gray-200",
            perdido: "bg-red-100 text-red-800 border-red-200"
        };
        return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 font-semibold text-slate-700 text-left">Nome</th>
                            <th className="p-4 font-semibold text-slate-700 text-left">Origem</th>
                            <th className="p-4 font-semibold text-slate-700 text-left">Status</th>
                            <th className="p-4 font-semibold text-slate-700 text-left">Contato</th>
                            <th className="p-4 font-semibold text-slate-700 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(6)].map((_, i) => (
                            <tr key={i} className="border-b border-slate-100 last:border-0">
                                <td className="p-4">
                                    <Skeleton className="h-4 w-40 rounded" />
                                </td>
                                <td className="p-4">
                                    <Skeleton className="h-4 w-24 rounded" />
                                </td>
                                <td className="p-4">
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </td>
                                <td className="p-4">
                                    <Skeleton className="h-4 w-28 rounded" />
                                </td>
                                <td className="p-4 text-center">
                                    <Skeleton className="h-8 w-24 rounded-xl mx-auto" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 font-semibold text-slate-700 text-left">Nome</th>
                        <th className="p-4 font-semibold text-slate-700 text-left">Origem</th>
                        <th className="p-4 font-semibold text-slate-700 text-left">Status</th>
                        <th className="p-4 font-semibold text-slate-700 text-left">Contato</th>
                        <th className="p-4 font-semibold text-slate-700 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map((lead) => (
                        <tr
                            key={lead._id}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                        >
                            <td className="p-4">
                                <div className="font-medium text-slate-800">{lead.name}</div>
                                {lead.appointment?.seekingFor && (
                                    <div className="text-xs text-slate-500 mt-1">
                                        {lead.appointment.seekingFor}
                                    </div>
                                )}
                            </td>

                            <td className="p-4">
                                <span className="text-slate-600 text-sm">{lead.origin}</span>
                            </td>

                            <td className="p-4">
                                <select
                                    value={lead.status}
                                    onChange={(e) => onStatusUpdate(lead._id, e.target.value)}
                                    className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${getStatusColor(lead.status)} focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                                >
                                    <option value="novo">Novo</option>
                                    <option value="em_andamento">Em Andamento</option>
                                    <option value="atendimento">Em Atendimento</option>
                                    <option value="virou_paciente">Virou Paciente</option>
                                    <option value="lead_frio">Lead Frio</option>
                                    <option value="perdido">Perdido</option>
                                </select>
                            </td>

                            <td className="p-4">
                                <div className="space-y-1">
                                    {lead.contact?.phone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone size={14} className="text-slate-400" />
                                            <a
                                                href={`https://wa.me/${lead.contact.phone.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                                            >
                                                {lead.contact.phone}
                                            </a>
                                        </div>
                                    )}
                                    {lead.contact?.email && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail size={14} className="text-slate-400" />
                                            <span className="text-slate-600">{lead.contact.email}</span>
                                        </div>
                                    )}
                                </div>
                            </td>

                            <td className="text-center p-4">
                                <Button
                                    onClick={() => onOpenTimeline(lead)}
                                    disabled={showModal && selectedLeadId === lead._id}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 mx-auto ${showModal && selectedLeadId === lead._id
                                            ? "bg-slate-100 text-slate-600 cursor-not-allowed"
                                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl"
                                        }`}
                                >
                                    <MessageCircle size={16} />
                                    {showModal && selectedLeadId === lead._id
                                        ? "Aberto"
                                        : "Timeline"}
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>

            {leads.length === 0 && !loading && (
                <div className="text-center py-8">
                    <MessageCircle size={48} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Nenhum lead encontrado</p>
                    <p className="text-slate-400 text-xs mt-1">
                        Tente ajustar os filtros ou criar um novo lead
                    </p>
                </div>
            )}
        </div>
    );
};

export default LeadTable;
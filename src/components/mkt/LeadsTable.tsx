import { Modal } from "@mui/material";
import axios from "axios";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "../ui/Button";
import { LeadAmandaModal } from "./whatsapp/LeadAmandaModal";

export const LeadsTable = ({ leads, onRefresh }) => {
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [draft, setDraft] = useState("");
    const [reason, setReason] = useState("reengajamento");
    const [campaign, setCampaign] = useState("");
    const [loading, setLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [showAmanda, setShowAmanda] = useState(false);



    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Origem</th>
                        <th>Status</th>
                        <th className="text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map((lead) => (
                        <tr key={lead._id}>
                            <td>{lead.name}</td>
                            <td>{lead.origin}</td>
                            <td>{lead.status}</td>
                            <td className="text-right space-x-2">
                                {/* Botões padrão */}
                                <Button size="sm" onClick={() => handleEdit(lead)}>
                                    Editar
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => handleDelete(lead)}>
                                    Excluir
                                </Button>

                                {/* Novo botão Amanda 💚 */}
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        setSelectedLead(lead);
                                        setShowAmanda(true);
                                    }}
                                >
                                    💚 Amanda (IA)
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Modal da Amanda */}
            <LeadAmandaModal
                lead={selectedLead}
                open={showAmanda}
                onClose={() => setShowAmanda(false)}
                onSent={onRefresh}
            />
        </div>
    );

};

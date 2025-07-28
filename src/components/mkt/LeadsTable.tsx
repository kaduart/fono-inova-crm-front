import { useEffect, useState } from 'react';
import { deleteLead, getLeads, getLeadSummary } from '../../services/leadService';
import { exportLeadsToCSV } from '../../utils/exportToCSV';
import { LeadFormModal } from './LeadFormModal';

export function LeadsTable() {
    const [leads, setLeads] = useState([]);
    const [filters, setFilters] = useState({ status: '', origin: '' });
    const [summary, setSummary] = useState({ byStatus: [], byOrigin: [] });
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => {
        loadLeads();
        loadSummary();
    }, [filters]);

    const loadLeads = async () => {
        const res = await getLeads(filters);
        setLeads(res.data);
    };

    const loadSummary = async () => {
        const res = await getLeadSummary();
        setSummary(res.data);


        const handleDelete = async (id: string) => {
            await deleteLead(id);
            loadLeads();
            loadSummary();
        };

        const handleExport = () => {
            // Adapte os dados para conter somente os campos desejados
            const formattedLeads = leads.map((lead: any) => ({
                nome: lead.name,
                contato: lead.contact?.email || lead.contact?.phone || '',
                origem: lead.origin,
                status: lead.status,
            }));

            exportLeadsToCSV(formattedLeads);
        };


        return (
            <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Leads</h2>
                    <button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-blue-600 text-white px-3 py-1 rounded">
                        Novo Lead
                    </button>
                    <button onClick={handleExport} className="bg-green-600 text-white px-3 py-1 rounded">
                        Exportar CSV
                    </button>
                </div>

                {/* Filtros */}
                <div className="flex gap-4 mb-4">
                    <select onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} value={filters.status}>
                        <option value="">Todos Status</option>
                        <option value="novo">Novo</option>
                        <option value="atendimento">Em Atendimento</option>
                        <option value="convertido">Convertido</option>
                        <option value="perdido">Perdido</option>
                    </select>

                    <select onChange={e => setFilters(f => ({ ...f, origin: e.target.value }))} value={filters.origin}>
                        <option value="">Todas Origens</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Site">Site</option>
                        <option value="Indicação">Indicação</option>
                        <option value="Outro">Outro</option>
                    </select>
                </div>

                {/* Resumo */}
                <div className="flex gap-8 mb-4">
                    {summary.byStatus.map(s => (
                        <div key={s._id} className="p-3 bg-gray-100 rounded">
                            <p className="text-sm">{s._id}</p>
                            <p className="font-bold">{s.count}</p>
                        </div>
                    ))}
                </div>

                {/* Tabela */}
                <table className="w-full table-auto border">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Contato</th>
                            <th>Origem</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.map((lead: any) => (
                            <tr key={lead._id}>
                                <td>{lead.name}</td>
                                <td>{lead.contact.email || lead.contact.phone}</td>
                                <td>{lead.origin}</td>
                                <td>{lead.status}</td>
                                <td className="flex gap-2">
                                    <button onClick={() => { setEditing(lead); setModalOpen(true); }} className="text-blue-600">Editar</button>
                                    <button onClick={() => handleDelete(lead._id)} className="text-red-600">Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <LeadFormModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onSave={() => { setModalOpen(false); loadLeads(); loadSummary(); }}
                    editing={editing}
                />
            </div>
        );
    }
}
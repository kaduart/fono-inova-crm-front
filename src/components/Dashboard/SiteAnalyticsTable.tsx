import React from 'react';
import { translateAction } from '../../utils/types/types';
import { toast } from 'react-toastify';
import api from '@/services/api';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';

interface SiteAnalyticsTableProps {
    data: any[];
}

const SiteAnalyticsTable: React.FC<SiteAnalyticsTableProps> = ({ data }) => {
    const handleCreateLead = async (event: any) => {
        try {
            const payload = {
                name: event.userName || 'Visitante do Site',
                origin: 'Site',
                status: 'novo',
                contact: {
                    email: event.userEmail || '',
                    phone: event.userPhone || '',
                },
                notes: `Evento GA4: ${translateAction(event.action)} | Página: ${event.pageTitle || '-'}`
            };

            await api.post('/leads', payload);
            toast.success('✅ Lead criado com sucesso!');
        } catch (err) {
            toast.error('❌ Erro ao criar lead');
            console.error(err);
        }
    };

    // Função auxiliar para determinar se um evento é conversão
    const isConversionEvent = (action: string) => {
        const conversionActions = ['click_whatsapp', 'form_submit', 'contact_button_click', 'agendar_avaliacao'];
        return conversionActions.includes(action);
    };

    return (
        <div className="overflow-x-auto shadow rounded-lg">
            <table className="w-full table-auto border-collapse">
                <thead>
                    <tr className="bg-blue-50 text-left">
                        <th className="p-3 font-semibold text-blue-700">Evento</th>
                        <th className="p-3 font-semibold text-blue-700">Categoria</th>
                        <th className="p-3 font-semibold text-blue-700">Descrição</th>
                        <th className="p-3 font-semibold text-blue-700">Data / Hora</th>
                        <th className="p-3 font-semibold text-blue-700 text-center">Valor</th>
                        <th className="p-3 font-semibold text-blue-700 text-center">Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((e, i) => (
                        <tr
                            key={i}
                            className="border-b hover:bg-blue-50 transition-colors duration-150"
                        >
                            <td className="p-3 text-gray-800 capitalize">{translateAction(e.action)}</td>
                            <td className="p-3 text-gray-800 capitalize">{e.category || '-'}</td>
                            <td className="p-3 text-gray-800">{e.label || '-'}</td>
                            <td className="p-3 text-gray-800">
                                {new Date(e.timestamp).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </td>
                            <td className="p-3 text-center text-gray-800">{e.value ?? 1}</td>

                            {/* 🚀 Nova coluna com botão de ação */}
                            <td className="p-3 text-center">
                                {isConversionEvent(e.action) ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCreateLead(e)}
                                    >
                                        Criar Lead
                                    </Button>
                                ) : (
                                    <span className="text-gray-400">—</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SiteAnalyticsTable;

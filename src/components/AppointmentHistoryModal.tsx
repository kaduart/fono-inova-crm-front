import { CalendarClock, CalendarX, ChevronDown, ChevronUp } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { getStatusColor } from '../utils/statusHelper';
import { Modal } from './ui/Modal';
import { ModalHeader } from '../pages/Financial/components/formKit';

interface AppointmentHistoryModalProps {
    open: boolean;
    onClose: () => void;
    appointments: Array<{
        _id: string;
        date: string;
        time: string;
        doctor: { fullName: string };
        specialty: string;
        operationalStatus: string;
        payment?: { serviceType: string };
    }>;
}

const AppointmentHistoryModal: React.FC<AppointmentHistoryModalProps> = ({
    open,
    onClose,
    appointments
}) => {
    // Estado para controlar a ordenação
    const [sortConfig, setSortConfig] = useState<{
        key: 'date';
        direction: 'asc' | 'desc';
    }>({ key: 'date', direction: 'desc' });

    // Função para alternar a ordenação
    const handleSort = () => {
        setSortConfig(prev => ({
            key: 'date',
            direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Ordenar os agendamentos
    const sortedAppointments = useMemo(() => {
        const sortableAppointments = [...appointments];
        sortableAppointments.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();

            if (sortConfig.direction === 'asc') {
                return dateA - dateB;
            }
            return dateB - dateA;
        });
        return sortableAppointments;
    }, [appointments, sortConfig]);

    const SERVICE: Record<string, string> = {
        evaluation: 'Avaliação',
        session: 'Sessão',
        package: 'Pacote',
        individual_session: 'Sessão avulsa',
    };
    const th = 'sticky top-0 bg-white px-4 py-3 text-left text-xs font-semibold text-gray-500';

    return (
        <Modal
            open={open}
            onClose={onClose}
            labelledBy="appt-history-title"
            zIndexClass="z-[1300]"
            panelClassName="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px]"
        >
            <ModalHeader
                icon={<CalendarClock className="w-6 h-6" />}
                color="#059669"
                title="Histórico de agendamentos"
                subtitle={`${sortedAppointments.length} ${sortedAppointments.length === 1 ? 'agendamento' : 'agendamentos'}`}
                onClose={onClose}
                titleId="appt-history-title"
            />

            {sortedAppointments.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-14 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                        <CalendarX className="h-7 w-7" />
                    </div>
                    <p className="text-base font-semibold text-gray-800">Nenhum agendamento registrado</p>
                    <p className="mt-1 max-w-sm text-sm text-gray-500">Quando houver agendamentos, eles aparecem aqui, do mais recente ao mais antigo.</p>
                </div>
            ) : (
                <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className={th} aria-sort={sortConfig.direction === 'asc' ? 'ascending' : 'descending'}>
                                    <button type="button" onClick={handleSort} className="inline-flex min-h-11 items-center gap-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                                        Data
                                        {sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </th>
                                <th className={th}>Hora</th>
                                <th className={th}>Profissional</th>
                                <th className={th}>Especialidade</th>
                                <th className={th}>Serviço</th>
                                <th className={`${th} text-center`}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAppointments.map((appt) => {
                                const color = getStatusColor(appt.operationalStatus as Parameters<typeof getStatusColor>[0]);
                                return (
                                    <tr key={appt._id} className="border-b border-gray-50 transition-colors duration-quick hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium tabular-nums text-gray-900">{new Date(appt.date).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-3 tabular-nums text-gray-700">{appt.time}</td>
                                        <td className="px-4 py-3 text-gray-700">{appt?.doctor?.fullName}</td>
                                        <td className="px-4 py-3 capitalize text-gray-500">{appt.specialty}</td>
                                        <td className="px-4 py-3 text-gray-500">{SERVICE[appt?.payment?.serviceType?.toLowerCase()?.trim() ?? ''] || 'Desconhecido'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className="inline-block min-w-[90px] rounded-full px-3 py-1 text-xs font-semibold"
                                                style={{ color, backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)` }}
                                            >
                                                {appt.operationalStatus}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex items-center justify-end border-t border-gray-100 px-5 py-4 sm:px-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="min-h-11 rounded-xl px-5 text-sm font-semibold text-gray-700 transition-colors duration-quick hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                    Fechar
                </button>
            </div>
        </Modal>
    );
};

export default AppointmentHistoryModal;

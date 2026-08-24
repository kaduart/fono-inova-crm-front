// pages/appointments/AppointmentsPage.tsx
// 🚀 Tela de Appointments com integração V2 real (React Query)

import React, { useEffect, useState } from 'react';
import { useAppointments } from '../../hooks/useAppointments';
import { useAppointmentsByType } from '../../hooks/useAppointmentsByType';
import { PollingIndicator, StatusBadge } from '../../components/appointments/PollingIndicator';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MoreVertical,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Search,
  Loader2,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { getStatusConfig, canComplete, canCancel } from '../../utils/appointmentStatus';
import { extractErrorMessage } from '../../utils/errorUtils';

export default function AppointmentsPage() {
  const {
    appointments,
    loading: isLoading,
    error,
    pollingState,
    isPolling,
    cancelPolling,
    fetchAppointments: refetch,
    completeAppointment,
    cancelAppointment,
    completing: isCompleting,
    canceling: isCanceling
  } = useAppointments();

  const { data: todayAnalytics, loading: analyticsLoading, fetchToday } = useAppointmentsByType();

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Estados para modal de completar
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [addToBalance, setAddToBalance] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceDescription, setBalanceDescription] = useState('');

  // Filtrar appointments
  const filteredAppointments = (appointments || []).filter(apt => {
    const matchesSearch = apt.patient?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.doctor?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || apt.operationalStatus === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Handler para abrir modal de completar
  const openCompleteModal = (appointment: any) => {
    setSelectedAppointment(appointment);
    setAddToBalance(false);
    setBalanceAmount('');
    setBalanceDescription('');
    setCompleteModalOpen(true);
  };

  // Handler para confirmar completar
  const handleConfirmComplete = async () => {
    if (!selectedAppointment) return;
    
    setCompleteModalOpen(false);
    
    const data: any = {};
    if (addToBalance && balanceAmount) {
      data.addToBalance = true;
      data.balanceAmount = parseFloat(balanceAmount);
      data.balanceDescription = balanceDescription || 'Saldo para próxima sessão';
    }
    
    await completeAppointment(selectedAppointment._id, data, {
      onSuccess: () => {
        setSelectedAppointment(null);
      },
      onError: (err: any) => {
        const msg = extractErrorMessage(err, 'Erro ao completar agendamento');
        alert(`Erro: ${msg}`);
      }
    });
  };

  // Handler para cancelar
  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    
    await cancelAppointment(id, { reason: 'Cancelado pelo usuário' }, {
      onError: (err: any) => {
        alert(`Erro ao cancelar: ${extractErrorMessage(err, 'Erro ao cancelar agendamento')}`);
      }
    });
  };

  // Verificar se está processando
  const isProcessing = (id: string) => {
    return isCompleting || isCanceling || isPolling(id);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agendamentos V2</h1>
            <p className="text-gray-500 mt-1">
              Gerencie suas consultas e sessões (Event-Driven)
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar paciente ou profissional..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos os status</option>
                <option value="scheduled">Agendado</option>
                <option value="confirmed">Confirmado</option>
                <option value="completed">Concluído</option>
                <option value="canceled">Cancelado</option>
              </select>
              <button 
                onClick={() => refetch()}
                disabled={isLoading}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: appointments.length, color: 'bg-blue-500' },
            { label: 'Hoje', value: appointments.filter((a: any) => a.date === new Date().toISOString().split('T')[0]).length, color: 'bg-green-500' },
            { label: 'Confirmados', value: appointments.filter((a: any) => a.operationalStatus === 'confirmed').length, color: 'bg-purple-500' },
            { label: 'Pendentes', value: appointments.filter((a: any) => a.operationalStatus === 'scheduled').length, color: 'bg-orange-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-8 ${stat.color} rounded-full`} />
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 🆕 Destaques do dia (analytics) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-pink-50 to-white rounded-xl shadow-sm border border-pink-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-pink-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-pink-700 font-medium">Leads (hoje)</p>
                <p className="text-2xl font-bold text-pink-900">
                  {analyticsLoading ? '-' : (todayAnalytics?.leads?.length ?? 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl shadow-sm border border-emerald-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-emerald-700 font-medium">Novos pacientes (hoje)</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {analyticsLoading ? '-' : (todayAnalytics?.novos?.length ?? 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl shadow-sm border border-amber-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-700 font-medium">Retorno 45+ dias (hoje)</p>
                <p className="text-2xl font-bold text-amber-900">
                  {analyticsLoading ? '-' : (todayAnalytics?.retornos45?.length ?? 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-sm border border-blue-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">Total criados hoje</p>
                <p className="text-2xl font-bold text-blue-900">
                  {analyticsLoading ? '-' : (todayAnalytics?.all?.length ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{(error as any)?.message || 'Erro ao carregar agendamentos'}</p>
            <button 
              onClick={() => refetch()}
              className="mt-2 text-sm text-red-700 underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Appointments List */}
        <div className="space-y-4">
          {filteredAppointments.map((appointment: any) => {
            const statusConfig = getStatusConfig(appointment.operationalStatus);
            const pollingData = pollingState[appointment._id];
            
            return (
              <div
                key={appointment._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-gray-900">
                            {appointment.patient?.fullName || 'Paciente'}
                          </h3>
                          <StatusBadge 
                            status={appointment.operationalStatus}
                            isProcessing={isProcessing(appointment._id)}
                          />
                          {appointment.isFirstVisit && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Novo paciente
                            </span>
                          )}
                          {appointment.isReturningAfter45Days && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                              Retorno 45+ dias
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(appointment.date).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {appointment.time} ({appointment.duration}min)
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {appointment.patient?.phone || '-'}
                          </div>
                          <span className="text-gray-400">|</span>
                          <span>{appointment.doctor?.fullName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Value */}
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      R$ {appointment.sessionValue?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-sm text-gray-500">{statusConfig.description}</p>
                  </div>

                  {/* Polling Indicator */}
                  {pollingData && (
                    <div className="lg:w-48">
                      <PollingIndicator
                        isPolling={pollingData.isPolling}
                        progress={pollingData.progress}
                        error={pollingData.error}
                        onCancel={() => cancelPolling(appointment._id)}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {canComplete(appointment.operationalStatus) && (
                      <button
                        onClick={() => openCompleteModal(appointment)}
                        disabled={isProcessing(appointment._id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Completar
                      </button>
                    )}
                    
                    {canCancel(appointment.operationalStatus) && (
                      <button
                        onClick={() => handleCancel(appointment._id)}
                        disabled={isProcessing(appointment._id)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar
                      </button>
                    )}
                    
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {!isLoading && filteredAppointments.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum agendamento encontrado</p>
          </div>
        )}

        {/* Modal de Completar */}
        {completeModalOpen && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Completar Sessão
              </h2>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">Paciente:</p>
                <p className="font-medium">{selectedAppointment.patient?.fullName}</p>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600">Valor:</p>
                <p className="text-xl font-bold text-gray-900">
                  R$ {selectedAppointment.sessionValue?.toFixed(2) || '0.00'}
                </p>
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToBalance}
                    onChange={(e) => setAddToBalance(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Adicionar saldo para próxima sessão
                  </span>
                </label>
              </div>

              {addToBalance && (
                <div className="space-y-3 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor do saldo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={selectedAppointment.sessionValue}
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={balanceDescription}
                      onChange={(e) => setBalanceDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: Troca de horário"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setCompleteModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmComplete}
                  disabled={isCompleting || (addToBalance && !balanceAmount)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isCompleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

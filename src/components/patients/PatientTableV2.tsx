// src/components/patients/PatientTableV2.tsx
/**
 * PatientTable V2 - Exemplo de listagem CQRS
 * 
 * Features:
 * - Carregamento ultra-rápido (PatientsView)
 * - Search com debounce
 * - UI otimista (mostra pacientes sendo criados)
 * - Indicadores de staleness
 */

import React, { useState } from 'react';
import { usePatientList, usePatientSearch, useDeletePatient } from '../../hooks/usePatientV2';
import { IPatient } from '../../utils/types/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Loader2, 
  Search, 
  Trash2, 
  Edit, 
  Calendar,
  Phone,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';

interface PatientTableV2Props {
  onEdit?: (patient: IPatient) => void;
  onView?: (patient: IPatient) => void;
}

export const PatientTableV2: React.FC<PatientTableV2Props> = ({
  onEdit,
  onView
}) => {
  const [page, setPage] = useState(0);
  const limit = 20;
  
  // Search com debounce
  const { 
    searchTerm, 
    setSearch, 
    results: searchResults, 
    isSearching 
  } = usePatientSearch(300);
  
  // Listagem normal (quando não está buscando)
  const { 
    patients, 
    pagination, 
    meta,
    isLoading, 
    isFetching,
    refetch 
  } = usePatientList({
    limit,
    skip: page * limit,
    enabled: searchTerm.length < 2 // só busca lista quando não está pesquisando
  });
  
  // Delete
  const deleteMutation = useDeletePatient({
    onSuccess: () => {
      // Já invalida cache automaticamente
    }
  });
  
  // Decide qual lista mostrar
  const displayPatients = searchTerm.length >= 2 ? searchResults : patients;
  const isLoadingData = searchTerm.length >= 2 ? isSearching : isLoading;
  
  // Renderiza indicador de performance
  const renderPerformanceIndicator = () => {
    if (!meta?.duration) return null;
    
    const duration = parseInt(meta.duration);
    let color = 'text-green-600';
    let icon = <CheckCircle2 className="w-3 h-3" />;
    
    if (duration > 100) {
      color = 'text-yellow-600';
      icon = <Clock className="w-3 h-3" />;
    }
    if (duration > 300) {
      color = 'text-red-600';
      icon = <AlertCircle className="w-3 h-3" />;
    }
    
    return (
      <span className={`flex items-center gap-1 text-xs ${color}`}>
        {icon}
        {meta.duration}
      </span>
    );
  };
  
  // Renderiza badge de staleness
  const renderStaleBadge = (patient: IPatient & { snapshot?: any }) => {
    if (!patient.snapshot?.isStale) return null;
    
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
        <Clock className="w-3 h-3" />
        Atualizando...
      </span>
    );
  };
  
  // Renderiza badge de status
  const renderStatusBadge = (patient: IPatient & { status?: string }) => {
    const statusColors: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'prospect': 'bg-blue-100 text-blue-800',
      'churned': 'bg-red-100 text-red-800',
      'creating': 'bg-yellow-100 text-yellow-800 animate-pulse'
    };
    
    const status = patient.status || 'active';
    
    return (
      <span className={`inline-flex px-2 py-0.5 text-xs rounded ${statusColors[status] || statusColors.active}`}>
        {status === 'creating' ? 'Criando...' : status}
      </span>
    );
  };
  
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header com search */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-600" />
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {renderPerformanceIndicator()}
          
          {isFetching && !isLoading && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Atualizando...
            </span>
          )}
          
          <button
            onClick={() => refetch()}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Atualizar
          </button>
        </div>
      </div>
      
      {/* Meta info */}
      {meta && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Fonte: {meta.source}</span>
          <span>Total: {pagination?.total || 0}</span>
          {meta.staleCount ? (
            <span className="text-yellow-600">
              {meta.staleCount} sincronizando
            </span>
          ) : null}
        </div>
      )}
      
      {/* Tabela */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Paciente</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Contato</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Próxima Consulta</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {displayPatients.map((patient: any) => (
              <tr 
                key={patient._id || patient.patientId}
                className={`hover:bg-gray-50 ${patient.status === 'creating' ? 'bg-yellow-50/50' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                      {patient.fullName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{patient.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {patient.dateOfBirth && format(new Date(patient.dateOfBirth), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </td>
                
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    {patient.phone && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="w-3 h-3" />
                        <span>{patient.phone}</span>
                      </div>
                    )}
                    {patient.email && (
                      <p className="text-xs text-gray-500">{patient.email}</p>
                    )}
                  </div>
                </td>
                
                <td className="px-4 py-3">
                  {patient.nextAppointment ? (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(new Date(patient.nextAppointment.date), 'dd/MM/yyyy', { locale: ptBR })}
                        {' '}
                        {patient.nextAppointment.time}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {renderStatusBadge(patient)}
                    {renderStaleBadge(patient)}
                  </div>
                </td>
                
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onView?.(patient)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Ver detalhes"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => onEdit?.(patient)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        if (confirm(`Remover ${patient.fullName}?`)) {
                          deleteMutation.deletePatient(patient._id || patient.patientId);
                        }
                      }}
                      disabled={deleteMutation.isDeleting}
                      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                      title="Remover"
                    >
                      {deleteMutation.deletingId === (patient._id || patient.patientId) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Paginação */}
      {searchTerm.length < 2 && pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {page * limit + 1} - {Math.min((page + 1) * limit, pagination.total)} de {pagination.total}
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasMore}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {displayPatients.length === 0 && !isLoadingData && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchTerm.length >= 2 
              ? 'Nenhum paciente encontrado para esta busca'
              : 'Nenhum paciente cadastrado'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default PatientTableV2;

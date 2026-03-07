/**
 * PatientsTab - Lazy Loading
 * 
 * Só carrega lista completa de pacientes quando a aba é ativada.
 * Inclui busca, filtros e paginação.
 */

import { useEffect, useState, useCallback } from 'react';
import { usePatientsContext } from '../../../contexts/PatientsContext';
import { PatientList } from '../../patients/PatientList';
import { PatientSearch } from '../../patients/PatientSearch';
import { Skeleton, Button } from '@mui/material';
import { Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface PatientsTabProps {
    onAddPatient: () => void;
    onEditPatient: (patient: any) => void;
}

export const PatientsTab = ({ onAddPatient, onEditPatient }: PatientsTabProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    
    // 🎯 USA O CONTEXTO GLOBAL DE PACIENTES
    const {
        patients,
        totalPatients,
        loading,
        refreshPatients,
        searchPatients
    } = usePatientsContext();

    // Carrega pacientes na montagem
    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                if (searchTerm) {
                    await searchPatients(searchTerm);
                } else if (patients.length === 0) {
                    await refreshPatients();
                }
            } catch (error) {
                if (mounted) {
                    toast.error('Erro ao carregar pacientes');
                }
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, [page]); // Recarrega quando muda de página

    // Debounce para busca
    const handleSearch = useCallback((term: string) => {
        setSearchTerm(term);
        setPage(1);
        
        if (term.length >= 3) {
            searchPatients(term);
        } else if (term === '') {
            refreshPatients();
        }
    }, [searchPatients, fetchPatients]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        // Pagination com contexto global (dados já carregados)
        setPage(newPage);
    };

    if (loading && patients.length === 0) {
        return <PatientsSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            Pacientes
                        </h2>
                        <p className="text-sm text-gray-500">
                            {totalPatients} pacientes cadastrados
                        </p>
                    </div>
                </div>

                <Button
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    onClick={onAddPatient}
                    sx={{
                        backgroundColor: '#00C087',
                        '&:hover': { backgroundColor: '#00A070' }
                    }}
                >
                    Novo Paciente
                </Button>
            </div>

            {/* Busca */}
            <PatientSearch
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Buscar paciente por nome, CPF ou telefone..."
            />

            {/* Lista */}
            <PatientList
                patients={patients}
                loading={loading}
                onEdit={onEditPatient}
                page={page}
                totalPages={Math.ceil(totalPatients / 20)}
                onPageChange={handlePageChange}
            />
        </div>
    );
};

// Skeleton de loading
const PatientsSkeleton = () => (
    <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={40} height={40} />
                <div>
                    <Skeleton variant="text" width={150} height={28} />
                    <Skeleton variant="text" width={100} height={20} />
                </div>
            </div>
            <Skeleton variant="rectangular" width={140} height={40} sx={{ borderRadius: 1 }} />
        </div>

        {/* Search skeleton */}
        <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />

        {/* List skeleton */}
        <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} variant="rectangular" height={72} sx={{ borderRadius: 1 }} />
            ))}
        </div>
    </div>
);

export default PatientsTab;

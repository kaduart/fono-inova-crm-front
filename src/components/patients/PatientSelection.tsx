
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import patientService from '../../services/patientService';
import { IPatient } from "../../utils/types/types";
import { Input } from "../ui/input";
import { Search } from "lucide-react";

// Hook de debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function PatientSelection() {
    const [patients, setPatients] = useState<IPatient[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const debouncedSearch = useDebounce(searchTerm, 300); // 300ms debounce

    // Busca inicial (primeiros 20)
    useEffect(() => {
        setLoading(true);
        patientService.list({ limit: 20 })
            .then((result) => {
                setPatients(result.patients);
            })
            .finally(() => setLoading(false));
    }, []);

    // Busca quando o usuário digita
    useEffect(() => {
        if (debouncedSearch.length >= 2) {
            setLoading(true);
            patientService.list({ search: debouncedSearch, limit: 50 })
                .then((result) => {
                    setPatients(result.patients);
                })
                .finally(() => setLoading(false));
        } else if (debouncedSearch === "") {
            // Volta para os primeiros 20 quando limpa a busca
            setLoading(true);
            patientService.list({ limit: 20 })
                .then((result) => {
                    setPatients(result.patients);
                })
                .finally(() => setLoading(false));
        }
    }, [debouncedSearch]);

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Selecione um Paciente</h1>
            
            {/* Campo de busca */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                    type="text"
                    placeholder="Buscar por nome, CPF ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                />
                {loading && (
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                        Buscando...
                    </span>
                )}
            </div>

            {/* Resultados */}
            <div className="space-y-2">
                {patients.length === 0 && !loading && (
                    <p className="text-gray-500 text-center py-8">
                        {searchTerm ? "Nenhum paciente encontrado" : "Digite para buscar pacientes"}
                    </p>
                )}
                
                {patients.map((patient) => (
                    <div 
                        key={patient._id} 
                        className="p-4 bg-white rounded shadow hover:shadow-md transition-shadow flex justify-between items-center"
                    >
                        <div>
                            <p className="font-semibold">{patient.fullName}</p>
                            <p className="text-sm text-gray-600">
                                {patient.cpf || patient.phone || "Sem contato"}
                            </p>
                        </div>
                        <Button onClick={() => navigate(`/patient/${patient.patientId || patient._id}`)}>
                            Acessar Prontuário
                        </Button>
                    </div>
                ))}
            </div>

            {patients.length > 0 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                    Mostrando {patients.length} paciente{patients.length > 1 ? 's' : ''}
                    {searchTerm && " (resultado da busca)"}
                </p>
            )}
        </div>
    );
}


import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";


export default function PatientSelection() {
    const [patients, setPatients] = useState<IPatient[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Substitua por sua API real
        axios.get("/api/patients").then((res) => {
            setPatients(res.data);
        });
    }, []);

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Selecione um Paciente</h1>
            <ul className="space-y-4">
                {patients.map((patient) => (
                    <li key={patient._id} className="p-4 bg-white rounded shadow flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{patient.fullName}</p>
                            <p className="text-sm text-gray-600">{patient.cpf}</p>
                        </div>
                        <Button onClick={() => navigate(`/patient/${patient._id}`)}>
                            Acessar Prontuário
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

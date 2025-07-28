import { IDoctor, IDoctors } from "../../utils/types/types";
import { Button } from "../ui/Button";
interface DoctorListProps {
    doctor: IDoctor;
    onEdit: (doctor: IDoctors) => void;
    onViewAgenda?: (doctor: IDoctors) => void;
}
const DoctorCard = ({ doctor, onEdit, onViewAgenda }: DoctorListProps) => {
    return (
        <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white">
            <h3 className="text-lg font-semibold text-gray-800">{doctor.fullName}</h3>
            <p className="text-sm text-gray-600">Especialidade: {doctor.specialty || "Não informada"}</p>
            <p className="text-sm text-gray-500 mt-1">
                Status:{" "}
                <span className={doctor.active ? "text-green-600" : "text-red-600"}>
                    {doctor.active ? "Ativo" : "Inativo"}
                </span>
            </p>

            <div className="flex gap-2 mt-4">
                <Button onClick={() => onEdit(doctor)}>Editar</Button>
                <Button variant="outline" onClick={() => onViewAgenda(doctor)}>Ver Agenda</Button>
            </div>
        </div>
    );
};

export default DoctorCard;

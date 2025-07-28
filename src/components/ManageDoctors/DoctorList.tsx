import { useState } from "react";
import DoctorCard from "./DoctorCard";

interface DoctorListProps {
    doctors: any[];
    onEdit: (doctor: any) => void;
    onViewAgenda?: (doctor: any) => void;
}


const DoctorList = ({ doctors, onEdit, onViewAgenda }: DoctorListProps) => {
    const [selectedDoctorAgenda, setSelectedDoctorAgenda] = useState<any>(null);
    if (!doctors.length) {
        return <p className="text-gray-500">Nenhum profissional cadastrado.</p>;
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {doctors.map((doctor) => (
                <DoctorCard
                    key={doctor._id}
                    doctor={doctor}
                    onEdit={onEdit}
                    onViewAgenda={onViewAgenda}
                />
            ))}
        </div>
    );
};

export default DoctorList;
/* import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { CardFooter, CardHeader } from '../ui/Card';
import { TimeMultiSelect } from './TimeMultiSelect';

const daysOfWeek = [
    'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'
];

interface EditAgendaModalProps {
    open: boolean;
    onClose: () => void;
    doctor: { name?: string };
    selectedDate: Date | null;
    availability?: Record<string, string[]>;
    onSave: (availability: Record<string, string[]>) => void;
    selectedDoctorId?: string;

}

const EditAgendaModal = ({ open, onClose, doctor,selectedDoctorId, selectedDate, availability, onSave }: EditAgendaModalProps) => {
    const [formData, setFormData] = useState({});
    const selectedDateKey = selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : '';

    // Atualiza o formData sempre que availability mudar (ex: modal reaberto com outro doutor)
    useEffect(() => {
        setFormData(availability || {});
    }, [availability, selectedDate]);


    const updateDate = (times: string[]) => {
        if (!selectedDateKey) return;
        setFormData(prev => ({ ...prev, [selectedDateKey]: times }));
    };


    const handleSave = () => {
        onSave(formData);
    };
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <CardHeader>
                <DialogTitle>Editar Horários</DialogTitle>
            </CardHeader>
            <DialogContent
                className="w-full max-w-3xl min-h-[350px] pt-6"
                sx={{
                    overflowY: 'visible', // evita scroll
                }}
            >

                <div className="space-y-4">
                    <h4 className="font-semibold mb-1">
                        Horários disponíveis para {selectedDate ? dayjs(selectedDate).format("DD/MM/YYYY") : ''}
                    </h4>

                    <TimeMultiSelect
                        selected={formData[selectedDateKey] || []}
                        onChange={(times) => updateDate(times)}
                        availableTimes={availability}
                        selectedDate={selectedDate}
                        selectedDoctorId={selectedDoctorId}
                    />
                </div>

                <CardFooter>
                    <div className="flex justify-end gap-4 mt-10">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSave}>Salvar</Button>
                    </div>
                </CardFooter>
            </DialogContent>
        </Dialog>

    );
};

export default EditAgendaModal;
 */
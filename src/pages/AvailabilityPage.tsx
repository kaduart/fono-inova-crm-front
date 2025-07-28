import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axios from 'axios';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import ScheduleModal from '../components/calendar/ScheduleModal';
import { BASE_URL } from '../constants/constants';
import { professionalService } from '../services/professionalService';

export default function AvailabilityPage() {
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState('');

    useEffect(() => {
        professionalService
            .fetchAll()
            .then(setDoctors)
            .catch((err) => console.error('Erro ao buscar profissionais:', err));
    }, []);

    useEffect(() => {
        const fetchAvailableSlots = async () => {
            if (!selectedDoctor || !selectedDate) return;

            setLoading(true);
            try {
                const response = await axios.get(`${BASE_URL}/appointments/available-slots`, {
                    params: {
                        doctorId: selectedDoctor,
                        date: selectedDate.format('YYYY-MM-DD'),
                    },
                });
                setAvailableSlots(response.data || []);
            } catch (error) {
                console.error('Erro ao carregar horários disponíveis:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAvailableSlots();
    }, [selectedDoctor, selectedDate]);

    const openModal = (slot: string) => {
        setSelectedSlot(slot);
        setModalOpen(true);
    };

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h5" mb={3}>Disponibilidade de Agenda</Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <FormControl fullWidth>
                    <InputLabel>Profissional</InputLabel>
                    <Select
                        value={selectedDoctor}
                        onChange={(e) => setSelectedDoctor(e.target.value)}
                        label="Profissional"
                    >
                        {doctors.map((doc) => (
                            <MenuItem key={doc.id} value={doc.id}>
                                {doc.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <DatePicker
                    label="Data"
                    value={selectedDate}
                    onChange={(newValue) => setSelectedDate(newValue)}
                />
            </Box>

            {loading ? (
                <CircularProgress />
            ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {availableSlots.map((slot) => (
                        <Button
                            key={slot}
                            variant="outlined"
                            onClick={() => openModal(slot)}
                        >
                            {slot}
                        </Button>
                    ))}
                </Box>
            )}

            {modalOpen && (
                <ScheduleModal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    perfilData={{
                        date: selectedDate?.format('YYYY-MM-DD'),
                        time: selectedSlot,
                        doctorId: selectedDoctor,
                    }}
                />
            )}
        </Box>
    );
}

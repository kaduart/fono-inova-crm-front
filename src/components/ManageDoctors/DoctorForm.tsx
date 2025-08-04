import { Box, Checkbox, Chip, FormControlLabel } from "@mui/material";
import { Clock, Eye, EyeOff, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaUserEdit } from "react-icons/fa";
import { IDoctor, THERAPY_TYPES, TherapyType } from "../../utils/types/types";
import { Button } from "../ui/Button";
import Input from "../ui/Input";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";

interface DoctorFormProps {
    selectedDoctor: IDoctor | null;
    onSubmitDoctor: (data: IDoctor) => void;
    onCancel: () => void;
    loading?: boolean;
}

interface TimeSlot {
    day: string;
    period: 'morning' | 'afternoon';
    time: string;
}

interface TimeSlot {
    day: string;
    time: string;
}

const daysOfWeek = {
    'Segunda-feira': 'monday',
    'Terça-feira': 'tuesday',
    'Quarta-feira': 'wednesday',
    'Quinta-feira': 'thursday',
    'Sexta-feira': 'friday'
};


// Gerar todos os slots das 8:00 às 16:20 com intervalos de 40 minutos
const generateAllTimeSlots = () => {
    const times: string[] = [];
    for (let hour = 8; hour <= 16; hour++) {
        for (let minute = 0; minute < 60; minute += 40) {
            if (hour === 16 && minute > 20) break;
            times.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }
    }
    return times;
};

const allTimeSlots = generateAllTimeSlots();

const DoctorForm = ({ selectedDoctor, onSubmitDoctor, onCancel, loading }: DoctorFormProps) => {
    const [form, setForm] = useState<IDoctor>({
        _id: selectedDoctor?._id || "",
        fullName: selectedDoctor?.fullName || "",
        specialty: selectedDoctor?.specialty || "",
        email: selectedDoctor?.email || "",
        phoneNumber: selectedDoctor?.phoneNumber || "",
        licenseNumber: selectedDoctor?.licenseNumber || "",
        password: "",
        active: selectedDoctor?.active ?? true,
        weeklyAvailability: selectedDoctor?.weeklyAvailability || [],
    });

    const [selectedTimeSlots, setSelectedTimeSlots] = useState<TimeSlot[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [formErrors, setFormErrors] = useState({
        fullName: false,
        email: false,
        password: false,
        licenseNumber: false,
        phoneNumber: false,
        specialty: false
    });

    // Inicializa os slots selecionados com base no schedule existente
    useEffect(() => {
        if (selectedDoctor?.weeklyAvailability) {
            const slots: TimeSlot[] = [];
            selectedDoctor.weeklyAvailability.forEach(daySchedule => {
                daySchedule.slots?.forEach((time: string) => {
                    slots.push({
                        day: daySchedule.day,
                        time
                    });
                });
            });
            setSelectedTimeSlots(slots);
        }
    }, [selectedDoctor]);

    // Atualiza form.schedule quando selectedTimeSlots muda
    useEffect(() => {
        const weeklyAvailability = Object.entries(daysOfWeek).map(([label, enDay]) => {
            const times = selectedTimeSlots
                .filter(slot => slot.day === enDay)  // comparar com valor em inglês
                .map(slot => slot.time);

            return times.length > 0 ? { day: enDay, times } : null;
        }).filter(Boolean);

        setForm(prev => ({
            ...prev,
            weeklyAvailability
        }));
    }, [selectedTimeSlots]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (formErrors.fullName) return toast.error("Nome é obrigatório");
        if (formErrors.email) return toast.error("Email é obrigatório");
        if (formErrors.specialty) return toast.error("Especialidade é obrigatória");
        if (formErrors.licenseNumber) return toast.error("Número do conselho é obrigatório");
        if (formErrors.phoneNumber) return toast.error("Telefone é obrigatório");
        if (!selectedDoctor && formErrors.password) return toast.error("Senha é obrigatória para novo cadastro");

        onSubmitDoctor(form);
    };

    const toggleTimeSlot = (day: string, time: string) => {
        setSelectedTimeSlots(prev => {
            const existingIndex = prev.findIndex(slot => slot.day === day && slot.time === time);
            if (existingIndex >= 0) {
                return prev.filter((_, index) => index !== existingIndex);
            } else {
                return [...prev, { day, time }];
            }
        });
    };

    const toggleAllDay = (day: string) => {
        const allDaySlotsSelected = allTimeSlots.every(time =>
            selectedTimeSlots.some(slot => slot.day === day && slot.time === time)
        );

        if (allDaySlotsSelected) {
            // Remove todos os slots do dia
            setSelectedTimeSlots(prev => prev.filter(slot => slot.day !== day));
        } else {
            // Adiciona todos os slots do dia
            const newSlots = [...selectedTimeSlots];
            allTimeSlots.forEach(time => {
                if (!newSlots.some(slot => slot.day === day && slot.time === time)) {
                    newSlots.push({ day, time });
                }
            });
            setSelectedTimeSlots(newSlots);
        }
    };

    const isFormValid = !Object.values(formErrors).some(Boolean);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="w-full max-w-4xl overflow-y-auto max-h-[90vh] bg-white border rounded-lg shadow-xl border-gray-100">
                {/* Cabeçalho */}
                <div className={`flex items-center px-6 py-4 ${selectedDoctor
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                    : 'bg-gradient-to-r from-green-600 to-green-700'
                    }`}>
                    <div className="p-2 mr-3 rounded-lg bg-white/20">
                        {selectedDoctor ? (
                            <FaUserEdit className="w-5 h-5 text-white" />
                        ) : (
                            <UserPlus className="w-5 h-5 text-white" />
                        )}
                    </div>
                    <h2 className="text-lg font-semibold text-white">
                        {selectedDoctor ? "Editar Profissional" : "Novo Profissional"}
                    </h2>
                </div>

                {/* Corpo do formulário */}
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nome */}
                        <div>
                            <Label htmlFor="fullName" error={formErrors.fullName}>
                                Nome *
                            </Label>
                            <Input
                                id="fullName"
                                value={form.fullName}
                                onChange={e => setForm({ ...form, fullName: e.target.value })}
                                error={formErrors.fullName}
                            />
                            {formErrors.fullName && (
                                <p className="mt-1 text-xs text-red-500">Nome é obrigatório</p>
                            )}
                        </div>

                        {/* Especialidade */}
                        <div>
                            <Label htmlFor="specialty" error={formErrors.specialty}>
                                Especialidade *
                            </Label>
                            <Select
                                id="specialty"
                                value={form.specialty}
                                onChange={(e) => setForm({ ...form, specialty: e.target.value as TherapyType })}
                                error={formErrors.specialty}
                            >
                                <option value="">Selecione</option>
                                {THERAPY_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </Select>
                            {formErrors.specialty && (
                                <p className="mt-1 text-xs text-red-500">Selecione uma especialidade</p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <Label htmlFor="email" error={formErrors.email}>
                                Email *
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                error={formErrors.email}
                            />
                            {formErrors.email && (
                                <p className="mt-1 text-xs text-red-500">Email é obrigatório</p>
                            )}
                        </div>

                        {/* Telefone */}
                        <div>
                            <Label htmlFor="phoneNumber" error={formErrors.phoneNumber}>Telefone *</Label>
                            <Input
                                id="phoneNumber"
                                mask="(99) 99999-9999"
                                type="tel"
                                value={form.phoneNumber}
                                onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                                error={formErrors.phoneNumber}
                            />
                            {formErrors.phoneNumber && (
                                <p className="mt-1 text-xs text-red-500">Telefone é obrigatório</p>
                            )}
                        </div>

                        {/* Número de Registro */}
                        <div>
                            <Label htmlFor="licenseNumber" error={formErrors.licenseNumber}>Número de Registro *</Label>
                            <Input
                                id="licenseNumber"
                                value={form.licenseNumber}
                                onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
                                error={formErrors.licenseNumber}
                            />
                            {formErrors.licenseNumber && (
                                <p className="mt-1 text-xs text-red-500">Número registro é obrigatório</p>
                            )}
                        </div>

                        {/* Senha (apenas para novo cadastro) */}
                        {!selectedDoctor && (
                            <div className="relative">
                                <Label htmlFor="password" error={formErrors.password}>
                                    Senha *
                                </Label>
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    error={formErrors.password}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="absolute right-2 top-9"
                                    onClick={() => setShowPassword(prev => !prev)}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                                {formErrors.password && (
                                    <p className="mt-1 text-xs text-red-500">Senha é obrigatória</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Agenda Semanal */}
                    <div className="pt-4 mt-4 border-t border-gray-200">
                        <h3 className="mb-6 text-lg font-medium">Agenda Semanal</h3>

                        <div className="space-y-6">
                            {Object.entries(daysOfWeek).map(([label, day]) => (
                                <div key={day} className="p-4 border rounded-lg bg-gray-50">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-md font-medium text-gray-800">{label}</h4>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleAllDay(day)}
                                        >
                                            {allTimeSlots.every(time =>
                                                selectedTimeSlots.some(slot =>
                                                    slot.day === day && slot.time === time
                                                )
                                            ) ? 'Desmarcar todos' : 'Marcar todos'}
                                        </Button>
                                    </div>

                                    <Box display="flex" flexWrap="wrap" gap={1}>
                                        {allTimeSlots.map(time => {
                                            const isSelected = selectedTimeSlots.some(slot =>
                                                slot.day === day && slot.time === time
                                            );

                                            return (
                                                <Chip
                                                    key={`${day}-${time}`}
                                                    label={time}
                                                    icon={<Clock style={{ fontSize: 14 }} />}
                                                    onClick={() => toggleTimeSlot(day, time)}
                                                    onDelete={isSelected ? () => toggleTimeSlot(day, time) : undefined}
                                                    color={isSelected ? "primary" : "default"}
                                                    variant={isSelected ? "filled" : "outlined"}
                                                    deleteIcon={<Trash2 size={14} />}
                                                    style={{ margin: '2px' }}
                                                />
                                            );
                                        })}
                                    </Box>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ativo */}
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={form.active === true}
                                onChange={e => setForm({ ...form, active: e.target.checked })}
                            />
                        }
                        label="Ativo"
                    />
                </div>

                {/* Rodapé */}
                <div className="flex justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="border-gray-300 hover:bg-gray-100"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={!isFormValid || loading}
                        className={`text-white ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''} ${selectedDoctor
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                            : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                            }`}
                    >
                        {loading ? (
                            <div className="flex items-center">
                                <div className="w-4 h-4 mr-2 border-2 rounded-full animate-spin border-t-transparent"></div>
                                Processando...
                            </div>
                        ) : (
                            <div className="flex items-center">
                                {selectedDoctor ? (
                                    <FaUserEdit className="w-4 h-4 mr-1.5" />
                                ) : (
                                    <UserPlus className="w-4 h-4 mr-1.5" />
                                )}
                                {selectedDoctor ? "Salvar Alterações" : "Cadastrar Profissional"}
                            </div>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default DoctorForm;
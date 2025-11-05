import { Checkbox, FormControlLabel } from "@mui/material";
import { Clock, Eye, EyeOff, UserPlus } from "lucide-react";
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
    time: string;
}

const daysOfWeek = {
    'Segunda-feira': 'monday',
    'Terça-feira': 'tuesday',
    'Quarta-feira': 'wednesday',
    'Quinta-feira': 'thursday',
    'Sexta-feira': 'friday'
};

const generateTimeSlots = (startHour: number, endHour: number, intervalMinutes: number) => {
    const slots = [];
    const date = new Date();
    date.setHours(startHour, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(endHour, 0, 0, 0);

    while (date <= endDate) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        slots.push(`${hours}:${minutes}`);
        date.setMinutes(date.getMinutes() + intervalMinutes);
    }

    return slots;
};

const allTimeSlots = generateTimeSlots(8, 18, 40);

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

    // Inicializa os slots a partir do médico selecionado
    useEffect(() => {
        if (selectedDoctor?.weeklyAvailability) {
            const slots: TimeSlot[] = [];
            selectedDoctor.weeklyAvailability.forEach(dayAvailability => {
                dayAvailability.times.forEach(time => {
                    slots.push({ day: dayAvailability.day, time });
                });
            });
            setSelectedTimeSlots(slots);
        }
    }, [selectedDoctor]);

    // Mantém weeklyAvailability em sincronia com os chips selecionados
    useEffect(() => {
        const weeklyAvailability = Object.values(daysOfWeek).map(day => {
            const times = selectedTimeSlots
                .filter(slot => slot.day === day)
                .map(slot => slot.time);
            return { day, times };
        }).filter(day => day.times.length > 0);

        setForm(prev => ({ ...prev, weeklyAvailability }));
    }, [selectedTimeSlots]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formErrors.fullName) return toast.error("Nome é obrigatório");
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
            setSelectedTimeSlots(prev => prev.filter(slot => slot.day !== day));
        } else {
            const newSlots = allTimeSlots.map(time => ({ day, time }));
            setSelectedTimeSlots(prev => [
                ...prev.filter(slot => slot.day !== day),
                ...newSlots
            ]);
        }
    };

    const isFormValid = !Object.values(formErrors).some(Boolean);
    const isEditing = !!selectedDoctor?._id;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-5xl overflow-y-auto max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-100 animate-fadeIn"
            >
                {/* CABEÇALHO — padrão institucional */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-400 via-emerald-500 to-green-400 text-white shadow-sm rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-full">
                            {isEditing
                                ? (
                                    <FaUserEdit className="w-5 h-5" />
                                ) : (
                                    <UserPlus className="w-5 h-5" />
                                )}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold tracking-wide">
                                {isEditing ? "Editar Profissional" : "Novo Profissional"}
                            </h2>
                            <p className="text-sm/5 opacity-90">
                                {isEditing

                                    ? "Atualize os dados do profissional"
                                    : "Adicione um novo profissional à equipe"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* CORPO — mesmo “DNA” do PatientForm (fieldset + legend + grids) */}
                <div className="p-6 space-y-6 bg-gradient-to-b from-white to-gray-50 rounded-b-2xl">
                    {/* Dados do Profissional */}
                    <fieldset className="border border-gray-200 rounded-xl p-4">
                        <legend className="px-2 text-sm font-semibold text-gray-700">Dados do Profissional</legend>

                        <div className="grid grid-cols-12 gap-4 mt-2">
                            <div className="col-span-12 md:col-span-6">
                                <Label htmlFor="fullName">Nome *</Label>
                                <Input
                                    id="fullName"
                                    value={form.fullName}
                                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                                    placeholder="Digite o nome completo"
                                    className="mt-1"
                                />
                                {formErrors.fullName && (
                                    <p className="mt-1 text-xs text-red-500">Nome é obrigatório</p>
                                )}
                            </div>

                            <div className="col-span-12 md:col-span-6">
                                <Label htmlFor="specialty">Especialidade *</Label>
                                <Select
                                    id="specialty"
                                    value={form.specialty}
                                    onChange={(e) => setForm({ ...form, specialty: e.target.value as TherapyType })}
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

                            <div className="col-span-12 md:col-span-4">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    placeholder="exemplo@clinica.com"
                                    className="mt-1"
                                />
                                {formErrors.email && (
                                    <p className="mt-1 text-xs text-red-500">Email é obrigatório</p>
                                )}
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <Label htmlFor="phoneNumber">Telefone *</Label>
                                <Input
                                    id="phoneNumber"
                                    mask="(99) 99999-9999"
                                    type="tel"
                                    placeholder="(62) 9999-9999"
                                    value={form.phoneNumber}
                                    onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                                    className="mt-1"
                                />
                                {formErrors.phoneNumber && (
                                    <p className="mt-1 text-xs text-red-500">Telefone é obrigatório</p>
                                )}
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <Label htmlFor="licenseNumber">Número de Registro *</Label>
                                <Input
                                    id="licenseNumber"
                                    placeholder="123456"
                                    value={form.licenseNumber}
                                    onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
                                    className="mt-1"
                                />
                                {formErrors.licenseNumber && (
                                    <p className="mt-1 text-xs text-red-500">Número registro é obrigatório</p>
                                )}
                            </div>

                            {/* Senha (apenas para novo cadastro) */}
                            {!selectedDoctor && (
                                <div className="col-span-12 md:col-span-6 relative">
                                    <Label htmlFor="password">Senha *</Label>
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        className="mt-1 pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="absolute right-2 top-[34px] text-gray-500 hover:text-gray-700"
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
                    </fieldset>

                    {/* Horários de Atendimento */}
                    <fieldset className="border border-gray-200 rounded-xl p-4">
                        <legend className="px-2 text-sm font-semibold text-gray-700">Horários de Atendimento</legend>

                        <div className="space-y-4 mt-2">
                            {Object.entries(daysOfWeek).map(([label, day]) => {
                                const daySlots = selectedTimeSlots.filter(slot => slot.day === day);
                                const allSelected = allTimeSlots.every(time =>
                                    daySlots.some(slot => slot.time === time)
                                );

                                return (
                                    <div key={day} className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium text-gray-800">{label}</h4>
                                            <button
                                                type="button"
                                                onClick={() => toggleAllDay(day)}
                                                className="text-sm text-emerald-600 hover:text-emerald-800 hover:underline"
                                            >
                                                {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {allTimeSlots.map(time => {
                                                const isSelected = daySlots.some(slot => slot.time === time);
                                                return (
                                                    <button
                                                        key={`${day}-${time}`}
                                                        type="button"
                                                        onClick={() => toggleTimeSlot(day, time)}
                                                        className={`px-3 py-1.5 text-sm rounded-md border transition-all flex items-center
                                                            ${isSelected
                                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 hover:bg-emerald-100'
                                                                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                                                    >
                                                        <Clock className="w-4 h-4 mr-1.5" />
                                                        {time}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </fieldset>

                    {/* Status */}
                    <fieldset className="border border-gray-200 rounded-xl p-4">
                        <legend className="px-2 text-sm font-semibold text-gray-700">Status</legend>
                        <div className="mt-2">
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={form.active === true}
                                        onChange={e => setForm({ ...form, active: e.target.checked })}
                                    />
                                }
                                label="Profissional ativo"
                            />
                        </div>
                    </fieldset>
                </div>

                {/* RODAPÉ — botões padronizados */}
                <div className="flex justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
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
                        className={`text-white ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''} bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600`}
                    >
                        {loading ? (
                            <div className="flex items-center">
                                <div className="w-4 h-4 mr-2 border-2 rounded-full animate-spin border-t-transparent"></div>
                                Processando...
                            </div>
                        ) : (
                            <div className="flex items-center">
                                {isEditing ? (
                                    <FaUserEdit className="w-4 h-4 mr-1.5" />
                                ) : (
                                    <UserPlus className="w-4 h-4 mr-1.5" />
                                )}
                                {isEditing ? "Salvar Alterações" : "Cadastrar Profissional"}
                            </div>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default DoctorForm;

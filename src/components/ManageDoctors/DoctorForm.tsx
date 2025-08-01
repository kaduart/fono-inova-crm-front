import { Checkbox, FormControlLabel } from "@mui/material";
import { Eye, EyeOff, UserPlus } from "lucide-react";
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
    });

    const [showPassword, setShowPassword] = useState(false);
    const [formErrors, setFormErrors] = useState({
        fullName: false,
        email: false,
        password: false,
        licenseNumber: false,
        phoneNumber: false,
        specialty: false
    });

    // Validação em tempo real
    useEffect(() => {
        setFormErrors({
            fullName: !form.fullName.trim(),
            email: !form.email.trim(),
            password: !selectedDoctor && !form.password.trim(),
            licenseNumber: !form.licenseNumber,
            phoneNumber: !form.phoneNumber,
            specialty: !form.specialty
        });
    }, [form, selectedDoctor]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (formErrors.fullName) return toast.error("Nome é obrigatório");
        if (formErrors.email) return toast.error("Email é obrigatório");
        if (formErrors.specialty) return toast.error("Especialidade é obrigatória");
        if (formErrors.licenseNumber) return toast.error("Número conselho é obrigatório");
        if (formErrors.phoneNumber) return toast.error("Número telefone é obrigatório");
        if (!selectedDoctor && formErrors.password) return toast.error("Senha é obrigatória para novo cadastro");

        onSubmitDoctor(form);
    };

    const isFormValid = !Object.values(formErrors).some(Boolean);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-2xl overflow-hidden bg-white border rounded-lg shadow-xl border-gray-100"
            >
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
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
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
                            <Label htmlFor="phoneNumber" error={formErrors.phoneNumber}>Telefone</Label>
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
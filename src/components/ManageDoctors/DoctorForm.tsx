import { Checkbox, FormControlLabel } from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { IDoctor, THERAPY_TYPES, TherapyType } from "../../utils/types/types";
import { Button } from "../ui/Button";
import Input from "../ui/Input";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";

interface DoctorFormProps {
    selectedDoctor: IDoctor | null;
    onSubmitDoctor: (data: IDoctor) => void;
    onCancel: () => void;
}

const DoctorForm = ({ selectedDoctor, onSubmitDoctor, onCancel }: DoctorFormProps) => {
    const [form, setForm] = useState<IDoctor>({
        _id: selectedDoctor?._id || "",
        fullName: selectedDoctor?.fullName || "",
        specialty: selectedDoctor?.specialty || "",
        email: selectedDoctor?.email || "",
        phoneNumber: selectedDoctor?.phoneNumber || "",
        licenseNumber: selectedDoctor?.licenseNumber || "",
        password: "", // só será usado no cadastro
        active: selectedDoctor?.active ?? true,
    });

    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.fullName.trim()) return alert("Nome é obrigatório.");
        if (!form.email.trim()) return alert("Email é obrigatório.");
        if (!selectedDoctor && !form.password.trim()) return alert("Senha é obrigatória para novo cadastro.");
        onSubmitDoctor(form);
    };

    return (
        <form className="space-y-6 p-6 max-w-xl mx-auto bg-white rounded-lg w-50 shadow-md border border-gray-200">
            <h2 className="text-2xl font-semibold mb-4">
                {selectedDoctor ? "Editar Profissional" : "Novo Profissional"}
            </h2>

            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Nome"
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                />

                <div className="space-y-2">
                    <Label htmlFor="specialty">Especialidade</Label>
                    <Select
                        value={form.specialty}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                specialty: e.target.value as TherapyType,
                            })
                        }
                    >
                        <option value="">Selecione</option>
                        {THERAPY_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </Select>
                </div>
                <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                />
                <Input
                    mask="(99) 99999-9999"
                    label="Telefone"
                    type="tel"
                    value={form.phoneNumber}
                    onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                />

                <Input
                    label="Número de Registro"
                    value={form.licenseNumber}
                    onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
                />
                {!selectedDoctor && (
                    <div className="relative">
                        <Input
                            label="Senha"
                            type={showPassword ? "text" : "password"}
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            className="absolute right-2 top-9"
                            onClick={() => setShowPassword(prev => !prev)}
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                    </div>
                )}
            </div>

            <FormControlLabel
                control={
                    <Checkbox
                        checked={form.active === true}
                        onChange={e => setForm({ ...form, active: e.target.checked })}
                    />
                }
                label="Ativo"
            />

            <div className="flex gap-2 mt-4 justify-end">
                <Button onClick={handleSubmit}>Salvar</Button>
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            </div>
        </form>
    );
};

export default DoctorForm;

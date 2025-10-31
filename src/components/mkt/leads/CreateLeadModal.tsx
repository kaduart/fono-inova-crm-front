// src/components/leads/CreateLeadModal.tsx
import { motion } from "framer-motion";
import { Mail, MapPin, Phone, User, X } from "lucide-react";
import React, { useState } from "react";
import { Button } from "../../ui/Button";

interface CreateLeadModalProps {
    onClose: () => void;
    onSubmit: (leadData: any) => Promise<void>;
}

const CreateLeadModal: React.FC<CreateLeadModalProps> = ({
    onClose,
    onSubmit,
}) => {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        origin: "Site",
        status: "novo",
        appointment: {
            seekingFor: "Adulto +18 anos",
            modality: "Online",
            healthPlan: "Mensalidade"
        }
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name.startsWith("appointment.")) {
            const field = name.split(".")[1];
            setFormData(prev => ({
                ...prev,
                appointment: {
                    ...prev.appointment,
                    [field]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await onSubmit(formData);
        } catch (error) {
            console.error("Erro ao criar lead:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto"
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
            >
                {/* CABEÇALHO */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-white sticky top-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Criar Novo Lead</h2>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-emerald-100 text-sm mt-1">
                        Preencha os dados do potencial paciente
                    </p>
                </div>

                {/* FORMULÁRIO */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* INFORMAÇÕES PESSOAIS */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <User size={16} />
                            Informações Pessoais
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nome Completo *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                placeholder="Digite o nome completo"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    <Phone size={14} className="inline mr-1" />
                                    Telefone *
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    <Mail size={14} className="inline mr-1" />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ORIGEM E STATUS */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Origem
                            </label>
                            <select
                                name="origin"
                                value={formData.origin}
                                onChange={handleChange}
                                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                            >
                                <option value="Site">Site</option>
                                <option value="Instagram">Instagram</option>
                                <option value="Google">Google</option>
                                <option value="Indicação">Indicação</option>
                                <option value="Meta Ads">Meta Ads</option>
                                <option value="Tráfego pago">Tráfego Pago</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Status
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                            >
                                <option value="novo">Novo</option>
                                <option value="em_andamento">Em Andamento</option>
                                <option value="atendimento">Em Atendimento</option>
                                <option value="virou_paciente">Virou Paciente</option>
                                <option value="lead_frio">Lead Frio</option>
                            </select>
                        </div>
                    </div>

                    {/* INFORMAÇÕES DA CONSULTA */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <MapPin size={16} />
                            Informações da Consulta
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Buscando Atendimento Para
                            </label>
                            <select
                                name="appointment.seekingFor"
                                value={formData.appointment.seekingFor}
                                onChange={handleChange}
                                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                            >
                                <option value="Adulto +18 anos">Adulto +18 anos</option>
                                <option value="Infantil">Infantil</option>
                                <option value="Graduação">Graduação</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Modalidade
                                </label>
                                <select
                                    name="appointment.modality"
                                    value={formData.appointment.modality}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                >
                                    <option value="Online">Online</option>
                                    <option value="Presencial">Presencial</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Plano
                                </label>
                                <select
                                    name="appointment.healthPlan"
                                    value={formData.appointment.healthPlan}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                >
                                    <option value="Mensalidade">Mensalidade</option>
                                    <option value="Graduação">Graduação</option>
                                    <option value="Dependente">Dependente</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* BOTÕES */}
                    <div className="flex gap-3 pt-6 border-t border-slate-200">
                        <Button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 bg-slate-200 text-slate-800 hover:bg-slate-300 disabled:opacity-50"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Criando...
                                </>
                            ) : (
                                "Criar Lead"
                            )}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default CreateLeadModal;
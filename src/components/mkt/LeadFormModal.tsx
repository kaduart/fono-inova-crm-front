// components/LeadFormModal.tsx
import React, { useEffect, useState } from 'react';
import { createLead, updateLead } from '../../services/leadService';

interface LeadFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editing: any;
}

export function LeadFormModal({ isOpen, onClose, onSave, editing }: LeadFormModalProps) {
    const [data, setData] = useState({
        name: '',
        contact: { email: '', phone: '' },
        origin: 'Outro',
        status: 'novo',
    });

    useEffect(() => {
        if (editing) {
            setData(editing);
        } else {
            setData({
                name: '',
                contact: { email: '', phone: '' },
                origin: 'Outro',
                status: 'novo',
            });
        }
    }, [editing, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, contact: { ...prev.contact, [name]: value } }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editing) {
            await updateLead(editing._id, data);
        } else {
            await createLead(data);
        }
        onSave();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-96 space-y-4">
                <h3 className="text-lg font-bold">{editing ? 'Editar Lead' : 'Novo Lead'}</h3>

                <input
                    type="text"
                    name="name"
                    value={data.name}
                    onChange={handleChange}
                    placeholder="Nome"
                    required
                    className="w-full border rounded p-2"
                />

                <input
                    type="email"
                    name="email"
                    value={data.contact.email}
                    onChange={handleContactChange}
                    placeholder="Email"
                    className="w-full border rounded p-2"
                />

                <input
                    type="text"
                    name="phone"
                    value={data.contact.phone}
                    onChange={handleContactChange}
                    placeholder="Telefone"
                    className="w-full border rounded p-2"
                />

                <select
                    name="origin"
                    value={data.origin}
                    onChange={handleChange}
                    className="w-full border rounded p-2"
                >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Site">Site</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Outro">Outro</option>
                </select>

                <select
                    name="status"
                    value={data.status}
                    onChange={handleChange}
                    className="w-full border rounded p-2"
                >
                    <option value="novo">Novo</option>
                    <option value="atendimento">Em Atendimento</option>
                    <option value="convertido">Convertido</option>
                    <option value="perdido">Perdido</option>
                </select>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border rounded text-gray-700"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded"
                    >
                        Salvar
                    </button>
                </div>
            </form>
        </div>
    );
}

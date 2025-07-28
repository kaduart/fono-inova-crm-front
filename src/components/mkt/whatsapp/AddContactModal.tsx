import React, { FormEvent, useState } from 'react';

interface AddContactModalProps {
    onClose: () => void;
    onAdd: (contact: Contact) => void;
}

interface Contact {
    _id: string;
    name: string;
    phone: string;
    avatar?: string;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) {
            setError('Nome e telefone são obrigatórios');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/wpp/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao adicionar contato');
            }
            const newContact: Contact = await res.json();
            onAdd(newContact);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow w-80">
                <h2 className="text-lg font-bold mb-4">Adicionar Contato</h2>
                {error && <p className="text-red-600 mb-2">{error}</p>}
                <input
                    type="text"
                    placeholder="Nome"
                    className="w-full mb-2 p-2 border rounded"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={loading}
                />
                <input
                    type="tel"
                    placeholder="Telefone"
                    className="w-full mb-4 p-2 border rounded"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={loading}
                />
                <div className="flex justify-end space-x-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border rounded"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Adicionando...' : 'Adicionar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddContactModal;

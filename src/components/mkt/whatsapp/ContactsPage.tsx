import React, { useEffect, useState } from "react";
import {
    fetchContacts,
    addContact,
    editContact,
    deleteContact,
} from "../../../services/whatsappService";
import { toast } from "react-toastify";
import ContactsList, { Contact } from "./ContactsList";

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    // 🔹 Carrega contatos
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchContacts();
                setContacts(data);
            } catch (err: any) {
                console.error("Erro ao carregar contatos:", err);
                toast.error("Erro ao buscar contatos");
            }
        };
        load();
    }, []);

    // 🔹 Adicionar novo contato
    const handleAdd = async (data: Omit<Contact, "_id">) => {
        try {
            const newContact = await addContact(data);
            setContacts((prev) => [...prev, newContact]);
            toast.success("Contato adicionado com sucesso 💚");
        } catch (err) {
            toast.error("Erro ao adicionar contato");
        }
    };

    // 🔹 Editar contato existente
    const handleEdit = async (id: string, data: Omit<Contact, "_id">) => {
        try {
            const updated = await editContact(id, data);
            setContacts((prev) =>
                prev.map((c) => (c._id === id ? updated : c))
            );
            toast.success("Contato atualizado 💚");
        } catch (err) {
            toast.error("Erro ao editar contato");
        }
    };

    // 🔹 Deletar contato
    const handleDelete = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja deletar este contato?")) return;
        try {
            await deleteContact(id);
            setContacts((prev) => prev.filter((c) => c._id !== id));
            toast.success("Contato deletado 💚");
        } catch (err) {
            toast.error("Erro ao deletar contato");
        }
    };

    return (
        <div className="p-6 min-h-screen bg-gray-50">
            <ContactsList
                contacts={contacts}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSelect={setSelectedContact}
                selectedContactId={selectedContact?._id}
            />
        </div>
    );
}

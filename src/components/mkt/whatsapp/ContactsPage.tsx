// pages/ContactsPage.tsx
import { useState } from "react";
import { toast } from "react-toastify";
import { useContacts } from "../../../contexts/ContactsContext";
import { usePatients } from '../../../hooks/usePatients';
import { addContact, deleteContact, editContact } from "../../../services/whatsappService";
import ContactsList, { Contact } from "./ContactsList";

export default function ContactsPage() {
    const { listContacts, refreshContacts, markAsRead } = useContacts();
    const { patients, createPatient } = usePatients(); // ✅ hook de pacientes
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    // ✅ Seleciona contato e marca como lido (limpa notificação)
    const handleSelect = (contact: Contact) => {
        markAsRead(contact._id);
        setSelectedContact(contact);
    };

    // ✅ Função auxiliar: cria/busca paciente e vincula ao contato
    const syncContactWithPatient = async (contact: Contact, newName: string) => {
        try {
            // 1️⃣ Verifica se já existe paciente com este telefone
            const existingPatient = patients.find(p => p.phone === contact.phone);

            let patientId: string;

            if (existingPatient) {
                // Atualiza nome do paciente existente se necessário
                patientId = existingPatient._id;
                console.log('✅ Paciente já existe:', existingPatient.name);
            } else {
                // 2️⃣ Cria novo paciente
                const newPatient = await createPatient({
                    name: newName,
                    phone: contact.phone,
                    cpf: '',
                    rg: '',
                    birthDate: '',
                    email: '',
                    address: '',
                    // ... outros campos opcionais
                } as any);

                patientId = newPatient._id;
                console.log('✅ Paciente criado:', newPatient);
            }

            return patientId;
        } catch (error) {
            console.error('❌ Erro ao sincronizar paciente:', error);
            throw error;
        }
    };

    // 🔹 Adicionar novo contato
    const handleAdd = async (data: Omit<Contact, "_id">) => {
        try {
            const newContact = await addContact(data);

            // ✅ Se tiver nome válido (não "WhatsApp XXXX"), cria paciente
            if (data.name && !data.name.startsWith('WhatsApp ')) {
                const patientId = await syncContactWithPatient(newContact, data.name);

                // Atualiza contato com patientId
                await editContact(newContact._id, { patientId } as any);
            }

            await refreshContacts();
            toast.success("Contato adicionado com sucesso 💚");
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Erro ao adicionar contato");
        }
    };

    // 🔹 Editar contato existente
    const handleEdit = async (id: string, data: Partial<Contact>) => {
        try {
            const contact = listContacts.find(c => c._id === id);
            if (!contact) throw new Error('Contato não encontrado');

            // ✅ Detecta se nome foi alterado de "WhatsApp XXXX" para nome real
            const nameChanged = data.name &&
                data.name !== contact.name &&
                !data.name.startsWith('WhatsApp ');

            let updateData = { ...data };

            if (nameChanged) {
                // Sincroniza com paciente
                const patientId = await syncContactWithPatient(contact, data.name!);
                updateData = { ...data, patientId } as any;

                toast.success(`Paciente "${data.name}" criado e vinculado 💚`);
            }

            // Atualiza contato
            await editContact(id, updateData);
            await refreshContacts();

            if (!nameChanged) {
                toast.success("Contato atualizado 💚");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Erro ao editar contato");
        }
    };

    // 🔹 Deletar contato
    const handleDelete = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja deletar este contato?")) return;
        try {
            await deleteContact(id);
            await refreshContacts();
            toast.success("Contato deletado 💚");
        } catch (err) {
            toast.error("Erro ao deletar contato");
        }
    };

    return (
        <div className="p-6 min-h-screen bg-gray-50">
            <ContactsList
                contacts={listContacts}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSelect={handleSelect}
                selectedContactId={selectedContact?._id}
            />
        </div>
    );
}
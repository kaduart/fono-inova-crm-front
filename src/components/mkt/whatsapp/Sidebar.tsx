import React from 'react';
import ContactsList from './ContactsList';

interface Contact {
    _id: string;
    name: string;
    phone: string;
    avatar?: string;
}

interface SidebarProps {
    contacts: Contact[];
    active: Contact | null;
    onSelect: (contact: Contact) => void;
    // onAddContact: () => void;
    onAdd: (data: Omit<Contact, '_id'>) => void;
    onEdit: (id: string, data: Omit<Contact, '_id'>) => void;
    onDelete: (id: string) => void;

}

const Sidebar: React.FC<SidebarProps> = ({
    contacts,
    active,
    onSelect,
    //onAddContact,
    onAdd,
    onEdit,
    onDelete,
}) => {
    return (
        <div className="w-1/3 border-r h-screen flex flex-col">
            <ContactsList
                contacts={contacts}
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
                onSelect={onSelect} // se quiser também para seleção do contato
            />
            {/* <button
                onClick={onAddContact}
                className="m-4 p-2 bg-green-600 text-white rounded"
            >
                + Adicionar Contato
            </button> */}
        </div>
    );
};

export default Sidebar;

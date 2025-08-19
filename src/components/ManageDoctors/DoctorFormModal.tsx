import { Box, Modal } from "@mui/material";
import { useEffect, useState } from "react";
import { IDoctor } from "../../utils/types/types";
import DoctorForm from "./DoctorForm";
import { toast } from "react-toastify";

interface DoctorFormModalProps {
    open: boolean;
    onClose: () => void;
    onSubmitDoctor: (data: IDoctor) => Promise<void>;
    selectedDoctor: IDoctor | null;
    loading?: boolean;
    modalShouldClose?: boolean;
    onCancel?: () => void;
};

const DoctorFormModal = ({
    open,
    onClose,
    onSubmitDoctor,
    selectedDoctor,
    loading,
    onCancel,
    modalShouldClose
}: DoctorFormModalProps) => {
    const [localOpen, setLocalOpen] = useState(open);
    const [shouldClose, setShouldClose] = useState(false);

    // Sincroniza o estado aberto/fechado
    useEffect(() => {
        if (open) {
            setLocalOpen(true);
            setShouldClose(false);
        } else if (shouldClose) {
            setLocalOpen(false);
        }
    }, [open, modalShouldClose]);

    const handleSubmit = async (data: IDoctor) => {
        try {
            await onSubmitDoctor(data);
            setShouldClose(true); 
        } catch (error) {
            // Erros são tratados no componente pai
        }
    };

    return (
        <Modal
            open={localOpen}
            onClose={() => {
                setShouldClose(true);
                onClose();
            }}
            BackdropProps={{
                style: {
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)'
                }
            }}
        >
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90%',
                maxWidth: '800px',
                bgcolor: 'background.paper',
                boxShadow: 24,
                p: 4,
                borderRadius: '8px',
                outline: 'none'
            }}>
                <DoctorForm
                    selectedDoctor={selectedDoctor}
                    onCancel={() => {
                        setShouldClose(true);
                        onClose();
                    }}
                    onSubmitDoctor={handleSubmit}
                    loading={loading}
                />
            </Box>
        </Modal>
    );
};

export default DoctorFormModal;
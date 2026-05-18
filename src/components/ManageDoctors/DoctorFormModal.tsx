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
    loading: externalLoading,
    onCancel,
    modalShouldClose
}: DoctorFormModalProps) => {
    const [localOpen, setLocalOpen] = useState(open);
    const [shouldClose, setShouldClose] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sincroniza o estado aberto/fechado
    useEffect(() => {
        if (modalShouldClose) {
            setLocalOpen(false);
        } else if (open) {
            setLocalOpen(true);
            setShouldClose(false);
        } else if (shouldClose) {
            setLocalOpen(false);
        }
    }, [open, modalShouldClose]);

    const handleSubmit = async (data: IDoctor) => {
        console.log('[DoctorFormModal] handleSubmit recebido:', data);
        setIsSubmitting(true);
        try {
            console.log('[DoctorFormModal] Chamando onSubmitDoctor...');
            await onSubmitDoctor(data);
            console.log('[DoctorFormModal] onSubmitDoctor resolveu com sucesso.');
            setShouldClose(true);
            onClose(); // Fecha o modal no sucesso
        } catch (error) {
            console.error('[DoctorFormModal] onSubmitDoctor rejeitou:', error);
            // Erros são tratados no componente pai
        } finally {
            setIsSubmitting(false);
        }
    };

    // Combina loading externo com interno
    const loading = externalLoading || isSubmitting;

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
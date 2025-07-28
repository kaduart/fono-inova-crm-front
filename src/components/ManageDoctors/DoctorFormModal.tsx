import { Box, Modal } from "@mui/material";
import { IDoctor } from "../../utils/types/types";
import DoctorForm from "./DoctorForm";

interface DoctorFormModalProps {
    open: boolean;
    onClose: () => void;
    onSubmitDoctor: (data: IDoctor) => void;
    selectedDoctor: IDoctor | null
    openCloseModalResponse: boolean
};
const DoctorFormModal = ({ open, openCloseModalResponse, onClose, onSubmitDoctor, selectedDoctor }: DoctorFormModalProps) => {

    return (
        <Modal open={open} onClose={onClose}>
            <Box>
                <DoctorForm selectedDoctor={selectedDoctor} onCancel={onClose} onSubmitDoctor={onSubmitDoctor} />
            </Box>
        </Modal>
    );
};

export default DoctorFormModal;


import { Box } from '@mui/material';
import PaymentPage from '../../../components/financial/PaymentPage';
import { FinancialRecord } from '../../../services/paymentService';
import { IDoctor, IPatient } from '../../../utils/types/types';

interface RevenueTabProps {
    patients: IPatient[];
    doctors: IDoctor[];
    payments: FinancialRecord[];
    onMarkAsPaid: (payment: FinancialRecord) => void;
    registerAppointmentAndPayemntFuture: (payment: FinancialRecord) => void;
    onCancelPayment: (paymentId: string) => void;
}

const RevenueTab: React.FC<RevenueTabProps> = ({
    patients,
    doctors,
    payments,
    onMarkAsPaid,
    registerAppointmentAndPayemntFuture,
    onCancelPayment,
}) => {
    return (
        <Box>
            <PaymentPage
                patients={patients}
                doctors={doctors}
                initialPayments={payments}
                onMarkAsPaid={onMarkAsPaid}
                registerAppointmentAndPayemntFuture={registerAppointmentAndPayemntFuture}
                onCancelPayment={onCancelPayment}
            />
        </Box>
    );
};

export default RevenueTab;

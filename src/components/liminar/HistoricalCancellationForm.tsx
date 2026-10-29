import CancellationEntryForm from '../common/CancellationEntryForm';
import liminarContractService, { TherapeuticPlan } from '../../services/liminarContractService';
type Props = { contractId: string; plan: TherapeuticPlan; onRecorded: () => void; onPendingChange: (pending: boolean) => void };
export default function HistoricalCancellationForm({ contractId, plan, onRecorded, onPendingChange }: Props) {
  return <CancellationEntryForm specialties={Object.keys(plan.therapies)}
    onSubmit={(rows, dryRun) => liminarContractService.recordHistoricalCancellations(contractId, plan._id, rows, dryRun)}
    onRecorded={onRecorded} onPendingChange={onPendingChange} />;
}

import { Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ModalHeader, ModalFooter } from '../../pages/Financial/components/formKit';

export type InactivatableEntityType = 'package' | 'guide' | 'liminar';

const ENTITY_LABELS: Record<InactivatableEntityType, string> = {
  package: 'pacote',
  guide: 'guia',
  liminar: 'contrato liminar',
};

interface InactivateEntityModalProps {
  open: boolean;
  entityType: InactivatableEntityType;
  entityName?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Modal de confirmação compartilhado entre Package/InsuranceGuide/LiminarContract.
 * Cada domínio mantém seu próprio endpoint e estado de loading — este componente
 * só resolve a UX (título, texto, botões), não a regra de negócio.
 */
export default function InactivateEntityModal({
  open,
  entityType,
  entityName,
  loading = false,
  onConfirm,
  onClose,
}: InactivateEntityModalProps) {
  const label = ENTITY_LABELS[entityType];
  const title = entityName ? `Inativar ${label} de ${entityName}` : `Inativar ${label}`;

  return (
    <Modal
      open={open}
      onClose={() => !loading && onClose()}
      labelledBy="inactivate-entity-title"
      zIndexClass="z-[1300]"
      panelClassName="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px]"
    >
      <ModalHeader
        icon={<Trash2 className="w-6 h-6" />}
        color="#DC2626"
        title={title}
        onClose={onClose}
        titleId="inactivate-entity-title"
        closeDisabled={loading}
      />
      <div className="space-y-3 px-5 py-5 sm:px-6">
        <p className="text-sm text-gray-700">
          Esta ação irá <strong>cancelar todas as sessões e agendamentos pendentes</strong> vinculados a este {label} e liberar a agenda.
        </p>
        <p className="rounded-xl bg-gray-50 px-3.5 py-2.5 text-sm text-gray-600">
          Sessões já realizadas e pagamentos concluídos serão <strong>mantidos</strong> e não impactarão o financeiro.
        </p>
      </div>
      <ModalFooter
        accent="red"
        onCancel={onClose}
        onSubmit={onConfirm}
        submitting={loading}
        submitLabel="Sim, inativar"
        submittingLabel="Inativando..."
      />
    </Modal>
  );
}

import { Trash2 } from 'lucide-react';

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
  if (!open) return null;

  const label = ENTITY_LABELS[entityType];
  const title = entityName ? `Inativar ${label} de ${entityName}` : `Inativar ${label}`;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={() => !loading && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          Esta ação irá <strong>cancelar todas as sessões e agendamentos pendentes</strong> vinculados a este {label} e liberar a agenda.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Sessões já realizadas e pagamentos concluídos serão <strong>mantidos</strong> e não impactarão o financeiro.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Inativando...
              </>
            ) : (
              'Sim, inativar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

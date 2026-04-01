interface ConvenioManagerModalProps {
  open: boolean;
  onClose: () => void;
}

const ConvenioManagerModal = ({ open, onClose }: ConvenioManagerModalProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Gerenciamento de Convênios</h3>
        <p className="text-gray-600 mb-4">Funcionalidade em construção.</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConvenioManagerModal;

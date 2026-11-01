// Mantido pelo nome antigo: agora abre a confirmação no estilo do app (ConfirmHost).
import { confirmDialog, type ConfirmOptions } from '../components/ui/ConfirmHost';

export const confirmToast = (msg: string, options: ConfirmOptions = {}) =>
  confirmDialog(msg, { confirmText: 'Excluir', cancelText: 'Cancelar', confirmColor: 'red', ...options });

export default confirmToast;

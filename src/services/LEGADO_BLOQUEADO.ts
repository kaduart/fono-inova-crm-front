/**
 * 🚫 LEGADO BLOQUEADO - NÃO USE
 * 
 * Este arquivo existe apenas para gerar erros claros
 * se alguém tentar usar APIs legadas.
 */

export const ERRO_LEGADO = (nome: string) => {
  throw new Error(
    `🚫 BLOQUEADO: ${nome} é LEGADO e foi removido.\n` +
    `👉 Use packageService (V2) em vez disso.\n` +
    `📖 Veja: /docs/API_CONTRACT_V2.md`
  );
};

// 🚫 Exportações legadas BLOQUEADAS
export const packagesService = {
  listPackages: () => ERRO_LEGADO('packagesService.listPackages'),
  createPackage: () => ERRO_LEGADO('packagesService.createPackage'),
  updatePackage: () => ERRO_LEGADO('packagesService.updatePackage'),
  deletePackage: () => ERRO_LEGADO('packagesService.deletePackage'),
  createSession: () => ERRO_LEGADO('packagesService.createSession'),
  updateSession: () => ERRO_LEGADO('packagesService.updateSession'),
  addPayment: () => ERRO_LEGADO('packagesService.addPayment'),
  cancelAllSessions: () => ERRO_LEGADO('packagesService.cancelAllSessions'),
};

export default packagesService;

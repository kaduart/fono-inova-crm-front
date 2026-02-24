// src/hooks/admin/useAdminUIReducer.ts
import { useReducer, useCallback } from 'react';

// ==================== STATE ====================
export interface AdminUIState {
  // Navegação
  activeTab: string;
  openMenu: string;
  
  // Perfil/Edição
  isEditing: boolean;
  showAdminPassword: boolean;
  
  // Modais
  isModalOpen: boolean;
  showModalAddProfessional: boolean;
  paymentModalOpen: boolean;
  showAdvancedPayment: boolean;
  closeModalSignal: number;
  openModal: boolean;
  openModalAppointment: boolean;
}

const initialUIState: AdminUIState = {
  activeTab: 'Dashboard',
  openMenu: '',
  isEditing: false,
  showAdminPassword: false,
  isModalOpen: false,
  showModalAddProfessional: false,
  paymentModalOpen: false,
  showAdvancedPayment: false,
  closeModalSignal: 0,
  openModal: false,
  openModalAppointment: false,
};

// ==================== ACTIONS ====================
type UIAction =
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_OPEN_MENU'; payload: string }
  | { type: 'TOGGLE_MENU'; payload: string }
  | { type: 'SET_IS_EDITING'; payload: boolean }
  | { type: 'SET_SHOW_ADMIN_PASSWORD'; payload: boolean }
  | { type: 'OPEN_MODAL'; modal: 'patient' | 'professional' | 'payment' | 'advancedPayment' | 'appointment' }
  | { type: 'CLOSE_MODAL'; modal: 'patient' | 'professional' | 'payment' | 'advancedPayment' | 'appointment' }
  | { type: 'TRIGGER_CLOSE_SIGNAL' }
  | { type: 'RESET_UI' };

// ==================== REDUCER ====================
function uiReducer(state: AdminUIState, action: UIAction): AdminUIState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_OPEN_MENU':
      return { ...state, openMenu: action.payload };
    case 'TOGGLE_MENU':
      return { ...state, openMenu: state.openMenu === action.payload ? '' : action.payload };
    case 'SET_IS_EDITING':
      return { ...state, isEditing: action.payload };
    case 'SET_SHOW_ADMIN_PASSWORD':
      return { ...state, showAdminPassword: action.payload };
    case 'OPEN_MODAL':
      switch (action.modal) {
        case 'patient': return { ...state, isModalOpen: true };
        case 'professional': return { ...state, showModalAddProfessional: true };
        case 'payment': return { ...state, paymentModalOpen: true };
        case 'advancedPayment': return { ...state, showAdvancedPayment: true };
        case 'appointment': return { ...state, openModalAppointment: true, openModal: true };
        default: return state;
      }
    case 'CLOSE_MODAL':
      switch (action.modal) {
        case 'patient': return { ...state, isModalOpen: false };
        case 'professional': return { ...state, showModalAddProfessional: false };
        case 'payment': return { ...state, paymentModalOpen: false };
        case 'advancedPayment': return { ...state, showAdvancedPayment: false };
        case 'appointment': return { ...state, openModalAppointment: false, openModal: false };
        default: return state;
      }
    case 'TRIGGER_CLOSE_SIGNAL':
      return { ...state, closeModalSignal: state.closeModalSignal + 1 };
    case 'RESET_UI':
      return initialUIState;
    default:
      return state;
  }
}

// ==================== HOOK ====================
export function useAdminUIReducer() {
  const [state, dispatch] = useReducer(uiReducer, initialUIState);

  // Actions memoizadas
  const setActiveTab = useCallback((tab: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  }, []);

  const setOpenMenu = useCallback((menu: string) => {
    dispatch({ type: 'SET_OPEN_MENU', payload: menu });
  }, []);

  const toggleMenu = useCallback((menu: string) => {
    dispatch({ type: 'TOGGLE_MENU', payload: menu });
  }, []);

  const setIsEditing = useCallback((value: boolean) => {
    dispatch({ type: 'SET_IS_EDITING', payload: value });
  }, []);

  const setShowAdminPassword = useCallback((value: boolean) => {
    dispatch({ type: 'SET_SHOW_ADMIN_PASSWORD', payload: value });
  }, []);

  const openModal = useCallback((modal: 'patient' | 'professional' | 'payment' | 'advancedPayment' | 'appointment') => {
    dispatch({ type: 'OPEN_MODAL', modal });
  }, []);

  const closeModal = useCallback((modal: 'patient' | 'professional' | 'payment' | 'advancedPayment' | 'appointment') => {
    dispatch({ type: 'CLOSE_MODAL', modal });
  }, []);

  const triggerCloseSignal = useCallback(() => {
    dispatch({ type: 'TRIGGER_CLOSE_SIGNAL' });
  }, []);

  const resetUI = useCallback(() => {
    dispatch({ type: 'RESET_UI' });
  }, []);

  return {
    state,
    dispatch,
    // Actions individuais para conveniência
    setActiveTab,
    setOpenMenu,
    toggleMenu,
    setIsEditing,
    setShowAdminPassword,
    openModal,
    closeModal,
    triggerCloseSignal,
    resetUI,
  };
}

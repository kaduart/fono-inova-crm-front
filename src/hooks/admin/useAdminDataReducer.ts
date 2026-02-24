// src/hooks/admin/useAdminDataReducer.ts
import { useReducer, useCallback } from 'react';
import { IPatient } from '../../utils/types/types';
import { FinancialRecord } from '../../services/paymentService';

// ==================== TYPES ====================
export interface AppointmentData {
  patient: string;
  doctor: string;
  date: string;
  time: string;
  type: string;
  reason: string;
  status: string;
}

export interface AgendamentoTemp {
  profissional: string;
  data: string;
  hora: string;
  sessionType: string;
  status: string;
  motivo: string;
}

export interface AdminData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface PaymentContext {
  mode: 'create' | 'edit';
  patient?: IPatient;
  payment?: FinancialRecord;
}

// ==================== STATE ====================
export interface AdminDataState {
  // Formulários
  appointmentData: AppointmentData;
  agendamentoTemp: AgendamentoTemp;
  agendamentosTemp: unknown[];
  adminData: AdminData;
  
  // Entidades selecionadas
  patientToEdit: IPatient | undefined;
  selectedPatient: IPatient | null;
  
  // Contexto de pagamento
  paymentContext: PaymentContext;
  allPayments: FinancialRecord[];
  
  // Loading
  isLoading: boolean;
  
  // Calendar
  calendarDateRange: { startDate?: string; endDate?: string };
  modalShouldClose: boolean;
}

const initialDataState: AdminDataState = {
  appointmentData: {
    patient: '',
    doctor: '',
    date: '',
    time: '',
    type: '',
    reason: '',
    status: '',
  },
  agendamentoTemp: {
    profissional: '',
    data: '',
    hora: '',
    sessionType: '',
    status: '',
    motivo: '',
  },
  agendamentosTemp: [],
  adminData: {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  },
  patientToEdit: undefined,
  selectedPatient: null,
  paymentContext: { mode: 'create' },
  allPayments: [],
  isLoading: false,
  calendarDateRange: {},
  modalShouldClose: false,
};

// ==================== ACTIONS ====================
type DataAction =
  | { type: 'SET_APPOINTMENT_DATA'; payload: Partial<AppointmentData> }
  | { type: 'SET_AGENDAMENTO_TEMP'; payload: Partial<AgendamentoTemp> }
  | { type: 'SET_AGENDAMENTOS_TEMP'; payload: unknown[] }
  | { type: 'SET_ADMIN_DATA'; payload: Partial<AdminData> }
  | { type: 'SET_PATIENT_TO_EDIT'; payload: IPatient | undefined }
  | { type: 'SET_SELECTED_PATIENT'; payload: IPatient | null }
  | { type: 'SET_PAYMENT_CONTEXT'; payload: Partial<PaymentContext> }
  | { type: 'SET_ALL_PAYMENTS'; payload: FinancialRecord[] }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_CALENDAR_DATE_RANGE'; payload: { startDate?: string; endDate?: string } }
  | { type: 'SET_MODAL_SHOULD_CLOSE'; payload: boolean }
  | { type: 'RESET_APPOINTMENT_DATA' }
  | { type: 'RESET_DATA' };

// ==================== REDUCER ====================
function dataReducer(state: AdminDataState, action: DataAction): AdminDataState {
  switch (action.type) {
    case 'SET_APPOINTMENT_DATA':
      return { ...state, appointmentData: { ...state.appointmentData, ...action.payload } };
    case 'SET_AGENDAMENTO_TEMP':
      return { ...state, agendamentoTemp: { ...state.agendamentoTemp, ...action.payload } };
    case 'SET_AGENDAMENTOS_TEMP':
      return { ...state, agendamentosTemp: action.payload };
    case 'SET_ADMIN_DATA':
      return { ...state, adminData: { ...state.adminData, ...action.payload } };
    case 'SET_PATIENT_TO_EDIT':
      return { ...state, patientToEdit: action.payload };
    case 'SET_SELECTED_PATIENT':
      return { ...state, selectedPatient: action.payload };
    case 'SET_PAYMENT_CONTEXT':
      return { ...state, paymentContext: { ...state.paymentContext, ...action.payload } };
    case 'SET_ALL_PAYMENTS':
      return { ...state, allPayments: action.payload };
    case 'SET_IS_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CALENDAR_DATE_RANGE':
      return { ...state, calendarDateRange: action.payload };
    case 'SET_MODAL_SHOULD_CLOSE':
      return { ...state, modalShouldClose: action.payload };
    case 'RESET_APPOINTMENT_DATA':
      return { ...state, appointmentData: initialDataState.appointmentData };
    case 'RESET_DATA':
      return initialDataState;
    default:
      return state;
  }
}

// ==================== HOOK ====================
export function useAdminDataReducer() {
  const [state, dispatch] = useReducer(dataReducer, initialDataState);

  // Actions memoizadas
  const setAppointmentData = useCallback((data: Partial<AppointmentData>) => {
    dispatch({ type: 'SET_APPOINTMENT_DATA', payload: data });
  }, []);

  const setAgendamentoTemp = useCallback((data: Partial<AgendamentoTemp>) => {
    dispatch({ type: 'SET_AGENDAMENTO_TEMP', payload: data });
  }, []);

  const setAgendamentosTemp = useCallback((data: unknown[]) => {
    dispatch({ type: 'SET_AGENDAMENTOS_TEMP', payload: data });
  }, []);

  const setAdminData = useCallback((data: Partial<AdminData>) => {
    dispatch({ type: 'SET_ADMIN_DATA', payload: data });
  }, []);

  const setPatientToEdit = useCallback((patient: IPatient | undefined) => {
    dispatch({ type: 'SET_PATIENT_TO_EDIT', payload: patient });
  }, []);

  const setSelectedPatient = useCallback((patient: IPatient | null) => {
    dispatch({ type: 'SET_SELECTED_PATIENT', payload: patient });
  }, []);

  const setPaymentContext = useCallback((context: Partial<PaymentContext>) => {
    dispatch({ type: 'SET_PAYMENT_CONTEXT', payload: context });
  }, []);

  const setAllPayments = useCallback((payments: FinancialRecord[]) => {
    dispatch({ type: 'SET_ALL_PAYMENTS', payload: payments });
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_IS_LOADING', payload: loading });
  }, []);

  const setCalendarDateRange = useCallback((range: { startDate?: string; endDate?: string }) => {
    dispatch({ type: 'SET_CALENDAR_DATE_RANGE', payload: range });
  }, []);

  const setModalShouldClose = useCallback((value: boolean) => {
    dispatch({ type: 'SET_MODAL_SHOULD_CLOSE', payload: value });
  }, []);

  const resetAppointmentData = useCallback(() => {
    dispatch({ type: 'RESET_APPOINTMENT_DATA' });
  }, []);

  const resetData = useCallback(() => {
    dispatch({ type: 'RESET_DATA' });
  }, []);

  return {
    state,
    dispatch,
    // Actions individuais
    setAppointmentData,
    setAgendamentoTemp,
    setAgendamentosTemp,
    setAdminData,
    setPatientToEdit,
    setSelectedPatient,
    setPaymentContext,
    setAllPayments,
    setIsLoading,
    setCalendarDateRange,
    setModalShouldClose,
    resetAppointmentData,
    resetData,
  };
}

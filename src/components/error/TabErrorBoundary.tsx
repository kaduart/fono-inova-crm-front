// src/components/error/TabErrorBoundary.tsx
import {React,  Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  tabName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Erro de chunk (React.lazy) após um novo deploy: a promise do import fica
// permanentemente rejeitada, então resetar o estado do boundary não resolve —
// React relança o mesmo erro a cada render. Só um reload real da página busca
// o bundle novo. Ver: /assets/features/*.js hash mismatch em produção (2026-07-25).
const isChunkLoadError = (error?: Error): boolean => {
  if (!error) return false;
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|load failed/i.test(
    error.message || ''
  );
};

export class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[TabErrorBoundary${this.props.tabName ? ` - ${this.props.tabName}` : ''}]`, error, errorInfo);
  }

  handleReset = (): void => {
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, tabName } = this.props;

    if (hasError) {
      const isChunkError = isChunkLoadError(error);
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            {isChunkError ? 'Nova versão disponível' : `Algo deu errado${tabName ? ` em "${tabName}"` : ''}`}
          </h3>
          <p className="text-sm text-red-600 mb-4 text-center max-w-md">
            {isChunkError
              ? 'O sistema foi atualizado e esta aba precisa recarregar para continuar.'
              : (error?.message || 'Ocorreu um erro inesperado ao carregar esta aba.')}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {isChunkError ? 'Atualizar página' : 'Tentar novamente'}
          </button>
        </div>
      );
    }

    return children;
  }
}

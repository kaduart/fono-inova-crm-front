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
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, tabName } = this.props;

    if (hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Algo deu errado{tabName ? ` em "${tabName}"` : ''}
          </h3>
          <p className="text-sm text-red-600 mb-4 text-center max-w-md">
            {error?.message || 'Ocorreu um erro inesperado ao carregar esta aba.'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      );
    }

    return children;
  }
}

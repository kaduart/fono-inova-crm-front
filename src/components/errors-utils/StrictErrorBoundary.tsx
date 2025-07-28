// src/components/StrictErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class StrictErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Limpeza agressiva
    localStorage.clear();
    sessionStorage.clear();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h2>Ocorreu um erro crítico</h2>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', marginTop: 10 }}
          >
            Recarregar a aplicação
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
export default StrictErrorBoundary;
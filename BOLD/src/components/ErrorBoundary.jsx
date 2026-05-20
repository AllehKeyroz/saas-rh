import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Erro ao carregar esta página</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-md">
              {this.state.error?.message || 'Ocorreu um erro inesperado.'}
            </p>
          </div>
          <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}>
            <RefreshCw className="w-4 h-4" />
            Recarregar página
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
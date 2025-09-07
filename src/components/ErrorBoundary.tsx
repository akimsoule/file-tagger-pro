import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error) => React.ReactNode);
  onReset?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log technique (peut être remplacé par un service distant)
    console.error("Application error boundary caught: ", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  renderFallback(error: Error) {
    const isDev = typeof import.meta !== "undefined" && (import.meta as any).env?.DEV; // eslint-disable-line @typescript-eslint/no-explicit-any
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background text-foreground">
        <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold mb-2">Un problème est survenu</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Une erreur s'est produite lors de l'affichage de l'application. Vous pouvez réessayer ou
            recharger la page.
          </p>
          {isDev && (
            <pre className="text-xs overflow-auto max-h-48 bg-muted p-3 rounded mb-4 whitespace-pre-wrap">
              {error?.message || String(error)}
            </pre>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="px-3 py-2 text-sm rounded border border-input hover:bg-accent"
              onClick={this.handleReset}
            >
              Réessayer
            </button>
            <button
              type="button"
              className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90"
              onClick={() => window.location.reload()}
            >
              Recharger
            </button>
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      if (fallback) {
        return typeof fallback === "function"
          ? (fallback as (error: Error) => React.ReactNode)(this.state.error)
          : fallback;
      }
      return this.renderFallback(this.state.error);
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

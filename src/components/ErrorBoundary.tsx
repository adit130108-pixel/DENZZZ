import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="shell">
          <div className="glass offline-card" style={{ margin: 'auto 0' }}>
            <h1 className="offline-title">DENZZ CLIENT</h1>
            <p className="offline-message">
              Terjadi kesalahan saat memuat aplikasi. Silakan muat ulang halaman.
            </p>
            <button
              type="button"
              className="pill-btn primary offline-refresh"
              onClick={() => window.location.reload()}
            >
              MUAT ULANG
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

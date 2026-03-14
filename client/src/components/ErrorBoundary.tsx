import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[300px] p-8"
          data-testid="error-boundary-fallback"
        >
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-white/90 mb-2">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h2>

          <p className="text-sm text-white/50 mb-6 max-w-md text-center">
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>

          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-gold-accent)]/10 border border-[var(--color-gold-accent)]/20 text-[var(--color-gold-accent)] text-sm hover:bg-[var(--color-gold-accent)]/20 transition-colors"
              data-testid="button-error-retry"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-colors"
              data-testid="button-error-home"
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

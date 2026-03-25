import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Optional fallback to render instead of the default error UI. */
  fallback?: ReactNode;
  /** Called when an error is caught. Defaults to console.error. */
  onError?: (error: Error, info: ErrorInfo) => void;
};

type ErrorBoundaryState = {
  error: Error | null;
};

function defaultOnError(error: Error, info: ErrorInfo) {
  console.error("ErrorBoundary caught an error:", error, info);
}

/**
 * A class component error boundary that catches render errors in its subtree
 * and displays a fallback UI with the error message and a "Try again" button.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const onError = this.props.onError ?? defaultOnError;
    onError(error, info);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <p className="text-sm font-medium text-destructive">Something went wrong</p>
          <p className="text-xs text-muted-foreground">{this.state.error.message}</p>
          <button
            type="button"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
            onClick={this.handleRetry}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

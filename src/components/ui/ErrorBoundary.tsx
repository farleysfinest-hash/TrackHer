import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card } from './Card';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error);
    console.error(info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <Card variant="elevated" padding="lg" className="max-w-md">
            <h2 className="font-display text-xl text-sage-800">
              Something went wrong on our end
            </h2>
            <p className="mt-3 text-sm text-sage-600">
              This is a problem with the app, not with anything you did or anything in your
              data. Your information is safe and nothing has been lost.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button onClick={this.handleReload}>Reload</Button>
              <Link
                to="/dashboard"
                className="text-sm text-sage-600 underline hover:text-sage-800"
              >
                Go to dashboard
              </Link>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

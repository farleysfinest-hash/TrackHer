import { Navigate, useLocation } from 'react-router-dom';
import { PageLoader } from '../ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isInitialized, profile, profileLoadFailed, retryProfileLoad } =
    useAuth();
  const location = useLocation();

  if (!isInitialized || isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profileLoadFailed && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sage-700">Unable to load your profile.</p>
          <button
            type="button"
            onClick={() => void retryProfileLoad()}
            className="mt-4 rounded-lg bg-sage-500 px-4 py-2 text-sm font-medium text-white hover:bg-sage-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (requireOnboarding && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!requireOnboarding && profile?.onboarding_completed && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

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
            className="mt-4 rounded-lg bg-sage-500 px-4 py-2 text-sm font-medium text-on-accent hover:bg-sage-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Authenticated but profile still loading (deferred fetch after SIGNED_IN).
  if (!profile) {
    return <PageLoader />;
  }

  if (requireOnboarding && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  // A completed profile is normally bounced away from onboarding. The exception is a profile
  // that finished onboarding without a STRAW stage: nothing else in the app can write
  // `straw_stage`, so redirecting would trap the user with staging that can never be fixed —
  // and staging gates the provider report, the insight engine and the bleeding check.
  const stagingIncomplete = !profile?.straw_stage;

  if (
    !requireOnboarding &&
    profile?.onboarding_completed &&
    !stagingIncomplete &&
    location.pathname === '/onboarding'
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

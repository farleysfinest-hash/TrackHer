import { Navigate, useLocation } from 'react-router-dom';
import { PageLoader } from '../ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import { hasConfirmedProfileContext } from '../../utils/profileContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isInitialized, profile } = useAuth();
  const location = useLocation();

  if (!isInitialized || isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const contextConfirmed = hasConfirmedProfileContext(profile);

  if (requireOnboarding && profile?.onboarding_completed && !contextConfirmed) {
    return <Navigate to="/profile-confirmation" replace />;
  }

  if (requireOnboarding && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!requireOnboarding && profile?.onboarding_completed && location.pathname === '/onboarding') {
    return <Navigate to={contextConfirmed ? '/dashboard' : '/profile-confirmation'} replace />;
  }

  if (
    !requireOnboarding &&
    location.pathname === '/profile-confirmation' &&
    contextConfirmed
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

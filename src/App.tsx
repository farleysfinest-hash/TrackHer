import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary, RouteErrorBoundary } from './components/ui/ErrorBoundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { useKeyboardAvoidance } from './hooks/useKeyboardBottomInset';

function KeyboardAvoidanceRoot() {
  useKeyboardAvoidance();
  return null;
}
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import('./pages/SignupPage').then((m) => ({ default: m.SignupPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const OnboardingPage = lazy(() =>
  import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const PrivacyPolicyPage = lazy(() =>
  import('./pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })),
);
const TermsOfServicePage = lazy(() =>
  import('./pages/TermsOfServicePage').then((m) => ({ default: m.TermsOfServicePage })),
);

/**
 * Visual harness for the bleeding and safeguarding cards, which only fire for account states
 * no test account is in. Registered under DEV only — the lazy import is unreachable in a
 * production build, so Rollup drops the chunk. See src/pages/DevCardsPage.tsx.
 */
const DevCardsPage = import.meta.env.DEV
  ? lazy(() => import('./pages/DevCardsPage').then((m) => ({ default: m.DevCardsPage })))
  : null;

/** URL match only — PersistentTabs owns the real page trees for main tabs. */
function TabRoute() {
  return null;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <KeyboardAvoidanceRoot />
      <ToastContainer />
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />

            {DevCardsPage && <Route path="/dev/cards" element={<DevCardsPage />} />}

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute requireOnboarding={false}>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<TabRoute />} />
              <Route path="/medications" element={<TabRoute />} />
              <Route path="/checkin" element={<TabRoute />} />
              <Route path="/labs" element={<TabRoute />} />
              <Route path="/insights" element={<TabRoute />} />
              <Route
                path="/settings"
                element={
                  <RouteErrorBoundary>
                    <SettingsPage />
                  </RouteErrorBoundary>
                }
              />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

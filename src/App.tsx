import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { IS_DEV_MODE } from './lib/devMode';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { ToastContainer } from './components/ui/Toast';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { MedicationsPage } from './pages/MedicationsPage';
import { CheckinPage } from './pages/CheckinPage';
import { LabsPage } from './pages/LabsPage';
import { InsightsPage } from './pages/InsightsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/medications" element={<MedicationsPage />} />
          <Route path="/checkin" element={<CheckinPage />} />
          <Route path="/labs" element={<LabsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {IS_DEV_MODE && (
        <div className="pointer-events-none fixed bottom-20 right-4 z-40 rounded-full bg-sage-700 px-3 py-1 font-mono text-xs text-white opacity-80 shadow-lg md:bottom-4">
          DEV MODE
        </div>
      )}
    </BrowserRouter>
  );
}
